import { Router } from 'express';
import { quotationsController } from './quotations.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// Content Library Templates
router.get('/templates', quotationsController.listTemplates);
router.post('/templates', requireAuth, requirePermission('quotation:edit'), quotationsController.saveTemplate);

// Sales Quotations
router.get('/', quotationsController.list);
router.get('/:id', quotationsController.getById);
router.get('/:id/pdf', quotationsController.getPdf);

router.post('/', requireAuth, requirePermission('quotation:create'), quotationsController.create);
router.patch('/:id', requireAuth, requirePermission('quotation:edit'), quotationsController.update);
router.delete('/:id', requireAuth, requirePermission('quotation:delete'), quotationsController.delete);
router.post('/:id/revise', requireAuth, requirePermission('quotation:edit'), quotationsController.revise);
router.post('/:id/send', requireAuth, requirePermission('quotation:send'), quotationsController.send);
router.post('/:id/send-email', requireAuth, requirePermission('quotation:send'), quotationsController.sendEmail);
router.get('/:id/follow-ups', quotationsController.getFollowups);
router.post('/:id/follow-ups', requireAuth, requirePermission('quotation:edit'), quotationsController.createFollowup);
router.patch('/:id/follow-up-status', requireAuth, requirePermission('quotation:edit'), quotationsController.updateFollowupStatus);
router.post('/:id/send-followup-email', requireAuth, requirePermission('quotation:send'), quotationsController.sendFollowupEmail);
router.post('/:id/convert-to-pi', requireAuth, requirePermission('quotation:edit'), quotationsController.convertToPI);
router.post('/:id/convert-to-order', requireAuth, requirePermission('quotation:edit'), quotationsController.convertToOrder);

export default router;
