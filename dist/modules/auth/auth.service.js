"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../../config/database");
const env_1 = require("../../config/env");
const totp_service_1 = require("./totp.service");
const session_service_1 = require("./session.service");
const signAccessToken = (payload) => jsonwebtoken_1.default.sign(payload, env_1.env.jwt.secret, { expiresIn: env_1.env.jwt.expiresIn });
const signRefreshToken = (payload) => jsonwebtoken_1.default.sign(payload, env_1.env.jwt.refreshSecret, { expiresIn: env_1.env.jwt.refreshExpiresIn });
const signTempToken = (payload) => jsonwebtoken_1.default.sign(payload, env_1.env.jwt.secret, { expiresIn: '15m' });
const verifyTempToken = (token, expectedPurpose) => {
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwt.secret);
    }
    catch (_err) {
        throw Object.assign(new Error('Verification token has expired or is invalid. Please sign in again.'), { status: 401 });
    }
    if (!decoded || decoded.purpose !== expectedPurpose) {
        throw Object.assign(new Error('Invalid token purpose. Please restart sign-in.'), { status: 400 });
    }
    return decoded;
};
exports.authService = {
    /**
     * Main login handler with multi-state detection (first-time password reset / 2FA / session creation)
     */
    async login(data, req) {
        const email = data.email.trim().toLowerCase();
        const user = await database_1.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
            throw Object.assign(new Error('Invalid credentials'), { status: 401 });
        }
        const valid = await bcryptjs_1.default.compare(data.password, user.password);
        if (!valid) {
            throw Object.assign(new Error('Invalid credentials'), { status: 401 });
        }
        // 1. First-time login detection: dummy/temporary password must be changed
        if (user.mustChangePassword) {
            const tempToken = signTempToken({ id: user.id, email: user.email, purpose: 'FIRST_TIME_ONBOARDING' });
            return {
                requiresPasswordChange: true,
                tempToken,
                email: user.email,
                message: 'A temporary password was detected. Please create a new secure password.',
            };
        }
        // 2. Unfinished 2FA enrollment detection
        if (user.isTwoFactorPending) {
            let secret = user.twoFactorSecret;
            let recoveryCodes = user.twoFactorRecoveryCodes || [];
            if (!secret) {
                secret = totp_service_1.totpService.generateSecret();
                recoveryCodes = totp_service_1.totpService.generateRecoveryCodes(10);
                await database_1.prisma.user.update({
                    where: { id: user.id },
                    data: { twoFactorSecret: secret, twoFactorRecoveryCodes: recoveryCodes },
                });
            }
            const otpAuthUri = totp_service_1.totpService.getOtpAuthUri(user.email, secret);
            const qrCodeUrl = await totp_service_1.totpService.generateQrCodeDataUrl(otpAuthUri);
            const tempToken = signTempToken({ id: user.id, email: user.email, purpose: 'FIRST_TIME_2FA_SETUP' });
            return {
                requires2FASetup: true,
                tempToken,
                secret,
                qrCodeUrl,
                recoveryCodes,
                email: user.email,
                message: 'Two-factor authentication enrollment is required to complete your access.',
            };
        }
        // 3. Two-factor authentication required for regular sign-in
        if (user.twoFactorEnabled) {
            const tempToken = signTempToken({ id: user.id, email: user.email, purpose: '2FA_VERIFICATION' });
            return {
                requires2FA: true,
                tempToken,
                email: user.email,
                message: 'Please enter your 6-digit authenticator code or emergency recovery code.',
            };
        }
        // 4. Standard full sign-in (creates session)
        const session = await session_service_1.sessionService.createSession(user.id, req);
        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, sessionId: session.sessionToken });
        const refreshToken = signRefreshToken({ id: user.id, sessionId: session.sessionToken });
        await database_1.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
        return {
            accessToken,
            refreshToken,
            sessionToken: session.sessionToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled,
            },
        };
    },
    /**
     * Register a new user
     */
    async register(data) {
        const existing = await database_1.prisma.user.findUnique({ where: { email: data.email } });
        if (existing)
            throw Object.assign(new Error('Email already registered'), { status: 409 });
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
        const user = await database_1.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role || 'EDITOR',
            },
        });
        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
        const refreshToken = signRefreshToken({ id: user.id });
        await database_1.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
        return {
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        };
    },
    /**
     * First-time login: changes temporary password, validates strength, and transitions to mandatory 2FA enrollment
     */
    async firstTimeChangePassword(tempToken, newPassword) {
        const payload = verifyTempToken(tempToken, 'FIRST_TIME_ONBOARDING');
        const user = await database_1.prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || !user.isActive) {
            throw Object.assign(new Error('User account not found or deactivated'), { status: 404 });
        }
        // Password strength enforcement
        const pwd = (newPassword || '').trim();
        if (pwd.length < 8) {
            throw Object.assign(new Error('Password must be at least 8 characters in length'), { status: 400 });
        }
        if (!/[A-Z]/.test(pwd)) {
            throw Object.assign(new Error('Password must contain at least one uppercase letter (A-Z)'), { status: 400 });
        }
        if (!/[a-z]/.test(pwd)) {
            throw Object.assign(new Error('Password must contain at least one lowercase letter (a-z)'), { status: 400 });
        }
        if (!/[0-9]/.test(pwd)) {
            throw Object.assign(new Error('Password must contain at least one numeric digit (0-9)'), { status: 400 });
        }
        if (!/[!@#$%^&*(),.?":{}|<>\-_]/.test(pwd)) {
            throw Object.assign(new Error('Password must contain at least one special character'), { status: 400 });
        }
        // Hash and update
        const hashedPassword = await bcryptjs_1.default.hash(pwd, 12);
        // Invalidate any past sessions
        await session_service_1.sessionService.revokeAllSessions(user.id, 'PASSWORD_CHANGE');
        // Generate 2FA Secret & 10 Recovery Codes
        const secret = totp_service_1.totpService.generateSecret();
        const recoveryCodes = totp_service_1.totpService.generateRecoveryCodes(10);
        const otpAuthUri = totp_service_1.totpService.getOtpAuthUri(user.email, secret);
        const qrCodeUrl = await totp_service_1.totpService.generateQrCodeDataUrl(otpAuthUri);
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                mustChangePassword: false,
                isTwoFactorPending: true,
                twoFactorSecret: secret,
                twoFactorRecoveryCodes: recoveryCodes,
                twoFactorEnabled: false,
            },
        });
        const freshTempToken = signTempToken({ id: user.id, email: user.email, purpose: 'FIRST_TIME_2FA_SETUP' });
        return {
            success: true,
            requires2FASetup: true,
            tempToken: freshTempToken,
            secret,
            qrCodeUrl,
            recoveryCodes,
            message: 'New password registered! Please configure Two-Factor Authentication using your Authenticator app.',
        };
    },
    /**
     * First-time login: verifies 6-digit TOTP code, enables 2FA, creates session, and issues full tokens
     */
    async firstTimeVerify2fa(tempToken, code, req) {
        const payload = verifyTempToken(tempToken, 'FIRST_TIME_2FA_SETUP');
        const user = await database_1.prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || !user.isActive) {
            throw Object.assign(new Error('User account not found or deactivated'), { status: 404 });
        }
        if (!user.twoFactorSecret) {
            throw Object.assign(new Error('2FA secret is not initialized. Please restart setup.'), { status: 400 });
        }
        const isValid = totp_service_1.totpService.verifyCode(user.twoFactorSecret, code);
        if (!isValid) {
            throw Object.assign(new Error('Invalid 6-digit code. Please enter the current code from your Authenticator app.'), { status: 400 });
        }
        // Enable 2FA and clear pending state
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: true,
                isTwoFactorPending: false,
            },
        });
        // Create active session
        const session = await session_service_1.sessionService.createSession(user.id, req);
        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, sessionId: session.sessionToken });
        const refreshToken = signRefreshToken({ id: user.id, sessionId: session.sessionToken });
        await database_1.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
        return {
            success: true,
            message: 'Two-factor authentication successfully enabled. Welcome to Pacific Admin!',
            accessToken,
            refreshToken,
            sessionToken: session.sessionToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                twoFactorEnabled: true,
            },
        };
    },
    /**
     * Standard 2FA verification for regular logins (accepts TOTP or recovery code)
     */
    async verify2fa(tempToken, code, req) {
        const payload = verifyTempToken(tempToken, '2FA_VERIFICATION');
        const user = await database_1.prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || !user.isActive || !user.twoFactorSecret) {
            throw Object.assign(new Error('User account not found or 2FA not enabled'), { status: 404 });
        }
        const cleanInput = (code || '').trim().replace(/\s+/g, '');
        let passed = false;
        let usedRecoveryCode = false;
        // A. Check TOTP 6-digit code
        if (cleanInput.length === 6 && /^\d{6}$/.test(cleanInput)) {
            passed = totp_service_1.totpService.verifyCode(user.twoFactorSecret, cleanInput);
        }
        // B. Check Emergency Recovery Code
        if (!passed && user.twoFactorRecoveryCodes && user.twoFactorRecoveryCodes.length > 0) {
            const { match, matchedIndex } = totp_service_1.totpService.matchesRecoveryCode(cleanInput, user.twoFactorRecoveryCodes);
            if (match && matchedIndex >= 0) {
                passed = true;
                usedRecoveryCode = true;
                // Atomically consume recovery code
                const updatedCodes = [...user.twoFactorRecoveryCodes];
                updatedCodes.splice(matchedIndex, 1);
                await database_1.prisma.user.update({
                    where: { id: user.id },
                    data: { twoFactorRecoveryCodes: updatedCodes },
                });
            }
        }
        if (!passed) {
            throw Object.assign(new Error('Invalid 6-digit authenticator code or emergency recovery code.'), { status: 400 });
        }
        // Create session and issue tokens
        const session = await session_service_1.sessionService.createSession(user.id, req);
        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, sessionId: session.sessionToken });
        const refreshToken = signRefreshToken({ id: user.id, sessionId: session.sessionToken });
        await database_1.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
        return {
            success: true,
            accessToken,
            refreshToken,
            sessionToken: session.sessionToken,
            usedRecoveryCode,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                twoFactorEnabled: true,
            },
        };
    },
    /**
     * Set up 2FA for an existing logged-in user
     */
    async setup2fa(userId) {
        const user = await database_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw Object.assign(new Error('User not found'), { status: 404 });
        const secret = totp_service_1.totpService.generateSecret();
        const recoveryCodes = totp_service_1.totpService.generateRecoveryCodes(10);
        const otpAuthUri = totp_service_1.totpService.getOtpAuthUri(user.email, secret);
        const qrCodeUrl = await totp_service_1.totpService.generateQrCodeDataUrl(otpAuthUri);
        // Save pending secret
        await database_1.prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorSecret: secret,
                twoFactorRecoveryCodes: recoveryCodes,
            },
        });
        return {
            secret,
            qrCodeUrl,
            recoveryCodes,
        };
    },
    /**
     * Enable 2FA after verifying code in settings
     */
    async enable2fa(userId, code) {
        const user = await database_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorSecret) {
            throw Object.assign(new Error('2FA setup has not been initiated'), { status: 400 });
        }
        const isValid = totp_service_1.totpService.verifyCode(user.twoFactorSecret, code);
        if (!isValid) {
            throw Object.assign(new Error('Invalid 6-digit verification code'), { status: 400 });
        }
        await database_1.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });
        return { success: true, message: 'Two-factor authentication has been enabled.' };
    },
    /**
     * Disable 2FA in settings (requires current password verification)
     */
    async disable2fa(userId, passwordConfirm) {
        const user = await database_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw Object.assign(new Error('User not found'), { status: 404 });
        const valid = await bcryptjs_1.default.compare(passwordConfirm, user.password);
        if (!valid)
            throw Object.assign(new Error('Incorrect password confirmation'), { status: 400 });
        await database_1.prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorRecoveryCodes: [],
            },
        });
        return { success: true, message: 'Two-factor authentication has been disabled.' };
    },
    /**
     * Regenerate 10 emergency recovery codes (requires password)
     */
    async regenerateRecoveryCodes(userId, passwordConfirm) {
        const user = await database_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorEnabled) {
            throw Object.assign(new Error('2FA is not active on this account'), { status: 400 });
        }
        const valid = await bcryptjs_1.default.compare(passwordConfirm, user.password);
        if (!valid)
            throw Object.assign(new Error('Incorrect password confirmation'), { status: 400 });
        const recoveryCodes = totp_service_1.totpService.generateRecoveryCodes(10);
        await database_1.prisma.user.update({
            where: { id: userId },
            data: { twoFactorRecoveryCodes: recoveryCodes },
        });
        return { success: true, recoveryCodes };
    },
    /**
     * List active sessions for user
     */
    async listSessions(userId, currentSessionToken) {
        return session_service_1.sessionService.listUserSessions(userId, currentSessionToken);
    },
    /**
     * Revoke single session
     */
    async revokeSession(sessionId, userId) {
        return session_service_1.sessionService.revokeSession(sessionId, userId, 'USER');
    },
    /**
     * Revoke all other sessions
     */
    async revokeOtherSessions(userId, currentSessionToken) {
        return session_service_1.sessionService.revokeAllOtherSessions(userId, currentSessionToken);
    },
    /**
     * Refresh access and refresh tokens
     */
    async refreshTokens(token) {
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, env_1.env.jwt.refreshSecret);
        }
        catch {
            throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
        }
        const user = await database_1.prisma.user.findFirst({ where: { id: payload.id, refreshToken: token } });
        if (!user || !user.isActive)
            throw Object.assign(new Error('Refresh token revoked'), { status: 401 });
        // Validate session if sessionId is present
        if (payload.sessionId) {
            const activeSession = await session_service_1.sessionService.validateSession(payload.sessionId);
            if (!activeSession) {
                throw Object.assign(new Error('Session has been revoked or expired'), { status: 401 });
            }
        }
        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role, sessionId: payload.sessionId });
        const newRefreshToken = signRefreshToken({ id: user.id, sessionId: payload.sessionId });
        await database_1.prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });
        return { accessToken, refreshToken: newRefreshToken };
    },
    /**
     * Log out user
     */
    async logout(userId, currentSessionToken) {
        if (currentSessionToken) {
            await session_service_1.sessionService.revokeSession(currentSessionToken, userId, 'LOGOUT');
        }
        await database_1.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
    },
    /**
     * Retrieve current authenticated user profile
     */
    async getMe(userId) {
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                mustChangePassword: true,
                twoFactorEnabled: true,
                isTwoFactorPending: true,
                lastLoginAt: true,
                lastLoginIp: true,
            },
        });
        if (!user)
            throw Object.assign(new Error('User not found'), { status: 404 });
        return user;
    },
    /**
     * Logged-in admin user changes their own password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await database_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw Object.assign(new Error('User not found'), { status: 404 });
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            throw Object.assign(new Error('Current password does not match records'), { status: 400 });
        }
        if (newPassword.length < 8) {
            throw Object.assign(new Error('New password must be at least 8 characters long'), { status: 400 });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await database_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword, mustChangePassword: false },
        });
        // Revoke all other active sessions for safety
        await session_service_1.sessionService.revokeAllOtherSessions(userId, '');
        return {
            success: true,
            message: 'Password changed successfully. All other device sessions have been revoked.',
        };
    },
    /**
     * Legacy / Super Admin direct provisioning
     */
    async provisionSuperAdmin(data) {
        const email = data.email.trim().toLowerCase();
        const firstName = data.firstName?.trim() || 'Pacific';
        const lastName = data.lastName?.trim() || 'Admin';
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
        const existing = await database_1.prisma.user.findUnique({ where: { email } });
        let user;
        if (existing) {
            user = await database_1.prisma.user.update({
                where: { email },
                data: {
                    role: 'SUPER_ADMIN',
                    password: hashedPassword,
                    firstName,
                    lastName,
                    isActive: true,
                },
            });
        }
        else {
            user = await database_1.prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    role: 'SUPER_ADMIN',
                    isActive: true,
                },
            });
        }
        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
        const refreshToken = signRefreshToken({ id: user.id });
        await database_1.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
        return {
            success: true,
            message: 'Super Admin successfully provisioned.',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
            tokens: {
                accessToken,
                refreshToken,
                tokenType: 'Bearer',
                expiresIn: env_1.env.jwt.expiresIn,
            },
        };
    },
};
//# sourceMappingURL=auth.service.js.map