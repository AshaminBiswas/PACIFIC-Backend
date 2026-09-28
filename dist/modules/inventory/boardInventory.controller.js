"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardInventoryController = exports.BoardInventoryController = void 0;
const boardInventory_service_1 = require("./boardInventory.service");
const inventoryAlert_service_1 = require("./inventoryAlert.service");
class BoardInventoryController {
    async listBoards(req, res) {
        try {
            const { search, vendorId, vendorName, boardType, thickness, status, warehouse, category, page, limit } = req.query;
            const data = await boardInventory_service_1.boardInventoryService.listBoards({
                search: search,
                vendorId: vendorId,
                vendorName: vendorName,
                boardType: boardType,
                thickness: thickness,
                status: status,
                warehouse: warehouse,
                category: category,
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 25,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            console.error('[BoardInventory] listBoards error:', err);
            res.status(500).json({ success: false, message: err.message || 'Failed to list boards' });
        }
    }
    async getBoardById(req, res) {
        try {
            const { id } = req.params;
            const data = await boardInventory_service_1.boardInventoryService.getBoardById(id);
            res.json({ success: true, data });
        }
        catch (err) {
            console.error('[BoardInventory] getBoardById error:', err);
            res.status(404).json({ success: false, message: err.message || 'Board not found' });
        }
    }
    async createBoard(req, res) {
        try {
            const data = await boardInventory_service_1.boardInventoryService.createBoard(req.body);
            res.status(201).json({ success: true, data, message: 'Board SKU created successfully' });
        }
        catch (err) {
            console.error('[BoardInventory] createBoard error:', err);
            res.status(400).json({ success: false, message: err.message || 'Failed to create board SKU' });
        }
    }
    async updateBoard(req, res) {
        try {
            const { id } = req.params;
            const data = await boardInventory_service_1.boardInventoryService.updateBoard(id, req.body);
            res.json({ success: true, data, message: 'Board SKU updated successfully' });
        }
        catch (err) {
            console.error('[BoardInventory] updateBoard error:', err);
            res.status(400).json({ success: false, message: err.message || 'Failed to update board SKU' });
        }
    }
    async deleteBoard(req, res) {
        try {
            const { id } = req.params;
            await boardInventory_service_1.boardInventoryService.deleteBoard(id);
            res.json({ success: true, message: 'Board SKU deleted successfully' });
        }
        catch (err) {
            console.error('[BoardInventory] deleteBoard error:', err);
            res.status(400).json({ success: false, message: err.message || 'Failed to delete board SKU' });
        }
    }
    async addStockInward(req, res) {
        try {
            const userId = req.user?.id;
            const data = await boardInventory_service_1.boardInventoryService.addStockInward({
                ...req.body,
                createdById: userId,
            });
            res.status(201).json({ success: true, data, message: 'Stock received and credited successfully' });
        }
        catch (err) {
            console.error('[BoardInventory] addStockInward error:', err);
            res.status(400).json({ success: false, message: err.message || 'Failed to record stock inward' });
        }
    }
    async issueStockManual(req, res) {
        try {
            const userId = req.user?.id;
            const data = await boardInventory_service_1.boardInventoryService.issueStockManual({
                ...req.body,
                createdById: userId,
            });
            res.status(201).json({ success: true, data, message: 'Stock issued successfully' });
        }
        catch (err) {
            console.error('[BoardInventory] issueStockManual error:', err);
            res.status(400).json({ success: false, message: err.message || 'Failed to issue stock' });
        }
    }
    async autoDeductForIssueList(req, res) {
        try {
            const userId = req.user?.id;
            const data = await boardInventory_service_1.boardInventoryService.autoDeductForIssueList({
                ...req.body,
                createdById: userId,
            });
            res.status(200).json({ success: true, data, message: 'Issue list stock auto-deducted' });
        }
        catch (err) {
            console.error('[BoardInventory] autoDeductForIssueList error:', err);
            res.status(400).json({ success: false, message: err.message || 'Auto-deduction failed' });
        }
    }
    async adjustDeductionMovement(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            const data = await boardInventory_service_1.boardInventoryService.adjustDeductionMovement(id, {
                ...req.body,
                adjustedByUserId: userId,
            });
            res.json({ success: true, data, message: 'Deduction movement adjusted successfully' });
        }
        catch (err) {
            console.error('[BoardInventory] adjustDeductionMovement error:', err);
            res.status(400).json({ success: false, message: err.message || 'Failed to adjust deduction' });
        }
    }
    async listSuppliers(_req, res) {
        try {
            const data = await boardInventory_service_1.boardInventoryService.listSuppliers();
            res.json({ success: true, data });
        }
        catch (err) {
            console.error('[BoardInventory] listSuppliers error:', err);
            res.status(500).json({ success: false, message: 'Failed to list suppliers' });
        }
    }
    async getMovements(req, res) {
        try {
            const { inventoryItemId, movementType, timeframe, startDate, endDate, warehouse, limit } = req.query;
            const data = await boardInventory_service_1.boardInventoryService.getMovements({
                inventoryItemId: inventoryItemId,
                movementType: movementType,
                timeframe: timeframe,
                startDate: startDate,
                endDate: endDate,
                warehouse: warehouse,
                limit: limit ? Number(limit) : 100,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            console.error('[BoardInventory] getMovements error:', err);
            res.status(500).json({ success: false, message: 'Failed to query movements' });
        }
    }
    async getAnalytics(req, res) {
        try {
            const { timeframe, startDate, endDate, warehouse, category } = req.query;
            const data = await boardInventory_service_1.boardInventoryService.getAnalyticsSummary(timeframe, startDate, endDate, warehouse, category);
            res.json({ success: true, data });
        }
        catch (err) {
            console.error('[BoardInventory] getAnalytics error:', err);
            res.status(500).json({ success: false, message: 'Failed to retrieve analytics' });
        }
    }
    async triggerLowStockAlert(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body || {};
            const result = await inventoryAlert_service_1.inventoryAlertService.checkAndTriggerLowStockAlert(id, reason || 'Operator Manual Re-Check');
            res.json({ success: true, message: 'Low stock alert email triggered to all 5 recipients', data: result });
        }
        catch (err) {
            console.error('[BoardInventory] triggerLowStockAlert error:', err);
            res.status(500).json({ success: false, message: err.message || 'Failed to trigger low stock alert' });
        }
    }
}
exports.BoardInventoryController = BoardInventoryController;
exports.boardInventoryController = new BoardInventoryController();
//# sourceMappingURL=boardInventory.controller.js.map