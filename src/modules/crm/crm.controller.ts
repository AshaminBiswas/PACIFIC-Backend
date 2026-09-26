import { Request, Response, NextFunction } from 'express';
import { crmService } from './crm.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const crmController = {
  async listCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await crmService.listCustomers({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string,
        status: req.query.status as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getCustomerById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await crmService.getCustomerById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getCustomer360(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await crmService.getCustomer360(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createCustomer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await crmService.createCustomer(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateCustomer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await crmService.updateCustomer(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async deleteCustomer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await crmService.deleteCustomer(req.params.id, req.user?.id);
      res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async addContact(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await crmService.addContact(req.params.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await crmService.addAddress(req.params.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async checkDuplicates(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await crmService.checkDuplicates(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async mergeCustomers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { canonicalCustomerId, mergedCustomerId, reason } = req.body;
      const data = await crmService.mergeCustomers(canonicalCustomerId, mergedCustomerId, reason, req.user?.id);
      res.json({ success: true, data, message: 'Customers merged successfully' });
    } catch (err) {
      next(err);
    }
  },
};

