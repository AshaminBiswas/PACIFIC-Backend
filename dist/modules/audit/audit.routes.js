"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("./audit.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), audit_controller_1.auditController.list);
exports.default = router;
//# sourceMappingURL=audit.routes.js.map