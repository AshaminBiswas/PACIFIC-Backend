import { Request, Response, NextFunction } from 'express';
import { hardwareIssueService } from './hardware-issue.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const hardwareIssueController = {
  // Master Catalog
  async listCatalog(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await hardwareIssueService.listCatalog(req.query.category as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createCatalogItem(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await hardwareIssueService.createCatalogItem(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateCatalogItem(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await hardwareIssueService.updateCatalogItem(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // Issue Lists
  async listIssues(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await hardwareIssueService.listIssues(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getIssueById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await hardwareIssueService.getIssueById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createIssue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await hardwareIssueService.createIssue(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateIssue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await hardwareIssueService.updateIssue(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Hardware issue list updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async deleteIssue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await hardwareIssueService.deleteIssue(req.params.id, req.user?.id);
      res.json({ success: true, data, message: 'Hardware issue list deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async signStep(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, name } = req.body;
      if (!role || !name) {
        throw new Error('Sign-off role and signatory name are required');
      }
      const data = await hardwareIssueService.signStep(req.params.id, role, name);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const html = await hardwareIssueService.getPdfHtml(req.params.id);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },
};
