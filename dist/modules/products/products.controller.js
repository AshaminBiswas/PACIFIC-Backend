"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsController = void 0;
const products_service_1 = require("./products.service");
exports.productsController = {
    async list(req, res, next) {
        try {
            const result = await products_service_1.productsService.list({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                search: req.query.search,
                categoryId: req.query.categoryId,
                isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
                isFeatured: req.query.isFeatured !== undefined ? req.query.isFeatured === 'true' : undefined,
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const product = await products_service_1.productsService.getById(req.params.id);
            res.json({ success: true, data: product });
        }
        catch (err) {
            next(err);
        }
    },
    async getBySlug(req, res, next) {
        try {
            const product = await products_service_1.productsService.getBySlug(req.params.slug);
            res.json({ success: true, data: product });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const product = await products_service_1.productsService.create(req.body, req.user?.id);
            res.status(201).json({ success: true, data: product });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const product = await products_service_1.productsService.update(req.params.id, req.body);
            res.json({ success: true, data: product });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            await products_service_1.productsService.delete(req.params.id);
            res.json({ success: true, message: 'Product deleted' });
        }
        catch (err) {
            next(err);
        }
    },
    async listCategories(req, res, next) {
        try {
            const categories = await products_service_1.productsService.listCategories();
            res.json({ success: true, data: categories });
        }
        catch (err) {
            next(err);
        }
    },
    async createCategory(req, res, next) {
        try {
            const category = await products_service_1.productsService.createCategory(req.body);
            res.status(201).json({ success: true, data: category });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=products.controller.js.map