"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const configurator_controller_1 = require("./configurator.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public — storefront can submit designs
router.post('/submit', configurator_controller_1.configuratorController.submit);
// Admin
router.get('/', auth_middleware_1.requireAuth, configurator_controller_1.configuratorController.list);
router.get('/:id', auth_middleware_1.requireAuth, configurator_controller_1.configuratorController.getById);
router.patch('/:id/status', auth_middleware_1.requireAuth, configurator_controller_1.configuratorController.updateStatus);
router.delete('/:id', auth_middleware_1.requireAuth, configurator_controller_1.configuratorController.delete);
exports.default = router;
//# sourceMappingURL=configurator.routes.js.map