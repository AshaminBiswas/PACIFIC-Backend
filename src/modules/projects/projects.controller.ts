import { Request, Response, NextFunction } from 'express';
import { projectsService } from './projects.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const projectsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await projectsService.list({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20, status: req.query.status as string, search: req.query.search as string }) }); }
    catch (err) { next(err); }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await projectsService.getById(req.params.id) }); }
    catch (err) { next(err); }
  },
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await projectsService.create(req.body, req.user?.id) }); }
    catch (err) { next(err); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await projectsService.update(req.params.id, req.body) }); }
    catch (err) { next(err); }
  },
  async delete(req: Request, res: Response, next: NextFunction) {
    try { await projectsService.delete(req.params.id); res.json({ success: true, message: 'Project deleted' }); }
    catch (err) { next(err); }
  },
};
