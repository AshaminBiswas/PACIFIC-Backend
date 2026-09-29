import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function upgrade() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DIRECT_URL or DATABASE_URL environment variable is missing in .env');
  }

  console.log('Connecting to PostgreSQL for Multi-Warehouse & Inventory Upgrade...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log('Connected! Adding warehouse and category columns...');

    await client.query(`
      ALTER TABLE "board_inventory_items"
      ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'RESTROOM_CUBICLE',
      ADD COLUMN IF NOT EXISTS "warehouse" TEXT NOT NULL DEFAULT 'DELHI',
      ADD COLUMN IF NOT EXISTS "lastAlertSentAt" TIMESTAMP(3);
    `);
    console.log('✓ Columns added to board_inventory_items');

    await client.query(`
      ALTER TABLE "board_stock_movements"
      ADD COLUMN IF NOT EXISTS "warehouse" TEXT NOT NULL DEFAULT 'DELHI';
    `);
    console.log('✓ Columns added to board_stock_movements');

    await client.query(`
      CREATE INDEX IF NOT EXISTS "board_inventory_items_category_idx" ON "board_inventory_items"("category");
      CREATE INDEX IF NOT EXISTS "board_inventory_items_warehouse_idx" ON "board_inventory_items"("warehouse");
      CREATE INDEX IF NOT EXISTS "board_stock_movements_warehouse_idx" ON "board_stock_movements"("warehouse");
    `);
    console.log('✓ Indexes on category and warehouse created');

    // Purge dummy/hardcoded test records as requested by user
    console.log('Purging test/dummy board records...');
    await client.query(`DELETE FROM "board_stock_movements";`);
    await client.query(`DELETE FROM "board_inventory_items";`);
    console.log('✓ Board inventory tables successfully purged to clean slate');

    console.log('\n✅ Database schema successfully upgraded and cleaned!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

upgrade();
