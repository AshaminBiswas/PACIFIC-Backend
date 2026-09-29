const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.kgalsrokdmsrqysyoffm:Pacific_API_2026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL successfully!');

  // Check current RLS status on products
  const rlsCheck = await client.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products';");
  console.log('Products RLS status:', rlsCheck.rows);

  const existingPolicies = await client.query("SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products';");
  console.log('Current products policies:', existingPolicies.rows);

  // Enable RLS and add public read policy
  await client.query("ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;");
  await client.query('DROP POLICY IF EXISTS "Allow public read access on products" ON public.products;');
  await client.query('CREATE POLICY "Allow public read access on products" ON public.products FOR SELECT TO anon, authenticated USING (true);');
  console.log('Policy created for products!');

  // Also grant SELECT on products to anon and authenticated roles
  await client.query("GRANT SELECT ON public.products TO anon, authenticated;");
  console.log('Granted SELECT on products to anon, authenticated!');

  // Also do for all other public CMS tables so website works seamlessly
  const cmsTables = ['solutions', 'blogs', 'gallery_images', 'core_services', 'page_banners', 'hero_images', 'catalogs', 'testimonials'];
  for (const tbl of cmsTables) {
    try {
      await client.query(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;`);
      await client.query(`DROP POLICY IF EXISTS "Allow public read access on ${tbl}" ON public.${tbl};`);
      await client.query(`CREATE POLICY "Allow public read access on ${tbl}" ON public.${tbl} FOR SELECT TO anon, authenticated USING (true);`);
      await client.query(`GRANT SELECT ON public.${tbl} TO anon, authenticated;`);
      console.log(`RLS & SELECT granted for ${tbl}`);
    } catch (e) {
      console.log(`Notice for ${tbl}:`, e.message);
    }
  }

  await client.end();
  console.log('All done!');
}

run().catch(e => {
  console.error('Execution error:', e);
  process.exit(1);
});
