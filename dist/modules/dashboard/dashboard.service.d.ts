export declare const dashboardService: {
    getStats(): Promise<{
        overview: {
            totalProducts: number;
            totalLeads: number;
            newLeads: number;
            totalQuotations: number;
            pendingQuotations: number;
            totalProjects: number;
            activeProjects: number;
            totalInvoices: number;
            paidInvoices: number;
            configuratorDesigns: number;
        };
        revenue: {
            paid: number;
            pending: number;
        };
        recentLeads: {
            status: import(".prisma/client").$Enums.LeadStatus;
            email: string;
            firstName: string;
            lastName: string | null;
            id: string;
            createdAt: Date;
            source: import(".prisma/client").$Enums.LeadSource;
        }[];
        recentDesigns: ({
            lead: {
                email: string;
                firstName: string;
                lastName: string | null;
                id: string;
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
    }>;
};
//# sourceMappingURL=dashboard.service.d.ts.map