import { Request, Response } from 'express';
import { hardwareInventoryService } from './hardwareInventory.service';

export class HardwareInventoryController {
  async list(req: Request, res: Response) {
    try {
      const data = await hardwareInventoryService.listItems(req.query);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[HardwareInventory] list error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to list hardware items' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await hardwareInventoryService.getItemById(id);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[HardwareInventory] getById error:', err);
      res.status(404).json({ success: false, message: err.message || 'Hardware item not found' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = await hardwareInventoryService.createItem(req.body);
      res.status(201).json({ success: true, data, message: 'Hardware SKU registered successfully' });
    } catch (err: any) {
      console.error('[HardwareInventory] create error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to create hardware SKU' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await hardwareInventoryService.updateItem(id, req.body);
      res.json({ success: true, data, message: 'Hardware item updated successfully' });
    } catch (err: any) {
      console.error('[HardwareInventory] update error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to update hardware item' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await hardwareInventoryService.deleteItem(id);
      res.json({ success: true, data, message: 'Hardware item deleted successfully' });
    } catch (err: any) {
      console.error('[HardwareInventory] delete error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to delete hardware item' });
    }
  }

  async inward(req: Request, res: Response) {
    try {
      const data = await hardwareInventoryService.inwardStock(req.body);
      res.json({ success: true, data, message: 'Stock inward recorded successfully' });
    } catch (err: any) {
      console.error('[HardwareInventory] inward error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to record stock inward' });
    }
  }

  async issue(req: Request, res: Response) {
    try {
      const data = await hardwareInventoryService.issueStock(req.body);
      res.json({ success: true, data, message: 'Stock issue recorded successfully' });
    } catch (err: any) {
      console.error('[HardwareInventory] issue error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to record stock issue' });
    }
  }

  async listMovements(req: Request, res: Response) {
    try {
      const data = await hardwareInventoryService.listMovements(req.query);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[HardwareInventory] listMovements error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to list movements' });
    }
  }

  async getAnalytics(req: Request, res: Response) {
    try {
      const warehouse = (req.query.warehouse as string) || undefined;
      const data = await hardwareInventoryService.getAnalyticsSummary(warehouse);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[HardwareInventory] getAnalytics error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to get analytics summary' });
    }
  }

  async listBranches(_req: Request, res: Response) {
    try {
      const data = await hardwareInventoryService.listBranches();
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[HardwareInventory] listBranches error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to list branches' });
    }
  }

  async listVendors(_req: Request, res: Response) {
    try {
      const data = await hardwareInventoryService.listVendors();
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('[HardwareInventory] listVendors error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to list vendors' });
    }
  }

  async deleteVendor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await hardwareInventoryService.deleteVendor(id);
      res.json({ success: true, data, message: 'Vendor deleted successfully' });
    } catch (err: any) {
      console.error('[HardwareInventory] deleteVendor error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to delete vendor' });
    }
  }
}

export const hardwareInventoryController = new HardwareInventoryController();
