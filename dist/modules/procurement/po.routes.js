"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const po_controller_1 = require("./po.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('po:view'), po_controller_1.poController.list);
router.get('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('po:view'), po_controller_1.poController.getById);
router.get('/:id/pdf', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('po:download'), po_controller_1.poController.getPdfHtml);
router.post('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('po:create'), po_controller_1.poController.create);
router.post('/:id/approve', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('po:approve'), po_controller_1.poController.approve);
router.post('/:id/cancel', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('po:cancel'), po_controller_1.poController.cancel);
router.delete('/:id', auth_middleware_1.requireAuth, po_controller_1.poController.delete);
exports.default = router;
//# sourceMappingURL=po.routes.js.map