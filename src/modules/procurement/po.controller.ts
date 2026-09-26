import { Request, Response, NextFunction } from 'express';
import { poService } from './po.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const poController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await poService.list({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status as string,
        vendorId: req.query.vendorId as string,
        search: req.query.search as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await poService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await poService.create(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await poService.approve(req.params.id, req.user!.id);
      res.json({ success: true, data, message: 'Purchase Order approved successfully' });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await poService.cancel(req.params.id, req.body.reason, req.user!.id);
      res.json({ success: true, data, message: 'Purchase Order cancelled' });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await poService.delete(req.params.id, req.user!.id);
      res.json({ success: true, data, message: 'Purchase Order deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getPdfHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const html = await poService.getPdfHtml(req.params.id);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },
};
