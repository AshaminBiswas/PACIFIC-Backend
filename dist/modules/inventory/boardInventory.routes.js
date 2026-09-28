"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const boardInventory_controller_1 = require("./boardInventory.controller");
const router = (0, express_1.Router)();
// Master Board Catalog & Queries
router.get('/', (req, res) => boardInventory_controller_1.boardInventoryController.listBoards(req, res));
router.get('/suppliers', (req, res) => boardInventory_controller_1.boardInventoryController.listSuppliers(req, res));
router.get('/analytics', (req, res) => boardInventory_controller_1.boardInventoryController.getAnalytics(req, res));
router.get('/movements', (req, res) => boardInventory_controller_1.boardInventoryController.getMovements(req, res));
router.get('/:id', (req, res) => boardInventory_controller_1.boardInventoryController.getBoardById(req, res));
// Stock Creation, Mutations & Inward/Outward Operations
router.post('/', (req, res) => boardInventory_controller_1.boardInventoryController.createBoard(req, res));
router.put('/:id', (req, res) => boardInventory_controller_1.boardInventoryController.updateBoard(req, res));
router.delete('/:id', (req, res) => boardInventory_controller_1.boardInventoryController.deleteBoard(req, res));
router.post('/inward', (req, res) => boardInventory_controller_1.boardInventoryController.addStockInward(req, res));
router.post('/issue', (req, res) => boardInventory_controller_1.boardInventoryController.issueStockManual(req, res));
router.post('/auto-deduct', (req, res) => boardInventory_controller_1.boardInventoryController.autoDeductForIssueList(req, res));
router.put('/movements/:id/adjust', (req, res) => boardInventory_controller_1.boardInventoryController.adjustDeductionMovement(req, res));
router.post('/:id/alert', (req, res) => boardInventory_controller_1.boardInventoryController.triggerLowStockAlert(req, res));
exports.default = router;
//# sourceMappingURL=boardInventory.routes.js.map