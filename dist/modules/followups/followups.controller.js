"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.followupsController = void 0;
const followups_service_1 = require("./followups.service");
const ledger_service_1 = require("../finance/ledger.service");
exports.followupsController = {
    async list(req, res, next) {
        try {
            const data = await followups_service_1.followupsService.list({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                customerId: req.query.customerId,
                followupStatus: req.query.followupStatus,
                priority: req.query.priority,
                assignedUserId: req.query.assignedUserId,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const data = await followups_service_1.followupsService.getById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getByCustomer(req, res, next) {
        try {
            const data = await followups_service_1.followupsService.getByCustomer(req.params.customerId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const data = await followups_service_1.followupsService.create(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addLog(req, res, next) {
        try {
            const data = await followups_service_1.followupsService.addLog(req.params.id, req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async logCustomerTouchpoint(req, res, next) {
        try {
            const data = await ledger_service_1.ledgerService.logFollowupTouchpoint(req.params.customerId, req.body, req.user?.id);
            res.status(201).json({ success: true, data, message: 'Follow-up activity recorded' });
        }
        catch (err) {
            next(err);
        }
    },
    async runCadence(_req, res, next) {
        try {
            const data = await ledger_service_1.ledgerService.runPaymentOverdueCadence();
            res.json({ success: true, data, message: 'Overdue cadence executed' });
        }
        catch (err) {
            next(err);
        }
    },
    async getRecoveryDashboard(_req, res, next) {
        try {
            const data = await followups_service_1.followupsService.getRecoveryDashboard();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=followups.controller.js.map