"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const companies_controller_1 = require("./companies.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', companies_controller_1.companiesController.list);
router.get('/:id', companies_controller_1.companiesController.getById);
router.post('/', auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), companies_controller_1.companiesController.create);
router.patch('/:id', auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), companies_controller_1.companiesController.update);
router.post('/:id/addresses', auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), companies_controller_1.companiesController.addAddress);
router.post('/:id/bank-accounts', auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), companies_controller_1.companiesController.addBankAccount);
router.post('/:id/signatories', auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), companies_controller_1.companiesController.addSignatory);
router.post('/:id/terms', auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), companies_controller_1.companiesController.addTerm);
exports.default = router;
//# sourceMappingURL=companies.routes.js.map