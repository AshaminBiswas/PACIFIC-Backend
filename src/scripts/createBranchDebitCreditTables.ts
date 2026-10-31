import { prisma } from '../config/database';

async function main() {
  console.log('--- Creating branches & branch_transactions tables in Supabase Postgres ---');

  // 1. Create branches table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      contact_person TEXT,
      opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
      current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
      is_default BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      company_profile_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('branches table created or exists.');

  // 2. Populate branches from hardware_branches if branches table is empty
  await prisma.$executeRawUnsafe(`
    INSERT INTO branches (id, code, name, city, state, address, phone, contact_person, is_default, is_active, created_at, updated_at)
    SELECT id, code, name, city, state, address, phone, contact_person, is_default, is_active, created_at, NOW()
    FROM hardware_branches
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        code = EXCLUDED.code,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        contact_person = EXCLUDED.contact_person,
        is_default = EXCLUDED.is_default,
        is_active = EXCLUDED.is_active;
  `);
  console.log('Synced branches from hardware_branches.');

  // Also ensure we have common branches if missing: Mumbai, Bengaluru
  const sampleBranches = [
    {
      id: 'branch-mumbai',
      code: 'MUMBAI',
      name: 'Mumbai & Western Regional Branch',
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'Andheri East Industrial Area, Mumbai 400069',
      phone: '+91 98201 12233',
      contactPerson: 'Sanjay Deshmukh (Branch Incharge)',
      openingBalance: 50000,
    },
    {
      id: 'branch-bengaluru',
      code: 'BLR',
      name: 'Bengaluru & South Operations Branch',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: 'Peenya Industrial Area Phase 2, Bengaluru 560058',
      phone: '+91 98450 44556',
      contactPerson: 'Karthik Raman (Branch Manager)',
      openingBalance: 40000,
    },
  ];

  for (const b of sampleBranches) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO branches (id, code, name, city, state, address, phone, contact_person, opening_balance, current_balance, is_default, is_active)
      VALUES ('${b.id}', '${b.code}', '${b.name}', '${b.city}', '${b.state}', '${b.address}', '${b.phone}', '${b.contactPerson}', ${b.openingBalance}, ${b.openingBalance}, false, true)
      ON CONFLICT (id) DO NOTHING;
    `);
  }
  console.log('Ensured regional branches exist.');

  // 3. Create branch_transactions table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS branch_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      entry_date DATE NOT NULL,
      type TEXT NOT NULL,
      amount NUMERIC(14, 2) NOT NULL,
      running_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      party_name TEXT NOT NULL,
      party_type TEXT,
      reference_no TEXT,
      payment_mode TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
      payment_status TEXT NOT NULL DEFAULT 'CLEARED',
      description TEXT,
      voucher_url TEXT,
      company_profile_id TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `);
  console.log('branch_transactions table created.');

  // 4. Create indexes individually
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_branch_tx_branch_id ON branch_transactions(branch_id);',
    'CREATE INDEX IF NOT EXISTS idx_branch_tx_entry_date ON branch_transactions(entry_date);',
    'CREATE INDEX IF NOT EXISTS idx_branch_tx_branch_date ON branch_transactions(branch_id, entry_date);',
    'CREATE INDEX IF NOT EXISTS idx_branch_tx_type ON branch_transactions(type);',
    'CREATE INDEX IF NOT EXISTS idx_branch_tx_branch_type ON branch_transactions(branch_id, type);',
    'CREATE INDEX IF NOT EXISTS idx_branch_tx_category ON branch_transactions(category);',
    'CREATE INDEX IF NOT EXISTS idx_branch_tx_deleted_at ON branch_transactions(deleted_at);',
  ];

  for (const idxSql of indexes) {
    await prisma.$executeRawUnsafe(idxSql);
  }
  console.log('Indexes created successfully.');

  // 5. Query verification
  const countBranches = await prisma.$queryRawUnsafe<any[]>('SELECT count(*) as count FROM branches');
  console.log('Total branches:', countBranches[0]?.count);

  await prisma.$disconnect();
  console.log('--- Migration Finished Successfully ---');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
