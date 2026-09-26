import { Router } from 'express';
import { configuratorController } from './configurator.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Public — storefront can submit designs
router.post('/submit', configuratorController.submit);

// Admin
router.get('/', requireAuth, configuratorController.list);
router.get('/:id', requireAuth, configuratorController.getById);
router.patch('/:id/status', requireAuth, configuratorController.updateStatus);
router.delete('/:id', requireAuth, configuratorController.delete);

export default router;
