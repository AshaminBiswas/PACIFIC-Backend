import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { dailySalesPurchasesService } from './dailySalesPurchases.service';
import { dailySalesPurchasesPdfService } from './dailySalesPurchasesPdf.service';
import { htmlToPdfBuffer } from '../../utils/htmlToPdf';

export const dailySalesPurchasesController = {
  async getPdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const html = await dailySalesPurchasesPdfService.generateDailyReportHtml({
        startDate: (req.query.startDate as string) || new Date().toISOString().slice(0, 10),
        endDate: (req.query.endDate as string) || new Date().toISOString().slice(0, 10),
        date: req.query.date as string,
        companyProfileId: req.query.companyProfileId as string,
      });

      const wantsDownload = req.query.download === 'true' || req.query.dl === '1';

      if (wantsDownload) {
        try {
          const pdfBuffer = await htmlToPdfBuffer(html);
          const dateStr = (req.query.date as string) || (req.query.startDate as string) || 'Report';
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="Daily_Sales_Purchase_Report_${dateStr}.pdf"`
          );
          res.send(pdfBuffer);
          return;
        } catch (pdfErr: any) {
          console.warn(
            '[Daily Report PDF] Headless browser generation failed, serving printable HTML fallback:',
            pdfErr?.message
          );
        }
      }

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.createEntry(
        req.body,
        req.user?.id
      );
      sendSuccess(res, result, 'Daily entry recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.getEntries(req.query as any);
      sendSuccess(res, result, 'Daily entries retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async summary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.getSummary(req.query as any);
      sendSuccess(res, result, 'Daily sales & purchase summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.getEntryById(req.params.id);
      sendSuccess(res, result, 'Daily entry retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.updateEntry(
        req.params.id,
        req.body
      );
      sendSuccess(res, result, 'Daily entry updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await dailySalesPurchasesService.deleteEntry(req.params.id);
      sendSuccess(res, result, 'Daily entry deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};
