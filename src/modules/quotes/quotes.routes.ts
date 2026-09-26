import { Router } from 'express';
import { quotesController } from './quotes.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, quotesController.list);
router.get('/:id', requireAuth, quotesController.getById);
router.post('/', requireAuth, quotesController.create);
router.patch('/:id/status', requireAuth, quotesController.updateStatus);
router.patch('/:id', requireAuth, quotesController.update);
router.delete('/:id', requireAuth, quotesController.delete);

export default router;
