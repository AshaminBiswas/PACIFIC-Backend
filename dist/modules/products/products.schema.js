"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProductsSchema = exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1),
        slug: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        shortDesc: zod_1.z.string().optional(),
        sku: zod_1.z.string().optional(),
        categoryId: zod_1.z.string().min(1),
        basePrice: zod_1.z.number().positive().optional(),
        isFeatured: zod_1.z.boolean().optional(),
        isActive: zod_1.z.boolean().optional(),
        images: zod_1.z.array(zod_1.z.string()).optional(),
        specifications: zod_1.z.record(zod_1.z.any()).optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        metaTitle: zod_1.z.string().optional(),
        metaDescription: zod_1.z.string().optional(),
    }),
});
exports.updateProductSchema = zod_1.z.object({
    body: exports.createProductSchema.shape.body.partial(),
    params: zod_1.z.object({ id: zod_1.z.string() }),
});
exports.listProductsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().positive().optional().default(1),
        limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
        search: zod_1.z.string().optional(),
        categoryId: zod_1.z.string().optional(),
        isActive: zod_1.z.coerce.boolean().optional(),
        isFeatured: zod_1.z.coerce.boolean().optional(),
    }),
});
//# sourceMappingURL=products.schema.js.map