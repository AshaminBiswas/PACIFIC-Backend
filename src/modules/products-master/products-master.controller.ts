import { Request, Response, NextFunction } from 'express';
import { productsMasterService } from './products-master.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const productsMasterController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsMasterService.list({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        materialId: req.query.materialId as string,
        finishId: req.query.finishId as string,
        isActive: req.query.isActive === 'false' ? false : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsMasterService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await productsMasterService.create(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await productsMasterService.update(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await productsMasterService.delete(req.params.id, req.user?.id);
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getMaterials(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsMasterService.getMaterials();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getFinishes(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsMasterService.getFinishes();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getUnits(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsMasterService.getUnits();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getSubcategories(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await productsMasterService.getSubcategories(req.query.categoryId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
