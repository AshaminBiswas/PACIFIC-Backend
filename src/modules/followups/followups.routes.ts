import { Router } from 'express';
import { followupsController } from './followups.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/dashboard', requireAuth, requirePermission('followup:view'), followupsController.getRecoveryDashboard);
router.get('/', requireAuth, requirePermission('followup:view'), followupsController.list);
router.get('/customer/:customerId', requireAuth, requirePermission('followup:view'), followupsController.getByCustomer);
router.post('/customer/:customerId/log', requireAuth, requirePermission('followup:edit'), followupsController.logCustomerTouchpoint);
router.post('/run-cadence', requireAuth, requirePermission('followup:edit'), followupsController.runCadence);
router.get('/:id', requireAuth, requirePermission('followup:view'), followupsController.getById);
router.post('/', requireAuth, requirePermission('followup:create'), followupsController.create);
router.post('/:id/logs', requireAuth, requirePermission('followup:edit'), followupsController.addLog);

export default router;
