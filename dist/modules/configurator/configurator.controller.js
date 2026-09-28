"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configuratorController = void 0;
const configurator_service_1 = require("./configurator.service");
exports.configuratorController = {
    async list(req, res, next) {
        try {
            const result = await configurator_service_1.configuratorService.list({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                status: req.query.status,
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const design = await configurator_service_1.configuratorService.getById(req.params.id);
            res.json({ success: true, data: design });
        }
        catch (err) {
            next(err);
        }
    },
    async submit(req, res, next) {
        try {
            const design = await configurator_service_1.configuratorService.submit(req.body);
            res.status(201).json({ success: true, data: design });
        }
        catch (err) {
            next(err);
        }
    },
    async updateStatus(req, res, next) {
        try {
            const design = await configurator_service_1.configuratorService.updateStatus(req.params.id, req.body.status);
            res.json({ success: true, data: design });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            await configurator_service_1.configuratorService.delete(req.params.id);
            res.json({ success: true, message: 'Design deleted' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=configurator.controller.js.map