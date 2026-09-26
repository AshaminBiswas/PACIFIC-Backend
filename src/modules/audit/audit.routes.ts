import { Router } from 'express';
import { auditController } from './audit.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), auditController.list);

export default router;
