import { Router } from 'express';
import { boardInventoryController } from './boardInventory.controller';

const router = Router();

// Master Board Catalog & Queries
router.get('/', (req, res) => boardInventoryController.listBoards(req, res));
router.get('/suppliers', (req, res) => boardInventoryController.listSuppliers(req, res));
router.get('/analytics', (req, res) => boardInventoryController.getAnalytics(req, res));
router.get('/movements', (req, res) => boardInventoryController.getMovements(req, res));
router.get('/alert-status', (req, res) => boardInventoryController.getAlertStatus(req, res));
router.post('/toggle-alerts', (req, res) => boardInventoryController.toggleAlerts(req, res));
// Bulk Operations
router.post('/inward/bulk', (req, res) => boardInventoryController.addBulkStockInward(req, res));
router.post('/issue/bulk', (req, res) => boardInventoryController.issueBulkStock(req, res));
router.post('/bulk', (req, res) => boardInventoryController.createBulkBoards(req, res));

router.get('/:id', (req, res) => boardInventoryController.getBoardById(req, res));

// Stock Creation, Mutations & Inward/Outward Operations
router.post('/', (req, res) => boardInventoryController.createBoard(req, res));
router.put('/:id', (req, res) => boardInventoryController.updateBoard(req, res));
router.delete('/:id', (req, res) => boardInventoryController.deleteBoard(req, res));

router.post('/inward', (req, res) => boardInventoryController.addStockInward(req, res));
router.post('/issue', (req, res) => boardInventoryController.issueStockManual(req, res));
router.post('/auto-deduct', (req, res) => boardInventoryController.autoDeductForIssueList(req, res));
router.put('/movements/:id/adjust', (req, res) => boardInventoryController.adjustDeductionMovement(req, res));
router.post('/:id/alert', (req, res) => boardInventoryController.triggerLowStockAlert(req, res));

export default router;
