import { Request } from 'express';
import { LoginInput, RegisterInput } from './auth.schema';
export declare const authService: {
    /**
     * Main login handler with multi-state detection (first-time password reset / 2FA / session creation)
     */
    login(data: LoginInput, req: Request): Promise<{
        requiresPasswordChange: boolean;
        tempToken: string;
        email: string;
        message: string;
        requires2FASetup?: undefined;
        secret?: undefined;
        qrCodeUrl?: undefined;
        recoveryCodes?: undefined;
        requires2FA?: undefined;
        accessToken?: undefined;
        refreshToken?: undefined;
        sessionToken?: undefined;
        user?: undefined;
    } | {
        requires2FASetup: boolean;
        tempToken: string;
        secret: string;
        qrCodeUrl: string;
        recoveryCodes: string[];
        email: string;
        message: string;
        requiresPasswordChange?: undefined;
        requires2FA?: undefined;
        accessToken?: undefined;
        refreshToken?: undefined;
        sessionToken?: undefined;
        user?: undefined;
    } | {
        requires2FA: boolean;
        tempToken: string;
        email: string;
        message: string;
        requiresPasswordChange?: undefined;
        requires2FASetup?: undefined;
        secret?: undefined;
        qrCodeUrl?: undefined;
        recoveryCodes?: undefined;
        accessToken?: undefined;
        refreshToken?: undefined;
        sessionToken?: undefined;
        user?: undefined;
    } | {
        accessToken: string;
        refreshToken: string;
        sessionToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            twoFactorEnabled: false;
        };
        requiresPasswordChange?: undefined;
        tempToken?: undefined;
        email?: undefined;
        message?: undefined;
        requires2FASetup?: undefined;
        secret?: undefined;
        qrCodeUrl?: undefined;
        recoveryCodes?: undefined;
        requires2FA?: undefined;
    }>;
    /**
     * Register a new user
     */
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
    /**
     * First-time login: changes temporary password, validates strength, and transitions to mandatory 2FA enrollment
     */
    firstTimeChangePassword(tempToken: string, newPassword: string): Promise<{
        success: boolean;
        requires2FASetup: boolean;
        tempToken: string;
        secret: string;
        qrCodeUrl: string;
        recoveryCodes: string[];
        message: string;
    }>;
    /**
     * First-time login: verifies 6-digit TOTP code, enables 2FA, creates session, and issues full tokens
     */
    firstTimeVerify2fa(tempToken: string, code: string, req: Request): Promise<{
        success: boolean;
        message: string;
        accessToken: string;
        refreshToken: string;
        sessionToken: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            twoFactorEnabled: boolean;
        };
    }>;
    /**
     * Standard 2FA verification for regular logins (accepts TOTP or recovery code)
     */
    verify2fa(tempToken: string, code: string, req: Request): Promise<{
        success: boolean;
        accessToken: string;
        refreshToken: string;
        sessionToken: string;
        usedRecoveryCode: boolean;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            twoFactorEnabled: boolean;
        };
    }>;
    /**
     * Set up 2FA for an existing logged-in user
     */
    setup2fa(userId: string): Promise<{
        secret: string;
        qrCodeUrl: string;
        recoveryCodes: string[];
    }>;
    /**
     * Enable 2FA after verifying code in settings
     */
    enable2fa(userId: string, code: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Disable 2FA in settings (requires current password verification)
     */
    disable2fa(userId: string, passwordConfirm: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Regenerate 10 emergency recovery codes (requires password)
     */
    regenerateRecoveryCodes(userId: string, passwordConfirm: string): Promise<{
        success: boolean;
        recoveryCodes: string[];
    }>;
    /**
     * List active sessions for user
     */
    listSessions(userId: string, currentSessionToken?: string): Promise<{
        id: string;
        ipAddress: string | null;
        browser: string | null;
        os: string | null;
        deviceType: string | null;
        lastActiveAt: Date;
        createdAt: Date;
        expiresAt: Date;
        isCurrent: boolean;
    }[]>;
    /**
     * Revoke single session
     */
    revokeSession(sessionId: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Revoke all other sessions
     */
    revokeOtherSessions(userId: string, currentSessionToken: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Refresh access and refresh tokens
     */
    refreshTokens(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Log out user
     */
    logout(userId: string, currentSessionToken?: string): Promise<void>;
    /**
     * Retrieve current authenticated user profile
     */
    getMe(userId: string): Promise<{
        role: import(".prisma/client").$Enums.UserRole;
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        isActive: boolean;
        mustChangePassword: boolean;
        twoFactorEnabled: boolean;
        isTwoFactorPending: boolean;
        lastLoginAt: Date | null;
        lastLoginIp: string | null;
    }>;
    /**
     * Logged-in admin user changes their own password
     */
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Legacy / Super Admin direct provisioning
     */
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
    }>;
};
//# sourceMappingURL=auth.service.d.ts.map