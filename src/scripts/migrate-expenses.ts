import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';

const BACKUP_JSON_DIR = 'D:\\hardware\\PRC_DATABASE_BACKUP_2026_11_01\\json_tables';

async function runMigration() {
  console.log('🚀 [Migration] Starting Daily Expenses Tables & Data Migration...');

  // 1. Create Tables one by one
  console.log('📦 Creating expense tables in Supabase Postgres...');
  
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      monthly_budget_limit INTEGER,
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_entries (
      id TEXT PRIMARY KEY,
      entry_number TEXT NOT NULL UNIQUE,
      date DATE NOT NULL,
      time VARCHAR(10) NOT NULL,
      amount INTEGER NOT NULL,
      category_id TEXT NOT NULL REFERENCES expense_categories(id),
      sub_category TEXT,
      payment_mode TEXT NOT NULL DEFAULT 'CASH',
      description TEXT NOT NULL,
      paid_to TEXT NOT NULL,
      paid_by TEXT,
      receipt_attachment TEXT,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      department_id TEXT,
      employee_id TEXT,
      added_by_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'PENDING',
      approved_by_id TEXT REFERENCES users(id),
      approved_at TIMESTAMPTZ,
      rejection_reason TEXT,
      is_void BOOLEAN NOT NULL DEFAULT false,
      void_reason TEXT,
      voided_by_id TEXT REFERENCES users(id),
      voided_at TIMESTAMPTZ,
      client_temp_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_daily_ledgers (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      opening_balance INTEGER NOT NULL DEFAULT 0,
      cash_received INTEGER NOT NULL DEFAULT 0,
      total_expenses INTEGER NOT NULL DEFAULT 0,
      closing_balance INTEGER NOT NULL DEFAULT 0,
      physical_cash_counted INTEGER,
      variance INTEGER,
      is_reconciled BOOLEAN NOT NULL DEFAULT false,
      reconciled_by_id TEXT REFERENCES users(id),
      reconciled_at TIMESTAMPTZ,
      reconciliation_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_expense_branch_date UNIQUE (branch_id, date)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_float_top_ups (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      amount INTEGER NOT NULL,
      source TEXT NOT NULL,
      reference_no TEXT,
      notes TEXT,
      receipt_attachment TEXT,
      added_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS branch_cash_balances (
      branch_id TEXT PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
      current_balance INTEGER NOT NULL DEFAULT 0,
      last_entry_at TIMESTAMPTZ,
      last_reconciled_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_daily_rollups (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      category_id TEXT NOT NULL REFERENCES expense_categories(id),
      total_amount INTEGER NOT NULL DEFAULT 0,
      entry_count INTEGER NOT NULL DEFAULT 0,
      payment_mode_breakdown JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_expense_branch_date_cat UNIQUE (branch_id, date, category_id)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_monthly_rollups (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      category_id TEXT NOT NULL REFERENCES expense_categories(id),
      total_amount INTEGER NOT NULL DEFAULT 0,
      entry_count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_expense_branch_yr_mo_cat UNIQUE (branch_id, year, month, category_id)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_audit_logs (
      id TEXT PRIMARY KEY,
      expense_id TEXT REFERENCES expense_entries(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      performed_by_id TEXT NOT NULL REFERENCES users(id),
      changes JSONB,
      reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_sequences (
      id TEXT PRIMARY KEY,
      prefix TEXT NOT NULL UNIQUE,
      last_number INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_settings (
      id TEXT PRIMARY KEY,
      branch_id TEXT UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
      auto_approval_threshold INTEGER NOT NULL DEFAULT 200000,
      require_receipt_above INTEGER,
      alert_negative_balance BOOLEAN NOT NULL DEFAULT true,
      fiscal_year_start_month INTEGER NOT NULL DEFAULT 4,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ Tables created or verified.');

  // 2. Ensure Branches exist
  console.log('🏢 Ensuring branches exist...');
  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) throw new Error('No user found in database to link records.');
  const adminUserId = defaultUser.id;
  console.log(`👤 Using Admin User ID: ${adminUserId} (${defaultUser.email})`);

  await prisma.$executeRawUnsafe(`
    INSERT INTO branches (id, code, name, city, state, address, phone, contact_person, is_default, is_active)
    VALUES 
      ('branch-delhi', 'DELHI', 'Delhi Main Plant & Central Warehouse', 'Delhi / NCR', 'Delhi', 'Plot 42, Udyog Vihar Phase 4, Gurugram / Delhi NCR', '+91 98112 34567', 'Harish Rawat (Store Incharge)', true, true),
      ('branch-kolkata', 'KOLKATA', 'Kolkata Regional Hub & Warehouse', 'Kolkata', 'West Bengal', 'Kasba Industrial Estate, Phase 2, Kolkata 700107', '+91 98300 77665', 'Prabir Roy (Warehouse Manager)', false, true),
      ('branch-up', 'UP', 'UP Factory & Manufacturing Unit', 'Kanpur', 'Uttar Pradesh', 'PRC Manufacturing Unit, Uttar Pradesh', '+91 98390 11223', 'Factory Manager', false, true)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      code = EXCLUDED.code,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      address = EXCLUDED.address,
      phone = EXCLUDED.phone,
      contact_person = EXCLUDED.contact_person,
      is_active = true;
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO branches (id, code, name, city, state, address, phone, contact_person, is_default, is_active)
    VALUES 
      ('b1000000-0000-0000-0000-000000000001', 'DEL', 'Delhi HQ', 'New Delhi', 'Delhi', 'Pacific Hardware HQ, Mayapuri Industrial Area Phase II', '+91 98112 34567', 'Delhi Manager', false, true),
      ('b2000000-0000-0000-0000-000000000002', 'KOL', 'Kolkata Branch', 'Kolkata', 'West Bengal', 'PRC Hardware Depot, Topsia Road', '+91 98300 77665', 'Kolkata Manager', false, true),
      ('b3000000-0000-0000-0000-000000000003', 'UP-FAC', 'UP Factory', 'Kanpur', 'Uttar Pradesh', 'PRC Manufacturing Unit, Uttar Pradesh', '+91 98390 11223', 'UP Manager', false, true)
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('✅ Branches verified (including Delhi, Kolkata, and UP).');

  const readBackupJson = (filename: string) => {
    const fullPath = path.join(BACKUP_JSON_DIR, filename);
    if (!fs.existsSync(fullPath)) return [];
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  };

  // 3. Migrate Expense Categories
  const categories = readBackupJson('expense_categories.json');
  console.log(`📂 Migrating ${categories.length} expense categories...`);
  for (const cat of categories) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO expense_categories (id, name, description, monthly_budget_limit, is_active, is_deleted, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        monthly_budget_limit = EXCLUDED.monthly_budget_limit,
        is_active = EXCLUDED.is_active,
        is_deleted = EXCLUDED.is_deleted,
        updated_at = EXCLUDED.updated_at;
    `, cat.id, cat.name, cat.description || null, cat.monthly_budget_limit || null, cat.is_active ?? true, cat.is_deleted ?? false, cat.created_at || new Date().toISOString(), cat.updated_at || new Date().toISOString());
  }
  console.log('✅ Expense categories migrated.');

  // 4. Migrate Expense Entries
  const entries = readBackupJson('expense_entries.json');
  console.log(`🧾 Migrating ${entries.length} expense entries...`);
  for (const ent of entries) {
    let targetBranchId = ent.branch_id;
    if (targetBranchId === 'b2000000-0000-0000-0000-000000000002') {
      targetBranchId = 'branch-kolkata';
    } else if (targetBranchId === 'b1000000-0000-0000-0000-000000000001') {
      targetBranchId = 'branch-delhi';
    }

    const dateOnly = (ent.date || '').split('T')[0] || new Date().toISOString().split('T')[0];

    await prisma.$executeRawUnsafe(`
      INSERT INTO expense_entries (
        id, entry_number, date, time, amount, category_id, sub_category, payment_mode,
        description, paid_to, paid_by, receipt_attachment, branch_id, department_id,
        employee_id, added_by_id, status, approved_by_id, approved_at, rejection_reason,
        is_void, void_reason, voided_by_id, voided_at, client_temp_id, created_at, updated_at
      )
      VALUES (
        $1, $2, $3::date, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19::timestamptz, $20,
        $21, $22, $23, $24::timestamptz, $25, $26::timestamptz, $27::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        entry_number = EXCLUDED.entry_number,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        amount = EXCLUDED.amount,
        category_id = EXCLUDED.category_id,
        payment_mode = EXCLUDED.payment_mode,
        description = EXCLUDED.description,
        paid_to = EXCLUDED.paid_to,
        paid_by = EXCLUDED.paid_by,
        receipt_attachment = EXCLUDED.receipt_attachment,
        branch_id = EXCLUDED.branch_id,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at;
    `,
      ent.id, ent.entry_number, dateOnly, ent.time || '12:00:00', ent.amount,
      ent.category_id, ent.sub_category || null, ent.payment_mode || 'CASH',
      ent.description || 'Expense', ent.paid_to || 'na', ent.paid_by || null,
      ent.receipt_attachment || null, targetBranchId, ent.department_id || null,
      null, adminUserId, ent.status || 'APPROVED',
      ent.status === 'APPROVED' ? adminUserId : null,
      ent.approved_at || null, ent.rejection_reason || null,
      ent.is_void ?? false, ent.void_reason || null,
      null, ent.voided_at || null, ent.client_temp_id || null,
      ent.created_at || new Date().toISOString(), ent.updated_at || new Date().toISOString()
    );
  }
  console.log('✅ Expense entries migrated.');

  // 5. Migrate Float Top-Ups
  const floatTopUps = readBackupJson('expense_float_top_ups.json');
  console.log(`💰 Migrating ${floatTopUps.length} float top-ups...`);
  for (const ft of floatTopUps) {
    let targetBranchId = ft.branch_id;
    if (targetBranchId === 'b2000000-0000-0000-0000-000000000002') {
      targetBranchId = 'branch-kolkata';
    } else if (targetBranchId === 'b1000000-0000-0000-0000-000000000001') {
      targetBranchId = 'branch-delhi';
    }

    const dateOnly = (ft.date || '').split('T')[0] || new Date().toISOString().split('T')[0];

    await prisma.$executeRawUnsafe(`
      INSERT INTO expense_float_top_ups (
        id, branch_id, date, amount, source, reference_no, notes, receipt_attachment, added_by_id, created_at
      )
      VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10::timestamptz)
      ON CONFLICT (id) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        date = EXCLUDED.date,
        amount = EXCLUDED.amount,
        source = EXCLUDED.source,
        reference_no = EXCLUDED.reference_no,
        notes = EXCLUDED.notes;
    `,
      ft.id, targetBranchId, dateOnly, ft.amount, ft.source || 'Cash from Bank',
      ft.reference_no || null, ft.notes || null, ft.receipt_attachment || null,
      adminUserId, ft.created_at || new Date().toISOString()
    );
  }
  console.log('✅ Float top-ups migrated.');

  // 6. Migrate Daily Ledgers
  const ledgers = readBackupJson('expense_daily_ledgers.json');
  console.log(`📖 Migrating ${ledgers.length} daily ledgers...`);
  for (const ld of ledgers) {
    let targetBranchId = ld.branch_id;
    if (targetBranchId === 'b2000000-0000-0000-0000-000000000002') {
      targetBranchId = 'branch-kolkata';
    } else if (targetBranchId === 'b1000000-0000-0000-0000-000000000001') {
      targetBranchId = 'branch-delhi';
    }

    const dateOnly = (ld.date || '').split('T')[0] || new Date().toISOString().split('T')[0];

    await prisma.$executeRawUnsafe(`
      INSERT INTO expense_daily_ledgers (
        id, branch_id, date, opening_balance, cash_received, total_expenses,
        closing_balance, physical_cash_counted, variance, is_reconciled,
        reconciled_by_id, reconciled_at, reconciliation_notes, created_at, updated_at
      )
      VALUES (
        $1, $2, $3::date, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12::timestamptz, $13, $14::timestamptz, $15::timestamptz
      )
      ON CONFLICT (branch_id, date) DO UPDATE SET
        opening_balance = EXCLUDED.opening_balance,
        cash_received = EXCLUDED.cash_received,
        total_expenses = EXCLUDED.total_expenses,
        closing_balance = EXCLUDED.closing_balance,
        physical_cash_counted = EXCLUDED.physical_cash_counted,
        variance = EXCLUDED.variance,
        is_reconciled = EXCLUDED.is_reconciled,
        updated_at = EXCLUDED.updated_at;
    `,
      ld.id, targetBranchId, dateOnly, ld.opening_balance || 0, ld.cash_received || 0, ld.total_expenses || 0,
      ld.closing_balance || 0, ld.physical_cash_counted || null, ld.variance || null, ld.is_reconciled ?? false,
      ld.is_reconciled ? adminUserId : null, ld.reconciled_at || null, ld.reconciliation_notes || null,
      ld.created_at || new Date().toISOString(), ld.updated_at || new Date().toISOString()
    );
  }
  console.log('✅ Daily ledgers migrated.');

  // 7. Migrate Branch Cash Balances
  const balances = readBackupJson('branch_cash_balances.json');
  console.log(`🏦 Migrating ${balances.length} branch cash balances...`);
  for (const bal of balances) {
    let targetBranchId = bal.branch_id;
    if (targetBranchId === 'b2000000-0000-0000-0000-000000000002') {
      targetBranchId = 'branch-kolkata';
    } else if (targetBranchId === 'b1000000-0000-0000-0000-000000000001') {
      targetBranchId = 'branch-delhi';
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO branch_cash_balances (branch_id, current_balance, last_entry_at, last_reconciled_at, updated_at)
      VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5::timestamptz)
      ON CONFLICT (branch_id) DO UPDATE SET
        current_balance = EXCLUDED.current_balance,
        last_entry_at = EXCLUDED.last_entry_at,
        last_reconciled_at = EXCLUDED.last_reconciled_at,
        updated_at = EXCLUDED.updated_at;
    `, targetBranchId, bal.current_balance || 0, bal.last_entry_at || null, bal.last_reconciled_at || null, bal.updated_at || new Date().toISOString());
  }

  // Also ensure branch-delhi has a record in branch_cash_balances if missing
  await prisma.$executeRawUnsafe(`
    INSERT INTO branch_cash_balances (branch_id, current_balance, updated_at)
    VALUES ('branch-delhi', 0, NOW())
    ON CONFLICT (branch_id) DO NOTHING;
  `);
  console.log('✅ Branch cash balances migrated.');

  // 8. Migrate Expense Sequences
  const sequences = readBackupJson('expense_sequences.json');
  console.log(`🔢 Migrating ${sequences.length} expense sequences...`);
  for (const seq of sequences) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO expense_sequences (id, prefix, last_number, updated_at)
      VALUES ($1, $2, $3, $4::timestamptz)
      ON CONFLICT (prefix) DO UPDATE SET
        last_number = EXCLUDED.last_number,
        updated_at = EXCLUDED.updated_at;
    `, seq.id, seq.prefix, seq.last_number, seq.updated_at || new Date().toISOString());
  }
  console.log('✅ Expense sequences migrated.');

  // 9. Migrate Rollups
  const dailyRollups = readBackupJson('expense_daily_rollups.json');
  console.log(`📊 Migrating ${dailyRollups.length} daily rollups...`);
  for (const dr of dailyRollups) {
    let targetBranchId = dr.branch_id;
    if (targetBranchId === 'b2000000-0000-0000-0000-000000000002') targetBranchId = 'branch-kolkata';
    else if (targetBranchId === 'b1000000-0000-0000-0000-000000000001') targetBranchId = 'branch-delhi';

    const dateOnly = (dr.date || '').split('T')[0] || new Date().toISOString().split('T')[0];
    await prisma.$executeRawUnsafe(`
      INSERT INTO expense_daily_rollups (id, branch_id, date, category_id, total_amount, entry_count, payment_mode_breakdown, updated_at)
      VALUES ($1, $2, $3::date, $4, $5, $6, $7::jsonb, $8::timestamptz)
      ON CONFLICT (branch_id, date, category_id) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        entry_count = EXCLUDED.entry_count,
        updated_at = EXCLUDED.updated_at;
    `, dr.id, targetBranchId, dateOnly, dr.category_id, dr.total_amount || 0, dr.entry_count || 0, JSON.stringify(dr.payment_mode_breakdown || {}), dr.updated_at || new Date().toISOString());
  }

  const monthlyRollups = readBackupJson('expense_monthly_rollups.json');
  console.log(`📈 Migrating ${monthlyRollups.length} monthly rollups...`);
  for (const mr of monthlyRollups) {
    let targetBranchId = mr.branch_id;
    if (targetBranchId === 'b2000000-0000-0000-0000-000000000002') targetBranchId = 'branch-kolkata';
    else if (targetBranchId === 'b1000000-0000-0000-0000-000000000001') targetBranchId = 'branch-delhi';

    await prisma.$executeRawUnsafe(`
      INSERT INTO expense_monthly_rollups (id, branch_id, year, month, category_id, total_amount, entry_count, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
      ON CONFLICT (branch_id, year, month, category_id) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        entry_count = EXCLUDED.entry_count,
        updated_at = EXCLUDED.updated_at;
    `, mr.id, targetBranchId, mr.year, mr.month, mr.category_id, mr.total_amount || 0, mr.entry_count || 0, mr.updated_at || new Date().toISOString());
  }

  console.log('🎉 [Migration] ALL Daily Expense Tables & Historical Data successfully migrated into Pacific database!');
}

runMigration()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
