import { Router } from 'express';
import { usersController } from './users.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// All user operations require authentication
router.use(requireAuth);

router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), usersController.list);
router.get('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), usersController.getById);

// Creation, modification, and password reset restricted to Super Admin
router.post('/', requireRole('SUPER_ADMIN'), usersController.create);
router.patch('/:id', requireRole('SUPER_ADMIN'), usersController.update);
router.post('/:id/reset-password', requireRole('SUPER_ADMIN'), usersController.resetPassword);
router.delete('/:id', requireRole('SUPER_ADMIN'), usersController.delete);

export default router;
