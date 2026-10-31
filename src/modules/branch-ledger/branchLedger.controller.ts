import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { branchLedgerService } from './branchLedger.service';
import { branchLedgerPdfService } from './branchLedgerPdf.service';
import { htmlToPdfBuffer } from '../../utils/htmlToPdf';

export const branchLedgerController = {
  /**
   * List all dynamic branches with live balances.
   */
  async getBranches(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const branches = await branchLedgerService.getBranches({
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        companyProfileId: req.query.companyProfileId as string,
      });
      sendSuccess(res, branches, 'Branches retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Create a new branch dynamically.
   */
  async createBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const branch = await branchLedgerService.createBranch(req.body);
      sendSuccess(res, branch, 'Branch created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update an existing branch.
   */
  async updateBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const branch = await branchLedgerService.updateBranch(req.params.id, req.body);
      sendSuccess(res, branch, 'Branch updated successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single branch with live balance.
   */
  async getBranchById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const branch = await branchLedgerService.getBranchById(req.params.id);
      sendSuccess(res, branch, 'Branch details retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * List transactions with dynamic filtering, search, and pagination.
   */
  async getTransactions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await branchLedgerService.getTransactions(req.query as any);
      sendSuccess(res, result, 'Branch transactions retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single transaction by ID.
   */
  async getTransactionById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tx = await branchLedgerService.getTransactionById(req.params.id);
      sendSuccess(res, tx, 'Transaction retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Record a new Debit or Credit entry.
   */
  async createTransaction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tx = await branchLedgerService.createTransaction(req.body, req.user?.id);
      sendSuccess(res, tx, 'Transaction recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update an existing transaction.
   */
  async updateTransaction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tx = await branchLedgerService.updateTransaction(req.params.id, req.body);
      sendSuccess(res, tx, 'Transaction updated successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete a transaction.
   */
  async deleteTransaction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await branchLedgerService.deleteTransaction(req.params.id);
      sendSuccess(res, result, 'Transaction deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get financial summary for selected branch and date period.
   */
  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const summary = await branchLedgerService.getSummary(req.query as any);
      sendSuccess(res, summary, 'Branch financial summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Generate presentation-grade vector PDF report (or HTML preview).
   */
  async getPdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const html = await branchLedgerPdfService.generateBranchLedgerHtml({
        branchId: req.query.branchId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        date: req.query.date as string,
        companyProfileId: req.query.companyProfileId as string,
      });

      const wantsDownload = req.query.download === 'true' || req.query.dl === '1';

      if (wantsDownload) {
        try {
          const pdfBuffer = await htmlToPdfBuffer(html);
          const branchTag = (req.query.branchId as string) || 'All_Branches';
          const dateTag = (req.query.date as string) || (req.query.startDate as string) || 'Report';
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="Branch_Ledger_${branchTag}_${dateTag}.pdf"`
          );
          res.send(pdfBuffer);
          return;
        } catch (pdfErr: any) {
          console.warn('[Branch Ledger PDF] Headless buffer generation fallback to HTML:', pdfErr?.message);
        }
      }

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },
};
