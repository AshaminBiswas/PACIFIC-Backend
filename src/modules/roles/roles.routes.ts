import { Router } from 'express';
import { rolesController } from './roles.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// All role operations require authentication
router.use(requireAuth);

router.get('/permissions', requireRole('SUPER_ADMIN', 'ADMIN'), rolesController.listPermissions);
router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), rolesController.list);
router.get('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), rolesController.getById);

// Creation, modification, duplication, and deletion are restricted to Super Admin
router.post('/', requireRole('SUPER_ADMIN'), rolesController.create);
router.post('/:id/duplicate', requireRole('SUPER_ADMIN'), rolesController.duplicate);
router.patch('/:id', requireRole('SUPER_ADMIN'), rolesController.update);
router.delete('/:id', requireRole('SUPER_ADMIN'), rolesController.delete);

export default router;
