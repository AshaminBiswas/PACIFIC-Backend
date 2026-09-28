"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const export_controller_1 = require("./export.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// ─── Search & Dashboard ───────────────────────────────────────────────────────
router.get('/dashboard', auth_middleware_1.requireAuth, export_controller_1.exportController.getDashboard);
router.get('/search', auth_middleware_1.requireAuth, export_controller_1.exportController.globalSearch);
// ─── Master Trade Lookups ─────────────────────────────────────────────────────
router.get('/countries', auth_middleware_1.requireAuth, export_controller_1.exportController.listCountries);
router.get('/countries/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.getCountry);
router.post('/countries', auth_middleware_1.requireAuth, export_controller_1.exportController.upsertCountry);
router.get('/country-rules', auth_middleware_1.requireAuth, export_controller_1.exportController.listCountryRules);
router.post('/country-rules', auth_middleware_1.requireAuth, export_controller_1.exportController.upsertCountryRule);
router.get('/ports', auth_middleware_1.requireAuth, export_controller_1.exportController.listPorts);
router.post('/ports', auth_middleware_1.requireAuth, export_controller_1.exportController.createPort);
router.patch('/ports/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.updatePort);
router.get('/incoterms', auth_middleware_1.requireAuth, export_controller_1.exportController.listIncoterms);
router.post('/incoterms', auth_middleware_1.requireAuth, export_controller_1.exportController.upsertIncoterm);
router.get('/currencies', auth_middleware_1.requireAuth, export_controller_1.exportController.listCurrencies);
router.get('/exchange-rates', auth_middleware_1.requireAuth, export_controller_1.exportController.getExchangeRates);
router.post('/exchange-rates', auth_middleware_1.requireAuth, export_controller_1.exportController.updateExchangeRate);
router.get('/hs-codes', auth_middleware_1.requireAuth, export_controller_1.exportController.listHsCodes);
router.post('/hs-codes', auth_middleware_1.requireAuth, export_controller_1.exportController.createHsCode);
// ─── International CRM (Customers & Bank Accounts) ───────────────────────────
router.get('/customers', auth_middleware_1.requireAuth, export_controller_1.exportController.listCustomers);
router.post('/customers', auth_middleware_1.requireAuth, export_controller_1.exportController.createCustomer);
router.get('/customers/:id/360', auth_middleware_1.requireAuth, export_controller_1.exportController.getCustomer360);
router.post('/customers/:id/profile', auth_middleware_1.requireAuth, export_controller_1.exportController.upsertCustomerProfile);
router.post('/customers/:id/bank-accounts', auth_middleware_1.requireAuth, export_controller_1.exportController.addCustomerBankAccount);
router.delete('/customers/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.deleteCustomer);
// ─── RFQs & Inquiries ─────────────────────────────────────────────────────────
router.get('/rfqs', auth_middleware_1.requireAuth, export_controller_1.exportController.listRfqs);
router.get('/rfqs/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.getRfqById);
router.post('/rfqs', auth_middleware_1.requireAuth, export_controller_1.exportController.createRfq);
router.patch('/rfqs/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.updateRfq);
router.post('/rfqs/:id/convert-to-quotation', auth_middleware_1.requireAuth, export_controller_1.exportController.convertRfqToQuotation);
// ─── Export Quotations ────────────────────────────────────────────────────────
router.get('/quotations', auth_middleware_1.requireAuth, export_controller_1.exportController.listQuotations);
router.get('/quotations/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.getQuotationById);
router.get('/quotations/:id/pdf', auth_middleware_1.requireAuth, export_controller_1.exportController.getQuotationPdf);
router.post('/quotations', auth_middleware_1.requireAuth, export_controller_1.exportController.createQuotation);
router.patch('/quotations/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.updateQuotation);
router.delete('/quotations/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.deleteQuotation);
router.post('/quotations/:id/convert-to-order', auth_middleware_1.requireAuth, export_controller_1.exportController.convertQuotationToOrder);
// ─── Export Orders Hub & 360 ──────────────────────────────────────────────────
router.get('/orders', auth_middleware_1.requireAuth, export_controller_1.exportController.listOrders);
router.get('/orders/:id/360', auth_middleware_1.requireAuth, export_controller_1.exportController.getOrder360);
router.get('/orders/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.getOrder360);
router.post('/orders', auth_middleware_1.requireAuth, export_controller_1.exportController.createOrder);
router.patch('/orders/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.updateOrder);
router.patch('/orders/:id/stage', auth_middleware_1.requireAuth, export_controller_1.exportController.updateOrderStage);
// Milestones & LCs
router.get('/orders/:orderId/milestones', auth_middleware_1.requireAuth, export_controller_1.exportController.listMilestones);
router.patch('/milestones/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.updateMilestone);
router.get('/orders/:orderId/lc', auth_middleware_1.requireAuth, export_controller_1.exportController.getLcByOrder);
router.post('/orders/:orderId/lc', auth_middleware_1.requireAuth, export_controller_1.exportController.upsertLc);
// Customs & Compliance
router.get('/orders/:orderId/customs', auth_middleware_1.requireAuth, export_controller_1.exportController.getCustomsRecord);
router.post('/customs', auth_middleware_1.requireAuth, export_controller_1.exportController.upsertCustomsRecord);
router.get('/orders/:orderId/shipping-bill', auth_middleware_1.requireAuth, export_controller_1.exportController.getShippingBill);
router.post('/shipping-bill', auth_middleware_1.requireAuth, export_controller_1.exportController.upsertShippingBill);
router.post('/orders/:orderId/compliance/screen', auth_middleware_1.requireAuth, export_controller_1.exportController.runComplianceCheck);
router.get('/orders/:orderId/certificates', auth_middleware_1.requireAuth, export_controller_1.exportController.listCertificates);
router.post('/certificates', auth_middleware_1.requireAuth, export_controller_1.exportController.upsertCertificate);
// Expenses & Landed Cost
router.get('/orders/:orderId/expenses', auth_middleware_1.requireAuth, export_controller_1.exportController.listExpenses);
router.post('/expenses', auth_middleware_1.requireAuth, export_controller_1.exportController.addExpense);
router.delete('/expenses/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.deleteExpense);
// ─── Shipments, Containers & Tracking ─────────────────────────────────────────
router.get('/shipments', auth_middleware_1.requireAuth, export_controller_1.exportController.listShipments);
router.get('/shipments/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.getShipmentById);
router.post('/shipments', auth_middleware_1.requireAuth, export_controller_1.exportController.createShipment);
router.patch('/shipments/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.updateShipment);
router.get('/shipments/:shipmentId/containers', auth_middleware_1.requireAuth, export_controller_1.exportController.listContainers);
router.post('/containers', auth_middleware_1.requireAuth, export_controller_1.exportController.createContainer);
router.patch('/containers/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.updateContainer);
router.post('/shipments/:shipmentId/events', auth_middleware_1.requireAuth, export_controller_1.exportController.addShippingEvent);
// ─── Realizations & eBRC ──────────────────────────────────────────────────────
router.get('/realizations', auth_middleware_1.requireAuth, export_controller_1.exportController.listRealizations);
router.post('/realizations', auth_middleware_1.requireAuth, export_controller_1.exportController.createRealization);
router.post('/realizations/:realizationId/irms', auth_middleware_1.requireAuth, export_controller_1.exportController.addIrm);
router.post('/realizations/:realizationId/ebrcs', auth_middleware_1.requireAuth, export_controller_1.exportController.addEbrc);
// ─── Documents ────────────────────────────────────────────────────────────────
router.get('/documents', auth_middleware_1.requireAuth, export_controller_1.exportController.listDocuments);
router.post('/documents', auth_middleware_1.requireAuth, export_controller_1.exportController.addDocument);
// ─── Email Communication & Dispatch System ────────────────────────────────────
router.get('/emails/templates', auth_middleware_1.requireAuth, export_controller_1.exportController.listEmailTemplates);
router.get('/emails/templates/:code', auth_middleware_1.requireAuth, export_controller_1.exportController.getEmailTemplate);
router.post('/emails/templates', auth_middleware_1.requireAuth, export_controller_1.exportController.upsertEmailTemplate);
router.get('/emails/logs', auth_middleware_1.requireAuth, export_controller_1.exportController.listEmailLogs);
router.post('/emails/send', auth_middleware_1.requireAuth, export_controller_1.exportController.sendTradeEmail);
// ─── Tasks & SLA Dispatcher ───────────────────────────────────────────────────
router.get('/tasks', auth_middleware_1.requireAuth, export_controller_1.exportController.listTasks);
router.post('/tasks', auth_middleware_1.requireAuth, export_controller_1.exportController.createTask);
router.patch('/tasks/:id', auth_middleware_1.requireAuth, export_controller_1.exportController.updateTask);
exports.default = router;
//# sourceMappingURL=export.routes.js.map