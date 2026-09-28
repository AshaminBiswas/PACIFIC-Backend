"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorsController = void 0;
const vendors_service_1 = require("./vendors.service");
exports.vendorsController = {
    async listVendors(req, res, next) {
        try {
            const data = await vendors_service_1.vendorsService.listVendors({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                search: req.query.search,
                vendorType: req.query.vendorType,
                status: req.query.status,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getVendorById(req, res, next) {
        try {
            const data = await vendors_service_1.vendorsService.getVendorById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createVendor(req, res, next) {
        try {
            const data = await vendors_service_1.vendorsService.createVendor(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateVendor(req, res, next) {
        try {
            const data = await vendors_service_1.vendorsService.updateVendor(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteVendor(req, res, next) {
        try {
            await vendors_service_1.vendorsService.deleteVendor(req.params.id, req.user?.id);
            res.json({ success: true, message: 'Vendor deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=vendors.controller.js.map