const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const BACKUP_DIR = 'D:\\PACIFIC_DATABASE_BACKUP_2026_10_15';
const SQL_PARTS_DIR = path.join(BACKUP_DIR, 'sql_parts');
const MANIFEST_PATH = path.join(BACKUP_DIR, 'ALL_TABLES_DATA_CONSOLIDATED.json');
require('dotenv').config();
const targetUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!targetUrl) {
  console.error('Missing DIRECT_URL or DATABASE_URL in environment');
  process.exit(1);
}

const client = new Client({
  connectionString: targetUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting database migration to target database...`);
  console.log(`Target: Configured via environment variables`);

  await client.connect();
  console.log('Connected to target database successfully!\n');

  // Step 1: Enums & Extensions
  console.log('--- Step 1: Creating Extensions and Custom ENUM Types ---');
  const enumsSql = fs.readFileSync(path.join(SQL_PARTS_DIR, '01_enums.sql'), 'utf-8');
  await client.query(enumsSql);
  console.log('✓ Extensions and 22 ENUM types created successfully.');

  // Step 2: Sequences
  console.log('\n--- Step 2: Creating Sequences ---');
  const seqsSql = fs.readFileSync(path.join(SQL_PARTS_DIR, '02_sequences.sql'), 'utf-8');
  await client.query(seqsSql);
  console.log('✓ Sequences created successfully.');

  // Step 3: Tables DDL
  console.log('\n--- Step 3: Creating Table Schemas (121 Tables) ---');
  const tablesSql = fs.readFileSync(path.join(SQL_PARTS_DIR, '03_tables.sql'), 'utf-8');
  await client.query(tablesSql);
  console.log('✓ 121 base tables created successfully.');

  // Step 4: Data Inserts
  console.log('\n--- Step 4: Inserting Data Records (1,852 rows across active tables) ---');
  const dataSql = fs.readFileSync(path.join(SQL_PARTS_DIR, '04_data_inserts.sql'), 'utf-8');
  await client.query(dataSql);
  console.log('✓ All records inserted successfully.');

  // Step 5: Constraints (FK & Unique)
  console.log('\n--- Step 5: Applying Unique and Foreign Key Constraints ---');
  const constraintsSql = fs.readFileSync(path.join(SQL_PARTS_DIR, '05_constraints.sql'), 'utf-8');
  const constraintBlocks = constraintsSql
    .split('END $$;')
    .map(b => b.trim())
    .filter(b => b.length > 0 && b.includes('DO $$'));

  let constrSuccess = 0;
  for (const block of constraintBlocks) {
    try {
      await client.query(block + '\nEND $$;');
      constrSuccess++;
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log(`  Constraint note: ${e.message}`);
      } else {
        constrSuccess++;
      }
    }
  }
  console.log(`✓ Applied ${constrSuccess} / ${constraintBlocks.length} constraints successfully.`);

  // Step 6: Secondary Indexes (Executed statement by statement with graceful handling)
  console.log('\n--- Step 6: Creating Performance Indexes ---');
  const indexesSql = fs.readFileSync(path.join(SQL_PARTS_DIR, '06_indexes.sql'), 'utf-8');
  const indexStatements = indexesSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let idxSuccess = 0;
  for (const stmt of indexStatements) {
    try {
      await client.query(stmt + ';');
      idxSuccess++;
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log(`  Index note: ${e.message}`);
      } else {
        idxSuccess++;
      }
    }
  }
  console.log(`✓ Processed ${idxSuccess} / ${indexStatements.length} indexes successfully.`);

  // Step 7: Reset Sequences
  console.log('\n--- Step 7: Synchronizing Auto-Increment Sequences ---');
  const seqResetSql = fs.readFileSync(path.join(SQL_PARTS_DIR, '07_sequences_reset.sql'), 'utf-8');
  await client.query(seqResetSql);
  console.log('✓ Sequences reset to max ID values successfully.');

  // Step 8: RLS & Public Access for CMS Tables
  console.log('\n--- Step 8: Configuring RLS & Read Grants for Public CMS Tables ---');
  const cmsTables = [
    'products', 'solutions', 'blogs', 'gallery_images', 'core_services',
    'page_banners', 'hero_images', 'catalogs', 'testimonials', 'faqs'
  ];
  for (const tbl of cmsTables) {
    try {
      await client.query(`ALTER TABLE public."${tbl}" ENABLE ROW LEVEL SECURITY;`);
      await client.query(`DROP POLICY IF EXISTS "Allow public read access on ${tbl}" ON public."${tbl}";`);
      await client.query(`CREATE POLICY "Allow public read access on ${tbl}" ON public."${tbl}" FOR SELECT TO anon, authenticated USING (true);`);
      await client.query(`GRANT SELECT ON public."${tbl}" TO anon, authenticated;`);
      console.log(`  ✓ RLS public read configured for [${tbl}]`);
    } catch (e) {
      console.log(`  Note on [${tbl}]: ${e.message}`);
    }
  }

  // Step 9: Full Database Analyze
  console.log('\n--- Step 9: Running ANALYZE for Query Optimizer ---');
  await client.query('ANALYZE;');
  console.log('✓ ANALYZE completed.');

  // Step 10: Verification Audit
  console.log('\n======================================================');
  console.log('--- VERIFICATION AUDIT: COMPARING SOURCE VS TARGET ---');
  console.log('======================================================');

  const sourceData = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const sourceTables = sourceData.tables;

  const targetTablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log(`Target database public tables count: ${targetTablesRes.rows.length}`);

  let matchCount = 0;
  let mismatchCount = 0;
  let totalTargetRows = 0;

  for (const row of targetTablesRes.rows) {
    const tbl = row.table_name;
    const countRes = await client.query(`SELECT count(*) FROM public."${tbl}"`);
    const targetCount = parseInt(countRes.rows[0].count, 10);
    totalTargetRows += targetCount;

    const sourceRows = sourceTables[tbl] ? sourceTables[tbl].length : 0;
    if (targetCount === sourceRows) {
      matchCount++;
      if (targetCount > 0) {
        console.log(`  ✓ [${tbl}]: ${targetCount} rows (EXACT MATCH)`);
      }
    } else {
      mismatchCount++;
      console.error(`  ✕ MISMATCH in [${tbl}]: Source has ${sourceRows}, Target has ${targetCount}`);
    }
  }

  const indexesRes = await client.query(`SELECT count(*) FROM pg_indexes WHERE schemaname = 'public'`);
  const totalIndexes = parseInt(indexesRes.rows[0].count, 10);

  const durationSec = ((new Date() - startTime) / 1000).toFixed(1);
  console.log('\n======================================================');
  console.log(`MIGRATION FINISHED IN ${durationSec} SECONDS!`);
  console.log(`Total Tables in Target: ${targetTablesRes.rows.length}`);
  console.log(`Tables Verified Matching: ${matchCount} / ${targetTablesRes.rows.length}`);
  console.log(`Mismatches: ${mismatchCount}`);
  console.log(`Total Rows in Target DB: ${totalTargetRows}`);
  console.log(`Total Indexes in Target DB: ${totalIndexes}`);
  console.log('======================================================\n');

  await client.end();
}

runMigration().catch(err => {
  console.error('\nFatal migration error:', err);
  process.exit(1);
});
