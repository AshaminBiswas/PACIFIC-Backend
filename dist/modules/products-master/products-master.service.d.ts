export declare const productsMasterService: {
    list(query: {
        page?: number;
        limit?: number;
        search?: string;
        categoryId?: string;
        materialId?: string;
        finishId?: string;
        isActive?: boolean;
    }): Promise<{
        items: ({
            finish: {
                code: string | null;
                id: string;
                createdAt: Date;
                name: string;
            } | null;
            category: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                slug: string;
                description: string | null;
                imageUrl: string | null;
                sortOrder: number;
            } | null;
            subcategory: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                name: string;
                slug: string;
                categoryId: string;
                sortOrder: number;
            } | null;
            material: {
                code: string | null;
                id: string;
                createdAt: Date;
                name: string;
            } | null;
            unit: {
                code: string;
                id: string;
                createdAt: Date;
                name: string;
            } | null;
            variants: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                sku: string | null;
                barcode: string | null;
                productId: string;
                variantName: string;
                price: import("@prisma/client/runtime/library").Decimal | null;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            }[];
            qrCodes: {
                status: string;
                id: string;
                expiresAt: Date | null;
                createdAt: Date;
                token: string;
                productId: string | null;
                entityType: string;
                entityId: string;
                qrData: string;
                qrImageUrl: string | null;
                proformaInvoiceId: string | null;
                purchaseOrderId: string | null;
            }[];
        } & {
            id: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            slug: string;
            description: string | null;
            shortDesc: string | null;
            sku: string | null;
            barcode: string | null;
            hsnSac: string | null;
            categoryId: string | null;
            subcategoryId: string | null;
            materialId: string | null;
            finishId: string | null;
            unitId: string | null;
            thickness: string | null;
            cuttingSize: string | null;
            gstRate: import("@prisma/client/runtime/library").Decimal | null;
            basePrice: import("@prisma/client/runtime/library").Decimal | null;
            costPrice: import("@prisma/client/runtime/library").Decimal | null;
            isFeatured: boolean;
            images: import("@prisma/client/runtime/library").JsonValue;
            specifications: import("@prisma/client/runtime/library").JsonValue;
            tags: string[];
            metaTitle: string | null;
            metaDescription: string | null;
            createdById: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getById(id: string): Promise<{
        finish: {
            code: string | null;
            id: string;
            createdAt: Date;
            name: string;
        } | null;
        category: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            slug: string;
            description: string | null;
            imageUrl: string | null;
            sortOrder: number;
        } | null;
        subcategory: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            slug: string;
            categoryId: string;
            sortOrder: number;
        } | null;
        material: {
            code: string | null;
            id: string;
            createdAt: Date;
            name: string;
        } | null;
        unit: {
            code: string;
            id: string;
            createdAt: Date;
            name: string;
        } | null;
        variants: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            sku: string | null;
            barcode: string | null;
            productId: string;
            variantName: string;
            price: import("@prisma/client/runtime/library").Decimal | null;
            attributes: import("@prisma/client/runtime/library").JsonValue;
        }[];
        documents: {
            id: string;
            createdAt: Date;
            productId: string;
            title: string;
            fileUrl: string;
            fileType: string | null;
        }[];
        qrCodes: {
            status: string;
            id: string;
            expiresAt: Date | null;
            createdAt: Date;
            token: string;
            productId: string | null;
            entityType: string;
            entityId: string;
            qrData: string;
            qrImageUrl: string | null;
            proformaInvoiceId: string | null;
            purchaseOrderId: string | null;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        slug: string;
        description: string | null;
        shortDesc: string | null;
        sku: string | null;
        barcode: string | null;
        hsnSac: string | null;
        categoryId: string | null;
        subcategoryId: string | null;
        materialId: string | null;
        finishId: string | null;
        unitId: string | null;
        thickness: string | null;
        cuttingSize: string | null;
        gstRate: import("@prisma/client/runtime/library").Decimal | null;
        basePrice: import("@prisma/client/runtime/library").Decimal | null;
        costPrice: import("@prisma/client/runtime/library").Decimal | null;
        isFeatured: boolean;
        images: import("@prisma/client/runtime/library").JsonValue;
        specifications: import("@prisma/client/runtime/library").JsonValue;
        tags: string[];
        metaTitle: string | null;
        metaDescription: string | null;
        createdById: string | null;
    }>;
    create(data: any, userId?: string): Promise<{
        finish: {
            code: string | null;
            id: string;
            createdAt: Date;
            name: string;
        } | null;
        category: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            slug: string;
            description: string | null;
            imageUrl: string | null;
            sortOrder: number;
        } | null;
        material: {
            code: string | null;
            id: string;
            createdAt: Date;
            name: string;
        } | null;
        unit: {
            code: string;
            id: string;
            createdAt: Date;
            name: string;
        } | null;
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        slug: string;
        description: string | null;
        shortDesc: string | null;
        sku: string | null;
        barcode: string | null;
        hsnSac: string | null;
        categoryId: string | null;
        subcategoryId: string | null;
        materialId: string | null;
        finishId: string | null;
        unitId: string | null;
        thickness: string | null;
        cuttingSize: string | null;
        gstRate: import("@prisma/client/runtime/library").Decimal | null;
        basePrice: import("@prisma/client/runtime/library").Decimal | null;
        costPrice: import("@prisma/client/runtime/library").Decimal | null;
        isFeatured: boolean;
        images: import("@prisma/client/runtime/library").JsonValue;
        specifications: import("@prisma/client/runtime/library").JsonValue;
        tags: string[];
        metaTitle: string | null;
        metaDescription: string | null;
        createdById: string | null;
    }>;
    update(id: string, data: any, userId?: string): Promise<{
        finish: {
            code: string | null;
            id: string;
            createdAt: Date;
            name: string;
        } | null;
        category: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            slug: string;
            description: string | null;
            imageUrl: string | null;
            sortOrder: number;
        } | null;
        material: {
            code: string | null;
            id: string;
            createdAt: Date;
            name: string;
        } | null;
        unit: {
            code: string;
            id: string;
            createdAt: Date;
            name: string;
        } | null;
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        slug: string;
        description: string | null;
        shortDesc: string | null;
        sku: string | null;
        barcode: string | null;
        hsnSac: string | null;
        categoryId: string | null;
        subcategoryId: string | null;
        materialId: string | null;
        finishId: string | null;
        unitId: string | null;
        thickness: string | null;
        cuttingSize: string | null;
        gstRate: import("@prisma/client/runtime/library").Decimal | null;
        basePrice: import("@prisma/client/runtime/library").Decimal | null;
        costPrice: import("@prisma/client/runtime/library").Decimal | null;
        isFeatured: boolean;
        images: import("@prisma/client/runtime/library").JsonValue;
        specifications: import("@prisma/client/runtime/library").JsonValue;
        tags: string[];
        metaTitle: string | null;
        metaDescription: string | null;
        createdById: string | null;
    }>;
    delete(id: string, userId?: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        slug: string;
        description: string | null;
        shortDesc: string | null;
        sku: string | null;
        barcode: string | null;
        hsnSac: string | null;
        categoryId: string | null;
        subcategoryId: string | null;
        materialId: string | null;
        finishId: string | null;
        unitId: string | null;
        thickness: string | null;
        cuttingSize: string | null;
        gstRate: import("@prisma/client/runtime/library").Decimal | null;
        basePrice: import("@prisma/client/runtime/library").Decimal | null;
        costPrice: import("@prisma/client/runtime/library").Decimal | null;
        isFeatured: boolean;
        images: import("@prisma/client/runtime/library").JsonValue;
        specifications: import("@prisma/client/runtime/library").JsonValue;
        tags: string[];
        metaTitle: string | null;
        metaDescription: string | null;
        createdById: string | null;
    }>;
    getMaterials(): Promise<{
        code: string | null;
        id: string;
        createdAt: Date;
        name: string;
    }[]>;
    getFinishes(): Promise<{
        code: string | null;
        id: string;
        createdAt: Date;
        name: string;
    }[]>;
    getUnits(): Promise<{
        code: string;
        id: string;
        createdAt: Date;
        name: string;
    }[]>;
    getSubcategories(categoryId?: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        slug: string;
        categoryId: string;
        sortOrder: number;
    }[]>;
};
//# sourceMappingURL=products-master.service.d.ts.map