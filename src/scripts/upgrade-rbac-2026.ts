import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function upgradeRbacSchema() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DIRECT_URL or DATABASE_URL environment variable is missing in .env');
  }

  console.log('Connecting to PostgreSQL for Pacific RBAC Redesign Upgrade...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log('Connected! Applying RBAC schema enhancements...');

    // 1. Add columns to users table
    console.log('1. Enhancing users table...');
    await client.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "adminId" TEXT,
      ADD COLUMN IF NOT EXISTS "profilePhoto" TEXT,
      ADD COLUMN IF NOT EXISTS "mobileNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "department" TEXT,
      ADD COLUMN IF NOT EXISTS "designation" TEXT,
      ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS "createdById" TEXT REFERENCES "users"("id") ON DELETE SET NULL;
    `);

    // Ensure unique index on adminId if column exists
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_adminId_key" ON "users"("adminId") WHERE "adminId" IS NOT NULL;
    `);

    // Assign adminId to existing users if they do not have one
    const existingUsers = await client.query(`SELECT id, "adminId" FROM "users" ORDER BY "createdAt" ASC;`);
    let counter = 1001;
    for (const row of existingUsers.rows) {
      if (!row.adminId) {
        const nextId = `ADM-${counter}`;
        await client.query(`UPDATE "users" SET "adminId" = $1 WHERE id = $2;`, [nextId, row.id]);
        console.log(`  Assigned ${nextId} to user ${row.id}`);
      }
      counter++;
    }
    console.log('✓ users table enhanced with Admin ID, profile, department, and status');

    // 2. Add columns to roles table
    console.log('2. Enhancing roles table...');
    await client.query(`
      ALTER TABLE "roles"
      ADD COLUMN IF NOT EXISTS "department" TEXT,
      ADD COLUMN IF NOT EXISTS "category" TEXT,
      ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
    `);
    console.log('✓ roles table enhanced with department, category, and status');

    // 3. Add columns to permissions table
    console.log('3. Enhancing permissions table...');
    await client.query(`
      ALTER TABLE "permissions"
      ADD COLUMN IF NOT EXISTS "submodule" TEXT,
      ADD COLUMN IF NOT EXISTS "action" TEXT,
      ADD COLUMN IF NOT EXISTS "category" TEXT;
    `);
    console.log('✓ permissions table enhanced with submodule, action, and category');

    // 4. Create admin_activity_logs table
    console.log('4. Creating admin_activity_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "admin_activity_logs" (
        "id" TEXT PRIMARY KEY,
        "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "targetType" TEXT NOT NULL,
        "targetId" TEXT,
        "action" TEXT NOT NULL,
        "details" TEXT,
        "previousState" JSONB,
        "newState" JSONB,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "admin_activity_logs_actorId_idx" ON "admin_activity_logs"("actorId");
      CREATE INDEX IF NOT EXISTS "admin_activity_logs_target_idx" ON "admin_activity_logs"("targetType", "targetId");
      CREATE INDEX IF NOT EXISTS "admin_activity_logs_action_idx" ON "admin_activity_logs"("action");
      CREATE INDEX IF NOT EXISTS "admin_activity_logs_createdAt_idx" ON "admin_activity_logs"("createdAt");
    `);
    console.log('✓ admin_activity_logs table and indexes created');

    console.log('\n✅ All RBAC schema changes applied successfully with ZERO data loss!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

upgradeRbacSchema();
