"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("./auth.service");
exports.authController = {
    async login(req, res, next) {
        try {
            const result = await auth_service_1.authService.login(req.body);
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
    async register(req, res, next) {
        try {
            const result = await auth_service_1.authService.register(req.body);
            res.status(201).json({ success: true, data: result });
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
            if (req.user?.id)
                await auth_service_1.authService.logout(req.user.id);
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
};
//# sourceMappingURL=auth.controller.js.map