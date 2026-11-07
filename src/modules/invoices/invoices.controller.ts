import { Request, Response, NextFunction } from 'express';
import { invoicesService } from './invoices.service';

export const invoicesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await invoicesService.list({
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          status: req.query.status as string,
          orderId: req.query.orderId as string,
          search: req.query.search as string,
          branch: req.query.branch as string,
        }),
      });
    } catch (err) {
      next(err);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await invoicesService.getById(req.params.id) });
    } catch (err) {
      next(err);
    }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await invoicesService.create(req.body) });
    } catch (err) {
      next(err);
    }
  },
  async createFromOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoicesService.createFromOrder(req.params.orderId, (req as any).user?.id);
      res.status(201).json({ success: true, data, message: 'Tax Invoice created from Sales Order' });
    } catch (err) {
      next(err);
    }
  },
  async createFromPi(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoicesService.createFromPi(req.params.piId, (req as any).user?.id);
      res.status(201).json({ success: true, data, message: 'Tax Invoice created from Proforma Invoice' });
    } catch (err) {
      next(err);
    }
  },
  async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoicesService.recordPayment(req.params.id, req.body, (req as any).user?.id);
      res.status(201).json({ success: true, data, message: 'Payment recorded on Bill successfully' });
    } catch (err) {
      next(err);
    }
  },
  async getPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const html = await invoicesService.getPdfHtml(req.params.id);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await invoicesService.update(req.params.id, req.body) });
    } catch (err) {
      next(err);
    }
  },
  async requestDeletion(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoicesService.requestDeletion(req.params.id, req.body.reason, (req as any).user);
      res.json({ success: true, data, message: 'Bill deletion request submitted to Super Admin' });
    } catch (err) {
      next(err);
    }
  },
  async rejectDeletion(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoicesService.rejectDeletion(req.params.id, req.body.reason, (req as any).user);
      res.json({ success: true, data, message: 'Bill deletion request rejected' });
    } catch (err) {
      next(err);
    }
  },
  async cancelDeletion(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoicesService.cancelDeletion(req.params.id, (req as any).user);
      res.json({ success: true, data, message: 'Bill deletion request cancelled' });
    } catch (err) {
      next(err);
    }
  },
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await invoicesService.delete(req.params.id);
      res.json({ success: true, message: 'Invoice deleted' });
    } catch (err) {
      next(err);
    }
  },
};
