import prisma from '../../config/database';
import type {
  CreateUpExpenseInput,
  UpdateUpExpenseInput,
  ListUpExpensesQuery,
  CreateUpCategoryInput,
  UpdateUpCategoryInput,
  ReconcileCashInput,
} from './up.schema';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

// ─── 1. Super Admin Access Status ───────────────────────────────────────────

export const checkAccess = async (user: { id: string; role?: string }) => {
  const roleClean = (user.role || '').toUpperCase().replace(/[-_]/g, '');
  const isSuper = roleClean === 'SUPERADMIN';
  return { hasAccess: isSuper, isSuperAdmin: isSuper };
};

// ─── 2. Categories Management ─────────────────────────────────────────────────

export const listCategories = async (includeInactive: boolean = false) => {
  const whereClause = includeInactive ? '' : 'WHERE "active" = true';
  const categories = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      c.id,
      c.name,
      c.active,
      c.sort_order as "sortOrder",
      c.created_at as "createdAt",
      c.updated_at as "updatedAt",
      COUNT(e.id)::int as "expenseCount"
    FROM "up_expense_categories" c
    LEFT JOIN "up_expenses" e ON e."category_id" = c.id AND e."deleted_at" IS NULL
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC;
  `);

  return categories;
};

export const createCategory = async (userId: string, input: CreateUpCategoryInput) => {
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM "up_expense_categories" WHERE LOWER(name) = LOWER($1) LIMIT 1;`,
    input.name.trim()
  );

  if (existing.length > 0) {
    throw new AppError(`Category '${input.name}' already exists`, 409);
  }

  const result = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "up_expense_categories" ("id", "name", "active", "sort_order", "created_by", "created_at", "updated_at")
     VALUES (gen_random_uuid(), $1, true, $2, $3::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING *;`,
    input.name.trim(),
    input.sortOrder || 0,
    userId
  );

  return result[0];
};

export const updateCategory = async (userId: string, id: string, input: UpdateUpCategoryInput) => {
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "up_expense_categories" WHERE id = $1::uuid LIMIT 1;`,
    id
  );

  if (existing.length === 0) {
    throw new AppError('Category not found', 404);
  }

  const fields: string[] = ['"updated_at" = CURRENT_TIMESTAMP'];
  const values: any[] = [id];
  let idx = 2;

  if (input.name !== undefined) {
    fields.push(`"name" = $${idx++}`);
    values.push(input.name.trim());
  }
  if (input.active !== undefined) {
    fields.push(`"active" = $${idx++}`);
    values.push(input.active);
  }
  if (input.sortOrder !== undefined) {
    fields.push(`"sort_order" = $${idx++}`);
    values.push(input.sortOrder);
  }

  const updated = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE "up_expense_categories" SET ${fields.join(', ')} WHERE id = $1::uuid RETURNING *;`,
    ...values
  );

  return updated[0];
};

// ─── 3. Expenses CRUD & Transactional Audit ───────────────────────────────────

export const listExpenses = async (query: ListUpExpensesQuery) => {
  const page = Number(query.page || 1);
  const limit = Math.min(500, Number(query.limit || 50));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['e."deleted_at" IS NULL'];
  const values: any[] = [];
  let paramIdx = 1;

  if (query.startDate) {
    conditions.push(`e."expense_date" >= $${paramIdx++}::date`);
    values.push(query.startDate);
  }
  if (query.endDate) {
    conditions.push(`e."expense_date" <= $${paramIdx++}::date`);
    values.push(query.endDate);
  }
  if (query.categoryId) {
    conditions.push(`e."category_id" = $${paramIdx++}::uuid`);
    values.push(query.categoryId);
  }
  if (query.paymentMode) {
    conditions.push(`LOWER(e."payment_mode") = LOWER($${paramIdx++})`);
    values.push(query.paymentMode);
  }
  if (query.verified && query.verified !== 'all') {
    conditions.push(`e."verified" = $${paramIdx++}::boolean`);
    values.push(query.verified === 'true');
  }
  if (query.search && query.search.trim()) {
    conditions.push(`(e."paid_to" ILIKE $${paramIdx} OR e."note" ILIKE $${paramIdx})`);
    values.push(`%${query.search.trim()}%`);
    paramIdx++;
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 1. Data query
  const items = await prisma.$queryRawUnsafe<any[]>(
    `SELECT
       e.id,
       e.expense_date as "expenseDate",
       e.amount::numeric as amount,
       e.category_id as "categoryId",
       c.name as "categoryName",
       e.payment_mode as "paymentMode",
       e.paid_to as "paidTo",
       e.note,
       e.receipt_path as "receiptPath",
       e.verified,
       e.verified_by as "verifiedBy",
       e.verified_at as "verifiedAt",
       vb."firstName" as "verifiedByFirstName",
       vb."lastName" as "verifiedByLastName",
       e.created_by as "createdBy",
       cb."firstName" as "createdByFirstName",
       cb."lastName" as "createdByLastName",
       e.created_at as "createdAt",
       e.updated_at as "updatedAt"
     FROM "up_expenses" e
     JOIN "up_expense_categories" c ON c.id = e.category_id
     LEFT JOIN "users" cb ON cb.id = e.created_by::text
     LEFT JOIN "users" vb ON vb.id = e.verified_by::text
     ${whereSql}
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT ${limit} OFFSET ${offset};`,
    ...values
  );

  // 2. Count query
  const countResult = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(e.id)::int as total, COALESCE(SUM(e.amount), 0)::numeric as "totalAmount"
     FROM "up_expenses" e
     ${whereSql};`,
    ...values
  );

  const total = countResult[0]?.total || 0;
  const totalAmount = Number(countResult[0]?.totalAmount || 0);

  return {
    items: items.map((i) => ({
      ...i,
      amount: Number(i.amount),
      expenseDate: i.expenseDate instanceof Date ? i.expenseDate.toISOString().split('T')[0] : String(i.expenseDate).split('T')[0],
      verifiedByName: i.verifiedByFirstName ? `${i.verifiedByFirstName} ${i.verifiedByLastName || ''}`.trim() : null,
      createdByName: i.createdByFirstName ? `${i.createdByFirstName} ${i.createdByLastName || ''}`.trim() : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      totalAmount,
    },
  };
};

export const getExpenseById = async (id: string) => {
  const expenses = await prisma.$queryRawUnsafe<any[]>(
    `SELECT
       e.id,
       e.expense_date as "expenseDate",
       e.amount::numeric as amount,
       e.category_id as "categoryId",
       c.name as "categoryName",
       e.payment_mode as "paymentMode",
       e.paid_to as "paidTo",
       e.note,
       e.receipt_path as "receiptPath",
       e.verified,
       e.verified_by as "verifiedBy",
       e.verified_at as "verifiedAt",
       vb."firstName" as "verifiedByFirstName",
       vb."lastName" as "verifiedByLastName",
       e.created_by as "createdBy",
       cb."firstName" as "createdByFirstName",
       cb."lastName" as "createdByLastName",
       e.created_at as "createdAt",
       e.updated_at as "updatedAt"
     FROM "up_expenses" e
     JOIN "up_expense_categories" c ON c.id = e.category_id
     LEFT JOIN "users" cb ON cb.id = e.created_by::text
     LEFT JOIN "users" vb ON vb.id = e.verified_by::text
     WHERE e.id = $1::uuid AND e.deleted_at IS NULL
     LIMIT 1;`,
    id
  );

  if (expenses.length === 0) {
    throw new AppError('Expense record not found', 404);
  }

  const exp = expenses[0];
  return {
    ...exp,
    amount: Number(exp.amount),
    expenseDate: exp.expenseDate instanceof Date ? exp.expenseDate.toISOString().split('T')[0] : String(exp.expenseDate).split('T')[0],
    verifiedByName: exp.verifiedByFirstName ? `${exp.verifiedByFirstName} ${exp.verifiedByLastName || ''}`.trim() : null,
    createdByName: exp.createdByFirstName ? `${exp.createdByFirstName} ${exp.createdByLastName || ''}`.trim() : null,
  };
};

export const createExpense = async (userId: string, input: CreateUpExpenseInput) => {
  // Validate category
  const cat = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name FROM "up_expense_categories" WHERE id = $1::uuid AND active = true LIMIT 1;`,
    input.categoryId
  );
  if (cat.length === 0) {
    throw new AppError('Selected category does not exist or is inactive', 400);
  }

  const expenseId = (
    await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "up_expenses" (
         "id", "expense_date", "amount", "category_id", "payment_mode",
         "paid_to", "note", "receipt_path", "verified", "created_by",
         "created_at", "updated_at"
       ) VALUES (
         gen_random_uuid(), $1::date, $2::numeric, $3::uuid, $4,
         $5, $6, $7, false, $8::uuid,
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )
       RETURNING "id";`,
      input.expenseDate,
      input.amount,
      input.categoryId,
      input.paymentMode || 'cash',
      input.paidTo.trim(),
      input.note ?? null,
      input.receiptPath ?? null,
      userId
    )
  )[0].id;

  const created = await getExpenseById(expenseId);

  // Write audit trail
  await prisma.$executeRawUnsafe(
    `INSERT INTO "up_expense_audit" ("id", "expense_id", "action", "changed_by", "after_json", "created_at")
     VALUES (gen_random_uuid(), $1::uuid, 'CREATE', $2::uuid, $3::jsonb, CURRENT_TIMESTAMP);`,
    expenseId,
    userId,
    JSON.stringify(created)
  );

  return created;
};

