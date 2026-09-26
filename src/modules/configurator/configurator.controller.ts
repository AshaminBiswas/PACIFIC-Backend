import { Request, Response, NextFunction } from 'express';
import { configuratorService } from './configurator.service';

export const configuratorController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await configuratorService.list({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status as string,
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const design = await configuratorService.getById(req.params.id);
      res.json({ success: true, data: design });
    } catch (err) { next(err); }
  },

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const design = await configuratorService.submit(req.body);
      res.status(201).json({ success: true, data: design });
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const design = await configuratorService.updateStatus(req.params.id, req.body.status);
      res.json({ success: true, data: design });
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await configuratorService.delete(req.params.id);
      res.json({ success: true, message: 'Design deleted' });
    } catch (err) { next(err); }
  },
};
