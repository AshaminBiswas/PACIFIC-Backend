import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';

export const dashboardController = {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getStats();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
