import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import * as upService from './up.service';
import { exportExpensesToExcel } from './up-export.service';

// ─── 1. Access Check ──────────────────────────────────────────────────────────

export const getAccessStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await upService.checkAccess(req.user!);
    sendSuccess(res, data, 'UP access status retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 2. Dashboard Controller ──────────────────────────────────────────────────

export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const range = (req.query.range as string) || 'month';
    const startDate = (req.query.startDate as string) || (req.query.month as string);
    const endDate = req.query.endDate as string;
    const data = await upService.getDashboard(range, startDate, endDate);
    sendSuccess(res, data, 'UP dashboard metrics retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 3. Expenses CRUD Controllers ─────────────────────────────────────────────

export const listExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await upService.listExpenses(req.query as any);
    sendSuccess(res, data, 'UP expenses retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const getExpenseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await upService.getExpenseById(req.params.id);
    sendSuccess(res, data, 'UP expense retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await upService.createExpense(req.user!.id, req.body);
    sendSuccess(res, data, 'Expense recorded successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await upService.updateExpense(req.user!.id, req.params.id, req.body);
    sendSuccess(res, data, 'Expense updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await upService.deleteExpense(req.user!.id, req.params.id);
    sendSuccess(res, data, data.message);
  } catch (err) {
    next(err);
  }
};

// ─── 4. Verification Action ───────────────────────────────────────────────────

export const verifyExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isUnverify = req.path.endsWith('/unverify');
    const verifyStatus = req.body.verified !== undefined ? Boolean(req.body.verified) : !isUnverify;
    const data = await upService.verifyExpense(req.user!.id, req.params.id, verifyStatus);
    sendSuccess(res, data, data.verified ? 'Expense verified successfully' : 'Expense unverified');
  } catch (err) {
    next(err);
  }
};

export const bulkVerifyExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ids, verified } = req.body;
    const data = await upService.bulkVerifyExpenses(req.user!.id, ids, verified);
    sendSuccess(res, data, `Successfully updated ${data.count} expense records`);
  } catch (err) {
    next(err);
  }
};

// ─── 5. Audit Log ─────────────────────────────────────────────────────────────

export const getExpenseAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await upService.getExpenseAudit(req.params.id);
    sendSuccess(res, data, 'Expense audit trail retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 6. Categories Management ─────────────────────────────────────────────────

export const listCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const data = await upService.listCategories(includeInactive);
    sendSuccess(res, data, 'Categories retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await upService.createCategory(req.user!.id, req.body);
    sendSuccess(res, data, 'Category created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await upService.updateCategory(req.user!.id, req.params.id, req.body);
    sendSuccess(res, data, 'Category updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 7. Daily Cash Reconciliation ─────────────────────────────────────────────

export const getCashStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const data = await upService.getCashStatus(dateStr);
    sendSuccess(res, data, 'Daily cash status retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const listCashDays = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit || 30);
    const data = await upService.listCashDays(limit);
    sendSuccess(res, data, 'Cash days retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const reconcileCash = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await upService.reconcileCash(req.user!.id, req.body);
    sendSuccess(res, data, 'Cash day reconciled successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 8. Export ────────────────────────────────────────────────────────────────

export const exportExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await exportExpensesToExcel(req.query as any, res);
  } catch (err) {
    next(err);
  }
};
