"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersController = void 0;
const orders_service_1 = require("./orders.service");
exports.ordersController = {
    async list(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.list(req.query);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.getById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createDirect(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.createDirect(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async approve(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.approve(req.params.id, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async cancel(req, res, next) {
        try {
            const { reason } = req.body;
            const data = await orders_service_1.ordersService.cancel(req.params.id, reason, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getTimeline(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.getDocumentTimeline(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.update(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateStatus(req, res, next) {
        try {
            const { status, reason } = req.body;
            const data = await orders_service_1.ordersService.updateStatus(req.params.id, status, reason, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            await orders_service_1.ordersService.delete(req.params.id, req.user?.id);
            res.json({ success: true, message: 'Sales Order deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async globalSearch(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.globalSearch(req.query.q || '');
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getFollowups(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.getFollowups(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createFollowup(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.createFollowup(req.params.id, req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async sendFollowupEmail(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.sendFollowupEmail(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getPdf(req, res, next) {
        try {
            const html = await orders_service_1.ordersService.getPdfHtml(req.params.id);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    },
    async createDispatch(req, res, next) {
        try {
            const data = await orders_service_1.ordersService.createDispatchRecord(req.params.id, req.body, req.user?.id);
            res.status(201).json({ success: true, data, message: 'Dispatch challan issued successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async getDispatchPdf(req, res, next) {
        try {
            const html = await orders_service_1.ordersService.getDispatchPdfHtml(req.params.dispatchId);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    },
    async deleteDispatch(req, res, next) {
        try {
            await orders_service_1.ordersService.deleteDispatchRecord(req.params.id, req.params.dispatchId, req.user?.id);
            res.json({ success: true, message: 'Dispatch record deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=orders.controller.js.map