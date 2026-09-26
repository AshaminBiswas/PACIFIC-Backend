import { Request, Response, NextFunction } from 'express';
import { packingListsService } from './packing-lists.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const packingListsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await packingListsService.list(req.query as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await packingListsService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await packingListsService.create(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await packingListsService.update(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data, message: 'Packing List updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await packingListsService.delete(req.params.id, req.user?.id);
      res.json({ success: true, data, message: 'Packing List deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async acknowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await packingListsService.acknowledge(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await packingListsService.getByToken(req.params.token);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async acknowledgeByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await packingListsService.acknowledgeByToken(req.params.token, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const html = await packingListsService.getPdfHtml(req.params.id);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },

  async listPacketTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await packingListsService.listPacketTypes();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addPacketType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name) throw new Error('Packet type name is required');
      const data = await packingListsService.addPacketType(name);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
