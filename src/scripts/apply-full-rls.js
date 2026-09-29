require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DIRECT_URL or DATABASE_URL in environment variables (.env)');
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL!');

  const tables = [
    'products',
    'solutions',
    'blogs',
    'gallery_images',
    'core_services',
    'page_banners',
    'hero_images',
    'catalogs',
    'testimonials'
  ];

  for (const tbl of tables) {
    try {
      // Ensure table has RLS enabled or disable RLS for direct access
      // In Supabase, if RLS is disabled, anyone with anon key can do CRUD!
      // Or we can enable RLS and add a permissive policy FOR ALL USING (true) WITH CHECK (true).
      await client.query(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;`);
      
      // Drop all existing policies to avoid conflicts
      const existing = await client.query(
        `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = $1;`,
        [tbl]
      );
      for (const row of existing.rows) {
        await client.query(`DROP POLICY IF EXISTS "${row.policyname}" ON public.${tbl};`);
      }

      // Create universal permissive policy for SELECT, INSERT, UPDATE, DELETE
      await client.query(`
        CREATE POLICY "Universal public access on ${tbl}"
        ON public.${tbl}
        FOR ALL
        TO anon, authenticated, service_role
        USING (true)
        WITH CHECK (true);
      `);

      // Grant all privileges
      await client.query(`GRANT ALL ON TABLE public.${tbl} TO anon, authenticated, service_role;`);
      console.log(`✅ Table ${tbl}: full CRUD policy and privileges applied.`);
    } catch (err) {
      console.error(`❌ Table ${tbl} error:`, err.message);
    }
  }

  // Verify products policies
  const pols = await client.query(`SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'products';`);
  console.log('Final products policies:', pols.rows);

  await client.end();
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
