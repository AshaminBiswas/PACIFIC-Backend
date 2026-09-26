import { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const productsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productsService.list({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        isFeatured: req.query.isFeatured !== undefined ? req.query.isFeatured === 'true' : undefined,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.getById(req.params.id);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.getBySlug(req.params.slug);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const product = await productsService.create(req.body, req.user?.id);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.update(req.params.id, req.body);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await productsService.delete(req.params.id);
      res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
      next(err);
    }
  },

  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await productsService.listCategories();
      res.json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  },

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await productsService.createCategory(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  },
};
