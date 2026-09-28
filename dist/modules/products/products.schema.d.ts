import { z } from 'zod';
export declare const createProductSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        slug: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        shortDesc: z.ZodOptional<z.ZodString>;
        sku: z.ZodOptional<z.ZodString>;
        categoryId: z.ZodString;
        basePrice: z.ZodOptional<z.ZodNumber>;
        isFeatured: z.ZodOptional<z.ZodBoolean>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        specifications: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        metaTitle: z.ZodOptional<z.ZodString>;
        metaDescription: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        categoryId: string;
        isActive?: boolean | undefined;
        description?: string | undefined;
        slug?: string | undefined;
        shortDesc?: string | undefined;
        sku?: string | undefined;
        basePrice?: number | undefined;
        isFeatured?: boolean | undefined;
        images?: string[] | undefined;
        specifications?: Record<string, any> | undefined;
        tags?: string[] | undefined;
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
    }, {
        name: string;
        categoryId: string;
        isActive?: boolean | undefined;
        description?: string | undefined;
        slug?: string | undefined;
        shortDesc?: string | undefined;
        sku?: string | undefined;
        basePrice?: number | undefined;
        isFeatured?: boolean | undefined;
        images?: string[] | undefined;
        specifications?: Record<string, any> | undefined;
        tags?: string[] | undefined;
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        categoryId: string;
        isActive?: boolean | undefined;
        description?: string | undefined;
        slug?: string | undefined;
        shortDesc?: string | undefined;
        sku?: string | undefined;
        basePrice?: number | undefined;
        isFeatured?: boolean | undefined;
        images?: string[] | undefined;
        specifications?: Record<string, any> | undefined;
        tags?: string[] | undefined;
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
    };
}, {
    body: {
        name: string;
        categoryId: string;
        isActive?: boolean | undefined;
        description?: string | undefined;
        slug?: string | undefined;
        shortDesc?: string | undefined;
        sku?: string | undefined;
        basePrice?: number | undefined;
        isFeatured?: boolean | undefined;
        images?: string[] | undefined;
        specifications?: Record<string, any> | undefined;
        tags?: string[] | undefined;
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
    };
}>;
export declare const updateProductSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        shortDesc: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        sku: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        categoryId: z.ZodOptional<z.ZodString>;
        basePrice: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        isFeatured: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
        isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
        images: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        specifications: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
        tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        metaTitle: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        metaDescription: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        isActive?: boolean | undefined;
        name?: string | undefined;
        description?: string | undefined;
        slug?: string | undefined;
        shortDesc?: string | undefined;
        sku?: string | undefined;
        categoryId?: string | undefined;
        basePrice?: number | undefined;
        isFeatured?: boolean | undefined;
        images?: string[] | undefined;
        specifications?: Record<string, any> | undefined;
        tags?: string[] | undefined;
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
    }, {
        isActive?: boolean | undefined;
        name?: string | undefined;
        description?: string | undefined;
        slug?: string | undefined;
        shortDesc?: string | undefined;
        sku?: string | undefined;
        categoryId?: string | undefined;
        basePrice?: number | undefined;
        isFeatured?: boolean | undefined;
        images?: string[] | undefined;
        specifications?: Record<string, any> | undefined;
        tags?: string[] | undefined;
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
    }>;
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
    };
    body: {
        isActive?: boolean | undefined;
        name?: string | undefined;
        description?: string | undefined;
        slug?: string | undefined;
        shortDesc?: string | undefined;
        sku?: string | undefined;
        categoryId?: string | undefined;
        basePrice?: number | undefined;
        isFeatured?: boolean | undefined;
        images?: string[] | undefined;
        specifications?: Record<string, any> | undefined;
        tags?: string[] | undefined;
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
    };
}, {
    params: {
        id: string;
    };
    body: {
        isActive?: boolean | undefined;
        name?: string | undefined;
        description?: string | undefined;
        slug?: string | undefined;
        shortDesc?: string | undefined;
        sku?: string | undefined;
        categoryId?: string | undefined;
        basePrice?: number | undefined;
        isFeatured?: boolean | undefined;
        images?: string[] | undefined;
        specifications?: Record<string, any> | undefined;
        tags?: string[] | undefined;
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
    };
}>;
export declare const listProductsSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        search: z.ZodOptional<z.ZodString>;
        categoryId: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        isFeatured: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        search?: string | undefined;
        isActive?: boolean | undefined;
        categoryId?: string | undefined;
        isFeatured?: boolean | undefined;
    }, {
        search?: string | undefined;
        isActive?: boolean | undefined;
        categoryId?: string | undefined;
        isFeatured?: boolean | undefined;
        page?: number | undefined;
        limit?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        page: number;
        limit: number;
        search?: string | undefined;
        isActive?: boolean | undefined;
        categoryId?: string | undefined;
        isFeatured?: boolean | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        isActive?: boolean | undefined;
        categoryId?: string | undefined;
        isFeatured?: boolean | undefined;
        page?: number | undefined;
        limit?: number | undefined;
    };
}>;
//# sourceMappingURL=products.schema.d.ts.map