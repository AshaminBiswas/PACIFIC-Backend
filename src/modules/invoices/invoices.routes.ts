import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, invoicesController.list);
router.post('/from-pi/:piId', requireAuth, invoicesController.createFromPi);
router.post('/from-order/:orderId', requireAuth, invoicesController.createFromOrder);
router.get('/:id', requireAuth, invoicesController.getById);
router.get('/:id/pdf', requireAuth, invoicesController.getPdf);
router.post('/:id/payment', requireAuth, invoicesController.recordPayment);
router.post('/', requireAuth, invoicesController.create);
router.put('/:id', requireAuth, invoicesController.update);
router.patch('/:id', requireAuth, invoicesController.update);
router.post('/:id/request-deletion', requireAuth, invoicesController.requestDeletion);
router.post('/:id/reject-deletion', requireAuth, requireSuperAdmin, invoicesController.rejectDeletion);
router.post('/:id/cancel-deletion', requireAuth, invoicesController.cancelDeletion);
router.delete('/:id', requireAuth, requireSuperAdmin, invoicesController.delete);

export default router;
