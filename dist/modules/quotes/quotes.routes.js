"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quotes_controller_1 = require("./quotes.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.requireAuth, quotes_controller_1.quotesController.list);
router.get('/:id', auth_middleware_1.requireAuth, quotes_controller_1.quotesController.getById);
router.post('/', auth_middleware_1.requireAuth, quotes_controller_1.quotesController.create);
router.patch('/:id/status', auth_middleware_1.requireAuth, quotes_controller_1.quotesController.updateStatus);
router.patch('/:id', auth_middleware_1.requireAuth, quotes_controller_1.quotesController.update);
router.delete('/:id', auth_middleware_1.requireAuth, quotes_controller_1.quotesController.delete);
exports.default = router;
//# sourceMappingURL=quotes.routes.js.map