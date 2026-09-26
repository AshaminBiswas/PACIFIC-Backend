import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function migrate() {
  const connectionString =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres.kgalsrokdmsrqysyoffm:Pacific_API_2026@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

  console.log('Connecting to PostgreSQL for Board Inventory migration...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log('Connected! Executing DDL statements...');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "BoardMovementType" AS ENUM ('INWARD', 'ISSUE_AUTO', 'ISSUE_MANUAL', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB', 'RETURN_VENDOR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Enum BoardMovementType ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "board_inventory_items" (
        "id" TEXT NOT NULL,
        "itemCode" TEXT NOT NULL,
        "serialNumber" SERIAL NOT NULL,
        "designNo" TEXT NOT NULL,
        "designName" TEXT,
        "size" TEXT NOT NULL,
        "thickness" TEXT NOT NULL,
        "boardType" TEXT NOT NULL,
        "vendorId" TEXT NOT NULL,
        "vendorName" TEXT,
        "openingStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "totalInward" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "totalIssued" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "reorderLevel" DECIMAL(10,2) NOT NULL DEFAULT 10,
        "unit" TEXT NOT NULL DEFAULT 'Sheets',
        "unitCost" DECIMAL(12,2),
        "locationRack" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "board_inventory_items_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ Table board_inventory_items ready');

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "board_inventory_items_itemCode_key" ON "board_inventory_items"("itemCode");
      CREATE INDEX IF NOT EXISTS "board_inventory_items_vendorId_idx" ON "board_inventory_items"("vendorId");
      CREATE INDEX IF NOT EXISTS "board_inventory_items_designNo_idx" ON "board_inventory_items"("designNo");
      CREATE INDEX IF NOT EXISTS "board_inventory_items_boardType_idx" ON "board_inventory_items"("boardType");
      CREATE INDEX IF NOT EXISTS "board_inventory_items_thickness_idx" ON "board_inventory_items"("thickness");
      CREATE INDEX IF NOT EXISTS "board_inventory_items_status_idx" ON "board_inventory_items"("status");
    `);
    console.log('✓ Indexes on board_inventory_items ready');

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "board_inventory_items" ADD CONSTRAINT "board_inventory_items_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Foreign key constraint to vendor_profiles ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "board_stock_movements" (
        "id" TEXT NOT NULL,
        "movementNumber" TEXT NOT NULL,
        "inventoryItemId" TEXT NOT NULL,
        "movementType" "BoardMovementType" NOT NULL,
        "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "quantity" DECIMAL(10,2) NOT NULL,
        "stockBefore" DECIMAL(10,2) NOT NULL,
        "stockAfter" DECIMAL(10,2) NOT NULL,
        "supplierInvoiceNo" TEXT,
        "supplierInvoiceDate" TIMESTAMP(3),
        "batchLotNo" TEXT,
        "unitCost" DECIMAL(12,2),
        "totalValue" DECIMAL(14,2),
        "issueListId" TEXT,
        "issueListNumber" TEXT,
        "dispatchRecordId" TEXT,
        "packingListId" TEXT,
        "orderId" TEXT,
        "issueReference" TEXT,
        "issuedToPerson" TEXT,
        "notes" TEXT,
        "createdById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "board_stock_movements_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ Table board_stock_movements ready');

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "board_stock_movements_movementNumber_key" ON "board_stock_movements"("movementNumber");
      CREATE INDEX IF NOT EXISTS "board_stock_movements_inventoryItemId_idx" ON "board_stock_movements"("inventoryItemId");
      CREATE INDEX IF NOT EXISTS "board_stock_movements_movementType_idx" ON "board_stock_movements"("movementType");
      CREATE INDEX IF NOT EXISTS "board_stock_movements_movementDate_idx" ON "board_stock_movements"("movementDate");
      CREATE INDEX IF NOT EXISTS "board_stock_movements_issueListId_idx" ON "board_stock_movements"("issueListId");
      CREATE INDEX IF NOT EXISTS "board_stock_movements_dispatchRecordId_idx" ON "board_stock_movements"("dispatchRecordId");
      CREATE INDEX IF NOT EXISTS "board_stock_movements_packingListId_idx" ON "board_stock_movements"("packingListId");
      CREATE INDEX IF NOT EXISTS "board_stock_movements_orderId_idx" ON "board_stock_movements"("orderId");
    `);
    console.log('✓ Indexes on board_stock_movements ready');

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "board_stock_movements" ADD CONSTRAINT "board_stock_movements_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "board_inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Foreign key constraint to board_inventory_items ready');

    console.log('🎉 Board inventory tables and indexes successfully created!');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
