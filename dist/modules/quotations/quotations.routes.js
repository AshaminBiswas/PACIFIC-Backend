"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quotations_controller_1 = require("./quotations.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
// Content Library Templates
router.get('/templates', quotations_controller_1.quotationsController.listTemplates);
router.post('/templates', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:edit'), quotations_controller_1.quotationsController.saveTemplate);
// Sales Quotations
router.get('/', quotations_controller_1.quotationsController.list);
router.get('/:id', quotations_controller_1.quotationsController.getById);
router.get('/:id/pdf', quotations_controller_1.quotationsController.getPdf);
router.post('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:create'), quotations_controller_1.quotationsController.create);
router.patch('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:edit'), quotations_controller_1.quotationsController.update);
router.delete('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:delete'), quotations_controller_1.quotationsController.delete);
router.post('/:id/revise', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:edit'), quotations_controller_1.quotationsController.revise);
router.post('/:id/send', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:send'), quotations_controller_1.quotationsController.send);
router.post('/:id/send-email', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:send'), quotations_controller_1.quotationsController.sendEmail);
router.get('/:id/follow-ups', quotations_controller_1.quotationsController.getFollowups);
router.post('/:id/follow-ups', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:edit'), quotations_controller_1.quotationsController.createFollowup);
router.post('/:id/send-followup-email', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:send'), quotations_controller_1.quotationsController.sendFollowupEmail);
router.post('/:id/convert-to-pi', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:edit'), quotations_controller_1.quotationsController.convertToPI);
router.post('/:id/convert-to-order', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('quotation:edit'), quotations_controller_1.quotationsController.convertToOrder);
exports.default = router;
//# sourceMappingURL=quotations.routes.js.map