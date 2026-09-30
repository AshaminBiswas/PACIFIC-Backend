export interface LogAuditParams {
    userId?: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ISSUE' | 'APPROVE' | 'CANCEL' | 'ALLOCATE' | 'SCAN' | 'LOGIN' | string;
    module: 'CRM' | 'Procurement' | 'Sales' | 'Finance' | 'Settings' | 'QR' | 'Products' | 'Auth' | 'Logistics' | 'Warehouse' | string;
    entityType: string;
    entityId: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
}
export declare const auditService: {
    log(params: LogAuditParams): Promise<{
        timestamp: Date;
        id: string;
        ipAddress: string | null;
        userAgent: string | null;
        userId: string | null;
        entityType: string;
        entityId: string;
        action: string;
        module: string;
        oldData: import("@prisma/client/runtime/library").JsonValue | null;
        newData: import("@prisma/client/runtime/library").JsonValue | null;
    } | null>;
    logMutation(params: LogAuditParams): Promise<{
        timestamp: Date;
        id: string;
        ipAddress: string | null;
        userAgent: string | null;
        userId: string | null;
        entityType: string;
        entityId: string;
        action: string;
        module: string;
        oldData: import("@prisma/client/runtime/library").JsonValue | null;
        newData: import("@prisma/client/runtime/library").JsonValue | null;
    } | null>;
    list(query: {
        page?: number;
        limit?: number;
        module?: string;
        action?: string;
        entityType?: string;
    }): Promise<{
        items: ({
            user: {
                role: import(".prisma/client").$Enums.UserRole;
                email: string;
                firstName: string;
                lastName: string;
                id: string;
            } | null;
        } & {
            timestamp: Date;
            id: string;
            ipAddress: string | null;
            userAgent: string | null;
            userId: string | null;
            entityType: string;
            entityId: string;
            action: string;
            module: string;
            oldData: import("@prisma/client/runtime/library").JsonValue | null;
            newData: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
};
//# sourceMappingURL=audit.service.d.ts.map