import { Request } from 'express';
export interface DeviceInfo {
    browser: string;
    os: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
}
/**
 * Parses user agent string into browser, OS, and device classification
 */
export declare function parseUserAgent(uaString?: string): DeviceInfo;
/**
 * Extracts client IP address supporting reverse proxies & cloud headers
 */
export declare function extractClientIp(req: Request): string;
export declare const sessionService: {
    /**
     * Creates and registers a new active session
     */
    createSession(userId: string, req: Request, customExpiryDays?: number): Promise<{
        refreshToken: string | null;
        id: string;
        sessionToken: string;
        ipAddress: string | null;
        userAgent: string | null;
        browser: string | null;
        os: string | null;
        deviceType: string | null;
        isActive: boolean;
        lastActiveAt: Date;
        expiresAt: Date;
        revokedAt: Date | null;
        revokedBy: string | null;
        createdAt: Date;
        userId: string;
    }>;
    /**
     * Validates if a session token is active and not expired
     */
    validateSession(sessionToken: string): Promise<({
        user: {
            role: import(".prisma/client").$Enums.UserRole;
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            isActive: boolean;
            mustChangePassword: boolean;
            twoFactorEnabled: boolean;
        };
    } & {
        refreshToken: string | null;
        id: string;
        sessionToken: string;
        ipAddress: string | null;
        userAgent: string | null;
        browser: string | null;
        os: string | null;
        deviceType: string | null;
        isActive: boolean;
        lastActiveAt: Date;
        expiresAt: Date;
        revokedAt: Date | null;
        revokedBy: string | null;
        createdAt: Date;
        userId: string;
    }) | null>;
    /**
     * Refreshes lastActiveAt timestamp if at least 2 minutes have elapsed
     */
    touchSession(sessionId: string, lastActiveAt: Date): Promise<void>;
    /**
     * Lists active sessions for a user with relative badges
     */
    listUserSessions(userId: string, currentSessionToken?: string): Promise<{
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
     * Revokes a single session by ID
     */
    revokeSession(sessionId: string, userId: string, revokedBy?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Revokes all active sessions for a user EXCEPT the current session
     */
    revokeAllOtherSessions(userId: string, currentSessionToken: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    /**
     * Invalidate every single session for a user (e.g. on password reset or account freeze)
     */
    revokeAllSessions(userId: string, revokedBy?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
};
//# sourceMappingURL=session.service.d.ts.map