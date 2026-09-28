"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_controller_1 = require("./products.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/', products_controller_1.productsController.list);
router.get('/categories', products_controller_1.productsController.listCategories);
router.get('/slug/:slug', products_controller_1.productsController.getBySlug);
router.get('/:id', products_controller_1.productsController.getById);
// Admin routes
router.post('/', auth_middleware_1.requireAuth, products_controller_1.productsController.create);
router.put('/:id', auth_middleware_1.requireAuth, products_controller_1.productsController.update);
router.patch('/:id', auth_middleware_1.requireAuth, products_controller_1.productsController.update);
router.delete('/:id', auth_middleware_1.requireAuth, products_controller_1.productsController.delete);
router.post('/categories', auth_middleware_1.requireAuth, products_controller_1.productsController.createCategory);
exports.default = router;
//# sourceMappingURL=products.routes.js.map