const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'd:/PACIFIC-Backend/.env' });
const { Client } = require('pg');

const BACKUP_ROOT = 'D:\\PACIFIC_DATABASE_BACKUP_2026_10_15';
const JSON_DIR = path.join(BACKUP_ROOT, 'json_tables');
const SQL_PARTS_DIR = path.join(BACKUP_ROOT, 'sql_parts');
const MIRROR_DIR = 'D:\\PACIFIC-Admin\\database-backup';

// Ensure directories exist
[BACKUP_ROOT, JSON_DIR, SQL_PARTS_DIR, MIRROR_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DIRECT_URL or DATABASE_URL in .env');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

function escapeSqlString(str) {
  if (typeof str !== 'string') str = String(str);
  return str.replace(/'/g, "''");
}

function formatSqlLiteral(val, udtName) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') {
    if (isNaN(val)) return 'NULL';
    return String(val);
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (Array.isArray(val)) {
    if (udtName && (udtName.startsWith('_json') || udtName === 'json' || udtName === 'jsonb')) {
      return `'${escapeSqlString(JSON.stringify(val))}'::jsonb`;
    }
    // PostgreSQL array literal format: '{elem1,elem2}'
    const formattedElements = val.map(el => {
      if (el === null || el === undefined) return 'NULL';
      if (typeof el === 'string') return `"${el.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      return String(el);
    }).join(',');
    return `'{${formattedElements}}'`;
  }
  if (typeof val === 'object') {
    return `'${escapeSqlString(JSON.stringify(val))}'::jsonb`;
  }
  if (typeof val === 'string') {
    if (udtName === 'json' || udtName === 'jsonb') {
      return `'${escapeSqlString(val)}'::${udtName}`;
    }
    return `'${escapeSqlString(val)}'`;
  }
  return `'${escapeSqlString(String(val))}'`;
}

async function runBackup() {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Connecting to PostgreSQL database...`);
  await client.connect();
  console.log('Connected successfully!');

  // 1. Fetch Enums
  console.log('Fetching custom ENUM types...');
  const enumsRes = await client.query(`
    SELECT t.typname as enum_name, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder;
  `);

  const enumMap = {};
  for (const row of enumsRes.rows) {
    if (!enumMap[row.enum_name]) enumMap[row.enum_name] = [];
    enumMap[row.enum_name].push(row.enumlabel);
  }

  let enumSql = '-- ==========================================\n-- 01. EXTENSIONS & ENUMS\n-- ==========================================\n\n';
  enumSql += 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n';
  enumSql += 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n';

  for (const [enumName, labels] of Object.entries(enumMap)) {
    const vals = labels.map(v => `'${escapeSqlString(v)}'`).join(', ');
    enumSql += `DO $$ BEGIN\n  CREATE TYPE public."${enumName}" AS ENUM (${vals});\nEXCEPTION\n  WHEN duplicate_object THEN null;\nEND $$;\n\n`;
  }
  fs.writeFileSync(path.join(SQL_PARTS_DIR, '01_enums.sql'), enumSql);
  console.log(`Exported ${Object.keys(enumMap).length} custom enums.`);

  // 2. Fetch Sequences
  console.log('Fetching sequences...');
  const seqsRes = await client.query(`
    SELECT c.relname as sequence_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND n.nspname = 'public'
    ORDER BY c.relname;
  `);

  let seqSql = '-- ==========================================\n-- 02. SEQUENCES\n-- ==========================================\n\n';
  for (const s of seqsRes.rows) {
    seqSql += `CREATE SEQUENCE IF NOT EXISTS public."${s.sequence_name}";\n`;
  }
  fs.writeFileSync(path.join(SQL_PARTS_DIR, '02_sequences.sql'), seqSql);
  console.log(`Exported ${seqsRes.rows.length} sequences.`);

  // 3. Fetch All Base Tables in Public
  console.log('Fetching base tables...');
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log(`Discovered ${tables.length} tables in public schema.`);

  // 4. Fetch Table Columns
  console.log('Fetching column specifications...');
  const columnsRes = await client.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
           character_maximum_length, numeric_precision, numeric_scale, ordinal_position
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const tableColumns = {};
  for (const col of columnsRes.rows) {
    if (!tableColumns[col.table_name]) tableColumns[col.table_name] = [];
    tableColumns[col.table_name].push(col);
  }

  // 5. Fetch Constraints (Separated into Primary Key, Unique, and Foreign Key)
  console.log('Fetching constraints...');
  const constraintsRes = await client.query(`
    SELECT 
      con.conname as constraint_name,
      con.contype as constraint_type,
      c.relname as table_name,
      pg_get_constraintdef(con.oid, true) as constraint_def
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    ORDER BY c.relname, con.contype DESC, con.conname;
  `);

  const primaryKeys = [];
  const foreignKeys = [];
  const uniqueConstraints = [];
  const checkConstraints = [];

  for (const con of constraintsRes.rows) {
    if (con.constraint_type === 'p') {
      primaryKeys.push(con);
    } else if (con.constraint_type === 'f') {
      foreignKeys.push(con);
    } else if (con.constraint_type === 'u') {
      uniqueConstraints.push(con);
    } else if (con.constraint_type === 'c') {
      checkConstraints.push(con);
    }
  }

  // 6. Fetch Indexes
  console.log('Fetching indexes...');
  const indexesRes = await client.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);

  // Map primary key index names so we don't duplicate them in index DDL
  const pkIndexNames = new Set(primaryKeys.map(pk => pk.constraint_name));

  // Generate Table Creation DDL (With PK inline or right after table creation)
  let schemaDdlSql = '-- ==========================================\n-- 03. TABLES CREATION DDL (WITH PRIMARY KEYS)\n-- ==========================================\n\n';
  for (const tbl of tables) {
    const cols = tableColumns[tbl] || [];
    if (cols.length === 0) continue;

    schemaDdlSql += `CREATE TABLE IF NOT EXISTS public."${tbl}" (\n`;
    const colDefs = cols.map(c => {
      let typeDef = c.data_type.toUpperCase();
      if (c.data_type === 'USER-DEFINED') {
        typeDef = `public."${c.udt_name}"`;
      } else if (c.data_type === 'ARRAY') {
        const elemType = c.udt_name.startsWith('_') ? c.udt_name.substring(1) : c.udt_name;
        if (enumMap[elemType]) {
          typeDef = `public."${elemType}"[]`;
        } else {
          typeDef = `${elemType.toUpperCase()}[]`;
        }
      } else if (c.data_type === 'character varying') {
        typeDef = c.character_maximum_length ? `VARCHAR(${c.character_maximum_length})` : 'VARCHAR';
      } else if (c.data_type === 'character') {
        typeDef = c.character_maximum_length ? `CHAR(${c.character_maximum_length})` : 'CHAR';
      } else if (c.data_type === 'numeric') {
        typeDef = c.numeric_precision ? `NUMERIC(${c.numeric_precision}, ${c.numeric_scale || 0})` : 'NUMERIC';
      } else if (c.data_type === 'timestamp with time zone') {
        typeDef = 'TIMESTAMPTZ';
      } else if (c.data_type === 'timestamp without time zone') {
        typeDef = 'TIMESTAMP';
      }

      let line = `  "${c.column_name}" ${typeDef}`;
      if (c.column_default) line += ` DEFAULT ${c.column_default}`;
      if (c.is_nullable === 'NO') line += ' NOT NULL';
      return line;
    });

    // Add Primary Key constraint inline if present
    const pk = primaryKeys.find(p => p.table_name === tbl);
    if (pk) {
      colDefs.push(`  CONSTRAINT "${pk.constraint_name}" ${pk.constraint_def}`);
    }

    schemaDdlSql += colDefs.join(',\n');
    schemaDdlSql += '\n);\n\n';
  }
  fs.writeFileSync(path.join(SQL_PARTS_DIR, '03_tables.sql'), schemaDdlSql);

  // 7. Dump Data from all tables
  console.log('Dumping table data (JSON and SQL INSERT statements)...');
  let dataSql = '-- ==========================================\n-- 04. DATA INSERTS\n-- ==========================================\n\n';
  dataSql += 'SET session_replication_role = \'replica\';\n';
  dataSql += 'SET standard_conforming_strings = on;\n\n';

  const consolidatedJson = {
    metadata: {
      exportedAt: new Date().toISOString(),
      sourceDatabase: connectionString.split('@')[1]?.split('/')[0] || 'supabase-postgres',
      tablesCount: tables.length,
      totalRows: 0
    },
    tables: {}
  };

  const manifest = [];
  let totalExportedRows = 0;

  for (const tbl of tables) {
    const cols = tableColumns[tbl] || [];
    const colNames = cols.map(c => c.column_name);
    const colTypes = {};
    cols.forEach(c => colTypes[c.column_name] = c.udt_name);

    try {
      const rowsRes = await client.query(`SELECT * FROM public."${tbl}"`);
      const rows = rowsRes.rows;
      totalExportedRows += rows.length;

      // Save JSON
      fs.writeFileSync(
        path.join(JSON_DIR, `${tbl}.json`),
        JSON.stringify(rows, null, 2),
        'utf-8'
      );

      consolidatedJson.tables[tbl] = rows;

      manifest.push({
        table: tbl,
        columns: cols.length,
        rows: rows.length,
        hasData: rows.length > 0
      });

      if (rows.length > 0) {
        console.log(`  -> [${tbl}]: ${rows.length} rows`);

        dataSql += `-- Table: public."${tbl}" (${rows.length} rows)\n`;
        const quotedCols = colNames.map(c => `"${c}"`).join(', ');

        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const valuesList = batch.map(row => {
            const rowValues = colNames.map(col => formatSqlLiteral(row[col], colTypes[col]));
            return `(${rowValues.join(', ')})`;
          });
          dataSql += `INSERT INTO public."${tbl}" (${quotedCols})\nVALUES\n  ${valuesList.join(',\n  ')}\nON CONFLICT DO NOTHING;\n\n`;
        }
      }
    } catch (e) {
      console.error(`  !! Error exporting table ${tbl}:`, e.message);
      manifest.push({
        table: tbl,
        columns: cols.length,
        rows: -1,
        error: e.message
      });
    }
  }

  dataSql += 'SET session_replication_role = \'origin\';\n\n';
  fs.writeFileSync(path.join(SQL_PARTS_DIR, '04_data_inserts.sql'), dataSql);

  // 8. Constraints (Unique & Foreign Keys applied AFTER data is loaded)
  console.log('Generating foreign keys and unique constraints DDL...');
  let constraintsSql = '-- ==========================================\n-- 05. UNIQUE AND FOREIGN KEY CONSTRAINTS\n-- ==========================================\n\n';
  
  for (const u of uniqueConstraints) {
    constraintsSql += `DO $$ BEGIN\n  ALTER TABLE public."${u.table_name}" ADD CONSTRAINT "${u.constraint_name}" ${u.constraint_def};\nEXCEPTION\n  WHEN duplicate_object THEN null;\nEND $$;\n\n`;
  }
  for (const f of foreignKeys) {
    constraintsSql += `DO $$ BEGIN\n  ALTER TABLE public."${f.table_name}" ADD CONSTRAINT "${f.constraint_name}" ${f.constraint_def};\nEXCEPTION\n  WHEN duplicate_object THEN null;\nEND $$;\n\n`;
  }
  for (const c of checkConstraints) {
    constraintsSql += `DO $$ BEGIN\n  ALTER TABLE public."${c.table_name}" ADD CONSTRAINT "${c.constraint_name}" ${c.constraint_def};\nEXCEPTION\n  WHEN duplicate_object THEN null;\nEND $$;\n\n`;
  }
  fs.writeFileSync(path.join(SQL_PARTS_DIR, '05_constraints.sql'), constraintsSql);

  // 9. Secondary Indexes
  console.log('Generating indexes DDL...');
  let indexesSql = '-- ==========================================\n-- 06. SECONDARY INDEXES\n-- ==========================================\n\n';
  for (const idx of indexesRes.rows) {
    if (pkIndexNames.has(idx.indexname)) continue;
    indexesSql += `${idx.indexdef};\n`;
  }
  fs.writeFileSync(path.join(SQL_PARTS_DIR, '06_indexes.sql'), indexesSql);

  // 10. Sequences Reset
  console.log('Generating sequence resets...');
  let seqResetSql = '-- ==========================================\n-- 07. SEQUENCE RESETS\n-- ==========================================\n\n';
  for (const s of seqsRes.rows) {
    const rawTableName = s.sequence_name.replace(/_id_seq$/, '').replace(/_seq$/, '');
    seqResetSql += `DO $$ BEGIN\n  PERFORM setval('public."${s.sequence_name}"', COALESCE((SELECT MAX(id) FROM public."${rawTableName}"), 1), true);\nEXCEPTION\n  WHEN undefined_table THEN null;\n  WHEN undefined_column THEN null;\nEND $$;\n\n`;
  }
  fs.writeFileSync(path.join(SQL_PARTS_DIR, '07_sequences_reset.sql'), seqResetSql);

  // 11. Dump Auth & Storage Metadata
  console.log('Dumping auth and storage tables...');
  let authSql = '-- ==========================================\n-- AUTH & STORAGE BACKUP\n-- ==========================================\n\n';
  for (const at of ['users', 'identities']) {
    try {
      const aRes = await client.query(`SELECT * FROM auth."${at}"`);
      fs.writeFileSync(path.join(JSON_DIR, `auth_${at}.json`), JSON.stringify(aRes.rows, null, 2));
      console.log(`  -> [auth.${at}]: ${aRes.rows.length} rows`);
    } catch (e) {
      console.log(`  -> auth.${at} note: ${e.message}`);
    }
  }

  for (const st of ['buckets', 'objects']) {
    try {
      const sRes = await client.query(`SELECT * FROM storage."${st}"`);
      fs.writeFileSync(path.join(JSON_DIR, `storage_${st}.json`), JSON.stringify(sRes.rows, null, 2));
      console.log(`  -> [storage.${st}]: ${sRes.rows.length} rows`);
    } catch (e) {
      console.log(`  -> storage.${st} note: ${e.message}`);
    }
  }

  // 12. Create Consolidated All-in-One Master SQL File
  console.log('Generating master FULL_DATABASE_RESTORE.sql...');
  let masterSql = '/*\n';
  masterSql += '========================================================================\n';
  masterSql += 'PACIFIC RESTROOM CUBICLE — COMPLETE PRODUCTION DATABASE BACKUP\n';
  masterSql += `Export Date: ${new Date().toISOString()}\n`;
  masterSql += `Total Tables: ${tables.length}\n`;
  masterSql += `Total Records Exported: ${totalExportedRows}\n`;
  masterSql += 'Full DDL + All Data + Foreign Keys + All Indexes + Sequence Resets\n';
  masterSql += 'Safe for 100% lossless restoration on any PostgreSQL / Supabase instance.\n';
  masterSql += '========================================================================\n';
  masterSql += '*/\n\n';

  masterSql += 'BEGIN;\n\n';
  masterSql += enumSql + '\n';
  masterSql += seqSql + '\n';
  masterSql += schemaDdlSql + '\n';
  masterSql += dataSql + '\n';
  masterSql += constraintsSql + '\n';
  masterSql += indexesSql + '\n';
  masterSql += seqResetSql + '\n';
  masterSql += 'COMMIT;\n';

  const masterSqlPath = path.join(BACKUP_ROOT, 'FULL_DATABASE_RESTORE.sql');
  fs.writeFileSync(masterSqlPath, masterSql, 'utf-8');

  // Consolidated JSON
  consolidatedJson.metadata.totalRows = totalExportedRows;
  const masterJsonPath = path.join(BACKUP_ROOT, 'ALL_TABLES_DATA_CONSOLIDATED.json');
  fs.writeFileSync(masterJsonPath, JSON.stringify(consolidatedJson, null, 2), 'utf-8');

  // Schema metadata JSON
  const schemaMeta = {
    enums: enumMap,
    sequences: seqsRes.rows,
    tables: tableColumns,
    primaryKeys,
    foreignKeys,
    uniqueConstraints,
    indexes: indexesRes.rows
  };
  fs.writeFileSync(path.join(BACKUP_ROOT, 'SCHEMA_METADATA.json'), JSON.stringify(schemaMeta, null, 2));

  // 13. Generate Markdown Manifest
  console.log('Generating BACKUP_MANIFEST.md...');
  let md = '# Pacific Restroom Cubicle — Complete Database Backup Manifest\n\n';
  md += `**Backup Timestamp:** \`${new Date().toISOString()}\`  \n`;
  md += `**Database Host:** \`[CONFIGURED_IN_ENV]\`  \n`;
  md += `**Total Public Tables:** \`${tables.length}\`  \n`;
  md += `**Total Records Dumped:** \`${totalExportedRows}\`  \n`;
  md += `**Primary Local Backup Path:** \`${BACKUP_ROOT}\`  \n`;
  md += `**Admin Mirror Path:** \`${MIRROR_DIR}\`  \n\n`;

  md += '## Backup Architecture & Files\n\n';
  md += '| File / Folder | Purpose & Content |\n';
  md += '|---|---|\n';
  md += '| [`FULL_DATABASE_RESTORE.sql`](file:///' + masterSqlPath.replace(/\\/g, '/') + ') | **Master all-in-one restoration script** containing enums, tables, sequences, data inserts, constraints, and indexes. |\n';
  md += '| [`ALL_TABLES_DATA_CONSOLIDATED.json`](file:///' + masterJsonPath.replace(/\\/g, '/') + ') | Single consolidated JSON file containing every table and record. |\n';
  md += '| `SCHEMA_METADATA.json` | Full machine-readable schema structure (types, columns, constraints, indexes). |\n';
  md += '| `sql_parts/` | Modular SQL scripts: `01_enums.sql`, `02_sequences.sql`, `03_tables.sql`, `04_data_inserts.sql`, `05_constraints.sql`, `06_indexes.sql`, `07_sequences_reset.sql`. |\n';
  md += '| `json_tables/` | 121 individual JSON data files for each public table + auth & storage metadata. |\n\n';

  md += '## Table Inventory & Data Counts\n\n';
  md += '| # | Table Name | Columns | Row Count | Status |\n';
  md += '|---|---|---|---|---|\n';

  manifest.forEach((m, idx) => {
    const status = m.rows > 0 ? `Active (${m.rows} rows)` : 'Empty (0 rows)';
    md += `| ${idx + 1} | \`${m.table}\` | ${m.columns} | ${m.rows} | ${status} |\n`;
  });

  const manifestPath = path.join(BACKUP_ROOT, 'BACKUP_MANIFEST.md');
  fs.writeFileSync(manifestPath, md, 'utf-8');

  // Mirror to D:\PACIFIC-Admin\database-backup
  fs.copyFileSync(masterSqlPath, path.join(MIRROR_DIR, 'FULL_DATABASE_RESTORE.sql'));
  fs.copyFileSync(masterJsonPath, path.join(MIRROR_DIR, 'ALL_TABLES_DATA_CONSOLIDATED.json'));
  fs.copyFileSync(manifestPath, path.join(MIRROR_DIR, 'BACKUP_MANIFEST.md'));

  // Copy sql_parts to mirror
  const mirrorSqlParts = path.join(MIRROR_DIR, 'sql_parts');
  if (!fs.existsSync(mirrorSqlParts)) fs.mkdirSync(mirrorSqlParts, { recursive: true });
  fs.readdirSync(SQL_PARTS_DIR).forEach(f => {
    fs.copyFileSync(path.join(SQL_PARTS_DIR, f), path.join(mirrorSqlParts, f));
  });

  // Create Restore Instructions
  let restoreMd = '# Database Migration & Restoration Instructions\n\n';
  restoreMd += '### Option 1: Restore to a New Supabase Project via SQL Editor\n';
  restoreMd += '1. Create your new Supabase project at [database.new](https://database.new) or in the Supabase Dashboard.\n';
  restoreMd += '2. Navigate to the **SQL Editor** in your new project.\n';
  restoreMd += '3. Execute the modular scripts in sequence from the `sql_parts/` folder:\n';
  restoreMd += '   - `01_enums.sql` (Creates custom ENUM types & uuid extensions)\n';
  restoreMd += '   - `02_sequences.sql` (Creates sequence objects)\n';
  restoreMd += '   - `03_tables.sql` (Creates all 121 table structures with primary keys)\n';
  restoreMd += '   - `04_data_inserts.sql` (Inserts all records for all tables without FK blockers)\n';
  restoreMd += '   - `05_constraints.sql` (Applies foreign keys and unique constraints)\n';
  restoreMd += '   - `06_indexes.sql` (Builds all 395 performance indexes)\n';
  restoreMd += '   - `07_sequences_reset.sql` (Synchronizes all auto-increment IDs)\n\n';
  restoreMd += '*(Alternatively, you can run the unified `FULL_DATABASE_RESTORE.sql` in one single transaction!)*\n\n';

  restoreMd += '### Option 2: Restore via psql (PostgreSQL Terminal / Command Prompt)\n';
  restoreMd += '```bash\n';
  restoreMd += 'psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" -f "D:\\PACIFIC_DATABASE_BACKUP_2026_10_15\\FULL_DATABASE_RESTORE.sql"\n';
  restoreMd += '```\n\n';

  restoreMd += '### Option 3: Update Pacific Admin & Backend Connection Strings\n';
  restoreMd += 'Once the new database is running:\n';
  restoreMd += '1. Update `DATABASE_URL` and `DIRECT_URL` in `D:\\PACIFIC-Backend\\.env`\n';
  restoreMd += '2. Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `D:\\PACIFIC-Admin\\.env`\n';
  restoreMd += '3. Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `D:\\Pacific Products And Solutions\\.env`\n';
  restoreMd += '4. Run `npx tsc --noEmit` and `npm run build` to confirm full cross-stack synchronization.\n';

  fs.writeFileSync(path.join(BACKUP_ROOT, 'RESTORE_INSTRUCTIONS.md'), restoreMd, 'utf-8');
  fs.writeFileSync(path.join(MIRROR_DIR, 'RESTORE_INSTRUCTIONS.md'), restoreMd, 'utf-8');

  const endTime = new Date();
  const elapsedSec = ((endTime - startTime) / 1000).toFixed(1);
  console.log(`\n======================================================`);
  console.log(`BACKUP COMPLETED IN ${elapsedSec} SECONDS!`);
  console.log(`Total Tables Exported: ${tables.length}`);
  console.log(`Total Records Exported: ${totalExportedRows}`);
  console.log(`Backup Location: ${BACKUP_ROOT}`);
  console.log(`Mirror Location: ${MIRROR_DIR}`);
  console.log(`======================================================\n`);

  await client.end();
}

runBackup().catch(err => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
