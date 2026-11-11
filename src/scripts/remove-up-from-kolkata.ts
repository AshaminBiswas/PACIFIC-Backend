/**
 * remove-up-from-kolkata.ts
 *
 * Idempotent cleanup script that removes Uttar Pradesh (UP) factory expenses
 * (entry_number matching `EXP-YYYY-MM-UXXXX`) that were mistakenly imported into
 * the Kolkata branch (`branch-kolkata`) `expense_entries` table, while verifying
 * 100% presence in the dedicated `up_expenses` table first, and rebuilds Kolkata's
 * rollups, daily ledgers, and live cash balance.
 *
 * Usage:
 *   npx tsx src/scripts/remove-up-from-kolkata.ts --dry-run
 *   npx tsx src/scripts/remove-up-from-kolkata.ts --backup <path-to-backup.json>
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const TARGET_BRANCH_ID = 'branch-kolkata';
const UP_ENTRY_REGEX = /^EXP-\d{4}-\d{2}-U\d+$/;

const prisma = new PrismaClient();

interface UpRow {
  id: string;
  expense_date: Date;
  amount: string;
  paid_to: string | null;
  note: string | null;
  deleted_at: Date | null;
}

function toDateStr(value: Date | string): string {
  return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);
}

function formatInrFromPaise(paise: number): string {
  return `Rs ${(paise / 100).toFixed(2)}`;
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const backupIdx = args.indexOf('--backup');
  const backupPath = backupIdx !== -1 ? args[backupIdx + 1] : undefined;
  return { dryRun, backupPath };
}

async function main() {
  const { dryRun, backupPath } = parseCliArgs();

  console.log(`\n=== Separating UP Expenses from Kolkata Branch (${TARGET_BRANCH_ID}) ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no database writes)' : 'LIVE EXECUTION'}`);

  const kolkataBranch = await prisma.branch.findUnique({ where: { id: TARGET_BRANCH_ID } });
  if (!kolkataBranch) {
    throw new Error(`Target branch "${TARGET_BRANCH_ID}" not found.`);
  }

  const [
    allKolkataEntries,
    allKolkataFloats,
    existingLedgers,
    existingDailyRollups,
    existingMonthlyRollups,
    existingCashBalance,
    upRows,
  ] = await Promise.all([
    prisma.expenseEntry.findMany({ where: { branchId: TARGET_BRANCH_ID } }),
    prisma.expenseFloatTopUp.findMany({ where: { branchId: TARGET_BRANCH_ID } }),
    prisma.expenseDailyLedger.findMany({ where: { branchId: TARGET_BRANCH_ID } }),
    prisma.expenseDailyRollup.findMany({ where: { branchId: TARGET_BRANCH_ID } }),
    prisma.expenseMonthlyRollup.findMany({ where: { branchId: TARGET_BRANCH_ID } }),
    prisma.branchCashBalance.findUnique({ where: { branchId: TARGET_BRANCH_ID } }),
    prisma.$queryRaw<UpRow[]>`
      SELECT id::text, expense_date, amount::text, paid_to, note, deleted_at
      FROM up_expenses
    `,
  ]);

  const upEntriesInKolkata = allKolkataEntries.filter((e) => UP_ENTRY_REGEX.test(e.entryNumber));
  const genuineKolkataEntries = allKolkataEntries.filter((e) => !UP_ENTRY_REGEX.test(e.entryNumber));

  const upById = new Map<string, UpRow>();
  for (const row of upRows) {
    upById.set(row.id, row);
  }

  // Verify every UP entry slated for removal already exists in up_expenses
  const unmatched: string[] = [];
  for (const entry of upEntriesInKolkata) {
    const upMatch = upById.get(entry.id);
    if (!upMatch) {
      unmatched.push(`${entry.entryNumber} (id=${entry.id})`);
      continue;
    }
    const upPaise = Math.round(parseFloat(upMatch.amount || '0') * 100);
    const upDate = toDateStr(upMatch.expense_date);
    const entryDate = toDateStr(entry.date);
    if (upPaise !== entry.amount || upDate !== entryDate) {
      throw new Error(
        `Data mismatch for ${entry.entryNumber} (${entry.id}): Kolkata has (${entryDate}, ${entry.amount}) vs up_expenses (${upDate}, ${upPaise}). Aborting.`
      );
    }
  }

  if (unmatched.length > 0) {
    throw new Error(
      `Aborting: ${unmatched.length} -U entries in ${TARGET_BRANCH_ID} do not exist in up_expenses: ${unmatched.slice(0, 5).join(', ')}`
    );
  }

  const upTotalPaise = upEntriesInKolkata.reduce((s, e) => s + e.amount, 0);
  const floatTotalPaise = allKolkataFloats.reduce((s, f) => s + f.amount, 0);
  const approvedKolkataEntries = genuineKolkataEntries.filter(
    (e) => e.status === 'APPROVED' && !e.isVoid
  );
  const kolkataTotalPaise = approvedKolkataEntries.reduce((s, e) => s + e.amount, 0);
  const expectedNetBalancePaise = floatTotalPaise - kolkataTotalPaise;

  console.log(`Total up_expenses rows in DB: ${upRows.length}`);
  console.log(
    `Kolkata expense_entries: ${allKolkataEntries.length} total = ${upEntriesInKolkata.length} UP (-U) [${formatInrFromPaise(upTotalPaise)}] + ${genuineKolkataEntries.length} Kolkata [${formatInrFromPaise(kolkataTotalPaise)}]`
  );
  console.log(
    `Kolkata float top-ups: ${allKolkataFloats.length} [${formatInrFromPaise(floatTotalPaise)}]`
  );
  console.log(
    `Cash balance before: ${formatInrFromPaise(existingCashBalance?.currentBalance ?? 0)} -> Expected after: ${formatInrFromPaise(expectedNetBalancePaise)} (${expectedNetBalancePaise} paise)`
  );

  // Build clean rollups & ledgers from genuine Kolkata entries & float top-ups
  const dailyRollupMap = new Map<
    string,
    { branchId: string; date: Date; categoryId: string; totalAmount: number; entryCount: number }
  >();
  const monthlyRollupMap = new Map<
    string,
    { branchId: string; year: number; month: number; categoryId: string; totalAmount: number; entryCount: number }
  >();

  for (const e of approvedKolkataEntries) {
    const dateStr = toDateStr(e.date);
    const utcDate = new Date(`${dateStr}T00:00:00.000Z`);
    const year = Number(dateStr.slice(0, 4));
    const month = Number(dateStr.slice(5, 7));

    const dKey = `${dateStr}|${e.categoryId}`;
    const dPrev = dailyRollupMap.get(dKey);
    if (dPrev) {
      dPrev.totalAmount += e.amount;
      dPrev.entryCount += 1;
    } else {
      dailyRollupMap.set(dKey, {
        branchId: TARGET_BRANCH_ID,
        date: utcDate,
        categoryId: e.categoryId,
        totalAmount: e.amount,
        entryCount: 1,
      });
    }

    const mKey = `${year}-${month}|${e.categoryId}`;
    const mPrev = monthlyRollupMap.get(mKey);
    if (mPrev) {
      mPrev.totalAmount += e.amount;
      mPrev.entryCount += 1;
    } else {
      monthlyRollupMap.set(mKey, {
        branchId: TARGET_BRANCH_ID,
        year,
        month,
        categoryId: e.categoryId,
        totalAmount: e.amount,
        entryCount: 1,
      });
    }
  }

  const existingLedgerByDate = new Map<string, (typeof existingLedgers)[number]>();
  for (const l of existingLedgers) {
    existingLedgerByDate.set(toDateStr(l.date), l);
  }

  const ledgerDates = new Set<string>();
  const floatByDate = new Map<string, number>();
  for (const f of allKolkataFloats) {
    const dStr = toDateStr(f.date);
    ledgerDates.add(dStr);
    floatByDate.set(dStr, (floatByDate.get(dStr) || 0) + f.amount);
  }

  const expByDate = new Map<string, number>();
  for (const e of approvedKolkataEntries) {
    const dStr = toDateStr(e.date);
    ledgerDates.add(dStr);
    expByDate.set(dStr, (expByDate.get(dStr) || 0) + e.amount);
  }

  // Preserve any pre-reconciled ledger date even if it has zero entries/floats
  for (const l of existingLedgers) {
    if (l.isReconciled || l.physicalCashCounted != null || l.openingBalance !== 0) {
      ledgerDates.add(toDateStr(l.date));
    }
  }

  const rebuiltLedgers = Array.from(ledgerDates)
    .sort()
    .map((dateStr) => {
      const prev = existingLedgerByDate.get(dateStr);
      const openingBalance = prev?.openingBalance ?? 0;
      const cashReceived = floatByDate.get(dateStr) || 0;
      const totalExpenses = expByDate.get(dateStr) || 0;
      const closingBalance = openingBalance + cashReceived - totalExpenses;
      const physicalCashCounted = prev?.physicalCashCounted ?? null;
      const variance =
        physicalCashCounted != null ? closingBalance - physicalCashCounted : null;

      return {
        branchId: TARGET_BRANCH_ID,
        date: new Date(`${dateStr}T00:00:00.000Z`),
        openingBalance,
        cashReceived,
        totalExpenses,
        closingBalance,
        physicalCashCounted,
        variance,
        isReconciled: prev?.isReconciled ?? false,
        reconciledById: prev?.reconciledById ?? null,
        reconciledAt: prev?.reconciledAt ?? null,
        reconciliationNotes: prev?.reconciliationNotes ?? null,
      };
    });

  console.log(
    `Rebuilt counts -> dailyLedgers: ${rebuiltLedgers.length} (was ${existingLedgers.length}), dailyRollups: ${dailyRollupMap.size} (was ${existingDailyRollups.length}), monthlyRollups: ${monthlyRollupMap.size} (was ${existingMonthlyRollups.length})`
  );

  if (dryRun) {
    console.log('Dry run complete. No changes written.');
    return;
  }

  if (backupPath) {
    const resolvedBackup = path.resolve(backupPath);
    fs.mkdirSync(path.dirname(resolvedBackup), { recursive: true });
    fs.writeFileSync(
      resolvedBackup,
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          branchId: TARGET_BRANCH_ID,
          removedUpEntries: upEntriesInKolkata,
          previousCashBalance: existingCashBalance,
          previousDailyLedgers: existingLedgers,
          previousDailyRollups: existingDailyRollups,
          previousMonthlyRollups: existingMonthlyRollups,
        },
        null,
        2
      ),
      'utf8'
    );
    console.log(`Saved pre-cleanup snapshot to ${resolvedBackup}`);
  }

  const upIds = upEntriesInKolkata.map((e) => e.id);
  const latestActivityDate = [...approvedKolkataEntries, ...allKolkataFloats]
    .map((r) => r.createdAt)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date();

  await prisma.$transaction(
    async (tx) => {
      if (upIds.length > 0) {
        // Detach any audit log references if present before removing UP entries
        await tx.expenseAuditLog.updateMany({
          where: { expenseId: { in: upIds } },
          data: { expenseId: null },
        });

        await tx.expenseEntry.deleteMany({
          where: {
            branchId: TARGET_BRANCH_ID,
            id: { in: upIds },
          },
        });
      }

      await tx.expenseDailyRollup.deleteMany({ where: { branchId: TARGET_BRANCH_ID } });
      if (dailyRollupMap.size > 0) {
        await tx.expenseDailyRollup.createMany({ data: Array.from(dailyRollupMap.values()) });
      }

      await tx.expenseMonthlyRollup.deleteMany({ where: { branchId: TARGET_BRANCH_ID } });
      if (monthlyRollupMap.size > 0) {
        await tx.expenseMonthlyRollup.createMany({ data: Array.from(monthlyRollupMap.values()) });
      }

      await tx.expenseDailyLedger.deleteMany({ where: { branchId: TARGET_BRANCH_ID } });
      if (rebuiltLedgers.length > 0) {
        await tx.expenseDailyLedger.createMany({ data: rebuiltLedgers });
      }

      await tx.branchCashBalance.upsert({
        where: { branchId: TARGET_BRANCH_ID },
        update: {
          currentBalance: expectedNetBalancePaise,
          lastEntryAt: latestActivityDate,
        },
        create: {
          branchId: TARGET_BRANCH_ID,
          currentBalance: expectedNetBalancePaise,
          lastEntryAt: latestActivityDate,
        },
      });
    },
    { timeout: 60000 }
  );

  console.log(
    `Cleanup committed: removed ${upIds.length} UP (-U) entries from ${TARGET_BRANCH_ID}; synchronized rollups, daily ledgers, and cash balance (${formatInrFromPaise(expectedNetBalancePaise)}).`
  );
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
