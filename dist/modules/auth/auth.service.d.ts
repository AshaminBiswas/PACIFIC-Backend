import { LoginInput, RegisterInput } from './auth.schema';
export declare const authService: {
    login(data: LoginInput): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    }>;
    register(data: RegisterInput): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    }>;
    refreshTokens(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<void>;
    getMe(userId: string): Promise<{
        role: import(".prisma/client").$Enums.UserRole;
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        isActive: boolean;
    }>;
    provisionSuperAdmin(data: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
    }): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
            tokenType: string;
            expiresIn: string;
        };
        supabase: {
            synced: boolean;
            status: string;
        };
        loginUrl: string;
    }>;
};
//# sourceMappingURL=auth.service.d.ts.map