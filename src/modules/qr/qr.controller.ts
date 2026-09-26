import { Request, Response, NextFunction } from 'express';
import { qrService } from './qr.service';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';

export const qrController = {
  /**
   * Admin Scan Handler — called when admin scans any QR code via camera or manual entry.
   */
  async scan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { payload } = req.body;
      if (!payload) {
        res.status(400).json({ success: false, message: 'Scanned payload or token is required' });
        return;
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await qrService.handleAdminScan(payload, req.user?.id, ip, userAgent);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Public Document Verification — safe, non-guessable, never exposes internal database IDs.
   */
  async verifyPublicToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const result = await qrService.verifyPublicToken(token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Generate QR code for a given entity
   */
  async generate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.body;
      if (!entityType || !entityId) {
        res.status(400).json({ success: false, message: 'entityType and entityId are required' });
        return;
      }

      const token = qrService.generateToken(entityType, entityId);
      const qrData = `http://localhost:5176/verify/${token}`;

      const qr = await prisma.qrCode.create({
        data: {
          entityType,
          entityId,
          token,
          qrData,
          status: 'ACTIVE',
        },
      });

      res.status(201).json({ success: true, data: qr });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Scan history
   */
  async getScanHistory(_req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await prisma.qrScanLog.findMany({
        orderBy: { scannedAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  },
};
