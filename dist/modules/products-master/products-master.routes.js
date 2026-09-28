"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_master_controller_1 = require("./products-master.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Lookup routes (public/authenticated)
router.get('/materials', products_master_controller_1.productsMasterController.getMaterials);
router.get('/finishes', products_master_controller_1.productsMasterController.getFinishes);
router.get('/units', products_master_controller_1.productsMasterController.getUnits);
router.get('/subcategories', products_master_controller_1.productsMasterController.getSubcategories);
// Product routes
router.get('/', products_master_controller_1.productsMasterController.list);
router.get('/:id', products_master_controller_1.productsMasterController.getById);
router.post('/', auth_middleware_1.requireAuth, products_master_controller_1.productsMasterController.create);
router.patch('/:id', auth_middleware_1.requireAuth, products_master_controller_1.productsMasterController.update);
router.delete('/:id', auth_middleware_1.requireAuth, products_master_controller_1.productsMasterController.delete);
exports.default = router;
//# sourceMappingURL=products-master.routes.js.map