"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesController = void 0;
const invoices_service_1 = require("./invoices.service");
exports.invoicesController = {
    async list(req, res, next) {
        try {
            res.json({
                success: true,
                data: await invoices_service_1.invoicesService.list({
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                    status: req.query.status,
                    orderId: req.query.orderId,
                }),
            });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            res.json({ success: true, data: await invoices_service_1.invoicesService.getById(req.params.id) });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await invoices_service_1.invoicesService.create(req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async createFromOrder(req, res, next) {
        try {
            const data = await invoices_service_1.invoicesService.createFromOrder(req.params.orderId, req.user?.id);
            res.status(201).json({ success: true, data, message: 'Tax Invoice created from Sales Order' });
        }
        catch (err) {
            next(err);
        }
    },
    async getPdf(req, res, next) {
        try {
            const html = await invoices_service_1.invoicesService.getPdfHtml(req.params.id);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            res.json({ success: true, data: await invoices_service_1.invoicesService.update(req.params.id, req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            await invoices_service_1.invoicesService.delete(req.params.id);
            res.json({ success: true, message: 'Invoice deleted' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=invoices.controller.js.map