"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crmController = void 0;
const crm_service_1 = require("./crm.service");
exports.crmController = {
    async listCustomers(req, res, next) {
        try {
            const data = await crm_service_1.crmService.listCustomers({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                search: req.query.search,
                status: req.query.status,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getCustomerById(req, res, next) {
        try {
            const data = await crm_service_1.crmService.getCustomerById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getCustomer360(req, res, next) {
        try {
            const data = await crm_service_1.crmService.getCustomer360(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createCustomer(req, res, next) {
        try {
            const data = await crm_service_1.crmService.createCustomer(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateCustomer(req, res, next) {
        try {
            const data = await crm_service_1.crmService.updateCustomer(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteCustomer(req, res, next) {
        try {
            await crm_service_1.crmService.deleteCustomer(req.params.id, req.user?.id);
            res.json({ success: true, message: 'Customer deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async addContact(req, res, next) {
        try {
            const data = await crm_service_1.crmService.addContact(req.params.id, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addAddress(req, res, next) {
        try {
            const data = await crm_service_1.crmService.addAddress(req.params.id, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async checkDuplicates(req, res, next) {
        try {
            const data = await crm_service_1.crmService.checkDuplicates(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async mergeCustomers(req, res, next) {
        try {
            const { canonicalCustomerId, mergedCustomerId, reason } = req.body;
            const data = await crm_service_1.crmService.mergeCustomers(canonicalCustomerId, mergedCustomerId, reason, req.user?.id);
            res.json({ success: true, data, message: 'Customers merged successfully' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=crm.controller.js.map