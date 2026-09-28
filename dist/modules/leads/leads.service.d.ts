export declare const leadsService: {
    list(query: {
        page: number;
        limit: number;
        status?: string;
        source?: string;
        search?: string;
    }): Promise<{
        items: {
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
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getById(id: string): Promise<{
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
        configuratorDesigns: {
            status: import(".prisma/client").$Enums.ConfiguratorStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            designName: string | null;
            configuration: import("@prisma/client/runtime/library").JsonValue;
            estimatedPrice: import("@prisma/client/runtime/library").Decimal | null;
            leadId: string | null;
            notes: string | null;
        }[];
    } & {
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
    }>;
    create(data: any): Promise<{
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
    }>;
    update(id: string, data: any): Promise<{
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
    }>;
    delete(id: string): Promise<{
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
    }>;
    getStats(): Promise<{
        [k: string]: number;
    }>;
};
//# sourceMappingURL=leads.service.d.ts.map