"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoices_controller_1 = require("./invoices.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.requireAuth, invoices_controller_1.invoicesController.list);
router.get('/:id', auth_middleware_1.requireAuth, invoices_controller_1.invoicesController.getById);
router.get('/:id/pdf', auth_middleware_1.requireAuth, invoices_controller_1.invoicesController.getPdf);
router.post('/from-order/:orderId', auth_middleware_1.requireAuth, invoices_controller_1.invoicesController.createFromOrder);
router.post('/', auth_middleware_1.requireAuth, invoices_controller_1.invoicesController.create);
router.put('/:id', auth_middleware_1.requireAuth, invoices_controller_1.invoicesController.update);
router.patch('/:id', auth_middleware_1.requireAuth, invoices_controller_1.invoicesController.update);
router.delete('/:id', auth_middleware_1.requireAuth, invoices_controller_1.invoicesController.delete);
exports.default = router;
//# sourceMappingURL=invoices.routes.js.map