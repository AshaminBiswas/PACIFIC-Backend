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
};
