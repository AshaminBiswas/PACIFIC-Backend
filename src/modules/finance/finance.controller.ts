import { Request, Response, NextFunction } from 'express';
import { financeService } from './finance.service';
import { ledgerService } from './ledger.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const financeController = {
  async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await financeService.listPayments({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        partyId: req.query.partyId as string,
        paymentType: req.query.paymentType as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getPaymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await financeService.getPaymentById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await financeService.recordPayment(req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Payment recorded and allocated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async updatePayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await financeService.updatePayment(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Payment updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async deletePayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await financeService.deletePayment(req.params.id, req.user?.id);
      res.json({ success: true, data, message: 'Payment deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getReceivables(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await financeService.getReceivables({ status: req.query.status as string });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getPayables(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await financeService.getPayables({ status: req.query.status as string });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getLedgerSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await financeService.getLedgerSummary();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getCustomerLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.customerId;
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;
      const data = await ledgerService.getCustomerLedger(customerId, { fromDate, toDate });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async sendCustomerLedgerEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.customerId;
      const data = await ledgerService.sendCustomerLedgerEmail(customerId, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Statement of Account / Ledger emailed successfully' });
    } catch (err) {
      next(err);
    }
  },

  async recordManualLedgerEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.customerId;
      const data = await ledgerService.recordManualEntry(customerId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Historical / manual ledger entry recorded successfully' });
    } catch (err) {
      next(err);
    }
  },

  async logFollowupTouchpoint(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.customerId;
      const data = await ledgerService.logFollowupTouchpoint(customerId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Follow-up touchpoint recorded successfully' });
    } catch (err) {
      next(err);
    }
  },

  async triggerCadenceCheck(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ledgerService.runPaymentOverdueCadence();
      res.json({ success: true, data, message: 'Cadence check executed successfully' });
    } catch (err) {
      next(err);
    }
  },
};
