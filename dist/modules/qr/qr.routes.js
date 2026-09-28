"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qr_controller_1 = require("./qr.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
// Admin operations
router.post('/scan', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('qr:scan'), qr_controller_1.qrController.scan);
router.post('/generate', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('qr:create'), qr_controller_1.qrController.generate);
router.get('/history', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('qr:view'), qr_controller_1.qrController.getScanHistory);
exports.default = router;
//# sourceMappingURL=qr.routes.js.map