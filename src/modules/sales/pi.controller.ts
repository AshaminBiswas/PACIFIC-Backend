import { Request, Response, NextFunction } from 'express';
import { piService } from './pi.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const piController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await piService.list({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status as string,
        customerId: req.query.customerId as string,
        search: req.query.search as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await piService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await piService.create(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async issue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await piService.issue(req.params.id, req.user!.id);
      res.json({ success: true, data, message: 'Proforma Invoice issued successfully' });
    } catch (err) {
      next(err);
    }
  },

  async duplicate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await piService.duplicate(req.params.id, req.user!.id);
      res.status(201).json({ success: true, data, message: 'Proforma Invoice duplicated as new draft' });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await piService.cancel(req.params.id, req.body.reason, req.user!.id);
      res.json({ success: true, data, message: 'Proforma Invoice cancelled' });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await piService.update(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Proforma Invoice updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await piService.delete(req.params.id, req.user?.id);
      res.json({ success: true, data, message: 'Proforma Invoice deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getPdfHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const html = await piService.getPdfHtml(req.params.id);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },

  async recordAdvancePayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await piService.recordAdvancePayment(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Advance payment recorded successfully' });
    } catch (err) {
      next(err);
    }
  },

  async convertToOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await piService.convertToOrder(req.params.id, req.user?.id);
      res.json({ success: true, data, message: 'Sales Order generated from Proforma Invoice' });
    } catch (err) {
      next(err);
    }
  },

  async getFollowups(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await piService.getFollowups(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addFollowup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await piService.addFollowup(req.params.id, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Follow-up touchpoint recorded successfully' });
    } catch (err) {
      next(err);
    }
  },
};
