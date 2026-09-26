import { Router } from 'express';
import { vendorsController } from './vendors.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', requireAuth, requirePermission('vendor:view'), vendorsController.listVendors);
router.get('/:id', requireAuth, requirePermission('vendor:view'), vendorsController.getVendorById);
router.post('/', requireAuth, requirePermission('vendor:create'), vendorsController.createVendor);
router.patch('/:id', requireAuth, requirePermission('vendor:edit'), vendorsController.updateVendor);
router.delete('/:id', requireAuth, requirePermission('vendor:delete'), vendorsController.deleteVendor);

export default router;
