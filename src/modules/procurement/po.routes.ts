import { Router } from 'express';
import { poController } from './po.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', requireAuth, requirePermission('po:view'), poController.list);
router.get('/:id', requireAuth, requirePermission('po:view'), poController.getById);
router.get('/:id/pdf', requireAuth, requirePermission('po:download'), poController.getPdfHtml);
router.post('/', requireAuth, requirePermission('po:create'), poController.create);
router.post('/:id/approve', requireAuth, requirePermission('po:approve'), poController.approve);
router.post('/:id/cancel', requireAuth, requirePermission('po:cancel'), poController.cancel);
router.delete('/:id', requireAuth, poController.delete);

export default router;
