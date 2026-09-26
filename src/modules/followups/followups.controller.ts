import { Request, Response, NextFunction } from 'express';
import { followupsService } from './followups.service';
import { ledgerService } from '../finance/ledger.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const followupsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await followupsService.list({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        customerId: req.query.customerId as string,
        followupStatus: req.query.followupStatus as string,
        priority: req.query.priority as string,
        assignedUserId: req.query.assignedUserId as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await followupsService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getByCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await followupsService.getByCustomer(req.params.customerId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await followupsService.create(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addLog(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await followupsService.addLog(req.params.id, req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async logCustomerTouchpoint(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ledgerService.logFollowupTouchpoint(req.params.customerId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Follow-up activity recorded' });
    } catch (err) {
      next(err);
    }
  },

  async runCadence(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ledgerService.runPaymentOverdueCadence();
      res.json({ success: true, data, message: 'Overdue cadence executed' });
    } catch (err) {
      next(err);
    }
  },

  async getRecoveryDashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await followupsService.getRecoveryDashboard();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
