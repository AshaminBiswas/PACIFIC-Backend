"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeController = void 0;
const finance_service_1 = require("./finance.service");
const ledger_service_1 = require("./ledger.service");
exports.financeController = {
    async listPayments(req, res, next) {
        try {
            const data = await finance_service_1.financeService.listPayments({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                partyId: req.query.partyId,
                paymentType: req.query.paymentType,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getPaymentById(req, res, next) {
        try {
            const data = await finance_service_1.financeService.getPaymentById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async recordPayment(req, res, next) {
        try {
            const data = await finance_service_1.financeService.recordPayment(req.body, req.user?.id);
            res.status(201).json({ success: true, data, message: 'Payment recorded and allocated successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async getReceivables(req, res, next) {
        try {
            const data = await finance_service_1.financeService.getReceivables({ status: req.query.status });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getPayables(req, res, next) {
        try {
            const data = await finance_service_1.financeService.getPayables({ status: req.query.status });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getLedgerSummary(_req, res, next) {
        try {
            const data = await finance_service_1.financeService.getLedgerSummary();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getCustomerLedger(req, res, next) {
        try {
            const customerId = req.params.customerId;
            const fromDate = req.query.fromDate;
            const toDate = req.query.toDate;
            const data = await ledger_service_1.ledgerService.getCustomerLedger(customerId, { fromDate, toDate });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async sendCustomerLedgerEmail(req, res, next) {
        try {
            const customerId = req.params.customerId;
            const data = await ledger_service_1.ledgerService.sendCustomerLedgerEmail(customerId, req.body, req.user?.id);
            res.json({ success: true, data, message: 'Statement of Account / Ledger emailed successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async recordManualLedgerEntry(req, res, next) {
        try {
            const customerId = req.params.customerId;
            const data = await ledger_service_1.ledgerService.recordManualEntry(customerId, req.body, req.user?.id);
            res.status(201).json({ success: true, data, message: 'Historical / manual ledger entry recorded successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async logFollowupTouchpoint(req, res, next) {
        try {
            const customerId = req.params.customerId;
            const data = await ledger_service_1.ledgerService.logFollowupTouchpoint(customerId, req.body, req.user?.id);
            res.status(201).json({ success: true, data, message: 'Follow-up touchpoint recorded successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async triggerCadenceCheck(_req, res, next) {
        try {
            const data = await ledger_service_1.ledgerService.runPaymentOverdueCadence();
            res.json({ success: true, data, message: 'Cadence check executed successfully' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=finance.controller.js.map