import { Router } from 'express';
import { usersController } from './users.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { requireAnyPermission } from '../../middleware/rbac.middleware';

const router = Router();

// All user operations require valid authentication
router.use(requireAuth);

// Read user listing and single user details
router.get(
  '/',
  requireAnyPermission(['admin_users.read', 'admin_users.manage', 'users.read']),
  usersController.list
);
router.get(
  '/:id/effective-permissions',
  requireAnyPermission(['admin_users.read', 'roles.read', 'admin_users.manage']),
  usersController.getEffectivePermissions
);
router.get(
  '/:id/activity',
  requireAnyPermission(['admin_users.read', 'activity_logs.read', 'admin_users.manage']),
  usersController.getUserActivity
);
router.get(
  '/:id',
  requireAnyPermission(['admin_users.read', 'admin_users.manage', 'users.read']),
  usersController.getById
);

// Creation, modification, security resets, and deletion restricted strictly to Super Admin
router.post('/', requireRole('SUPER_ADMIN'), usersController.create);
router.patch('/:id', requireRole('SUPER_ADMIN'), usersController.update);
router.post('/:id/reset-password', requireRole('SUPER_ADMIN'), usersController.resetPassword);
router.post('/:id/reset-2fa', requireRole('SUPER_ADMIN'), usersController.reset2fa);
router.post('/:id/revoke-sessions', requireRole('SUPER_ADMIN'), usersController.revokeSessions);
router.delete('/:id', requireRole('SUPER_ADMIN'), usersController.delete);

export default router;
