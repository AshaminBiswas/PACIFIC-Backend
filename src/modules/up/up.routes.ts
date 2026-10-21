import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireUPSuperAdmin } from './up.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './up.controller';
import {
  CreateUpExpenseSchema,
  UpdateUpExpenseSchema,
  CreateUpCategorySchema,
  UpdateUpCategorySchema,
  ReconcileCashSchema,
} from './up.schema';

const router = Router();

// ─── STRICT SECURITY POLICY ───────────────────────────────────────────────────
// UP Daily Expense endpoints are strictly restricted to authenticated users
// who possess the 'SUPER_ADMIN' role. All other roles receive 403 Forbidden.
router.use(requireAuth);
router.use(requireUPSuperAdmin);

// ─── 1. Access Check ──────────────────────────────────────────────────────────
router.get('/access', controller.getAccessStatus);

// ─── 2. Dashboard Analytics ───────────────────────────────────────────────────
router.get('/dashboard', controller.getDashboard);

// ─── 3. Categories Management ─────────────────────────────────────────────────
router.get('/categories', controller.listCategories);
router.post('/categories', validate(CreateUpCategorySchema), controller.createCategory);
router.patch('/categories/:id', validate(UpdateUpCategorySchema), controller.updateCategory);

// ─── 4. Daily Petty Cash Reconciliation ───────────────────────────────────────
router.get('/cash/today', controller.getCashStatus);
router.get('/cash/status', controller.getCashStatus);
router.get('/cash', controller.listCashDays);
router.post('/cash/reconcile', validate(ReconcileCashSchema), controller.reconcileCash);

// ─── 5. Reports & Excel Export ────────────────────────────────────────────────
router.get('/reports', controller.listExpenses);
router.get('/reports/export', controller.exportExpenses);

// ─── 6. Bulk Actions ──────────────────────────────────────────────────────────
router.post('/expenses/bulk-verify', controller.bulkVerifyExpenses);

// ─── 7. Expenses CRUD ─────────────────────────────────────────────────────────
router.get('/expenses', controller.listExpenses);
router.post('/expenses', validate(CreateUpExpenseSchema), controller.createExpense);
router.get('/expenses/:id', controller.getExpenseById);
router.patch('/expenses/:id', validate(UpdateUpExpenseSchema), controller.updateExpense);
router.delete('/expenses/:id', controller.deleteExpense);

// ─── 8. Verification Actions ──────────────────────────────────────────────────
router.post('/expenses/:id/verify', controller.verifyExpense);
router.post('/expenses/:id/unverify', controller.verifyExpense);

// ─── 9. Immutable Audit Trail ─────────────────────────────────────────────────
router.get('/expenses/:id/audit', controller.getExpenseAudit);

export default router;
