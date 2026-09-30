"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pg_1 = require("pg");
async function upgradeAuthSchema() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DIRECT_URL or DATABASE_URL environment variable is missing in .env');
    }
    console.log('Connecting to PostgreSQL for Auth & RBAC Schema Upgrade...');
    const pool = new pg_1.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });
    const client = await pool.connect();
    try {
        console.log('Connected! Expanding UserRole enum...');
        // 1. Add new enum values to UserRole if they don't already exist
        const rolesToAdd = [
            'SALES_MANAGER',
            'WAREHOUSE_MANAGER',
            'FINANCE_OFFICER',
            'PROCUREMENT_MANAGER',
            'EXPORT_MANAGER',
        ];
        for (const roleVal of rolesToAdd) {
            try {
                await client.query(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS '${roleVal}';`);
                console.log(`✓ Added enum value '${roleVal}' to UserRole`);
            }
            catch (enumErr) {
                // Some postgres versions might not support IF NOT EXISTS for ADD VALUE
                console.log(`Notice for enum '${roleVal}': ${enumErr.message}`);
            }
        }
        // 2. Add columns to users table
        console.log('Adding 2FA and security columns to users table...');
        await client.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT,
      ADD COLUMN IF NOT EXISTS "twoFactorRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS "isTwoFactorPending" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "lastLoginIp" TEXT;
    `);
        console.log('✓ Columns added to users table');
        // 3. Create admin_sessions table
        console.log('Creating admin_sessions table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS "admin_sessions" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "sessionToken" TEXT UNIQUE NOT NULL,
        "refreshToken" TEXT UNIQUE,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "browser" TEXT,
        "os" TEXT,
        "deviceType" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "revokedAt" TIMESTAMP(3),
        "revokedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "admin_sessions_userId_isActive_idx" ON "admin_sessions"("userId", "isActive");
      CREATE INDEX IF NOT EXISTS "admin_sessions_sessionToken_idx" ON "admin_sessions"("sessionToken");
    `);
        console.log('✓ admin_sessions table and indexes created');
        console.log('\n✅ Database Auth & RBAC schema successfully upgraded!');
    }
    catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
    finally {
        client.release();
        await pool.end();
    }
}
upgradeAuthSchema();
//# sourceMappingURL=upgrade-auth-schema.js.map