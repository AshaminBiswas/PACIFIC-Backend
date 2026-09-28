"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsMasterController = void 0;
const products_master_service_1 = require("./products-master.service");
exports.productsMasterController = {
    async list(req, res, next) {
        try {
            const data = await products_master_service_1.productsMasterService.list({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                search: req.query.search,
                categoryId: req.query.categoryId,
                materialId: req.query.materialId,
                finishId: req.query.finishId,
                isActive: req.query.isActive === 'false' ? false : undefined,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const data = await products_master_service_1.productsMasterService.getById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const data = await products_master_service_1.productsMasterService.create(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const data = await products_master_service_1.productsMasterService.update(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            await products_master_service_1.productsMasterService.delete(req.params.id, req.user?.id);
            res.json({ success: true, message: 'Product deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async getMaterials(_req, res, next) {
        try {
            const data = await products_master_service_1.productsMasterService.getMaterials();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getFinishes(_req, res, next) {
        try {
            const data = await products_master_service_1.productsMasterService.getFinishes();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getUnits(_req, res, next) {
        try {
            const data = await products_master_service_1.productsMasterService.getUnits();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getSubcategories(req, res, next) {
        try {
            const data = await products_master_service_1.productsMasterService.getSubcategories(req.query.categoryId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=products-master.controller.js.map