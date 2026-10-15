require('dotenv').config({ path: 'd:/PACIFIC-Backend/.env' });
const { Client } = require('pg');
const fs = require('fs');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  // Check all schemas
  const schemasRes = await client.query(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ORDER BY schema_name;
  `);
  console.log('Schemas:', schemasRes.rows.map(r => r.schema_name));

  // Check public tables and row counts
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  console.log(`Found ${tablesRes.rows.length} base tables in public schema.`);

  const tableStats = [];
  for (const row of tablesRes.rows) {
    const tbl = row.table_name;
    try {
      const countRes = await client.query(`SELECT count(*) FROM public."${tbl}"`);
      const count = parseInt(countRes.rows[0].count, 10);
      tableStats.push({ table: tbl, rows: count });
    } catch (e) {
      tableStats.push({ table: tbl, rows: -1, error: e.message });
    }
  }

  const withData = tableStats.filter(t => t.rows > 0);
  const empty = tableStats.filter(t => t.rows === 0);
  console.log(`Tables with data: ${withData.length}, Empty tables: ${empty.length}`);
  console.log('Top tables by row count:');
  withData.sort((a, b) => b.rows - a.rows).slice(0, 20).forEach(t => console.log(`  - ${t.table}: ${t.rows} rows`));

  // Check auth and storage
  for (const s of ['auth', 'storage']) {
    const sTables = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    `, [s]);
    console.log(`Tables in ${s}:`, sTables.rows.map(r => r.table_name));
    for (const row of sTables.rows) {
      try {
        const c = await client.query(`SELECT count(*) FROM "${s}"."${row.table_name}"`);
        console.log(`  - ${s}.${row.table_name}: ${c.rows[0].count} rows`);
      } catch (e) {
        console.log(`  - ${s}.${row.table_name}: error (${e.message})`);
      }
    }
  }

  await client.end();
}

inspect().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
