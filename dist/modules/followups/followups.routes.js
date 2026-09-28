"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const followups_controller_1 = require("./followups.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
router.get('/dashboard', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('followup:view'), followups_controller_1.followupsController.getRecoveryDashboard);
router.get('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('followup:view'), followups_controller_1.followupsController.list);
router.get('/customer/:customerId', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('followup:view'), followups_controller_1.followupsController.getByCustomer);
router.post('/customer/:customerId/log', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('followup:edit'), followups_controller_1.followupsController.logCustomerTouchpoint);
router.post('/run-cadence', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('followup:edit'), followups_controller_1.followupsController.runCadence);
router.get('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('followup:view'), followups_controller_1.followupsController.getById);
router.post('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('followup:create'), followups_controller_1.followupsController.create);
router.post('/:id/logs', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('followup:edit'), followups_controller_1.followupsController.addLog);
exports.default = router;
//# sourceMappingURL=followups.routes.js.map