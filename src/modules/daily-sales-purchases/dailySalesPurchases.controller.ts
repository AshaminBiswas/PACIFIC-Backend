import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { dailySalesPurchasesService } from './dailySalesPurchases.service';

export const dailySalesPurchasesController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.createEntry(
        req.body,
        req.user?.id
      );
      sendSuccess(res, result, 'Daily entry recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.getEntries(req.query as any);
      sendSuccess(res, result, 'Daily entries retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async summary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.getSummary(req.query as any);
      sendSuccess(res, result, 'Daily sales & purchase summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.getEntryById(req.params.id);
      sendSuccess(res, result, 'Daily entry retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.updateEntry(
        req.params.id,
        req.body
      );
      sendSuccess(res, result, 'Daily entry updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.deleteEntry(req.params.id);
      sendSuccess(res, result, 'Daily entry deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};
