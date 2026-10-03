import { Request, Response, NextFunction } from 'express';
import { quotationsService } from './quotations.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { htmlToPdfBuffer } from '../../utils/htmlToPdf';

function injectPrintableToolbar(html: string, quote: any, autoPrint = false): string {
  const ref = quote.referenceNumber || quote.quotationNumber || quote.id;
  const total = Number(quote.grandTotal || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const drawingUrl = quote.drawingUrl;

  const toolbarHtml = `
<style>
  @media print {
    .pacific-no-print { display: none !important; }
  }
  .pacific-doc-header-bar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999999;
    background: #0f172a;
    color: #f8fafc;
    border-bottom: 2px solid #7fb706;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }
  .pacific-doc-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .pacific-badge {
    background: #1e293b;
    border: 1px solid #334155;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
  }
  .pacific-badge-val {
    color: #b5f823;
  }
  .pacific-doc-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .pacific-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: all 0.15s ease-in-out;
  }
  .pacific-btn-primary {
    background: #7fb706;
    color: #030213;
  }
  .pacific-btn-primary:hover {
    background: #98db08;
  }
  .pacific-btn-secondary {
    background: #1e293b;
    color: #f1f5f9;
    border: 1px solid #475569;
  }
  .pacific-btn-secondary:hover {
    background: #334155;
  }
  @media (max-width: 680px) {
    .pacific-doc-header-bar {
      flex-direction: column;
      align-items: stretch;
      padding: 12px;
    }
    .pacific-doc-actions {
      justify-content: flex-end;
    }
  }
</style>
<div class="pacific-doc-header-bar pacific-no-print">
  <div class="pacific-doc-info">
    <span style="font-weight: 700; color: #fff; display: flex; align-items: center; gap: 6px;">
      <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#7fb706;"></span>
      Pacific Commercial Proposal
    </span>
    <span class="pacific-badge">${ref}</span>
    <span class="pacific-badge"><span class="pacific-badge-val">₹ ${total}</span></span>
  </div>
  <div class="pacific-doc-actions">
    ${drawingUrl ? `<a href="${drawingUrl}" target="_blank" rel="noopener noreferrer" class="pacific-btn pacific-btn-secondary" title="View Technical Drawing">📐 View Drawing</a>` : ''}
    <button onclick="window.print()" class="pacific-btn pacific-btn-secondary" title="Print document or Save to PDF">🖨️ Print</button>
    <a href="?dl=1" class="pacific-btn pacific-btn-primary" title="Download Official PDF file">📥 Download PDF</a>
  </div>
</div>
${autoPrint ? `<script>window.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ window.print(); }, 500); });</script>` : ''}
`;

  if (html.includes('<body')) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${toolbarHtml}`);
  }
  return toolbarHtml + html;
}

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
      const quote = await quotationsService.getByCodeOrId(req.params.id);
      const html = await quotationsService.getPdfHtml(quote.id);
      const wantsDownload = req.query.download === 'true' || req.query.dl === '1';

      if (wantsDownload) {
        const refName = (quote.referenceNumber || quote.quotationNumber || quote.id).replace(/[\/\\]/g, '_');
        try {
          const pdfBuffer = await htmlToPdfBuffer(html);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="Quotation_${refName}.pdf"`);
          res.send(pdfBuffer);
          return;
        } catch (pdfErr: any) {
          console.warn('[Quotation PDF] Headless browser generation failed, serving printable HTML fallback:', pdfErr?.message);
          const printableHtml = injectPrintableToolbar(html, quote, true);
          res.setHeader('Content-Type', 'text/html');
          res.send(printableHtml);
          return;
        }
      }

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },

  async getShortPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.params.code;
      const quote = await quotationsService.getByCodeOrId(code);
      const html = await quotationsService.getPdfHtml(quote.id);
      const wantsDownload = req.query.download === 'true' || req.query.dl === '1' || req.path.endsWith('/pdf');

      if (wantsDownload) {
        const refName = (quote.referenceNumber || quote.quotationNumber || quote.id).replace(/[\/\\]/g, '_');
        try {
          const pdfBuffer = await htmlToPdfBuffer(html);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="Quotation_${refName}.pdf"`);
          res.send(pdfBuffer);
          return;
        } catch (pdfErr: any) {
          console.warn('[Quotation PDF Short] Headless browser generation failed, serving printable HTML fallback:', pdfErr?.message);
          const printableHtml = injectPrintableToolbar(html, quote, true);
          res.setHeader('Content-Type', 'text/html');
          res.send(printableHtml);
          return;
        }
      }

      const styledHtml = injectPrintableToolbar(html, quote, false);
      res.setHeader('Content-Type', 'text/html');
      res.send(styledHtml);
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