export const updateExpense = async (userId: string, id: string, input: UpdateUpExpenseInput) => {
  const current = await getExpenseById(id);

  if (input.categoryId) {
    const cat = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "up_expense_categories" WHERE id = $1::uuid AND active = true LIMIT 1;`,
      input.categoryId
    );
    if (cat.length === 0) {
      throw new AppError('Selected category does not exist or is inactive', 400);
    }
  }

  const fields: string[] = ['"updated_at" = CURRENT_TIMESTAMP'];
  const values: any[] = [id];
  let idx = 2;

  if (input.expenseDate !== undefined) {
    fields.push(`"expense_date" = $${idx++}::date`);
    values.push(input.expenseDate);
  }
  if (input.amount !== undefined) {
    fields.push(`"amount" = $${idx++}::numeric`);
    values.push(input.amount);
  }
  if (input.categoryId !== undefined) {
    fields.push(`"category_id" = $${idx++}::uuid`);
    values.push(input.categoryId);
  }
  if (input.paymentMode !== undefined) {
    fields.push(`"payment_mode" = $${idx++}`);
    values.push(input.paymentMode);
  }
  if (input.paidTo !== undefined) {
    fields.push(`"paid_to" = $${idx++}`);
    values.push(input.paidTo.trim());
  }
  if (input.note !== undefined) {
    fields.push(`"note" = $${idx++}`);
    values.push(input.note);
  }
  if (input.receiptPath !== undefined) {
    fields.push(`"receipt_path" = $${idx++}`);
    values.push(input.receiptPath);
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "up_expenses" SET ${fields.join(', ')} WHERE id = $1::uuid;`,
    ...values
  );

  const updated = await getExpenseById(id);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "up_expense_audit" ("id", "expense_id", "action", "changed_by", "before_json", "after_json", "created_at")
     VALUES (gen_random_uuid(), $1::uuid, 'UPDATE', $2::uuid, $3::jsonb, $4::jsonb, CURRENT_TIMESTAMP);`,
    id,
    userId,
    JSON.stringify(current),
    JSON.stringify(updated)
  );

  return updated;
};

export const deleteExpense = async (userId: string, id: string) => {
  const current = await getExpenseById(id);

  await prisma.$executeRawUnsafe(
    `UPDATE "up_expenses" SET "deleted_at" = CURRENT_TIMESTAMP WHERE id = $1::uuid;`,
    id
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "up_expense_audit" ("id", "expense_id", "action", "changed_by", "before_json", "created_at")
     VALUES (gen_random_uuid(), $1::uuid, 'DELETE', $2::uuid, $3::jsonb, CURRENT_TIMESTAMP);`,
    id,
    userId,
    JSON.stringify(current)
  );

  return { success: true, message: 'Expense deleted successfully' };
};

