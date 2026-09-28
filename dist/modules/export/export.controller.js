"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportController = void 0;
const export_service_1 = require("./export.service");
exports.exportController = {
    // ─── DASHBOARD ──────────────────────────────────────────────────────────────
    async getDashboard(_req, res, next) {
        try {
            const data = await export_service_1.exportService.getDashboardStats();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── MASTER LOOKUPS ────────────────────────────────────────────────────────
    async listCountries(_req, res, next) {
        try {
            const data = await export_service_1.exportService.listCountries();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getCountry(req, res, next) {
        try {
            const data = await export_service_1.exportService.getCountry(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async upsertCountry(req, res, next) {
        try {
            const data = await export_service_1.exportService.upsertCountry(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async listCountryRules(req, res, next) {
        try {
            const data = await export_service_1.exportService.listCountryRules(req.query.countryId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async upsertCountryRule(req, res, next) {
        try {
            const data = await export_service_1.exportService.upsertCountryRule(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async listPorts(req, res, next) {
        try {
            const data = await export_service_1.exportService.listPorts({
                countryId: req.query.countryId,
                portType: req.query.portType,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createPort(req, res, next) {
        try {
            const data = await export_service_1.exportService.createPort(req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updatePort(req, res, next) {
        try {
            const data = await export_service_1.exportService.updatePort(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async listIncoterms(_req, res, next) {
        try {
            const data = await export_service_1.exportService.listIncoterms();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async upsertIncoterm(req, res, next) {
        try {
            const data = await export_service_1.exportService.upsertIncoterm(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async listCurrencies(_req, res, next) {
        try {
            const data = await export_service_1.exportService.listCurrencies();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getExchangeRates(req, res, next) {
        try {
            const data = await export_service_1.exportService.getExchangeRates(req.query.currencyId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateExchangeRate(req, res, next) {
        try {
            const data = await export_service_1.exportService.updateExchangeRate(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async listHsCodes(req, res, next) {
        try {
            const data = await export_service_1.exportService.listHsCodes(req.query.search);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createHsCode(req, res, next) {
        try {
            const data = await export_service_1.exportService.createHsCode(req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── CUSTOMERS ──────────────────────────────────────────────────────────────
    async listCustomers(req, res, next) {
        try {
            const data = await export_service_1.exportService.listExportCustomers({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                search: req.query.search,
                countryId: req.query.countryId,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createCustomer(req, res, next) {
        try {
            const data = await export_service_1.exportService.createExportCustomer(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteCustomer(req, res, next) {
        try {
            await export_service_1.exportService.deleteExportCustomer(req.params.id);
            res.json({ success: true, message: 'Foreign buyer deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async getCustomer360(req, res, next) {
        try {
            const data = await export_service_1.exportService.getExportCustomer360(req.params.id);
            if (!data) {
                res.status(404).json({ success: false, message: 'Export customer not found' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async upsertCustomerProfile(req, res, next) {
        try {
            const data = await export_service_1.exportService.upsertExportCustomerProfile(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addCustomerBankAccount(req, res, next) {
        try {
            const data = await export_service_1.exportService.addCustomerBankAccount(req.params.id, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── RFQS ───────────────────────────────────────────────────────────────────
    async listRfqs(req, res, next) {
        try {
            const data = await export_service_1.exportService.listRfqs({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                search: req.query.search,
                status: req.query.status,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getRfqById(req, res, next) {
        try {
            const data = await export_service_1.exportService.getRfqById(req.params.id);
            if (!data) {
                res.status(404).json({ success: false, message: 'RFQ not found' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createRfq(req, res, next) {
        try {
            const data = await export_service_1.exportService.createRfq(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateRfq(req, res, next) {
        try {
            const data = await export_service_1.exportService.updateRfq(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async convertRfqToQuotation(req, res, next) {
        try {
            const data = await export_service_1.exportService.convertRfqToQuotation(req.params.id, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── QUOTATIONS ─────────────────────────────────────────────────────────────
    async listQuotations(req, res, next) {
        try {
            const data = await export_service_1.exportService.listQuotations({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                search: req.query.search,
                status: req.query.status,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getQuotationById(req, res, next) {
        try {
            const data = await export_service_1.exportService.getQuotationById(req.params.id);
            if (!data) {
                res.status(404).json({ success: false, message: 'Export Quotation not found' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getQuotationPdf(req, res, next) {
        try {
            const html = await export_service_1.exportService.getQuotationPdfHtml(req.params.id);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    },
    async createQuotation(req, res, next) {
        try {
            const data = await export_service_1.exportService.createQuotation(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateQuotation(req, res, next) {
        try {
            const data = await export_service_1.exportService.updateQuotation(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteQuotation(req, res, next) {
        try {
            const data = await export_service_1.exportService.deleteQuotation(req.params.id);
            res.json({ success: true, data, message: 'Export Quotation deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async convertQuotationToOrder(req, res, next) {
        try {
            const data = await export_service_1.exportService.convertQuotationToOrder(req.params.id, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── ORDERS ─────────────────────────────────────────────────────────────────
    async listOrders(req, res, next) {
        try {
            const data = await export_service_1.exportService.listOrders({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                search: req.query.search,
                stage: req.query.stage,
                status: req.query.status,
                countryId: req.query.countryId,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getOrder360(req, res, next) {
        try {
            const data = await export_service_1.exportService.getOrder360(req.params.id);
            if (!data) {
                res.status(404).json({ success: false, message: 'Export Order not found' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createOrder(req, res, next) {
        try {
            const data = await export_service_1.exportService.createOrder(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateOrder(req, res, next) {
        try {
            const data = await export_service_1.exportService.updateOrder(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateOrderStage(req, res, next) {
        try {
            const data = await export_service_1.exportService.updateOrderStage(req.params.id, req.body.stage, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── MILESTONES & LC ────────────────────────────────────────────────────────
    async listMilestones(req, res, next) {
        try {
            const data = await export_service_1.exportService.listMilestones(req.params.orderId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateMilestone(req, res, next) {
        try {
            const data = await export_service_1.exportService.updateMilestone(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getLcByOrder(req, res, next) {
        try {
            const data = await export_service_1.exportService.getLcByOrder(req.params.orderId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async upsertLc(req, res, next) {
        try {
            const data = await export_service_1.exportService.upsertLc(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── SHIPMENTS & CONTAINERS ─────────────────────────────────────────────────
    async listShipments(req, res, next) {
        try {
            const data = await export_service_1.exportService.listShipments({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                orderId: req.query.orderId,
                status: req.query.status,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getShipmentById(req, res, next) {
        try {
            const data = await export_service_1.exportService.getShipmentById(req.params.id);
            if (!data) {
                res.status(404).json({ success: false, message: 'Shipment not found' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createShipment(req, res, next) {
        try {
            const data = await export_service_1.exportService.createShipment(req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateShipment(req, res, next) {
        try {
            const data = await export_service_1.exportService.updateShipment(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async listContainers(req, res, next) {
        try {
            const data = await export_service_1.exportService.listContainers(req.params.shipmentId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createContainer(req, res, next) {
        try {
            const data = await export_service_1.exportService.createContainer(req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateContainer(req, res, next) {
        try {
            const data = await export_service_1.exportService.updateContainer(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addShippingEvent(req, res, next) {
        try {
            const data = await export_service_1.exportService.addShippingEvent(req.params.shipmentId, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── CUSTOMS & COMPLIANCE ───────────────────────────────────────────────────
    async getCustomsRecord(req, res, next) {
        try {
            const data = await export_service_1.exportService.getCustomsRecord(req.params.orderId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async upsertCustomsRecord(req, res, next) {
        try {
            const data = await export_service_1.exportService.upsertCustomsRecord(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getShippingBill(req, res, next) {
        try {
            const data = await export_service_1.exportService.getShippingBill(req.params.orderId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async upsertShippingBill(req, res, next) {
        try {
            const data = await export_service_1.exportService.upsertShippingBill(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async runComplianceCheck(req, res, next) {
        try {
            const data = await export_service_1.exportService.runComplianceCheck(req.params.orderId, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async listCertificates(req, res, next) {
        try {
            const data = await export_service_1.exportService.listCertificates(req.params.orderId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async upsertCertificate(req, res, next) {
        try {
            const data = await export_service_1.exportService.upsertCertificate(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── EXPENSES ───────────────────────────────────────────────────────────────
    async listExpenses(req, res, next) {
        try {
            const data = await export_service_1.exportService.listExpenses(req.params.orderId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addExpense(req, res, next) {
        try {
            const data = await export_service_1.exportService.addExpense(req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteExpense(req, res, next) {
        try {
            await export_service_1.exportService.deleteExpense(req.params.id);
            res.json({ success: true, message: 'Expense deleted' });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── REALIZATIONS ───────────────────────────────────────────────────────────
    async listRealizations(req, res, next) {
        try {
            const data = await export_service_1.exportService.listRealizations({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                orderId: req.query.orderId,
                status: req.query.status,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createRealization(req, res, next) {
        try {
            const data = await export_service_1.exportService.createRealization(req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addIrm(req, res, next) {
        try {
            const data = await export_service_1.exportService.addIrm(req.params.realizationId, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addEbrc(req, res, next) {
        try {
            const data = await export_service_1.exportService.addEbrc(req.params.realizationId, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── DOCUMENTS ──────────────────────────────────────────────────────────────
    async listDocuments(req, res, next) {
        try {
            const data = await export_service_1.exportService.listDocuments(req.query.entityType, req.query.entityId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addDocument(req, res, next) {
        try {
            const data = await export_service_1.exportService.addDocument(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── EMAIL SYSTEM ───────────────────────────────────────────────────────────
    async listEmailTemplates(_req, res, next) {
        try {
            const data = await export_service_1.exportService.listEmailTemplates();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getEmailTemplate(req, res, next) {
        try {
            const data = await export_service_1.exportService.getEmailTemplate(req.params.code);
            if (!data) {
                res.status(404).json({ success: false, message: 'Template not found' });
                return;
            }
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async upsertEmailTemplate(req, res, next) {
        try {
            const data = await export_service_1.exportService.upsertEmailTemplate(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async listEmailLogs(req, res, next) {
        try {
            const data = await export_service_1.exportService.listEmailLogs({
                exportOrderId: req.query.exportOrderId,
                partyId: req.query.partyId,
                status: req.query.status,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async sendTradeEmail(req, res, next) {
        try {
            const result = await export_service_1.exportService.sendTradeEmail(req.body, req.user?.id);
            res.json({ success: result.success, data: result.log, error: result.error });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── TASKS ──────────────────────────────────────────────────────────────────
    async listTasks(req, res, next) {
        try {
            const data = await export_service_1.exportService.listTasks({
                entityType: req.query.entityType,
                entityId: req.query.entityId,
                status: req.query.status,
                assignedToUserId: req.query.assignedToUserId,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createTask(req, res, next) {
        try {
            const data = await export_service_1.exportService.createTask(req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateTask(req, res, next) {
        try {
            const data = await export_service_1.exportService.updateTask(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // ─── GLOBAL SEARCH ──────────────────────────────────────────────────────────
    async globalSearch(req, res, next) {
        try {
            const data = await export_service_1.exportService.globalOmniSearch(req.query.q);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=export.controller.js.map