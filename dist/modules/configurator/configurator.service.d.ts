export declare const configuratorService: {
    list(query: {
        page: number;
        limit: number;
        status?: string;
    }): Promise<{
        items: ({
            lead: {
                email: string;
                firstName: string;
                lastName: string | null;
                id: string;
                phone: string | null;
            } | null;
        } & {
            status: import(".prisma/client").$Enums.ConfiguratorStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            designName: string | null;
            configuration: import("@prisma/client/runtime/library").JsonValue;
            estimatedPrice: import("@prisma/client/runtime/library").Decimal | null;
            leadId: string | null;
            notes: string | null;
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
        quotations: {
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
        }[];
    } & {
        status: import(".prisma/client").$Enums.ConfiguratorStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        designName: string | null;
        configuration: import("@prisma/client/runtime/library").JsonValue;
        estimatedPrice: import("@prisma/client/runtime/library").Decimal | null;
        leadId: string | null;
        notes: string | null;
    }>;
    submit(data: any): Promise<{
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
    } & {
        status: import(".prisma/client").$Enums.ConfiguratorStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        designName: string | null;
        configuration: import("@prisma/client/runtime/library").JsonValue;
        estimatedPrice: import("@prisma/client/runtime/library").Decimal | null;
        leadId: string | null;
        notes: string | null;
    }>;
    updateStatus(id: string, status: string): Promise<{
        status: import(".prisma/client").$Enums.ConfiguratorStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        designName: string | null;
        configuration: import("@prisma/client/runtime/library").JsonValue;
        estimatedPrice: import("@prisma/client/runtime/library").Decimal | null;
        leadId: string | null;
        notes: string | null;
    }>;
    delete(id: string): Promise<{
        status: import(".prisma/client").$Enums.ConfiguratorStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        designName: string | null;
        configuration: import("@prisma/client/runtime/library").JsonValue;
        estimatedPrice: import("@prisma/client/runtime/library").Decimal | null;
        leadId: string | null;
        notes: string | null;
    }>;
};
//# sourceMappingURL=configurator.service.d.ts.map