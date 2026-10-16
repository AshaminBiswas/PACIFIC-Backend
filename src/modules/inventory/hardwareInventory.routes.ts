import { Router } from 'express';
import { hardwareInventoryController } from './hardwareInventory.controller';

const router = Router();

// Sub-collections (MUST be declared before parameterized /:id route)
router.get('/branches', (req, res) => hardwareInventoryController.listBranches(req, res));
router.get('/vendors', (req, res) => hardwareInventoryController.listVendors(req, res));
router.delete('/vendors/:id', (req, res) => hardwareInventoryController.deleteVendor(req, res));
router.get('/analytics', (req, res) => hardwareInventoryController.getAnalytics(req, res));
router.get('/movements', (req, res) => hardwareInventoryController.listMovements(req, res));
router.post('/inward', (req, res) => hardwareInventoryController.inward(req, res));
router.post('/issue', (req, res) => hardwareInventoryController.issue(req, res));

// Items Collection
router.get('/', (req, res) => hardwareInventoryController.list(req, res));
router.post('/', (req, res) => hardwareInventoryController.create(req, res));

// Item Details
router.get('/:id', (req, res) => hardwareInventoryController.getById(req, res));
router.put('/:id', (req, res) => hardwareInventoryController.update(req, res));
router.patch('/:id', (req, res) => hardwareInventoryController.update(req, res));
router.delete('/:id', (req, res) => hardwareInventoryController.delete(req, res));

export default router;
