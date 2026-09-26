import { Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const ordersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.list(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createDirect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.createDirect(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.approve(req.params.id, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const data = await ordersService.cancel(req.params.id, reason, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.getDocumentTimeline(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.update(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, reason } = req.body;
      const data = await ordersService.updateStatus(req.params.id, status, reason, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await ordersService.delete(req.params.id, req.user?.id);
      res.json({ success: true, message: 'Sales Order deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async globalSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.globalSearch(req.query.q as string || '');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getFollowups(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.getFollowups(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createFollowup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.createFollowup(req.params.id, req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async sendFollowupEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.sendFollowupEmail(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const html = await ordersService.getPdfHtml(req.params.id);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },

  async createDispatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await ordersService.createDispatchRecord(req.params.id, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'Dispatch challan issued successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getDispatchPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const html = await ordersService.getDispatchPdfHtml(req.params.dispatchId);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },

  async deleteDispatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await ordersService.deleteDispatchRecord(req.params.id, req.params.dispatchId, req.user?.id);
      res.json({ success: true, message: 'Dispatch record deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};
