import { Request, Response, NextFunction } from 'express';
import { quotationsService } from './quotations.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { htmlToPdfBuffer } from '../../utils/htmlToPdf';

export const quotationsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.list(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.create(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.update(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await quotationsService.delete(req.params.id, req.user?.id);
      res.json({ success: true, message: 'Sales Quotation deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async revise(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { reason, ...updateData } = req.body;
      const data = await quotationsService.revise(req.params.id, updateData, reason, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async send(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.send(req.params.id, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async sendEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await quotationsService.sendEmail(req.params.id, req.body, req.user?.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getFollowups(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.getFollowups(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createFollowup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.createFollowup(req.params.id, req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async sendFollowupEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await quotationsService.sendFollowupEmail(req.params.id, req.body, req.user?.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async convertToPI(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.convertToPI(req.params.id, req.user?.id);
      res.json({ success: true, data, message: 'Proforma Invoice generated from Quotation' });
    } catch (err) {
      next(err);
    }
  },

  async convertToOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.convertToOrder(req.params.id, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const html = await quotationsService.getPdfHtml(req.params.id);
      if (req.query.download === 'true') {
        const quote = await quotationsService.getById(req.params.id);
        const pdfBuffer = await htmlToPdfBuffer(html);
        const refName = (quote.referenceNumber || quote.quotationNumber || req.params.id).replace(/[\/\\]/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Quotation_${refName}.pdf"`);
        res.send(pdfBuffer);
        return;
      }
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },

  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.listTemplates(req.query.category as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async saveTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await quotationsService.saveTemplate(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
