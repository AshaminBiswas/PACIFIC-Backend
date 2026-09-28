"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("./users.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All user operations require authentication
router.use(auth_middleware_1.requireAuth);
router.get('/', (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), users_controller_1.usersController.list);
router.get('/:id', (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), users_controller_1.usersController.getById);
// Creation, modification, and password reset restricted to Super Admin
router.post('/', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), users_controller_1.usersController.create);
router.patch('/:id', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), users_controller_1.usersController.update);
router.post('/:id/reset-password', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), users_controller_1.usersController.resetPassword);
router.delete('/:id', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), users_controller_1.usersController.delete);
exports.default = router;
//# sourceMappingURL=users.routes.js.map