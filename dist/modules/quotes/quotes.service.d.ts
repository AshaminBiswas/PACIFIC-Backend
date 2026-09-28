export declare const quotesService: {
    list(query: {
        page: number;
        limit: number;
        status?: string;
        leadId?: string;
    }): Promise<{
        items: ({
            lead: {
                email: string;
                firstName: string;
                lastName: string | null;
                id: string;
            } | null;
            createdBy: {
                firstName: string;
                lastName: string;
                id: string;
            } | null;
            items: ({
                product: {
                    id: string;
                    name: string;
                } | null;
            } & {
                id: string;
                description: string;
                notes: string | null;
                quotationId: string;
                productId: string | null;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                totalPrice: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            status: import(".prisma/client").$Enums.QuotationStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            leadId: string | null;
            notes: string | null;
            quoteNumber: string;
            designId: string | null;
            validUntil: Date | null;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            terms: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getById(id: string): Promise<{
        lead: {
            message: string | null;
            status: import(".prisma/client").$Enums.LeadStatus;
            email: string;
            firstName: string;
            lastName: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tags: string[];
            notes: string | null;
            phone: string | null;
            company: string | null;
            source: import(".prisma/client").$Enums.LeadSource;
        } | null;
        invoice: {
            status: import(".prisma/client").$Enums.InvoiceStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            quotationId: string | null;
            proformaInvoiceId: string | null;
            orderId: string | null;
            invoiceNumber: string;
            projectId: string | null;
            issueDate: Date;
            dueDate: Date | null;
            paidAt: Date | null;
        } | null;
        createdBy: {
            role: import(".prisma/client").$Enums.UserRole;
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            refreshToken: string | null;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        items: ({
            product: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                slug: string;
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
            } | null;
        } & {
            id: string;
            description: string;
            notes: string | null;
            quotationId: string;
            productId: string | null;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
        })[];
        design: {
            status: import(".prisma/client").$Enums.ConfiguratorStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            designName: string | null;
            configuration: import("@prisma/client/runtime/library").JsonValue;
            estimatedPrice: import("@prisma/client/runtime/library").Decimal | null;
            leadId: string | null;
            notes: string | null;
        } | null;
    } & {
        status: import(".prisma/client").$Enums.QuotationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        leadId: string | null;
        notes: string | null;
        quoteNumber: string;
        designId: string | null;
        validUntil: Date | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        terms: string | null;
    }>;
    create(data: any, userId?: string): Promise<{
        lead: {
            message: string | null;
            status: import(".prisma/client").$Enums.LeadStatus;
            email: string;
            firstName: string;
            lastName: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tags: string[];
            notes: string | null;
            phone: string | null;
            company: string | null;
            source: import(".prisma/client").$Enums.LeadSource;
        } | null;
        items: {
            id: string;
            description: string;
            notes: string | null;
            quotationId: string;
            productId: string | null;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
        status: import(".prisma/client").$Enums.QuotationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        leadId: string | null;
        notes: string | null;
        quoteNumber: string;
        designId: string | null;
        validUntil: Date | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        terms: string | null;
    }>;
    update(id: string, data: any): Promise<{
        lead: {
            message: string | null;
            status: import(".prisma/client").$Enums.LeadStatus;
            email: string;
            firstName: string;
            lastName: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tags: string[];
            notes: string | null;
            phone: string | null;
            company: string | null;
            source: import(".prisma/client").$Enums.LeadSource;
        } | null;
        items: {
            id: string;
            description: string;
            notes: string | null;
            quotationId: string;
            productId: string | null;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
        status: import(".prisma/client").$Enums.QuotationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        leadId: string | null;
        notes: string | null;
        quoteNumber: string;
        designId: string | null;
        validUntil: Date | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        terms: string | null;
    }>;
    updateStatus(id: string, status: string): Promise<{
        status: import(".prisma/client").$Enums.QuotationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        leadId: string | null;
        notes: string | null;
        quoteNumber: string;
        designId: string | null;
        validUntil: Date | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        terms: string | null;
    }>;
    delete(id: string): Promise<{
        status: import(".prisma/client").$Enums.QuotationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        leadId: string | null;
        notes: string | null;
        quoteNumber: string;
        designId: string | null;
        validUntil: Date | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        terms: string | null;
    }>;
};
//# sourceMappingURL=quotes.service.d.ts.map