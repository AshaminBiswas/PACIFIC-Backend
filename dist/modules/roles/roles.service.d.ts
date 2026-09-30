export interface PermissionSeed {
    code: string;
    module: string;
    description: string;
}
export declare const SYSTEM_PERMISSIONS: PermissionSeed[];
export declare const rolesService: {
    /**
     * Auto-seed baseline permissions and standard system roles
     */
    seedDefaultRolesAndPermissions(): Promise<void>;
    /**
     * List all roles with permission count and assigned user count
     */
    listRoles(): Promise<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        isSystem: boolean;
        permissionCount: number;
        assignedUsersCount: number;
        permissions: {
            code: string;
            id: string;
            createdAt: Date;
            description: string;
            module: string;
        }[];
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    /**
     * Get role details with full permissions
     */
    getRoleById(id: string): Promise<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        isSystem: boolean;
        permissions: {
            code: string;
            id: string;
            createdAt: Date;
            description: string;
            module: string;
        }[];
        users: {
            role: import(".prisma/client").$Enums.UserRole;
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            isActive: boolean;
        }[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * List all available permissions grouped by functional module
     */
    listPermissions(): Promise<{
        total: number;
        modules: string[];
        grouped: Record<string, {
            code: string;
            id: string;
            createdAt: Date;
            description: string;
            module: string;
        }[]>;
        all: {
            code: string;
            id: string;
            createdAt: Date;
            description: string;
            module: string;
        }[];
    }>;
    /**
     * Create a custom role
     */
    createRole(data: {
        name: string;
        code?: string;
        description?: string;
        permissionIds?: string[];
    }): Promise<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        isSystem: boolean;
        permissions: {
            code: string;
            id: string;
            createdAt: Date;
            description: string;
            module: string;
        }[];
        users: {
            role: import(".prisma/client").$Enums.UserRole;
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            isActive: boolean;
        }[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Update a custom or system role
     */
    updateRole(id: string, data: {
        name?: string;
        description?: string;
        permissionIds?: string[];
    }): Promise<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        isSystem: boolean;
        permissions: {
            code: string;
            id: string;
            createdAt: Date;
            description: string;
            module: string;
        }[];
        users: {
            role: import(".prisma/client").$Enums.UserRole;
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            isActive: boolean;
        }[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Delete a role (system or custom), protecting only SUPER_ADMIN
     */
    deleteRole(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
};
//# sourceMappingURL=roles.service.d.ts.map