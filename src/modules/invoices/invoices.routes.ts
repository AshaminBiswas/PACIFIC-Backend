import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, invoicesController.list);
router.get('/:id', requireAuth, invoicesController.getById);
router.get('/:id/pdf', requireAuth, invoicesController.getPdf);
router.post('/from-order/:orderId', requireAuth, invoicesController.createFromOrder);
router.post('/', requireAuth, invoicesController.create);
router.put('/:id', requireAuth, invoicesController.update);
router.patch('/:id', requireAuth, invoicesController.update);
router.delete('/:id', requireAuth, invoicesController.delete);

export default router;
