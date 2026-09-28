"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companiesController = void 0;
const companies_service_1 = require("./companies.service");
exports.companiesController = {
    async list(_req, res, next) {
        try {
            const data = await companies_service_1.companiesService.list();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const data = await companies_service_1.companiesService.getById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const data = await companies_service_1.companiesService.create(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const data = await companies_service_1.companiesService.update(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addAddress(req, res, next) {
        try {
            const data = await companies_service_1.companiesService.addAddress(req.params.id, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addBankAccount(req, res, next) {
        try {
            const data = await companies_service_1.companiesService.addBankAccount(req.params.id, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addSignatory(req, res, next) {
        try {
            const data = await companies_service_1.companiesService.addSignatory(req.params.id, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addTerm(req, res, next) {
        try {
            const data = await companies_service_1.companiesService.addTerm(req.params.id, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=companies.controller.js.map