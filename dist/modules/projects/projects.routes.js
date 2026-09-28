"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projects_controller_1 = require("./projects.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public — for portfolio display on website
router.get('/', projects_controller_1.projectsController.list);
router.get('/:id', projects_controller_1.projectsController.getById);
// Admin
router.post('/', auth_middleware_1.requireAuth, projects_controller_1.projectsController.create);
router.put('/:id', auth_middleware_1.requireAuth, projects_controller_1.projectsController.update);
router.patch('/:id', auth_middleware_1.requireAuth, projects_controller_1.projectsController.update);
router.delete('/:id', auth_middleware_1.requireAuth, projects_controller_1.projectsController.delete);
exports.default = router;
//# sourceMappingURL=projects.routes.js.map