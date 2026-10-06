import { Router } from 'express';
import { qrController } from './qr.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// Public verification route
router.get('/verify/:token', qrController.verifyPublicToken);

// Admin operations
router.post('/scan', requireAuth, requirePermission('qr:scan'), qrController.scan);
router.post('/generate', requireAuth, requirePermission('qr:create'), qrController.generate);
router.get('/history', requireAuth, requirePermission('qr:view'), qrController.getScanHistory);

export default router;
