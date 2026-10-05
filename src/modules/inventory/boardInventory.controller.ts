import { Request, Response } from 'express';
import { boardInventoryService } from './boardInventory.service';
import { inventoryAlertService } from './inventoryAlert.service';

export class BoardInventoryController {
  async listBoards(req: Request, res: Response) {
    try {
      const { search, vendorId, vendorName, boardType, size, thickness, status, warehouse, category, page, limit } = req.query;
      const data = await boardInventoryService.listBoards({
        search: search as string,
        vendorId: vendorId as string,
        vendorName: vendorName as string,
        boardType: boardType as string,
        size: size as string,
        thickness: thickness as string,
        status: status as string,
        warehouse: warehouse as string,
        category: category as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 25,
      });
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[BoardInventory] listBoards error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to list boards' });
    }
  }

  async getBoardById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await boardInventoryService.getBoardById(id);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[BoardInventory] getBoardById error:', err);
      res.status(404).json({ success: false, message: err.message || 'Board not found' });
    }
  }

  async createBoard(req: Request, res: Response) {
    try {
      const data = await boardInventoryService.createBoard(req.body);
      res.status(201).json({ success: true, data, message: 'Board SKU created successfully' });
    } catch (err: any) {
      console.error('[BoardInventory] createBoard error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to create board SKU' });
    }
  }

  async updateBoard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await boardInventoryService.updateBoard(id, req.body);
      res.json({ success: true, data, message: 'Board SKU updated successfully' });
    } catch (err: any) {
      console.error('[BoardInventory] updateBoard error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to update board SKU' });
    }
  }

  async deleteBoard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await boardInventoryService.deleteBoard(id);
      res.json({ success: true, message: 'Board SKU deleted successfully' });
    } catch (err: any) {
      console.error('[BoardInventory] deleteBoard error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to delete board SKU' });
    }
  }

  async addStockInward(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const data = await boardInventoryService.addStockInward({
        ...req.body,
        createdById: userId,
      });
      res.status(201).json({ success: true, data, message: 'Stock received and credited successfully' });
    } catch (err: any) {
      console.error('[BoardInventory] addStockInward error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to record stock inward' });
    }
  }

  async issueStockManual(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const data = await boardInventoryService.issueStockManual({
        ...req.body,
        createdById: userId,
      });
      res.status(201).json({ success: true, data, message: 'Stock issued successfully' });
    } catch (err: any) {
      console.error('[BoardInventory] issueStockManual error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to issue stock' });
    }
  }

  async addBulkStockInward(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const raw = Array.isArray(req.body.items) ? req.body.items : (Array.isArray(req.body) ? req.body : [req.body]);
      const inputs = raw.map((item: any) => ({
        ...item,
        createdById: userId,
      }));
      const data = await boardInventoryService.addBulkStockInward(inputs);
      res.status(201).json({ success: true, data, message: `Successfully inwarded ${data.count} items into stock` });
    } catch (err: any) {
      console.error('[BoardInventory] addBulkStockInward error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to record bulk stock inward' });
    }
  }

  async issueBulkStock(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const raw = Array.isArray(req.body.items) ? req.body.items : (Array.isArray(req.body) ? req.body : [req.body]);
      const inputs = raw.map((item: any) => ({
        ...item,
        createdById: userId,
      }));
      const data = await boardInventoryService.issueBulkStock(inputs);
      res.status(201).json({ success: true, data, message: `Successfully issued ${data.count} items from stock` });
    } catch (err: any) {
      console.error('[BoardInventory] issueBulkStock error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to issue bulk stock' });
    }
  }

  async createBulkBoards(req: Request, res: Response) {
    try {
      const raw = Array.isArray(req.body.items) ? req.body.items : (Array.isArray(req.body) ? req.body : [req.body]);
      const data = await boardInventoryService.createBulkBoards(raw);
      res.status(201).json({ success: true, data, message: `Successfully created ${data.count} board SKUs` });
    } catch (err: any) {
      console.error('[BoardInventory] createBulkBoards error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to create bulk board SKUs' });
    }
  }

  async autoDeductForIssueList(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const data = await boardInventoryService.autoDeductForIssueList({
        ...req.body,
        createdById: userId,
      });
      res.status(200).json({ success: true, data, message: 'Issue list stock auto-deducted' });
    } catch (err: any) {
      console.error('[BoardInventory] autoDeductForIssueList error:', err);
      res.status(400).json({ success: false, message: err.message || 'Auto-deduction failed' });
    }
  }

  async adjustDeductionMovement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const data = await boardInventoryService.adjustDeductionMovement(id, {
        ...req.body,
        adjustedByUserId: userId,
      });
      res.json({ success: true, data, message: 'Deduction movement adjusted successfully' });
    } catch (err: any) {
      console.error('[BoardInventory] adjustDeductionMovement error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to adjust deduction' });
    }
  }

  async listSuppliers(_req: Request, res: Response) {
    try {
      const data = await boardInventoryService.listSuppliers();
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[BoardInventory] listSuppliers error:', err);
      res.status(500).json({ success: false, message: 'Failed to list suppliers' });
    }
  }

  async getMovements(req: Request, res: Response) {
    try {
      const { inventoryItemId, movementType, timeframe, startDate, endDate, warehouse, limit } = req.query;
      const data = await boardInventoryService.getMovements({
        inventoryItemId: inventoryItemId as string,
        movementType: movementType as string,
        timeframe: timeframe as any,
        startDate: startDate as string,
        endDate: endDate as string,
        warehouse: warehouse as string,
        limit: limit ? Number(limit) : 100,
      });
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[BoardInventory] getMovements error:', err);
      res.status(500).json({ success: false, message: 'Failed to query movements' });
    }
  }

  async getAnalytics(req: Request, res: Response) {
    try {
      const { timeframe, startDate, endDate, warehouse, category } = req.query;
      const data = await boardInventoryService.getAnalyticsSummary(
        timeframe as any,
        startDate as string,
        endDate as string,
        warehouse as string,
        category as string
      );
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[BoardInventory] getAnalytics error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve analytics' });
    }
  }

  async triggerLowStockAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const result = await inventoryAlertService.checkAndTriggerLowStockAlert(id, reason || 'Operator Manual Re-Check');
      if (result && (result as any).paused) {
        res.json({ success: true, message: 'Stock alert email system is temporarily paused.', data: result });
        return;
      }
      res.json({ success: true, message: 'Low stock alert email triggered to all 5 recipients', data: result });
    } catch (err: any) {
      console.error('[BoardInventory] triggerLowStockAlert error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to trigger low stock alert' });
    }
  }

  async getAlertStatus(req: Request, res: Response) {
    try {
      res.json({ success: true, isPaused: inventoryAlertService.isAlertPaused() });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Failed to get alert status' });
    }
  }

  async toggleAlerts(req: Request, res: Response) {
    try {
      const { paused } = req.body || {};
      inventoryAlertService.setPaused(paused !== undefined ? Boolean(paused) : true);
      res.json({
        success: true,
        message: inventoryAlertService.isAlertPaused()
          ? 'Stock alert email system is paused.'
          : 'Stock alert email system is active.',
        isPaused: inventoryAlertService.isAlertPaused(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Failed to toggle alerts' });
    }
  }
}

export const boardInventoryController = new BoardInventoryController();
