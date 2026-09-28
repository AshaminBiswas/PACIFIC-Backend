"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_schema_1 = require("./auth.schema");
const router = (0, express_1.Router)();
router.post('/login', (0, validate_middleware_1.validate)(auth_schema_1.loginSchema), auth_controller_1.authController.login);
router.post('/register', (0, validate_middleware_1.validate)(auth_schema_1.registerSchema), auth_controller_1.authController.register);
router.post('/super-admin', auth_controller_1.authController.createSuperAdmin);
router.post('/refresh', auth_controller_1.authController.refresh);
router.post('/logout', auth_middleware_1.requireAuth, auth_controller_1.authController.logout);
router.get('/me', auth_middleware_1.requireAuth, auth_controller_1.authController.getMe);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map