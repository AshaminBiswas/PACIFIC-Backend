import { Router } from 'express';
import { companiesController } from './companies.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', companiesController.list);
router.get('/:id', companiesController.getById);
router.post('/', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), companiesController.create);
router.patch('/:id', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), companiesController.update);
router.post('/:id/addresses', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), companiesController.addAddress);
router.post('/:id/bank-accounts', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), companiesController.addBankAccount);
router.post('/:id/signatories', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), companiesController.addSignatory);
router.post('/:id/terms', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), companiesController.addTerm);

export default router;