export const verifyExpense = async (userId: string, id: string, verifyStatus?: boolean) => {
  const current = await getExpenseById(id);
  const targetStatus = verifyStatus !== undefined ? verifyStatus : !current.verified;

  await prisma.$executeRawUnsafe(
    `UPDATE "up_expenses"
     SET "verified" = $1,
         "verified_by" = CASE WHEN $1 = true THEN $2::uuid ELSE NULL END,
         "verified_at" = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
         "updated_at" = CURRENT_TIMESTAMP
     WHERE id = $3::uuid;`,
    targetStatus,
    userId,
    id
  );

  const updated = await getExpenseById(id);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "up_expense_audit" ("id", "expense_id", "action", "changed_by", "before_json", "after_json", "created_at")
     VALUES (gen_random_uuid(), $1::uuid, $2, $3::uuid, $4::jsonb, $5::jsonb, CURRENT_TIMESTAMP);`,
    id,
    targetStatus ? 'VERIFY' : 'UNVERIFY',
    userId,
    JSON.stringify(current),
    JSON.stringify(updated)
  );

  return updated;
};

export const bulkVerifyExpenses = async (userId: string, expenseIds: string[], verified: boolean = true) => {
  if (!expenseIds || expenseIds.length === 0) return { success: true, count: 0 };

  for (const id of expenseIds) {
    try {
      await verifyExpense(userId, id, verified);
    } catch {}
  }

  return { success: true, count: expenseIds.length };
};

export const getExpenseAudit = async (expenseId: string) => {
  const audits = await prisma.$queryRawUnsafe<any[]>(
    `SELECT
       a.id,
       a.expense_id as "expenseId",
       a.action,
       a.changed_by as "changedBy",
       u."firstName" as "changedByFirstName",
       u."lastName" as "changedByLastName",
       a.before_json as "beforeJson",
       a.after_json as "afterJson",
       a.created_at as "createdAt"
     FROM "up_expense_audit" a
     LEFT JOIN "users" u ON u.id = a.changed_by::text
     WHERE a.expense_id = $1::uuid
     ORDER BY a.created_at DESC;`,
    expenseId
  );

  return audits.map((a) => ({
    id: a.id,
    expenseId: a.expenseId,
    action: a.action,
    changedBy: a.changedBy,
    changedByName: a.changedByFirstName ? `${a.changedByFirstName} ${a.changedByLastName || ''}`.trim() : 'Super Admin',
    beforeJson: a.beforeJson,
    afterJson: a.afterJson,
    createdAt: a.createdAt,
  }));
};

// ─── 4. Dashboard Analytics & Rollup ──────────────────────────────────────────

export const getDashboard = async (range: string = 'month', startDate?: string, endDate?: string) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStr = now.toISOString().split('T')[0];

  const startOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1)).toISOString().split('T')[0];
  const endOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).toISOString().split('T')[0];

  let rangeStart = '';
  let rangeEnd = '';
  let prevStart = '';
  let prevEnd = '';

  if (range === 'custom' && startDate && endDate) {
    rangeStart = startDate;
    rangeEnd = endDate;
    const diff = Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
    prevStart = new Date(new Date(startDate).getTime() - diff * 86400000).toISOString().split('T')[0];
    prevEnd = new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0];
  } else if (range === 'year') {
    rangeStart = `${currentYear}-01-01`;
    rangeEnd = `${currentYear}-12-31`;
    prevStart = `${currentYear - 1}-01-01`;
    prevEnd = `${currentYear - 1}-12-31`;
  } else if (range === 'today') {
    rangeStart = todayStr;
    rangeEnd = todayStr;
    const yDay = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    prevStart = yDay;
    prevEnd = yDay;
  } else if (range === 'month' && startDate && startDate.includes('-') && startDate.length === 7) {
    // Exact month string (e.g. "2026-09")
    const [y, m] = startDate.split('-').map(Number);
    rangeStart = new Date(Date.UTC(y, m - 1, 1)).toISOString().split('T')[0];
    rangeEnd = new Date(Date.UTC(y, m, 0)).toISOString().split('T')[0];
    prevStart = new Date(Date.UTC(y, m - 2, 1)).toISOString().split('T')[0];
    prevEnd = new Date(Date.UTC(y, m - 1, 0)).toISOString().split('T')[0];
  } else {
    // Default current month
    rangeStart = startOfCurrentMonth;
    rangeEnd = endOfCurrentMonth;
    prevStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).toISOString().split('T')[0];
    prevEnd = new Date(Date.UTC(currentYear, currentMonth, 0)).toISOString().split('T')[0];
  }

  const sDate = new Date(`${rangeStart}T00:00:00Z`);
  const eDate = new Date(`${rangeEnd}T00:00:00Z`);
  const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / 86400000) + 1);

  // 1. KPI Aggregations
  const kpis = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      COALESCE(SUM(CASE WHEN expense_date >= '${startOfCurrentMonth}'::date AND expense_date <= '${endOfCurrentMonth}'::date THEN amount ELSE 0 END), 0)::numeric as "currentMonthTotal",
      COALESCE(SUM(CASE WHEN expense_date = '${todayStr}'::date THEN amount ELSE 0 END), 0)::numeric as "todayTotal",
      COALESCE(SUM(CASE WHEN expense_date >= '${prevStart}'::date AND expense_date <= '${prevEnd}'::date THEN amount ELSE 0 END), 0)::numeric as "previousPeriodTotal",
      COALESCE(SUM(CASE WHEN expense_date >= '${rangeStart}'::date AND expense_date <= '${rangeEnd}'::date AND verified = true THEN amount ELSE 0 END), 0)::numeric as "verifiedTotal",
      COALESCE(SUM(CASE WHEN expense_date >= '${rangeStart}'::date AND expense_date <= '${rangeEnd}'::date AND verified = false THEN amount ELSE 0 END), 0)::numeric as "unverifiedTotal",
      COALESCE(SUM(CASE WHEN expense_date >= '${rangeStart}'::date AND expense_date <= '${rangeEnd}'::date THEN amount ELSE 0 END), 0)::numeric as "rangeTotal",
      COUNT(CASE WHEN expense_date >= '${rangeStart}'::date AND expense_date <= '${rangeEnd}'::date THEN id END)::int as "rangeCount",
      COALESCE(MAX(CASE WHEN expense_date >= '${rangeStart}'::date AND expense_date <= '${rangeEnd}'::date THEN amount ELSE 0 END), 0)::numeric as "highestExpense"
    FROM "up_expenses"
    WHERE "deleted_at" IS NULL;
  `);

  const kpiData = kpis[0] || {};
  const rangeTotal = Number(kpiData.rangeTotal || 0);
  const rangeCount = Number(kpiData.rangeCount || 0);

  // 2. Peak Expense Detail
  const peakRows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      e.amount,
      e.expense_date as "date",
      e.paid_to as "paidTo",
      c.name as "categoryName"
    FROM "up_expenses" e
    LEFT JOIN "up_expense_categories" c ON c.id = e.category_id
    WHERE e.deleted_at IS NULL
      AND e.expense_date >= '${rangeStart}'::date
      AND e.expense_date <= '${rangeEnd}'::date
    ORDER BY e.amount DESC
    LIMIT 1;
  `);

  const peakItem = peakRows[0] || null;

  // 3. Category Breakdown
  const categoryRows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      c.id,
      c.name,
      COALESCE(SUM(e.amount), 0)::numeric as total,
      COUNT(e.id)::int as count
    FROM "up_expense_categories" c
    LEFT JOIN "up_expenses" e ON e.category_id = c.id
      AND e.deleted_at IS NULL
      AND e.expense_date >= '${rangeStart}'::date
      AND e.expense_date <= '${rangeEnd}'::date
    WHERE c.active = true
    GROUP BY c.id, c.name
    ORDER BY total DESC;
  `);

  const categoryBreakdown = categoryRows.map((cat) => {
    const total = Number(cat.total || 0);
    const pct = rangeTotal > 0 ? Number(((total / rangeTotal) * 100).toFixed(1)) : 0;
    return {
      id: cat.id,
      name: cat.name,
      total,
      count: Number(cat.count || 0),
      percentage: pct,
    };
  });

  // 4. Trend Velocity Query
  const trendRows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      expense_date as "date",
      COALESCE(SUM(amount), 0)::numeric as total,
      COUNT(id)::int as count
    FROM "up_expenses"
    WHERE deleted_at IS NULL
      AND expense_date >= '${rangeStart}'::date
      AND expense_date <= '${rangeEnd}'::date
    GROUP BY expense_date
    ORDER BY expense_date ASC;
  `);

  const trendMap = new Map<string, { total: number; count: number }>();
  for (const t of trendRows) {
    const dStr = t.date instanceof Date ? t.date.toISOString().split('T')[0] : String(t.date).slice(0, 10);
    trendMap.set(dStr, {
      total: Number(t.total || 0),
      count: Number(t.count || 0),
    });
  }

  let trend: { date: string; total: number; count: number }[] = [];
  if (diffDays <= 62) {
    const iter = new Date(sDate);
    while (iter <= eDate) {
      const dStr = iter.toISOString().split('T')[0];
      const match = trendMap.get(dStr);
      trend.push({
        date: dStr,
        total: match ? match.total : 0,
        count: match ? match.count : 0,
      });
      iter.setUTCDate(iter.getUTCDate() + 1);
    }
  } else {
    trend = trendRows.map((t) => ({
      date: t.date instanceof Date ? t.date.toISOString().split('T')[0] : String(t.date).slice(0, 10),
      total: Number(t.total || 0),
      count: Number(t.count || 0),
    }));
  }

  // 5. Top 5 Largest Expenditures
  const topExpensesRows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      e.id,
      e.amount,
      e.expense_date as "expenseDate",
      e.paid_to as "paidTo",
      e.note,
      e.payment_mode as "paymentMode",
      e.verified,
      c.name as "categoryName"
    FROM "up_expenses" e
    LEFT JOIN "up_expense_categories" c ON c.id = e.category_id
    WHERE e.deleted_at IS NULL
      AND e.expense_date >= '${rangeStart}'::date
      AND e.expense_date <= '${rangeEnd}'::date
    ORDER BY e.amount DESC
    LIMIT 5;
  `);

  const topExpenses = topExpensesRows.map((e) => ({
    id: e.id,
    amount: Number(e.amount),
    expenseDate: e.expenseDate instanceof Date ? e.expenseDate.toISOString().split('T')[0] : String(e.expenseDate).slice(0, 10),
    paidTo: e.paidTo,
    note: e.note || null,
    paymentMode: e.paymentMode || 'cash',
    verified: Boolean(e.verified),
    categoryName: e.categoryName || 'General',
  }));

  return {
    kpis: {
      currentMonthTotal: Number(kpiData.currentMonthTotal || 0),
      todayTotal: Number(kpiData.todayTotal || 0),
      previousMonthTotal: Number(kpiData.previousPeriodTotal || 0),
      previousPeriodTotal: Number(kpiData.previousPeriodTotal || 0),
      verifiedTotal: Number(kpiData.verifiedTotal || 0),
      unverifiedTotal: Number(kpiData.unverifiedTotal || 0),
      rangeTotal,
      transactionCount: rangeCount,
      highestExpense: Number(kpiData.highestExpense || 0),
      highestExpenseDate: peakItem?.date ? (peakItem.date instanceof Date ? peakItem.date.toISOString().split('T')[0] : String(peakItem.date).slice(0, 10)) : null,
      highestExpensePaidTo: peakItem?.paidTo || null,
      highestExpenseCategory: peakItem?.categoryName || null,
      averageDailyExpense: rangeCount > 0 ? Number((rangeTotal / diffDays).toFixed(2)) : 0,
      topCategory: categoryBreakdown[0]?.name || 'None',
    },
    categoryBreakdown,
    trend,
    topExpenses,
    range: {
      type: range,
      startDate: rangeStart,
      endDate: rangeEnd,
      diffDays,
    },
  };
};

