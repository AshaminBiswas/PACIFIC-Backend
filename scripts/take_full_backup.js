/**
 * Pacific Enterprise ERP — Production Database Backup Engine
 * Extracts all schema definitions, enums, sequences, tables, and rows from Supabase PostgreSQL.
 * Generates:
 *  - ALL_TABLES_DATA_CONSOLIDATED.json
 *  - SCHEMA_METADATA.json
 *  - manifest.json
 *  - BACKUP_MANIFEST.md
 *  - RESTORE_INSTRUCTIONS.md
 *  - FULL_DATABASE_RESTORE.sql
 *  - Modular json_tables/
 *  - Modular sql_parts/
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

const BACKUP_DIR_NAME = 'PACIFIC_DATABASE_BACKUP_2026_11_01';
const PRIMARY_OUT_DIR = path.join('D:', BACKUP_DIR_NAME);
const ADMIN_MIRROR_DIR = path.join('D:', 'PACIFIC-Admin', 'database-backup');
const BACKUPS_DIR = path.join('D:', 'backups', 'PACIFIC_Backend_Backup_2026_11_01');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeJsonReplacer(key, value) {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && 's' in value && 'e' in value && 'd' in value) {
    try {
      const d = new Prisma.Decimal(0);
      d.s = value.s;
      d.e = value.e;
      d.d = value.d;
      return d.toString();
    } catch {
      return String(value);
    }
  }
  return value;
}

function escapeSqlValue(val, colMeta) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') {
    if (isNaN(val)) return 'NULL';
    return String(val);
  }
  if (typeof val === 'bigint') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  
  if (typeof val === 'object') {
    // Decimal
    if ('s' in val && 'e' in val && 'd' in val) {
      try {
        const d = new Prisma.Decimal(0);
        d.s = val.s; d.e = val.e; d.d = val.d;
        return String(d.toString());
      } catch {
        return '0';
      }
    }
    // Array
    if (Array.isArray(val)) {
      if (val.length === 0) return "'{}'";
      const escapedItems = val.map(it => {
        if (typeof it === 'string') return `"${it.replace(/"/g, '\\"')}"`;
        return String(it);
      }).join(',');
      return `'{${escapedItems}}'`;
    }
    // JSON
    const jsonStr = JSON.stringify(val, safeJsonReplacer).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }

  // String
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function runBackup() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('🚀 Starting Pacific Enterprise Database Full Backup');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`📁 Primary Target: ${PRIMARY_OUT_DIR}`);
  console.log('================================================================');

  ensureDir(PRIMARY_OUT_DIR);
  const jsonTablesDir = path.join(PRIMARY_OUT_DIR, 'json_tables');
  const sqlPartsDir = path.join(PRIMARY_OUT_DIR, 'sql_parts');
  ensureDir(jsonTablesDir);
  ensureDir(sqlPartsDir);

  // 1. Fetch Schema Metadata
  console.log('🔍 Fetching database metadata...');
  
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const tableNames = tables.map(t => t.table_name);
  console.log(`✅ Discovered ${tableNames.length} tables in public schema.`);

  const columns = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  const enums = await prisma.$queryRawUnsafe(`
    SELECT t.typname as enum_name, e.enumlabel as enum_value
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `);

  const pks = await prisma.$queryRawUnsafe(`
    SELECT tc.table_name, kcu.column_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.ordinal_position
  `);

  const fks = await prisma.$queryRawUnsafe(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `);

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexname, indexdef, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);

  const sequences = await prisma.$queryRawUnsafe(`
    SELECT sequence_name, data_type, start_value, minimum_value, maximum_value, increment
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name
  `);

  // Build enum map
  const enumMap = {};
  for (const row of enums) {
    if (!enumMap[row.enum_name]) enumMap[row.enum_name] = [];
    enumMap[row.enum_name].push(row.enum_value);
  }

  // Build column map per table
  const tableColMap = {};
  for (const col of columns) {
    if (!tableColMap[col.table_name]) tableColMap[col.table_name] = [];
    tableColMap[col.table_name].push(col);
  }

  // Build PK map
  const tablePkMap = {};
  for (const pk of pks) {
    if (!tablePkMap[pk.table_name]) tablePkMap[pk.table_name] = [];
    tablePkMap[pk.table_name].push(pk.column_name);
  }

  // Write SCHEMA_METADATA.json
  const schemaMetadata = {
    generatedAt: new Date().toISOString(),
    tableCount: tableNames.length,
    tables: tableNames,
    columns,
    enums: enumMap,
    primaryKeys: pks,
    foreignKeys: fks,
    indexes,
    sequences,
  };
  fs.writeFileSync(path.join(PRIMARY_OUT_DIR, 'SCHEMA_METADATA.json'), JSON.stringify(schemaMetadata, safeJsonReplacer, 2), 'utf8');

  // 2. Dump Table Data
  console.log('\n📦 Extracting table records...');
  const consolidatedData = {};
  const manifestTables = [];
  let totalRecordCount = 0;
  const sqlInsertParts = [];

  for (let i = 0; i < tableNames.length; i++) {
    const tableName = tableNames[i];
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);
      const rowCount = rows.length;
      totalRecordCount += rowCount;
      consolidatedData[tableName] = rows;

      // Write individual JSON
      const jsonFilePath = path.join(jsonTablesDir, `${tableName}.json`);
      fs.writeFileSync(jsonFilePath, JSON.stringify(rows, safeJsonReplacer, 2), 'utf8');

      // Generate SQL INSERT statements for this table
      const cols = tableColMap[tableName] || [];
      const colNames = cols.map(c => c.column_name);
      const tableSqlInserts = [];

      if (rows.length > 0 && colNames.length > 0) {
        tableSqlInserts.push(`-- Table: ${tableName} (${rowCount} rows)`);
        
        // Batch in groups of 100 rows
        const batchSize = 100;
        for (let b = 0; b < rows.length; b += batchSize) {
          const chunk = rows.slice(b, b + batchSize);
          const valueClauses = chunk.map(row => {
            const vals = colNames.map(cName => {
              const cMeta = cols.find(c => c.column_name === cName);
              return escapeSqlValue(row[cName], cMeta);
            });
            return `(${vals.join(', ')})`;
          });

          const sqlStmt = `INSERT INTO "${tableName}" ("${colNames.join('", "')}") VALUES\n  ${valueClauses.join(',\n  ')}\nON CONFLICT DO NOTHING;`;
          tableSqlInserts.push(sqlStmt);
        }
      }

      if (tableSqlInserts.length > 0) {
        sqlInsertParts.push(tableSqlInserts.join('\n\n'));
      }

      manifestTables.push({
        index: i + 1,
        name: tableName,
        columns: cols.length,
        rows: rowCount,
        status: rowCount > 0 ? `Active (${rowCount} rows)` : 'Empty (0 rows)',
      });

      if ((i + 1) % 25 === 0 || i === tableNames.length - 1) {
        console.log(`  [${i + 1}/${tableNames.length}] Processed ${tableName} (${rowCount} rows)...`);
      }
    } catch (tblErr) {
      console.warn(`  ⚠️ Warning: Failed to query table "${tableName}":`, tblErr.message);
      manifestTables.push({
        index: i + 1,
        name: tableName,
        columns: (tableColMap[tableName] || []).length,
        rows: 0,
        status: `Query error: ${tblErr.message}`,
      });
    }
  }

  console.log(`\n🎉 Extracted a total of ${totalRecordCount} records across ${tableNames.length} tables.`);

  // Write ALL_TABLES_DATA_CONSOLIDATED.json
  console.log('💾 Writing ALL_TABLES_DATA_CONSOLIDATED.json...');
  fs.writeFileSync(
    path.join(PRIMARY_OUT_DIR, 'ALL_TABLES_DATA_CONSOLIDATED.json'),
    JSON.stringify(consolidatedData, safeJsonReplacer, 2),
    'utf8'
  );

  // Write manifest.json (compatible with restore_runner.js)
  const manifestJson = {
    timestamp: new Date().toISOString(),
    databaseHost: 'aws-0-ap-south-1.pooler.supabase.com',
    projectRef: 'bcbswbzbtskvmdqmgrjm',
    totalTables: tableNames.length,
    totalRecords: totalRecordCount,
    tables: manifestTables,
  };
  fs.writeFileSync(path.join(PRIMARY_OUT_DIR, 'manifest.json'), JSON.stringify(manifestJson, null, 2), 'utf8');

  // 3. Generate Modular SQL Parts
  console.log('📝 Generating modular SQL restore parts...');

  // 01_enums.sql
  const enumSql = ['-- 01_enums.sql: Custom PostgreSQL ENUM Types\n'];
  enumSql.push('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\nCREATE EXTENSION IF NOT EXISTS "pgcrypto";\n');
  for (const [eName, eVals] of Object.entries(enumMap)) {
    const formattedVals = eVals.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
    enumSql.push(`DO $$ BEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${eName}') THEN\n    CREATE TYPE "${eName}" AS ENUM (${formattedVals});\n  END IF;\nEND $$;\n`);
  }
  fs.writeFileSync(path.join(sqlPartsDir, '01_enums.sql'), enumSql.join('\n'), 'utf8');

  // 02_sequences.sql
  const seqSql = ['-- 02_sequences.sql: Database Sequences\n'];
  for (const seq of sequences) {
    seqSql.push(`CREATE SEQUENCE IF NOT EXISTS "${seq.sequence_name}" INCREMENT BY ${seq.increment || 1} MINVALUE ${seq.minimum_value || 1} START WITH ${seq.start_value || 1};\n`);
  }
  fs.writeFileSync(path.join(sqlPartsDir, '02_sequences.sql'), seqSql.join('\n'), 'utf8');

  // 03_tables.sql
  const tablesSql = ['-- 03_tables.sql: Tables DDL\n'];
  for (const tableName of tableNames) {
    const cols = tableColMap[tableName] || [];
    const colDefs = cols.map(c => {
      let typeDef = c.udt_name;
      if (c.data_type === 'USER-DEFINED') {
        typeDef = `"${c.udt_name}"`;
      } else if (c.data_type === 'ARRAY') {
        const innerType = c.udt_name.replace(/^_/, '');
        typeDef = `${innerType}[]`;
      } else if (c.data_type === 'character varying') {
        typeDef = 'VARCHAR';
      } else if (c.data_type === 'numeric') {
        typeDef = 'NUMERIC';
      } else if (c.data_type === 'timestamp with time zone') {
        typeDef = 'TIMESTAMPTZ';
      } else if (c.data_type === 'timestamp without time zone') {
        typeDef = 'TIMESTAMP';
      }

      let def = `  "${c.column_name}" ${typeDef}`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      if (c.column_default) def += ` DEFAULT ${c.column_default}`;
      return def;
    });

    const pkCols = tablePkMap[tableName];
    if (pkCols && pkCols.length > 0) {
      colDefs.push(`  PRIMARY KEY ("${pkCols.join('", "')}")`);
    }

    tablesSql.push(`CREATE TABLE IF NOT EXISTS "${tableName}" (\n${colDefs.join(',\n')}\n);\n`);
  }
  fs.writeFileSync(path.join(sqlPartsDir, '03_tables.sql'), tablesSql.join('\n'), 'utf8');

  // 04_data_inserts.sql
  const dataInsertHeader = `-- 04_data_inserts.sql: All Table Inserts\nSET session_replication_role = 'replica';\n\n`;
  const dataInsertFooter = `\n\nSET session_replication_role = 'origin';\n`;
  fs.writeFileSync(path.join(sqlPartsDir, '04_data_inserts.sql'), dataInsertHeader + sqlInsertParts.join('\n\n') + dataInsertFooter, 'utf8');

  // 05_constraints.sql
  const constraintsSql = ['-- 05_constraints.sql: Foreign Key Constraints\n'];
  for (const fk of fks) {
    const upRule = fk.update_rule ? ` ON UPDATE ${fk.update_rule}` : '';
    const delRule = fk.delete_rule ? ` ON DELETE ${fk.delete_rule}` : '';
    constraintsSql.push(
      `DO $$ BEGIN\n  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '${fk.constraint_name}' AND table_name = '${fk.table_name}') THEN\n    ALTER TABLE "${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES "${fk.foreign_table_name}" ("${fk.foreign_column_name}")${delRule}${upRule};\n  END IF;\nEND $$;\n`
    );
  }
  fs.writeFileSync(path.join(sqlPartsDir, '05_constraints.sql'), constraintsSql.join('\n'), 'utf8');

  // 06_indexes.sql
  const indexesSql = ['-- 06_indexes.sql: Database Indexes\n'];
  for (const idx of indexes) {
    if (idx.indexname.endsWith('_pkey')) continue; // Skip primary key indexes
    indexesSql.push(`${idx.indexdef};\n`);
  }
  fs.writeFileSync(path.join(sqlPartsDir, '06_indexes.sql'), indexesSql.join('\n'), 'utf8');

  // 07_sequences_reset.sql
  const resetSql = ['-- 07_sequences_reset.sql: Sequence Synchronization\n'];
  for (const tableName of tableNames) {
    const cols = tableColMap[tableName] || [];
    const seqCol = cols.find(c => c.column_default && c.column_default.includes('nextval('));
    if (seqCol) {
      resetSql.push(`SELECT setval(pg_get_serial_sequence('"${tableName}"', '${seqCol.column_name}'), COALESCE(MAX("${seqCol.column_name}"), 1)) FROM "${tableName}";\n`);
    }
  }
  fs.writeFileSync(path.join(sqlPartsDir, '07_sequences_reset.sql'), resetSql.join('\n'), 'utf8');

  // Master FULL_DATABASE_RESTORE.sql
  console.log('💾 Writing FULL_DATABASE_RESTORE.sql...');
  const fullSql = [
    `-- ==============================================================================`,
    `-- PACIFIC RESTROOM CUBICLE — COMPLETE PRODUCTION DATABASE RESTORATION SCRIPT`,
    `-- Backup Timestamp: ${new Date().toISOString()}`,
    `-- Total Tables: ${tableNames.length} | Total Records: ${totalRecordCount}`,
    `-- ==============================================================================\n`,
    `BEGIN;`,
    enumSql.join('\n'),
    seqSql.join('\n'),
    tablesSql.join('\n'),
    dataInsertHeader + sqlInsertParts.join('\n\n') + dataInsertFooter,
    constraintsSql.join('\n'),
    indexesSql.join('\n'),
    resetSql.join('\n'),
    `COMMIT;\n`,
  ].join('\n\n');
  fs.writeFileSync(path.join(PRIMARY_OUT_DIR, 'FULL_DATABASE_RESTORE.sql'), fullSql, 'utf8');

  // 4. Generate BACKUP_MANIFEST.md
  console.log('📄 Generating BACKUP_MANIFEST.md...');
  const manifestMd = [
    `# Pacific Restroom Cubicle — Complete Database Backup Manifest`,
    ``,
    `**Backup Timestamp:** \`${new Date().toISOString()}\`  `,
    `**Database Host:** \`aws-0-ap-south-1.pooler.supabase.com\`  `,
    `**Supabase Project Ref:** \`bcbswbzbtskvmdqmgrjm\`  `,
    `**Total Public Tables:** \`${tableNames.length}\`  `,
    `**Total Records Dumped:** \`${totalRecordCount}\`  `,
    `**Primary Local Backup Path:** \`${PRIMARY_OUT_DIR}\`  `,
    `**Admin Mirror Path:** \`${ADMIN_MIRROR_DIR}\`  `,
    ``,
    `## Backup Architecture & Files`,
    ``,
    `| File / Folder | Purpose & Content |`,
    `|---|---|`,
    `| [\`FULL_DATABASE_RESTORE.sql\`](${PRIMARY_OUT_DIR}/FULL_DATABASE_RESTORE.sql) | **Master all-in-one restoration script** containing enums, tables, sequences, data inserts, constraints, and indexes. |`,
    `| [\`ALL_TABLES_DATA_CONSOLIDATED.json\`](${PRIMARY_OUT_DIR}/ALL_TABLES_DATA_CONSOLIDATED.json) | Single consolidated JSON file containing every table and record. |`,
    `| \`manifest.json\` | Machine-readable manifest compatible with \`restore_runner.js\`. |`,
    `| \`SCHEMA_METADATA.json\` | Full machine-readable schema structure (types, columns, constraints, indexes). |`,
    `| \`sql_parts/\` | Modular SQL scripts: \`01_enums.sql\`, \`02_sequences.sql\`, \`03_tables.sql\`, \`04_data_inserts.sql\`, \`05_constraints.sql\`, \`06_indexes.sql\`, \`07_sequences_reset.sql\`. |`,
    `| \`json_tables/\` | ${tableNames.length} individual JSON data files for each public table. |`,
    ``,
    `## Table Inventory & Data Counts`,
    ``,
    `| # | Table Name | Columns | Row Count | Status |`,
    `|---|---|---|---|---|`,
    ...manifestTables.map(t => `| ${t.index} | \`${t.name}\` | ${t.columns} | ${t.rows} | ${t.status} |`),
    ``,
  ].join('\n');
  fs.writeFileSync(path.join(PRIMARY_OUT_DIR, 'BACKUP_MANIFEST.md'), manifestMd, 'utf8');

  // 5. Generate RESTORE_INSTRUCTIONS.md
  console.log('📖 Generating RESTORE_INSTRUCTIONS.md...');
  const restoreMd = [
    `# Database Migration & Restoration Instructions`,
    ``,
    `### Option 1: Restore to a New Supabase Project via SQL Editor`,
    `1. Create your new Supabase project at [database.new](https://database.new) or in the Supabase Dashboard.`,
    `2. Navigate to the **SQL Editor** in your new project.`,
    `3. Execute the modular scripts in sequence from the \`sql_parts/\` folder:`,
    `   - \`01_enums.sql\` (Creates custom ENUM types & uuid extensions)`,
    `   - \`02_sequences.sql\` (Creates sequence objects)`,
    `   - \`03_tables.sql\` (Creates all ${tableNames.length} table structures with primary keys)`,
    `   - \`04_data_inserts.sql\` (Inserts all ${totalRecordCount} records for all tables without FK blockers)`,
    `   - \`05_constraints.sql\` (Applies foreign keys and unique constraints)`,
    `   - \`06_indexes.sql\` (Builds all performance indexes)`,
    `   - \`07_sequences_reset.sql\` (Synchronizes all auto-increment IDs)`,
    ``,
    `*(Alternatively, you can run the unified \`FULL_DATABASE_RESTORE.sql\` in one single transaction!)*`,
    ``,
    `### Option 2: Restore via psql (PostgreSQL Terminal / Command Prompt)`,
    `\`\`\`bash`,
    `psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" -f "${path.join(PRIMARY_OUT_DIR, 'FULL_DATABASE_RESTORE.sql')}"`,
    `\`\`\``,
    ``,
    `### Option 3: Update Pacific Admin & Backend Connection Strings`,
    `Once the new database is running:`,
    `1. Update \`DATABASE_URL\` and \`DIRECT_URL\` in \`D:\\PACIFIC-Backend\\.env\``,
    `2. Update \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\` in \`D:\\PACIFIC-Admin\\.env\``,
    `3. Update \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\` in \`D:\\Pacific Products And Solutions\\.env\``,
    `4. Run \`npx tsc --noEmit\` and \`npm run build\` to confirm full cross-stack synchronization.`,
  ].join('\n');
  fs.writeFileSync(path.join(PRIMARY_OUT_DIR, 'RESTORE_INSTRUCTIONS.md'), restoreMd, 'utf8');

  // 6. Mirror to D:\PACIFIC-Admin\database-backup and D:\backups
  console.log(`\n🪞 Mirroring backup to: ${ADMIN_MIRROR_DIR}...`);
  ensureDir(ADMIN_MIRROR_DIR);
  copyFolderRecursiveSync(PRIMARY_OUT_DIR, ADMIN_MIRROR_DIR);

  console.log(`🪞 Mirroring backup to: ${BACKUPS_DIR}...`);
  ensureDir(BACKUPS_DIR);
  copyFolderRecursiveSync(PRIMARY_OUT_DIR, BACKUPS_DIR);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n================================================================');
  console.log(`✨ FULL DATABASE BACKUP COMPLETED SUCCESSFULLY in ${durationSec}s!`);
  console.log(`📂 Primary Location: ${PRIMARY_OUT_DIR}`);
  console.log(`📂 Admin Mirror:     ${ADMIN_MIRROR_DIR}`);
  console.log(`📂 Long-Term Archive: ${BACKUPS_DIR}`);
  console.log(`📊 Total Tables:     ${tableNames.length}`);
  console.log(`📊 Total Records:    ${totalRecordCount}`);
  console.log('================================================================');
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

runBackup()
  .catch(err => {
    console.error('❌ Backup failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
