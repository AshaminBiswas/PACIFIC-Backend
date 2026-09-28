export interface ListUsersParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
}
export declare const usersService: {
    /**
     * List users with pagination, search, role filter, and custom role assignments
     */
    listUsers(params: ListUsersParams): Promise<{
        items: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            customRoles: {
                code: string;
                id: string;
                name: string;
                isSystem: boolean;
            }[];
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    /**
     * Get single user with assigned roles
     */
    getUserById(id: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        customRoles: {
            id: string;
            name: string;
            code: string;
            isSystem: boolean;
            permissions: {
                code: string;
                id: string;
                createdAt: Date;
                description: string;
                module: string;
            }[];
        }[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Create an admin / staff user with secure password hash and optional custom roles
     */
    createUser(data: {
        email: string;
        password?: string;
        firstName: string;
        lastName: string;
        role?: string;
        roleIds?: string[];
        isActive?: boolean;
    }): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        customRoles: {
            id: string;
            name: string;
            code: string;
            isSystem: boolean;
            permissions: {
                code: string;
                id: string;
                createdAt: Date;
                description: string;
                module: string;
            }[];
        }[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Update user details, primary role, custom roles, and active status
     */
    updateUser(id: string, data: {
        firstName?: string;
        lastName?: string;
        role?: string;
        isActive?: boolean;
        roleIds?: string[];
    }, requesterId?: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        customRoles: {
            id: string;
            name: string;
            code: string;
            isSystem: boolean;
            permissions: {
                code: string;
                id: string;
                createdAt: Date;
                description: string;
                module: string;
            }[];
        }[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Reset user password and invalidate active refresh tokens
     */
    resetPassword(id: string, newPasswordRaw: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Delete user (Super Admin only, self-deletion guarded)
     */
    deleteUser(id: string, requesterId: string): Promise<{
        success: boolean;
        message: string;
    }>;
};
//# sourceMappingURL=users.service.d.ts.map