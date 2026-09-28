"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsController = void 0;
const leads_service_1 = require("./leads.service");
exports.leadsController = {
    async list(req, res, next) {
        try {
            const result = await leads_service_1.leadsService.list({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                status: req.query.status,
                source: req.query.source,
                search: req.query.search,
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            res.json({ success: true, data: await leads_service_1.leadsService.getById(req.params.id) });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await leads_service_1.leadsService.create(req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            res.json({ success: true, data: await leads_service_1.leadsService.update(req.params.id, req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            await leads_service_1.leadsService.delete(req.params.id);
            res.json({ success: true, message: 'Lead deleted' });
        }
        catch (err) {
            next(err);
        }
    },
    async getStats(req, res, next) {
        try {
            res.json({ success: true, data: await leads_service_1.leadsService.getStats() });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=leads.controller.js.map