import { Router } from 'express';
import { leadsController } from './leads.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Public — website contact/enquiry forms
router.post('/', leadsController.create);

// Admin
router.get('/stats', requireAuth, leadsController.getStats);
router.get('/', requireAuth, leadsController.list);
router.get('/:id', requireAuth, leadsController.getById);
router.put('/:id', requireAuth, leadsController.update);
router.patch('/:id', requireAuth, leadsController.update);
router.delete('/:id', requireAuth, leadsController.delete);

export default router;
