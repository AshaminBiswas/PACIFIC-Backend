import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema, registerSchema } from './auth.schema';

const router = Router();

// Standard auth routes
router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/super-admin', authController.createSuperAdmin);
router.post('/refresh', authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getMe);

// First-time login onboarding wizard (Dummy password -> New password -> 2FA setup)
router.post('/first-time/change-password', authController.firstTimeChangePassword);
router.post('/first-time/verify-2fa', authController.firstTimeVerify2fa);
router.post('/change-password', requireAuth, authController.changePassword);

// Two-Factor Authentication (2FA) verification & management
router.post('/2fa/verify', authController.verify2fa);
router.post('/2fa/setup', requireAuth, authController.setup2fa);
router.post('/2fa/enable', requireAuth, authController.enable2fa);
router.post('/2fa/disable', requireAuth, authController.disable2fa);
router.post('/2fa/regenerate-recovery-codes', requireAuth, authController.regenerateRecoveryCodes);

// Active Device Sessions & Remote Revocation
router.get('/sessions', requireAuth, authController.listSessions);
router.delete('/sessions/:id', requireAuth, authController.revokeSession);
router.post('/sessions/revoke-others', requireAuth, authController.revokeOtherSessions);

export default router;
