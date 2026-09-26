import { Request, Response, NextFunction } from 'express';
import { vendorsService } from './vendors.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const vendorsController = {
  async listVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await vendorsService.listVendors({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string,
        vendorType: req.query.vendorType as string,
        status: req.query.status as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getVendorById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await vendorsService.getVendorById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createVendor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await vendorsService.createVendor(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateVendor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await vendorsService.updateVendor(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async deleteVendor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await vendorsService.deleteVendor(req.params.id, req.user?.id);
      res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};
