"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_schema_1 = require("./auth.schema");
const router = (0, express_1.Router)();
// Standard auth routes
router.post('/login', (0, validate_middleware_1.validate)(auth_schema_1.loginSchema), auth_controller_1.authController.login);
router.post('/register', (0, validate_middleware_1.validate)(auth_schema_1.registerSchema), auth_controller_1.authController.register);
router.post('/super-admin', auth_controller_1.authController.createSuperAdmin);
router.post('/refresh', auth_controller_1.authController.refresh);
router.post('/logout', auth_middleware_1.requireAuth, auth_controller_1.authController.logout);
router.get('/me', auth_middleware_1.requireAuth, auth_controller_1.authController.getMe);
// First-time login onboarding wizard (Dummy password -> New password -> 2FA setup)
router.post('/first-time/change-password', auth_controller_1.authController.firstTimeChangePassword);
router.post('/first-time/verify-2fa', auth_controller_1.authController.firstTimeVerify2fa);
router.post('/change-password', auth_middleware_1.requireAuth, auth_controller_1.authController.changePassword);
// Two-Factor Authentication (2FA) verification & management
router.post('/2fa/verify', auth_controller_1.authController.verify2fa);
router.post('/2fa/setup', auth_middleware_1.requireAuth, auth_controller_1.authController.setup2fa);
router.post('/2fa/enable', auth_middleware_1.requireAuth, auth_controller_1.authController.enable2fa);
router.post('/2fa/disable', auth_middleware_1.requireAuth, auth_controller_1.authController.disable2fa);
router.post('/2fa/regenerate-recovery-codes', auth_middleware_1.requireAuth, auth_controller_1.authController.regenerateRecoveryCodes);
// Active Device Sessions & Remote Revocation
router.get('/sessions', auth_middleware_1.requireAuth, auth_controller_1.authController.listSessions);
router.delete('/sessions/:id', auth_middleware_1.requireAuth, auth_controller_1.authController.revokeSession);
router.post('/sessions/revoke-others', auth_middleware_1.requireAuth, auth_controller_1.authController.revokeOtherSessions);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map