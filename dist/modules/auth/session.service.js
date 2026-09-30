"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionService = void 0;
exports.parseUserAgent = parseUserAgent;
exports.extractClientIp = extractClientIp;
const database_1 = require("../../config/database");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Parses user agent string into browser, OS, and device classification
 */
function parseUserAgent(uaString = '') {
    const ua = uaString.toLowerCase();
    // 1. Device Type
    let deviceType = 'desktop';
    if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
        deviceType = 'tablet';
    }
    else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
        deviceType = 'mobile';
    }
    // 2. Operating System
    let os = 'Unknown OS';
    if (ua.includes('windows nt 10.0'))
        os = 'Windows 10/11';
    else if (ua.includes('windows nt 6.3'))
        os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.2'))
        os = 'Windows 8';
    else if (ua.includes('windows nt 6.1'))
        os = 'Windows 7';
    else if (ua.includes('windows'))
        os = 'Windows';
    else if (ua.includes('mac os x') || ua.includes('macintosh'))
        os = 'macOS';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod'))
        os = 'iOS';
    else if (ua.includes('android'))
        os = 'Android';
    else if (ua.includes('linux'))
        os = 'Linux';
    // 3. Browser
    let browser = 'Unknown Browser';
    if (ua.includes('edg/'))
        browser = 'Microsoft Edge';
    else if (ua.includes('chrome/') && !ua.includes('edg/'))
        browser = 'Google Chrome';
    else if (ua.includes('safari/') && !ua.includes('chrome/'))
        browser = 'Safari';
    else if (ua.includes('firefox/'))
        browser = 'Mozilla Firefox';
    else if (ua.includes('opr/') || ua.includes('opera/'))
        browser = 'Opera';
    return { browser, os, deviceType };
}
/**
 * Extracts client IP address supporting reverse proxies & cloud headers
 */
function extractClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '127.0.0.1';
}
exports.sessionService = {
    /**
     * Creates and registers a new active session
     */
    async createSession(userId, req, customExpiryDays = 7) {
        const rawUa = req.headers['user-agent'] || '';
        const { browser, os, deviceType } = parseUserAgent(rawUa);
        const ipAddress = extractClientIp(req);
        const sessionToken = crypto_1.default.randomUUID();
        const expiresAt = new Date(Date.now() + customExpiryDays * 24 * 60 * 60 * 1000);
        const session = await database_1.prisma.adminSession.create({
            data: {
                userId,
                sessionToken,
                ipAddress,
                userAgent: rawUa.substring(0, 500),
                browser,
                os,
                deviceType,
                isActive: true,
                expiresAt,
                lastActiveAt: new Date(),
            },
        });
        // Also update user's last login metadata
        try {
            await database_1.prisma.user.update({
                where: { id: userId },
                data: {
                    lastLoginAt: new Date(),
                    lastLoginIp: ipAddress,
                },
            });
        }
        catch (_err) { }
        return session;
    },
    /**
     * Validates if a session token is active and not expired
     */
    async validateSession(sessionToken) {
        if (!sessionToken)
            return null;
        const session = await database_1.prisma.adminSession.findUnique({
            where: { sessionToken },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        isActive: true,
                        mustChangePassword: true,
                        twoFactorEnabled: true,
                    },
                },
            },
        });
        if (!session || !session.isActive)
            return null;
        if (session.expiresAt < new Date()) {
            await this.revokeSession(session.id, session.userId, 'EXPIRED');
            return null;
        }
        if (!session.user || !session.user.isActive)
            return null;
        return session;
    },
    /**
     * Refreshes lastActiveAt timestamp if at least 2 minutes have elapsed
     */
    async touchSession(sessionId, lastActiveAt) {
        const diffMs = Date.now() - new Date(lastActiveAt).getTime();
        if (diffMs > 2 * 60 * 1000) {
            try {
                await database_1.prisma.adminSession.update({
                    where: { id: sessionId },
                    data: { lastActiveAt: new Date() },
                });
            }
            catch (_err) { }
        }
    },
    /**
     * Lists active sessions for a user with relative badges
     */
    async listUserSessions(userId, currentSessionToken) {
        const sessions = await database_1.prisma.adminSession.findMany({
            where: {
                userId,
                isActive: true,
                expiresAt: { gt: new Date() },
            },
            orderBy: { lastActiveAt: 'desc' },
            select: {
                id: true,
                sessionToken: true,
                ipAddress: true,
                browser: true,
                os: true,
                deviceType: true,
                lastActiveAt: true,
                createdAt: true,
                expiresAt: true,
            },
        });
        return sessions.map((s) => ({
            id: s.id,
            ipAddress: s.ipAddress,
            browser: s.browser,
            os: s.os,
            deviceType: s.deviceType,
            lastActiveAt: s.lastActiveAt,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            isCurrent: Boolean(currentSessionToken && s.sessionToken === currentSessionToken),
        }));
    },
    /**
     * Revokes a single session by ID
     */
    async revokeSession(sessionId, userId, revokedBy = 'USER') {
        return database_1.prisma.adminSession.updateMany({
            where: {
                id: sessionId,
                userId,
                isActive: true,
            },
            data: {
                isActive: false,
                revokedAt: new Date(),
                revokedBy,
            },
        });
    },
    /**
     * Revokes all active sessions for a user EXCEPT the current session
     */
    async revokeAllOtherSessions(userId, currentSessionToken) {
        return database_1.prisma.adminSession.updateMany({
            where: {
                userId,
                isActive: true,
                sessionToken: { not: currentSessionToken },
            },
            data: {
                isActive: false,
                revokedAt: new Date(),
                revokedBy: 'REVOKE_ALL_OTHERS',
            },
        });
    },
    /**
     * Invalidate every single session for a user (e.g. on password reset or account freeze)
     */
    async revokeAllSessions(userId, revokedBy = 'PASSWORD_CHANGE') {
        return database_1.prisma.adminSession.updateMany({
            where: {
                userId,
                isActive: true,
            },
            data: {
                isActive: false,
                revokedAt: new Date(),
                revokedBy,
            },
        });
    },
};
//# sourceMappingURL=session.service.js.map