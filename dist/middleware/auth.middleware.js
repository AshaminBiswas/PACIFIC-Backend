"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireSuperAdmin = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const requireAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
            (typeof req.query?.token === 'string' ? req.query.token : null) ||
            (typeof req.cookies?.accessToken === 'string' ? req.cookies.accessToken : null) ||
            null;
        if (!token) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwt.secret);
        req.user = payload;
        // Enforce system-wide rule: Only Super Admin and Admin can delete records
        const roleUpper = req.user.role?.toUpperCase();
        if (req.method === 'DELETE' && roleUpper !== 'SUPER_ADMIN' && roleUpper !== 'ADMIN') {
            res.status(403).json({ success: false, message: 'Only Super Admin and Admin can delete records' });
            return;
        }
        next();
    }
    catch (err) {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};
exports.requireAuth = requireAuth;
const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
    }
    if (req.user.role?.toUpperCase() !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, message: 'Only Super Admin can delete records' });
        return;
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
    }
    const roleUpper = req.user.role?.toUpperCase();
    if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN') {
        next();
        return;
    }
    const allowedUpper = roles.map((r) => r.toUpperCase());
    if (!allowedUpper.includes(roleUpper)) {
        res.status(403).json({ success: false, message: 'Insufficient permissions' });
        return;
    }
    next();
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.middleware.js.map