// ─── 5. Daily Cash Reconciliation Service ─────────────────────────────────────

export const getCashStatus = async (dateStr: string) => {
  // 1. Calculate today's cash expenses
  const expRes = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COALESCE(SUM(amount), 0)::numeric as "cashExpenses"
     FROM "up_expenses"
     WHERE expense_date = $1::date
       AND LOWER(payment_mode) = 'cash'
       AND deleted_at IS NULL;`,
    dateStr
  );
  const cashExpenses = Number(expRes[0]?.cashExpenses || 0);

  // 2. Fetch cash day record for date
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT
       cd.*,
       u."firstName" as "closedByFirstName",
       u."lastName" as "closedByLastName"
     FROM "up_cash_days" cd
     LEFT JOIN "users" u ON u.id = cd.closed_by::text
     WHERE cd.cash_date = $1::date
     LIMIT 1;`,
    dateStr
  );

  if (rows.length > 0) {
    const cd = rows[0];
    const opening = Number(cd.opening_balance || 0);
    const floatReceived = 0; // Float top-up if any
    const expected = Number(opening + floatReceived - cashExpenses);
    const actual = cd.closing_balance !== null ? Number(cd.closing_balance) : null;
    const diff = actual !== null ? Number(actual - expected) : null;

    return {
      cashDate: dateStr,
      openingBalance: opening,
      cashExpenses,
      floatReceived,
      expectedClosingBalance: expected,
      actualClosing: actual,
      closingBalance: actual,
      difference: diff,
      notes: cd.notes,
      closed: Boolean(cd.closed),
      closedBy: cd.closedByFirstName ? `${cd.closedByFirstName} ${cd.closedByLastName || ''}`.trim() : null,
      closedAt: cd.closed_at,
    };
  }

  // 3. Fallback: previous closed day's closing balance as default opening
  const prevClosed = await prisma.$queryRawUnsafe<any[]>(
    `SELECT closing_balance
     FROM "up_cash_days"
     WHERE cash_date < $1::date AND closed = true AND closing_balance IS NOT NULL
     ORDER BY cash_date DESC
     LIMIT 1;`,
    dateStr
  );

  const suggestedOpening = prevClosed.length > 0 ? Number(prevClosed[0].closing_balance) : 0;
  const expected = Number(suggestedOpening - cashExpenses);

  return {
    cashDate: dateStr,
    openingBalance: suggestedOpening,
    cashExpenses,
    floatReceived: 0,
    expectedClosingBalance: expected,
    actualClosing: null,
    closingBalance: null,
    difference: null,
    notes: null,
    closed: false,
    closedBy: null,
    closedAt: null,
  };
};

