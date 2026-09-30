"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("./auth.service");
exports.authController = {
    async login(req, res, next) {
        try {
            const result = await auth_service_1.authService.login(req.body, req);
            if (result.refreshToken) {
                res.cookie('refreshToken', result.refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });
            }
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async register(req, res, next) {
        try {
            const result = await auth_service_1.authService.register(req.body);
            res.status(201).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async firstTimeChangePassword(req, res, next) {
        try {
            const tempToken = (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.slice(7)
                : null) || req.body?.tempToken;
            if (!tempToken) {
                res.status(401).json({ success: false, message: 'Temporary authorization token required' });
                return;
            }
            const { newPassword } = req.body;
            const result = await auth_service_1.authService.firstTimeChangePassword(tempToken, newPassword);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async firstTimeVerify2fa(req, res, next) {
        try {
            const tempToken = (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.slice(7)
                : null) || req.body?.tempToken;
            if (!tempToken) {
                res.status(401).json({ success: false, message: 'Temporary authorization token required' });
                return;
            }
            const { code } = req.body;
            if (!code) {
                res.status(400).json({ success: false, message: 'Verification code is required' });
                return;
            }
            const result = await auth_service_1.authService.firstTimeVerify2fa(tempToken, code, req);
            if (result.refreshToken) {
                res.cookie('refreshToken', result.refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });
            }
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async verify2fa(req, res, next) {
        try {
            const tempToken = (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.slice(7)
                : null) || req.body?.tempToken;
            if (!tempToken) {
                res.status(401).json({ success: false, message: 'Verification token required' });
                return;
            }
            const { code } = req.body;
            if (!code) {
                res.status(400).json({ success: false, message: 'Verification code is required' });
                return;
            }
            const result = await auth_service_1.authService.verify2fa(tempToken, code, req);
            if (result.refreshToken) {
                res.cookie('refreshToken', result.refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });
            }
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async setup2fa(req, res, next) {
        try {
            const result = await auth_service_1.authService.setup2fa(req.user.id);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async enable2fa(req, res, next) {
        try {
            const { code } = req.body;
            if (!code) {
                res.status(400).json({ success: false, message: 'Verification code required' });
                return;
            }
            const result = await auth_service_1.authService.enable2fa(req.user.id, code);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    },
    async disable2fa(req, res, next) {
        try {
            const { password } = req.body;
            if (!password) {
                res.status(400).json({ success: false, message: 'Password confirmation required' });
                return;
            }
            const result = await auth_service_1.authService.disable2fa(req.user.id, password);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    },
    async regenerateRecoveryCodes(req, res, next) {
        try {
            const { password } = req.body;
            if (!password) {
                res.status(400).json({ success: false, message: 'Password confirmation required' });
                return;
            }
            const result = await auth_service_1.authService.regenerateRecoveryCodes(req.user.id, password);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    },
    async listSessions(req, res, next) {
        try {
            const currentToken = req.sessionId || req.headers['x-session-token'];
            const sessions = await auth_service_1.authService.listSessions(req.user.id, currentToken);
            res.json({ success: true, data: sessions });
        }
        catch (err) {
            next(err);
        }
    },
    async revokeSession(req, res, next) {
        try {
            const { id } = req.params;
            await auth_service_1.authService.revokeSession(id, req.user.id);
            res.json({ success: true, message: 'Session revoked successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async revokeOtherSessions(req, res, next) {
        try {
            const currentToken = req.sessionId || req.headers['x-session-token'] || '';
            await auth_service_1.authService.revokeOtherSessions(req.user.id, currentToken);
            res.json({ success: true, message: 'All other sessions have been signed out' });
        }
        catch (err) {
            next(err);
        }
    },
    async refresh(req, res, next) {
        try {
            const token = req.cookies?.refreshToken || req.body?.refreshToken;
            if (!token) {
                res.status(401).json({ success: false, message: 'Refresh token required' });
                return;
            }
            const result = await auth_service_1.authService.refreshTokens(token);
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async logout(req, res, next) {
        try {
            const currentSessionToken = req.sessionId || req.headers['x-session-token'];
            if (req.user?.id)
                await auth_service_1.authService.logout(req.user.id, currentSessionToken);
            res.clearCookie('refreshToken');
            res.json({ success: true, message: 'Logged out successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async getMe(req, res, next) {
        try {
            const user = await auth_service_1.authService.getMe(req.user.id);
            res.json({ success: true, data: user });
        }
        catch (err) {
            next(err);
        }
    },
    async createSuperAdmin(req, res, next) {
        try {
            const { email, password, firstName, lastName } = req.body;
            if (!email || !password) {
                res.status(400).json({ success: false, message: 'Email and password are required' });
                return;
            }
            if (typeof password !== 'string' || password.length < 6) {
                res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
                return;
            }
            const result = await auth_service_1.authService.provisionSuperAdmin({ email, password, firstName, lastName });
            res.status(201).json(result);
        }
        catch (err) {
            next(err);
        }
    },
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                res.status(400).json({ success: false, message: 'Current password and new password are required' });
                return;
            }
            const result = await auth_service_1.authService.changePassword(req.user.id, currentPassword, newPassword);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=auth.controller.js.map