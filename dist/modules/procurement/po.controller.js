"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poController = void 0;
const po_service_1 = require("./po.service");
exports.poController = {
    async list(req, res, next) {
        try {
            const data = await po_service_1.poService.list({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                status: req.query.status,
                vendorId: req.query.vendorId,
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
            const data = await po_service_1.poService.getById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const data = await po_service_1.poService.create(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async approve(req, res, next) {
        try {
            const data = await po_service_1.poService.approve(req.params.id, req.user.id);
            res.json({ success: true, data, message: 'Purchase Order approved successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async cancel(req, res, next) {
        try {
            const data = await po_service_1.poService.cancel(req.params.id, req.body.reason, req.user.id);
            res.json({ success: true, data, message: 'Purchase Order cancelled' });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            const data = await po_service_1.poService.delete(req.params.id, req.user.id);
            res.json({ success: true, data, message: 'Purchase Order deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async getPdfHtml(req, res, next) {
        try {
            const html = await po_service_1.poService.getPdfHtml(req.params.id);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=po.controller.js.map