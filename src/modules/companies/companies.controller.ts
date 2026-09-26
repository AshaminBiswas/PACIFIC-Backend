import { Request, Response, NextFunction } from 'express';
import { companiesService } from './companies.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const companiesController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companiesService.list();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companiesService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await companiesService.create(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await companiesService.update(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companiesService.addAddress(req.params.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companiesService.addBankAccount(req.params.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addSignatory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companiesService.addSignatory(req.params.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companiesService.addTerm(req.params.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
