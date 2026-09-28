"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendors_controller_1 = require("./vendors.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('vendor:view'), vendors_controller_1.vendorsController.listVendors);
router.get('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('vendor:view'), vendors_controller_1.vendorsController.getVendorById);
router.post('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('vendor:create'), vendors_controller_1.vendorsController.createVendor);
router.patch('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('vendor:edit'), vendors_controller_1.vendorsController.updateVendor);
router.delete('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('vendor:delete'), vendors_controller_1.vendorsController.deleteVendor);
exports.default = router;
//# sourceMappingURL=vendors.routes.js.map