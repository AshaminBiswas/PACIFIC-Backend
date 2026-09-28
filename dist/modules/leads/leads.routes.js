"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leads_controller_1 = require("./leads.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public — website contact/enquiry forms
router.post('/', leads_controller_1.leadsController.create);
// Admin
router.get('/stats', auth_middleware_1.requireAuth, leads_controller_1.leadsController.getStats);
router.get('/', auth_middleware_1.requireAuth, leads_controller_1.leadsController.list);
router.get('/:id', auth_middleware_1.requireAuth, leads_controller_1.leadsController.getById);
router.put('/:id', auth_middleware_1.requireAuth, leads_controller_1.leadsController.update);
router.patch('/:id', auth_middleware_1.requireAuth, leads_controller_1.leadsController.update);
router.delete('/:id', auth_middleware_1.requireAuth, leads_controller_1.leadsController.delete);
exports.default = router;
//# sourceMappingURL=leads.routes.js.map