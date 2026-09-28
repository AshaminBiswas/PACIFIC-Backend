"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotesController = void 0;
const quotes_service_1 = require("./quotes.service");
exports.quotesController = {
    async list(req, res, next) {
        try {
            const result = await quotes_service_1.quotesService.list({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                status: req.query.status,
                leadId: req.query.leadId,
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.getById(req.params.id);
            res.json({ success: true, data: quote });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.create(req.body, req.user?.id);
            res.status(201).json({ success: true, data: quote });
        }
        catch (err) {
            next(err);
        }
    },
    async updateStatus(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.updateStatus(req.params.id, req.body.status);
            res.json({ success: true, data: quote });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.update(req.params.id, req.body);
            res.json({ success: true, data: quote, message: 'Quotation updated successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            await quotes_service_1.quotesService.delete(req.params.id);
            res.json({ success: true, message: 'Quotation deleted' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=quotes.controller.js.map