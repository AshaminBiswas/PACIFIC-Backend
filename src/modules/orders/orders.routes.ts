import { Router } from 'express';
import { ordersController } from './orders.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/search', requireAuth, requirePermission('order:view'), ordersController.globalSearch);
router.get('/', requireAuth, requirePermission('order:view'), ordersController.list);
router.get('/:id', requireAuth, requirePermission('order:view'), ordersController.getById);
router.get('/:id/timeline', requireAuth, requirePermission('order:view'), ordersController.getTimeline);
router.get('/:id/follow-ups', requireAuth, requirePermission('order:view'), ordersController.getFollowups);
router.post('/:id/follow-ups', requireAuth, requirePermission('order:edit'), ordersController.createFollowup);
router.post('/:id/send-followup-email', requireAuth, requirePermission('order:edit'), ordersController.sendFollowupEmail);

router.post('/', requireAuth, requirePermission('order:create'), ordersController.createDirect);
router.patch('/:id', requireAuth, requirePermission('order:edit'), ordersController.update);
router.patch('/:id/status', requireAuth, requirePermission('order:edit'), ordersController.updateStatus);
router.delete('/:id', requireAuth, requirePermission('order:delete'), ordersController.delete);
router.post('/:id/approve', requireAuth, requirePermission('order:approve'), ordersController.approve);
router.post('/:id/cancel', requireAuth, requirePermission('order:cancel'), ordersController.cancel);
router.get('/:id/pdf', requireAuth, requirePermission('order:view'), ordersController.getPdf);
router.post('/:id/dispatch', requireAuth, requirePermission('order:edit'), ordersController.createDispatch);
router.get('/:id/dispatch/:dispatchId/pdf', requireAuth, requirePermission('order:view'), ordersController.getDispatchPdf);
router.delete('/:id/dispatch/:dispatchId', requireAuth, requirePermission('order:edit'), ordersController.deleteDispatch);

export default router;
