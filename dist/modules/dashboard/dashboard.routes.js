"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("./dashboard.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/stats', auth_middleware_1.requireAuth, dashboard_controller_1.dashboardController.getStats);
router.get('/', auth_middleware_1.requireAuth, dashboard_controller_1.dashboardController.getStats);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map