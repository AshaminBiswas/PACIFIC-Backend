"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsService = void 0;
const database_1 = require("../../config/database");
const slugify_1 = __importDefault(require("slugify"));
exports.productsService = {
    async list(query) {
        const { page, limit, search, categoryId, isActive, isFeatured } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (search)
            where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }];
        if (categoryId)
            where.categoryId = categoryId;
        if (isActive !== undefined)
            where.isActive = isActive;
        if (isFeatured !== undefined)
            where.isFeatured = isFeatured;
        const [items, total] = await Promise.all([
            database_1.prisma.product.findMany({
                where,
                include: { category: { select: { id: true, name: true, slug: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            database_1.prisma.product.count({ where }),
        ]);
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
    async getById(id) {
        const product = await database_1.prisma.product.findUnique({
            where: { id },
            include: { category: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (!product)
            throw Object.assign(new Error('Product not found'), { status: 404 });
        return product;
    },
    async getBySlug(slug) {
        const product = await database_1.prisma.product.findUnique({
            where: { slug },
            include: { category: true },
        });
        if (!product)
            throw Object.assign(new Error('Product not found'), { status: 404 });
        return product;
    },
    async create(data, userId) {
        const slug = data.slug || (0, slugify_1.default)(data.name, { lower: true, strict: true });
        return database_1.prisma.product.create({
            data: {
                ...data,
                slug,
                images: data.images || [],
                specifications: data.specifications || {},
                tags: data.tags || [],
                createdById: userId,
            },
            include: { category: true },
        });
    },
    async update(id, data) {
        if (data.name && !data.slug) {
            data.slug = (0, slugify_1.default)(data.name, { lower: true, strict: true });
        }
        return database_1.prisma.product.update({ where: { id }, data, include: { category: true } });
    },
    async delete(id) {
        return database_1.prisma.product.delete({ where: { id } });
    },
    async listCategories() {
        return database_1.prisma.productCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    },
    async createCategory(data) {
        const slug = (0, slugify_1.default)(data.name, { lower: true, strict: true });
        return database_1.prisma.productCategory.create({ data: { ...data, slug } });
    },
};
//# sourceMappingURL=products.service.js.map