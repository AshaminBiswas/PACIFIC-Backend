"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.piController = void 0;
const pi_service_1 = require("./pi.service");
exports.piController = {
    async list(req, res, next) {
        try {
            const data = await pi_service_1.piService.list({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                status: req.query.status,
                customerId: req.query.customerId,
                search: req.query.search,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const data = await pi_service_1.piService.getById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const data = await pi_service_1.piService.create(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async issue(req, res, next) {
        try {
            const data = await pi_service_1.piService.issue(req.params.id, req.user.id);
            res.json({ success: true, data, message: 'Proforma Invoice issued successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async duplicate(req, res, next) {
        try {
            const data = await pi_service_1.piService.duplicate(req.params.id, req.user.id);
            res.status(201).json({ success: true, data, message: 'Proforma Invoice duplicated as new draft' });
        }
        catch (err) {
            next(err);
        }
    },
    async cancel(req, res, next) {
        try {
            const data = await pi_service_1.piService.cancel(req.params.id, req.body.reason, req.user.id);
            res.json({ success: true, data, message: 'Proforma Invoice cancelled' });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const data = await pi_service_1.piService.update(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data, message: 'Proforma Invoice updated successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            const data = await pi_service_1.piService.delete(req.params.id, req.user?.id);
            res.json({ success: true, data, message: 'Proforma Invoice deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async getPdfHtml(req, res, next) {
        try {
            const pi = await pi_service_1.piService.getById(req.params.id);
            const billToParty = pi.parties?.find((p) => p.partyRole === 'BILL_TO');
            const billingName = (billToParty?.partyName || pi.customer?.legalName || 'Customer')
                .trim()
                .replace(/[/\\?%*:|"<>]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            const cleanPiNumber = (pi.piNumber || 'PI')
                .trim()
                .replace(/[/\\?%*:|"<>]/g, '')
                .trim();
            const filename = `${billingName}_${cleanPiNumber}.pdf`;
            const html = await pi_service_1.piService.getPdfHtml(req.params.id);
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    },
    async recordAdvancePayment(req, res, next) {
        try {
            const data = await pi_service_1.piService.recordAdvancePayment(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data, message: 'Advance payment recorded successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async convertToOrder(req, res, next) {
        try {
            const data = await pi_service_1.piService.convertToOrder(req.params.id, req.user?.id);
            res.json({ success: true, data, message: 'Sales Order generated from Proforma Invoice' });
        }
        catch (err) {
            next(err);
        }
    },
    async getFollowups(req, res, next) {
        try {
            const data = await pi_service_1.piService.getFollowups(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addFollowup(req, res, next) {
        try {
            const data = await pi_service_1.piService.addFollowup(req.params.id, req.body, req.user?.id);
            res.status(201).json({ success: true, data, message: 'Follow-up touchpoint recorded successfully' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=pi.controller.js.map