import { Request, Response, NextFunction } from 'express';
import { leadsService } from './leads.service';

export const leadsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leadsService.list({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status as string,
        source: req.query.source as string,
        search: req.query.search as string,
      });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await leadsService.getById(req.params.id) }); }
    catch (err) { next(err); }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await leadsService.create(req.body) }); }
    catch (err) { next(err); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await leadsService.update(req.params.id, req.body) }); }
    catch (err) { next(err); }
  },
  async delete(req: Request, res: Response, next: NextFunction) {
    try { await leadsService.delete(req.params.id); res.json({ success: true, message: 'Lead deleted' }); }
    catch (err) { next(err); }
  },
  async getStats(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await leadsService.getStats() }); }
    catch (err) { next(err); }
  },
};
