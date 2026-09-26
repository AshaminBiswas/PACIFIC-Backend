import { Request, Response, NextFunction } from 'express';
import { quotesService } from './quotes.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const quotesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await quotesService.list({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status as string,
        leadId: req.query.leadId as string,
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.getById(req.params.id);
      res.json({ success: true, data: quote });
    } catch (err) { next(err); }
  },
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.create(req.body, req.user?.id);
      res.status(201).json({ success: true, data: quote });
    } catch (err) { next(err); }
  },
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.updateStatus(req.params.id, req.body.status);
      res.json({ success: true, data: quote });
    } catch (err) { next(err); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.update(req.params.id, req.body);
      res.json({ success: true, data: quote, message: 'Quotation updated successfully' });
    } catch (err) { next(err); }
  },
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await quotesService.delete(req.params.id);
      res.json({ success: true, message: 'Quotation deleted' });
    } catch (err) { next(err); }
  },
};
