import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const BACKUP_DIR = 'D:/hardware/PRC_DATABASE_BACKUP_2026_11_01/json_tables/';

function readJson(filename: string): any[] {
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function run() {
  console.log('🚀 Starting full Kolkata Branch expense import from D:\\hardware\\PRC_DATABASE_BACKUP_2026_11_01...');

  // Ensure branch-kolkata exists
  const kolkataBranch = await prisma.branch.findUnique({
    where: { id: 'branch-kolkata' },
  });
  if (!kolkataBranch) {
    throw new Error('branch-kolkata does not exist in database!');
  }
  console.log(`✓ Target branch verified: ${kolkataBranch.name} (${kolkataBranch.id})`);

  // Ensure categories exist
  const existingCategories = await prisma.expenseCategory.findMany();
  const catByName = new Map<string, string>();
  existingCategories.forEach((c) => catByName.set(c.name.toLowerCase().trim(), c.id));

  // Get admin user for authoring
  const adminUser = await prisma.user.findFirst({ select: { id: true } });
  const adminUserId = adminUser?.id || '8fa992fe-3967-448e-9924-741f1109c6d8';

  // 1. Process expense_entries.json (40 records)
  const expenseEntries = readJson('expense_entries.json');
  console.log(`📦 Processing ${expenseEntries.length} entries from expense_entries.json...`);
  let expCount = 0;
  for (const ent of expenseEntries) {
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
        $9, $10, $11, $12, 'branch-kolkata', $13,
        $14, $15, $16, $17, $18::timestamptz, $19,
        $20, $21, $22, $23::timestamptz, $24, $25::timestamptz, $26::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        entry_number = EXCLUDED.entry_number,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        amount = EXCLUDED.amount,
        category_id = EXCLUDED.category_id,
        sub_category = EXCLUDED.sub_category,
        payment_mode = EXCLUDED.payment_mode,
        description = EXCLUDED.description,
        paid_to = EXCLUDED.paid_to,
        paid_by = EXCLUDED.paid_by,
        receipt_attachment = EXCLUDED.receipt_attachment,
        branch_id = 'branch-kolkata',
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `,
      ent.id,
      ent.entry_number,
      dateOnly,
      ent.time || '10:00:00',
      ent.amount,
      ent.category_id,
      ent.sub_category,
      ent.payment_mode || 'CASH',
      ent.description || 'Expense Voucher',
      ent.paid_to || 'na',
      ent.paid_by,
      ent.receipt_attachment,
      ent.department_id,
      ent.employee_id,
      adminUserId,
      ent.status || 'APPROVED',
      ent.approved_by_id ? adminUserId : null,
      ent.approved_at,
      ent.rejection_reason,
      ent.is_void ?? false,
      ent.void_reason,
      ent.voided_by_id,
      ent.voided_at,
      ent.client_temp_id,
      ent.created_at || new Date().toISOString(),
      ent.updated_at || new Date().toISOString()
    );
    expCount++;
  }
  console.log(`✓ Successfully updated ${expCount} expense_entries to Kolkata branch.`);

  // 2. Skip up_expenses.json intentionally: UP factory expenses belong exclusively in the dedicated
  // `up_expenses` table (/admin/dashboard/up-expenses) and must NOT be imported into Kolkata branch (`branch-kolkata`).
  console.log('ℹ️  Skipping up_expenses.json import: UP factory expenses remain strictly in the dedicated up_expenses module.');

  // 3. Process Float Top-Ups (31 records)
  const floatTopUps = readJson('expense_float_top_ups.json');
  console.log(`📦 Verifying ${floatTopUps.length} float top-ups for Kolkata branch...`);
  for (const f of floatTopUps) {
    const dateOnly = (f.date || '').split('T')[0] || new Date().toISOString().split('T')[0];
    await prisma.$executeRawUnsafe(`
      INSERT INTO expense_float_top_ups (
        id, branch_id, date, amount, source, reference_no, notes,
        added_by_id, receipt_attachment, created_at
      )
      VALUES ($1, 'branch-kolkata', $2::date, $3, $4, $5, $6, $7, $8, $9::timestamptz)
      ON CONFLICT (id) DO UPDATE SET
        branch_id = 'branch-kolkata',
        date = EXCLUDED.date,
        amount = EXCLUDED.amount,
        source = EXCLUDED.source,
        reference_no = EXCLUDED.reference_no,
        notes = EXCLUDED.notes
    `,
      f.id,
      dateOnly,
      f.amount,
      f.source || 'Cash from Bank',
      f.reference_no,
      f.notes,
      adminUserId,
      f.receipt_attachment,
      f.created_at || new Date().toISOString()
    );
  }
  console.log(`✓ Verified ${floatTopUps.length} float top-ups.`);

  // 4. Calculate total amounts for Kolkata branch
  const allKolkataEntries = await prisma.expenseEntry.findMany({
    where: { branchId: 'branch-kolkata', isVoid: false },
    select: { amount: true, date: true, categoryId: true },
  });
  const allKolkataFloats = await prisma.expenseFloatTopUp.findMany({
    where: { branchId: 'branch-kolkata' },
    select: { amount: true },
  });

  const totalExpensePaise = allKolkataEntries.reduce((acc, curr) => acc + curr.amount, 0);
  const totalFloatPaise = allKolkataFloats.reduce((acc, curr) => acc + curr.amount, 0);
  const netCashBalancePaise = totalFloatPaise - totalExpensePaise;

  console.log(`\n📊 KOLKATA BRANCH AGGREGATES:`);
  console.log(`- Total Expense Records: ${allKolkataEntries.length}`);
  console.log(`- Total Expenses: ₹${(totalExpensePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`- Total Float Injections: ${allKolkataFloats.length}`);
  console.log(`- Total Float Inflow: ₹${(totalFloatPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  console.log(`- Net Live Cash Balance: ₹${(netCashBalancePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);

  // 5. Update BranchCashBalance
  await prisma.branchCashBalance.upsert({
    where: { branchId: 'branch-kolkata' },
    create: {
      branchId: 'branch-kolkata',
      currentBalance: netCashBalancePaise,
      lastEntryAt: new Date(),
    },
    update: {
      currentBalance: netCashBalancePaise,
      lastEntryAt: new Date(),
    },
  });
  console.log(`✓ Updated Kolkata BranchCashBalance to ${netCashBalancePaise} paise.`);

  // 6. Regenerate Daily and Monthly Rollups for Kolkata
  console.log('🔄 Rebuilding Daily and Monthly rollups for Kolkata...');
  const dailyMap = new Map<string, { date: Date; categoryId: string; totalAmount: number; count: number }>();
  allKolkataEntries.forEach((e) => {
    const dStr = e.date.toISOString().split('T')[0];
    const key = `${dStr}_${e.categoryId}`;
    const existing = dailyMap.get(key) || { date: e.date, categoryId: e.categoryId, totalAmount: 0, count: 0 };
    existing.totalAmount += e.amount;
    existing.count += 1;
    dailyMap.set(key, existing);
  });

  for (const item of dailyMap.values()) {
    await prisma.expenseDailyRollup.upsert({
      where: {
        branchId_date_categoryId: {
          branchId: 'branch-kolkata',
          date: item.date,
          categoryId: item.categoryId,
        },
      },
      create: {
        branchId: 'branch-kolkata',
        date: item.date,
        categoryId: item.categoryId,
        totalAmount: item.totalAmount,
        entryCount: item.count,
      },
      update: {
        totalAmount: item.totalAmount,
        entryCount: item.count,
      },
    });
  }

  const monthlyMap = new Map<string, { year: number; month: number; categoryId: string; totalAmount: number; count: number }>();
  allKolkataEntries.forEach((e) => {
    const d = new Date(e.date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}_${month}_${e.categoryId}`;
    const existing = monthlyMap.get(key) || { year, month, categoryId: e.categoryId, totalAmount: 0, count: 0 };
    existing.totalAmount += e.amount;
    existing.count += 1;
    monthlyMap.set(key, existing);
  });

  for (const item of monthlyMap.values()) {
    await prisma.expenseMonthlyRollup.upsert({
      where: {
        branchId_year_month_categoryId: {
          branchId: 'branch-kolkata',
          year: item.year,
          month: item.month,
          categoryId: item.categoryId,
        },
      },
      create: {
        branchId: 'branch-kolkata',
        year: item.year,
        month: item.month,
        categoryId: item.categoryId,
        totalAmount: item.totalAmount,
        entryCount: item.count,
      },
      update: {
        totalAmount: item.totalAmount,
        entryCount: item.count,
      },
    });
  }

  console.log(`✓ Rollups updated: ${dailyMap.size} daily rollups and ${monthlyMap.size} monthly rollups.`);
  console.log('\n🎉 ALL EXPENSE DATA FROM D:\\hardware\\PRC_DATABASE_BACKUP_2026_11_01 SUCCESSFULLY ADDED TO KOLKATA BRANCH!');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
