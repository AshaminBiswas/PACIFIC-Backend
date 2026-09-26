import { Router } from 'express';
import { exportController } from './export.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// ─── Search & Dashboard ───────────────────────────────────────────────────────
router.get('/dashboard', requireAuth, exportController.getDashboard);
router.get('/search', requireAuth, exportController.globalSearch);

// ─── Master Trade Lookups ─────────────────────────────────────────────────────
router.get('/countries', requireAuth, exportController.listCountries);
router.get('/countries/:id', requireAuth, exportController.getCountry);
router.post('/countries', requireAuth, exportController.upsertCountry);

router.get('/country-rules', requireAuth, exportController.listCountryRules);
router.post('/country-rules', requireAuth, exportController.upsertCountryRule);

router.get('/ports', requireAuth, exportController.listPorts);
router.post('/ports', requireAuth, exportController.createPort);
router.patch('/ports/:id', requireAuth, exportController.updatePort);

router.get('/incoterms', requireAuth, exportController.listIncoterms);
router.post('/incoterms', requireAuth, exportController.upsertIncoterm);

router.get('/currencies', requireAuth, exportController.listCurrencies);
router.get('/exchange-rates', requireAuth, exportController.getExchangeRates);
router.post('/exchange-rates', requireAuth, exportController.updateExchangeRate);

router.get('/hs-codes', requireAuth, exportController.listHsCodes);
router.post('/hs-codes', requireAuth, exportController.createHsCode);

// ─── International CRM (Customers & Bank Accounts) ───────────────────────────
router.get('/customers', requireAuth, exportController.listCustomers);
router.post('/customers', requireAuth, exportController.createCustomer);
router.get('/customers/:id/360', requireAuth, exportController.getCustomer360);
router.post('/customers/:id/profile', requireAuth, exportController.upsertCustomerProfile);
router.post('/customers/:id/bank-accounts', requireAuth, exportController.addCustomerBankAccount);
router.delete('/customers/:id', requireAuth, exportController.deleteCustomer);

// ─── RFQs & Inquiries ─────────────────────────────────────────────────────────
router.get('/rfqs', requireAuth, exportController.listRfqs);
router.get('/rfqs/:id', requireAuth, exportController.getRfqById);
router.post('/rfqs', requireAuth, exportController.createRfq);
router.patch('/rfqs/:id', requireAuth, exportController.updateRfq);
router.post('/rfqs/:id/convert-to-quotation', requireAuth, exportController.convertRfqToQuotation);

// ─── Export Quotations ────────────────────────────────────────────────────────
router.get('/quotations', requireAuth, exportController.listQuotations);
router.get('/quotations/:id', requireAuth, exportController.getQuotationById);
router.get('/quotations/:id/pdf', requireAuth, exportController.getQuotationPdf);
router.post('/quotations', requireAuth, exportController.createQuotation);
router.patch('/quotations/:id', requireAuth, exportController.updateQuotation);
router.delete('/quotations/:id', requireAuth, exportController.deleteQuotation);
router.post('/quotations/:id/convert-to-order', requireAuth, exportController.convertQuotationToOrder);

// ─── Export Orders Hub & 360 ──────────────────────────────────────────────────
router.get('/orders', requireAuth, exportController.listOrders);
router.get('/orders/:id/360', requireAuth, exportController.getOrder360);
router.get('/orders/:id', requireAuth, exportController.getOrder360);
router.post('/orders', requireAuth, exportController.createOrder);
router.patch('/orders/:id', requireAuth, exportController.updateOrder);
router.patch('/orders/:id/stage', requireAuth, exportController.updateOrderStage);

// Milestones & LCs
router.get('/orders/:orderId/milestones', requireAuth, exportController.listMilestones);
router.patch('/milestones/:id', requireAuth, exportController.updateMilestone);
router.get('/orders/:orderId/lc', requireAuth, exportController.getLcByOrder);
router.post('/orders/:orderId/lc', requireAuth, exportController.upsertLc);

// Customs & Compliance
router.get('/orders/:orderId/customs', requireAuth, exportController.getCustomsRecord);
router.post('/customs', requireAuth, exportController.upsertCustomsRecord);
router.get('/orders/:orderId/shipping-bill', requireAuth, exportController.getShippingBill);
router.post('/shipping-bill', requireAuth, exportController.upsertShippingBill);
router.post('/orders/:orderId/compliance/screen', requireAuth, exportController.runComplianceCheck);
router.get('/orders/:orderId/certificates', requireAuth, exportController.listCertificates);
router.post('/certificates', requireAuth, exportController.upsertCertificate);

// Expenses & Landed Cost
router.get('/orders/:orderId/expenses', requireAuth, exportController.listExpenses);
router.post('/expenses', requireAuth, exportController.addExpense);
router.delete('/expenses/:id', requireAuth, exportController.deleteExpense);

// ─── Shipments, Containers & Tracking ─────────────────────────────────────────
router.get('/shipments', requireAuth, exportController.listShipments);
router.get('/shipments/:id', requireAuth, exportController.getShipmentById);
router.post('/shipments', requireAuth, exportController.createShipment);
router.patch('/shipments/:id', requireAuth, exportController.updateShipment);

router.get('/shipments/:shipmentId/containers', requireAuth, exportController.listContainers);
router.post('/containers', requireAuth, exportController.createContainer);
router.patch('/containers/:id', requireAuth, exportController.updateContainer);
router.post('/shipments/:shipmentId/events', requireAuth, exportController.addShippingEvent);

// ─── Realizations & eBRC ──────────────────────────────────────────────────────
router.get('/realizations', requireAuth, exportController.listRealizations);
router.post('/realizations', requireAuth, exportController.createRealization);
router.post('/realizations/:realizationId/irms', requireAuth, exportController.addIrm);
router.post('/realizations/:realizationId/ebrcs', requireAuth, exportController.addEbrc);

// ─── Documents ────────────────────────────────────────────────────────────────
router.get('/documents', requireAuth, exportController.listDocuments);
router.post('/documents', requireAuth, exportController.addDocument);

// ─── Email Communication & Dispatch System ────────────────────────────────────
router.get('/emails/templates', requireAuth, exportController.listEmailTemplates);
router.get('/emails/templates/:code', requireAuth, exportController.getEmailTemplate);
router.post('/emails/templates', requireAuth, exportController.upsertEmailTemplate);
router.get('/emails/logs', requireAuth, exportController.listEmailLogs);
router.post('/emails/send', requireAuth, exportController.sendTradeEmail);

// ─── Tasks & SLA Dispatcher ───────────────────────────────────────────────────
router.get('/tasks', requireAuth, exportController.listTasks);
router.post('/tasks', requireAuth, exportController.createTask);
router.patch('/tasks/:id', requireAuth, exportController.updateTask);

export default router;
