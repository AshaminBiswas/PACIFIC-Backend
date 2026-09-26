import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/stats', requireAuth, dashboardController.getStats);
router.get('/', requireAuth, dashboardController.getStats);

export default router;
