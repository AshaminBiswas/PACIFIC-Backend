import { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';

export const auditController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await auditService.list({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        module: req.query.module as string,
        action: req.query.action as string,
        entityType: req.query.entityType as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listAdminActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await auditService.listAdminActivity({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        actorId: req.query.actorId as string,
        targetType: req.query.targetType as string,
        targetId: req.query.targetId as string,
        action: req.query.action as string,
        search: req.query.search as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
