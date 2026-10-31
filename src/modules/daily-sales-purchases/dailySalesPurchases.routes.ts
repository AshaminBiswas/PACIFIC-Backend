import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { dailySalesPurchasesController } from './dailySalesPurchases.controller';

const router = Router();

// Require authenticated session for all daily sales & purchase operations
router.use(requireAuth);

router.post('/', dailySalesPurchasesController.create);
router.get('/', dailySalesPurchasesController.list);
router.get('/summary', dailySalesPurchasesController.summary);
router.get('/:id', dailySalesPurchasesController.getById);
router.put('/:id', dailySalesPurchasesController.update);
router.patch('/:id', dailySalesPurchasesController.update);
router.delete('/:id', dailySalesPurchasesController.remove);

export default router;
