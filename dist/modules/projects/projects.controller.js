"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsController = void 0;
const projects_service_1 = require("./projects.service");
exports.projectsController = {
    async list(req, res, next) {
        try {
            res.json({ success: true, data: await projects_service_1.projectsService.list({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20, status: req.query.status, search: req.query.search }) });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            res.json({ success: true, data: await projects_service_1.projectsService.getById(req.params.id) });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await projects_service_1.projectsService.create(req.body, req.user?.id) });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            res.json({ success: true, data: await projects_service_1.projectsService.update(req.params.id, req.body) });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            await projects_service_1.projectsService.delete(req.params.id);
            res.json({ success: true, message: 'Project deleted' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=projects.controller.js.map