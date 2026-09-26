import { Router } from 'express';
import { piController } from './pi.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', requireAuth, requirePermission('pi:view'), piController.list);
router.get('/:id', requireAuth, requirePermission('pi:view'), piController.getById);
router.get('/:id/pdf', requireAuth, requirePermission('pi:download'), piController.getPdfHtml);
router.post('/', requireAuth, requirePermission('pi:create'), piController.create);
router.post('/:id/issue', requireAuth, requirePermission('pi:issue'), piController.issue);
router.post('/:id/duplicate', requireAuth, requirePermission('pi:duplicate'), piController.duplicate);
router.post('/:id/cancel', requireAuth, requirePermission('pi:cancel'), piController.cancel);
router.post('/:id/advance-payment', requireAuth, requirePermission('pi:create'), piController.recordAdvancePayment);
router.post('/:id/convert-to-order', requireAuth, requirePermission('pi:create'), piController.convertToOrder);
router.get('/:id/followups', requireAuth, requirePermission('pi:view'), piController.getFollowups);
router.post('/:id/followups', requireAuth, requirePermission('pi:create'), piController.addFollowup);
router.patch('/:id', requireAuth, requirePermission('pi:create'), piController.update);
router.delete('/:id', requireAuth, requirePermission('pi:cancel'), piController.delete);

export default router;
