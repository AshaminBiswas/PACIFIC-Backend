"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roles_controller_1 = require("./roles.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All role operations require authentication
router.use(auth_middleware_1.requireAuth);
router.get('/permissions', (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), roles_controller_1.rolesController.listPermissions);
router.get('/', (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), roles_controller_1.rolesController.list);
router.get('/:id', (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), roles_controller_1.rolesController.getById);
// Creation, modification, and deletion are restricted to Super Admin
router.post('/', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), roles_controller_1.rolesController.create);
router.patch('/:id', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), roles_controller_1.rolesController.update);
router.delete('/:id', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), roles_controller_1.rolesController.delete);
exports.default = router;
//# sourceMappingURL=roles.routes.js.map