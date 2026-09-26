import { Request, Response, NextFunction } from 'express';
import { exportService } from './export.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const exportController = {
  // ─── DASHBOARD ──────────────────────────────────────────────────────────────
  async getDashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getDashboardStats();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── MASTER LOOKUPS ────────────────────────────────────────────────────────
  async listCountries(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listCountries();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getCountry(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getCountry(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async upsertCountry(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.upsertCountry(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listCountryRules(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listCountryRules(req.query.countryId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async upsertCountryRule(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.upsertCountryRule(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listPorts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listPorts({
        countryId: req.query.countryId as string,
        portType: req.query.portType as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createPort(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.createPort(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updatePort(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.updatePort(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listIncoterms(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listIncoterms();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async upsertIncoterm(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.upsertIncoterm(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listCurrencies(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listCurrencies();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getExchangeRates(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getExchangeRates(req.query.currencyId as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateExchangeRate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.updateExchangeRate(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listHsCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listHsCodes(req.query.search as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createHsCode(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.createHsCode(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── CUSTOMERS ──────────────────────────────────────────────────────────────
  async listCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listExportCustomers({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string,
        countryId: req.query.countryId as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.createExportCustomer(req.body, (req as any).user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      await exportService.deleteExportCustomer(req.params.id);
      res.json({ success: true, message: 'Foreign buyer deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getCustomer360(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getExportCustomer360(req.params.id);
      if (!data) {
        res.status(404).json({ success: false, message: 'Export customer not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async upsertCustomerProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.upsertExportCustomerProfile(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addCustomerBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.addCustomerBankAccount(req.params.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── RFQS ───────────────────────────────────────────────────────────────────
  async listRfqs(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listRfqs({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string,
        status: req.query.status as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getRfqById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getRfqById(req.params.id);
      if (!data) {
        res.status(404).json({ success: false, message: 'RFQ not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createRfq(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await exportService.createRfq(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateRfq(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.updateRfq(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async convertRfqToQuotation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await exportService.convertRfqToQuotation(req.params.id, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── QUOTATIONS ─────────────────────────────────────────────────────────────
  async listQuotations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listQuotations({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string,
        status: req.query.status as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getQuotationById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getQuotationById(req.params.id);
      if (!data) {
        res.status(404).json({ success: false, message: 'Export Quotation not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getQuotationPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const html = await exportService.getQuotationPdfHtml(req.params.id);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  },

  async createQuotation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await exportService.createQuotation(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.updateQuotation(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async deleteQuotation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await exportService.deleteQuotation(req.params.id);
      res.json({ success: true, data, message: 'Export Quotation deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async convertQuotationToOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await exportService.convertQuotationToOrder(req.params.id, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── ORDERS ─────────────────────────────────────────────────────────────────
  async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listOrders({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string,
        stage: req.query.stage as string,
        status: req.query.status as string,
        countryId: req.query.countryId as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getOrder360(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getOrder360(req.params.id);
      if (!data) {
        res.status(404).json({ success: false, message: 'Export Order not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await exportService.createOrder(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.updateOrder(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateOrderStage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await exportService.updateOrderStage(req.params.id, req.body.stage, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── MILESTONES & LC ────────────────────────────────────────────────────────
  async listMilestones(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listMilestones(req.params.orderId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.updateMilestone(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getLcByOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getLcByOrder(req.params.orderId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async upsertLc(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.upsertLc(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── SHIPMENTS & CONTAINERS ─────────────────────────────────────────────────
  async listShipments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listShipments({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        orderId: req.query.orderId as string,
        status: req.query.status as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getShipmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getShipmentById(req.params.id);
      if (!data) {
        res.status(404).json({ success: false, message: 'Shipment not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createShipment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.createShipment(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateShipment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.updateShipment(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listContainers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listContainers(req.params.shipmentId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createContainer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.createContainer(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateContainer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.updateContainer(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addShippingEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.addShippingEvent(req.params.shipmentId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── CUSTOMS & COMPLIANCE ───────────────────────────────────────────────────
  async getCustomsRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getCustomsRecord(req.params.orderId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async upsertCustomsRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.upsertCustomsRecord(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getShippingBill(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getShippingBill(req.params.orderId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async upsertShippingBill(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.upsertShippingBill(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async runComplianceCheck(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await exportService.runComplianceCheck(req.params.orderId, req.user?.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listCertificates(req.params.orderId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async upsertCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.upsertCertificate(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── EXPENSES ───────────────────────────────────────────────────────────────
  async listExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listExpenses(req.params.orderId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.addExpense(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      await exportService.deleteExpense(req.params.id);
      res.json({ success: true, message: 'Expense deleted' });
    } catch (err) {
      next(err);
    }
  },

  // ─── REALIZATIONS ───────────────────────────────────────────────────────────
  async listRealizations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listRealizations({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        orderId: req.query.orderId as string,
        status: req.query.status as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createRealization(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.createRealization(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addIrm(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.addIrm(req.params.realizationId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addEbrc(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.addEbrc(req.params.realizationId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── DOCUMENTS ──────────────────────────────────────────────────────────────
  async listDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listDocuments(
        req.query.entityType as string,
        req.query.entityId as string
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await exportService.addDocument(req.body, req.user?.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── EMAIL SYSTEM ───────────────────────────────────────────────────────────
  async listEmailTemplates(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listEmailTemplates();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getEmailTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.getEmailTemplate(req.params.code);
      if (!data) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async upsertEmailTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.upsertEmailTemplate(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listEmailLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listEmailLogs({
        exportOrderId: req.query.exportOrderId as string,
        partyId: req.query.partyId as string,
        status: req.query.status as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async sendTradeEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await exportService.sendTradeEmail(req.body, req.user?.id);
      res.json({ success: result.success, data: result.log, error: result.error });
    } catch (err) {
      next(err);
    }
  },

  // ─── TASKS ──────────────────────────────────────────────────────────────────
  async listTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.listTasks({
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        status: req.query.status as string,
        assignedToUserId: req.query.assignedToUserId as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.createTask(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.updateTask(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  // ─── GLOBAL SEARCH ──────────────────────────────────────────────────────────
  async globalSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await exportService.globalOmniSearch(req.query.q as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
