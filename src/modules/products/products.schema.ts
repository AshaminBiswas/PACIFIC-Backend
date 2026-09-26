import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    shortDesc: z.string().optional(),
    sku: z.string().optional(),
    categoryId: z.string().min(1),
    basePrice: z.number().positive().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    images: z.array(z.string()).optional(),
    specifications: z.record(z.any()).optional(),
    tags: z.array(z.string()).optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }),
});

export const updateProductSchema = z.object({
  body: createProductSchema.shape.body.partial(),
  params: z.object({ id: z.string() }),
});

export const listProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    search: z.string().optional(),
    categoryId: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
    isFeatured: z.coerce.boolean().optional(),
  }),
});