export const reconcileCash = async (userId: string, input: ReconcileCashInput) => {
  const current = await getCashStatus(input.cashDate);

  if (current.closed) {
    throw new AppError('This cash day is already closed and locked', 400);
  }

  const opening = input.openingBalance !== undefined ? Number(input.openingBalance) : current.openingBalance;
  const actual = input.actualClosing !== undefined && input.actualClosing !== null ? Number(input.actualClosing) : current.actualClosing;
  const expected = Number(opening - current.cashExpenses);
  const diff = actual !== null ? Number(actual - expected) : null;
  const isClosing = Boolean(input.closed);

  await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO "up_cash_days" (
       "id", "cash_date", "opening_balance", "closing_balance",
       "expected_closing_balance", "difference", "notes", "closed",
       "closed_by", "closed_at", "created_at", "updated_at"
     ) VALUES (
       gen_random_uuid(), $1::date, $2::numeric, $3::numeric,
       $4::numeric, $5::numeric, $6, $7::boolean,
       CASE WHEN $7::boolean THEN $8::uuid ELSE NULL END,
       CASE WHEN $7::boolean THEN CURRENT_TIMESTAMP ELSE NULL END,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     )
     ON CONFLICT ("cash_date") DO UPDATE
     SET "opening_balance" = EXCLUDED."opening_balance",
         "closing_balance" = EXCLUDED."closing_balance",
         "expected_closing_balance" = EXCLUDED."expected_closing_balance",
         "difference" = EXCLUDED."difference",
         "notes" = COALESCE(EXCLUDED."notes", "up_cash_days"."notes"),
         "closed" = EXCLUDED."closed",
         "closed_by" = EXCLUDED."closed_by",
         "closed_at" = EXCLUDED."closed_at",
         "updated_at" = CURRENT_TIMESTAMP
     RETURNING *;`,
    input.cashDate,
    opening,
    actual,
    expected,
    diff,
    input.notes ?? null,
    isClosing,
    userId
  );

  return getCashStatus(input.cashDate);
};

export const listCashDays = async (limit: number = 30) => {
  const days = await prisma.$queryRawUnsafe<any[]>(
    `SELECT
       cd.*,
       COALESCE((
         SELECT SUM(e.amount)
         FROM "up_expenses" e
         WHERE e.expense_date = cd.cash_date
           AND LOWER(e.payment_mode) = 'cash'
           AND e.deleted_at IS NULL
       ), 0)::numeric as "cash_expenses",
       u."firstName" as "closedByFirstName",
       u."lastName" as "closedByLastName"
     FROM "up_cash_days" cd
     LEFT JOIN "users" u ON u.id = cd.closed_by::text
     ORDER BY cd.cash_date DESC
     LIMIT $1;`,
    limit
  );

  return days.map((d) => {
    const opening = Number(d.opening_balance || 0);
    const expenses = Number(d.cash_expenses || 0);
    const expected = d.expected_closing_balance !== null
      ? Number(d.expected_closing_balance)
      : (opening - expenses);
    const actual = d.closing_balance !== null ? Number(d.closing_balance) : null;
    const diff = d.difference !== null
      ? Number(d.difference)
      : (actual !== null ? (actual - expected) : null);

    return {
      id: d.id,
      cashDate: d.cash_date ? (typeof d.cash_date.toISOString === 'function' ? d.cash_date.toISOString().split('T')[0] : String(d.cash_date).split('T')[0]) : '',
      openingBalance: opening,
      cashExpenses: expenses,
      floatReceived: 0,
      closingBalance: actual,
      actualClosing: actual,
      expectedClosingBalance: expected,
      difference: diff,
      notes: d.notes,
      closed: Boolean(d.closed),
      closedByName: d.closedByFirstName ? `${d.closedByFirstName} ${d.closedByLastName || ''}`.trim() : null,
      closedAt: d.closed_at,
    };
  });
};
