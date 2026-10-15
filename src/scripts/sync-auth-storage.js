const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const BACKUP_DIR = 'D:\\PACIFIC_DATABASE_BACKUP_2026_10_15';
const JSON_DIR = path.join(BACKUP_DIR, 'json_tables');
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

async function syncAuthAndStorage() {
  await client.connect();
  console.log('Connected to new Supabase database.');

  // 1. Storage Buckets
  const neededBuckets = ['products', 'documents', 'avatars', 'categories', 'cms'];
  for (const b of neededBuckets) {
    try {
      await client.query(`
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ($1, $2, true) 
        ON CONFLICT (id) DO UPDATE SET public = true;
      `, [b, b]);
      console.log(`✓ Storage bucket ensured: [${b}]`);
    } catch (e) {
      console.log(`Bucket note on [${b}]: ${e.message}`);
    }
  }

  // 2. Auth Users
  const authUsers = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'auth_users.json'), 'utf-8'));
  for (const u of authUsers) {
    try {
      await client.query(`
        INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, confirmation_token, recovery_token,
          email_change_token_new, email_change, phone_change, phone_change_token,
          email_change_token_current, reauthentication_token, is_sso_user, is_anonymous
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, '', '',
          '', '', '', '',
          '', '', false, false
        )
        ON CONFLICT (id) DO UPDATE SET
          encrypted_password = EXCLUDED.encrypted_password,
          email = EXCLUDED.email,
          raw_user_meta_data = EXCLUDED.raw_user_meta_data;
      `, [
        u.id,
        u.instance_id || '00000000-0000-0000-0000-000000000000',
        u.aud || 'authenticated',
        u.role || 'authenticated',
        u.email,
        u.encrypted_password,
        u.email_confirmed_at || new Date().toISOString(),
        JSON.stringify(u.raw_app_meta_data || { provider: 'email', providers: ['email'] }),
        JSON.stringify(u.raw_user_meta_data || {}),
        u.created_at || new Date().toISOString(),
        u.updated_at || new Date().toISOString()
      ]);
      console.log(`✓ Auth user restored: [${u.email}] (${u.id})`);
    } catch (e) {
      console.log(`Auth user note for [${u.email}]: ${e.message}`);
    }
  }

  // 3. Auth Identities
  const authIdentities = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'auth_identities.json'), 'utf-8'));
  for (const iden of authIdentities) {
    try {
      await client.query(`
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;
      `, [
        iden.id,
        iden.user_id,
        JSON.stringify(iden.identity_data || {}),
        iden.provider || 'email',
        iden.provider_id || iden.user_id,
        iden.last_sign_in_at || new Date().toISOString(),
        iden.created_at || new Date().toISOString(),
        iden.updated_at || new Date().toISOString()
      ]);
      console.log(`✓ Auth identity restored for: [${iden.user_id}]`);
    } catch (e) {
      console.log(`Auth identity note for [${iden.user_id}]: ${e.message}`);
    }
  }

  // 4. Verify Auth Users Count
  const count = await client.query('SELECT count(*) FROM auth.users');
  console.log(`Total Auth Users in new database: ${count.rows[0].count}`);

  await client.end();
}

syncAuthAndStorage().catch(err => {
  console.error('Fatal auth/storage sync error:', err);
  process.exit(1);
});
