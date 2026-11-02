import { Request, Response, NextFunction } from 'express';
import { ExpensesService } from './expenses.service';
import {
  CreateExpenseSchema,
  UpdateExpenseSchema,
  DeleteExpenseSchema,
  BatchSyncExpensesSchema,
  ExpenseFilterQuerySchema,
  ApproveExpenseSchema,
  RejectExpenseSchema,
  VoidExpenseSchema,
  DailyReconciliationSchema,
  FloatTopUpSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  ExpenseSettingsSchema,
  ExportReportQuerySchema,
} from './expenses.schema';
import { streamWorkbookToResponse } from './expenses-export.service';
import { uploadAttachmentFile } from './expenses-upload.service';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export class ExpensesController {
  // ─── 1. Create Expense ───────────────────────────────────────────────────────
  static async createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateExpenseSchema.parse(req.body);
      const userId = ((req as any).user)?.id || '5c4569f6-c6e8-484f-bf6b-c4fd3cf85d21';

      const result = await ExpensesService.createExpense(input, userId);
      res.status(201).json({
        success: true,
        message: result.isDuplicate
          ? 'Duplicate offline submission safely deduplicated'
          : 'Expense logged successfully',
        data: result.expense,
        budgetWarning: result.budgetWarning,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 2. Batch Offline Sync ───────────────────────────────────────────────────
  static async batchSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entries } = BatchSyncExpensesSchema.parse(req.body);
      const userId = ((req as any).user)?.id || '5c4569f6-c6e8-484f-bf6b-c4fd3cf85d21';

      const result = await ExpensesService.batchSync(entries, userId);
      res.status(200).json({
        success: true,
        message: `Batch sync complete: ${result.syncedCount} inserted, ${result.duplicateCount} deduplicated, ${result.errorCount} errors.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 3. List Expenses (Cursor-Based Pagination) ──────────────────────────────
  static async getExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ExpenseFilterQuerySchema.parse(req.query);
      const result = await ExpensesService.getExpenses(query);
      res.status(200).json({
        success: true,
        data: result.entries,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 4. Live Running Balance & Today's Summary ───────────────────────────────
  static async getLiveBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.params.branchId;
      if (!branchId) throw new AppError('VALIDATION_ERROR', 'Branch ID is required', 400);

      const balance = await ExpensesService.getLiveBalance(branchId);
      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 5. Super Admin Multi-Branch Summary ─────────────────────────────────────
  static async getMultiBranchSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await ExpensesService.getMultiBranchSummary();
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 6. Single Expense Detail & Audit History ────────────────────────────────
  static async getExpenseById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const expense = await prisma.expenseEntry.findUnique({
        where: { id },
        include: {
          category: true,
          branch: true,
          addedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          voidedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          employee: { select: { id: true, employeeId: true, name: true, phone: true } },
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            include: {
              performedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      });

      if (!expense) throw new AppError('NOT_FOUND', 'Expense record not found', 404);

      res.status(200).json({
        success: true,
        data: expense,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 7. Approve Expense ──────────────────────────────────────────────────────
  static async approveExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = ApproveExpenseSchema.parse(req.body || {});
      const userId = ((req as any).user)?.id || '5c4569f6-c6e8-484f-bf6b-c4fd3cf85d21';

      const updated = await ExpensesService.approveExpense(id, userId, notes);
      res.status(200).json({
        success: true,
        message: 'Expense approved and ledger balance updated',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 8. Reject Expense ───────────────────────────────────────────────────────
  static async rejectExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { rejectionReason } = RejectExpenseSchema.parse(req.body);
      const userId = ((req as any).user)?.id || '5c4569f6-c6e8-484f-bf6b-c4fd3cf85d21';

      const updated = await ExpensesService.rejectExpense(id, rejectionReason, userId);
      res.status(200).json({
        success: true,
        message: 'Expense entry rejected',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 9. Void Expense ─────────────────────────────────────────────────────────
  static async voidExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { voidReason } = VoidExpenseSchema.parse(req.body);
      const userId = ((req as any).user)?.id || '5c4569f6-c6e8-484f-bf6b-c4fd3cf85d21';

      const voided = await ExpensesService.voidExpense(id, voidReason, userId);
      res.status(200).json({
        success: true,
        message: 'Expense voided and balance reversal applied',
        data: voided,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 9b. Update Expense ──────────────────────────────────────────────────────
  static async updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = UpdateExpenseSchema.parse(req.body);
      const userId = ((req as any).user)?.id || '5c4569f6-c6e8-484f-bf6b-c4fd3cf85d21';

      const updated = await ExpensesService.updateExpense(id, input, userId);
      res.status(200).json({
        success: true,
        message: 'Expense entry updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 9c. Delete Expense (Super Admin Only) ───────────────────────────────────
  static async deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = DeleteExpenseSchema.parse(req.body || {});
      const userId = ((req as any).user)?.id || '5c4569f6-c6e8-484f-bf6b-c4fd3cf85d21';

      const result = await ExpensesService.deleteExpense(id, reason, userId);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 9d. Upload Expense Receipt / Voucher Slip ───────────────────────────────
  static async uploadReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('NO_FILE', 'No receipt image or PDF file provided', 400);
      }
      const url = await uploadAttachmentFile(req.file, 'expense-receipts');
      res.status(201).json({
        success: true,
        message: 'Receipt slip uploaded successfully',
        data: { url, fileName: req.file.originalname, size: req.file.size },
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 10. Daily Closing Reconciliation ────────────────────────────────────────
  static async reconcileDaily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = DailyReconciliationSchema.parse(req.body);
      const userId = ((req as any).user)?.id || '5c4569f6-c6e8-484f-bf6b-c4fd3cf85d21';

      const reconciled = await ExpensesService.reconcileDaily(input, userId);
      res.status(200).json({
        success: true,
        message: 'Daily closing reconciliation completed and locked',
        data: reconciled,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 11. Mid-Day Float Top-Up ────────────────────────────────────────────────
  static async addFloatTopUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = FloatTopUpSchema.parse(req.body);
      const userId = ((req as any).user)?.id || '5c4569f6-c6e8-484f-bf6b-c4fd3cf85d21';

      const topUp = await ExpensesService.addFloatTopUp(input, userId);
      res.status(201).json({
        success: true,
        message: 'Cash float top-up recorded and added to cash-in-hand',
        data: topUp,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 11b. List Float Top-Up History ──────────────────────────────────────────
  static async getFloatTopUps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;

      const result = await ExpensesService.getFloatTopUps({ branchId, startDate, endDate, limit, cursor });
      res.status(200).json({
        success: true,
        data: result.records,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 11c. Delete Float Top-Up (Super Admin Only) ──────────────────────────────
  static async deleteFloatTopUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = ((req as any).user)?.id || '5c4569f6-c6e8-484f-bf6b-c4fd3cf85d21';

      const result = await ExpensesService.deleteFloatTopUp(id, userId);
      res.status(200).json({
        success: true,
        message: result.message,
        reversedAmount: result.reversedAmount,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 12. Category Master ─────────────────────────────────────────────────────
  static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const month = req.query.month ? Number(req.query.month) : undefined;
      const branchId = req.query.branchId ? String(req.query.branchId) : undefined;

      const includeSpend = year && month ? { year, month, branchId } : undefined;
      const categories = await ExpensesService.getCategories(includeSpend);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateCategorySchema.parse(req.body);
      const cat = await ExpensesService.createCategory(input);
      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: cat,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = UpdateCategorySchema.parse(req.body);
      const cat = await ExpensesService.updateCategory(id, input);
      res.status(200).json({
        success: true,
        message: 'Category updated',
        data: cat,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const cat = await ExpensesService.deleteCategory(id);
      res.status(200).json({
        success: true,
        message: 'Category deleted (soft-deleted to preserve ledger integrity)',
        data: cat,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 13. Visual BI Rollup Analytics ──────────────────────────────────────────
  static async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      const month = req.query.month ? Number(req.query.month) : undefined;
      const period = req.query.period === 'year' ? 'year' : 'month';

      const analytics = await ExpensesService.getRollupAnalytics({
        branchId,
        year,
        month,
        period,
      });

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      next(err);
    }
  }

  // ─── 14. Excel Export Generator (Day / Week / Month / Year) ──────────────────
  static async exportExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ExportReportQuerySchema.parse(req.query);
      const { workbook, filename } = await ExpensesService.exportReport(query);

      streamWorkbookToResponse(workbook, filename, res);
    } catch (err) {
      next(err);
    }
  }

  // ─── 15. Settings ────────────────────────────────────────────────────────────
  static async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
      const settings = await ExpensesService.getSettings(branchId);
      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = ExpenseSettingsSchema.parse(req.body);
      const settings = await ExpensesService.updateSettings(input.branchId || null, input);
      res.status(200).json({
        success: true,
        message: 'Expense settings updated',
        data: settings,
      });
    } catch (err) {
      next(err);
    }
  }
}
