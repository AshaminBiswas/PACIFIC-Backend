import { Router } from 'express';
import { auditController } from './audit.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { requireAnyPermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

// General mutation audit logs
router.get('/', requireAnyPermission(['activity_logs.read', 'activity_logs.export']), auditController.list);

// Dedicated Admin Activity Audit Trail (RBAC, security, permissions, logins, users, roles)
router.get(
  '/admin-activity',
  requireAnyPermission(['activity_logs.read', 'admin_users.read', 'roles.read']),
  auditController.listAdminActivity
);

export default router;
