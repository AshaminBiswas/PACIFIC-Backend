"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crm_controller_1 = require("./crm.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('crm:view'), crm_controller_1.crmController.listCustomers);
router.post('/check-duplicates', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('crm:view'), crm_controller_1.crmController.checkDuplicates);
router.post('/merge', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('crm:edit'), crm_controller_1.crmController.mergeCustomers);
router.get('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('crm:view'), crm_controller_1.crmController.getCustomerById);
router.get('/:id/360', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('crm:view'), crm_controller_1.crmController.getCustomer360);
router.post('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('crm:create'), crm_controller_1.crmController.createCustomer);
router.patch('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('crm:edit'), crm_controller_1.crmController.updateCustomer);
router.delete('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('crm:delete'), crm_controller_1.crmController.deleteCustomer);
router.post('/:id/contacts', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('crm:edit'), crm_controller_1.crmController.addContact);
router.post('/:id/addresses', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('crm:edit'), crm_controller_1.crmController.addAddress);
exports.default = router;
//# sourceMappingURL=crm.routes.js.map