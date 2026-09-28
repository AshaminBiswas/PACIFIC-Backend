"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function required(key) {
    const value = process.env[key];
    if (!value)
        throw new Error(`Missing required environment variable: ${key}`);
    return value;
}
function optional(key, fallback) {
    return process.env[key] || fallback;
}
exports.env = {
    NODE_ENV: optional('NODE_ENV', 'development'),
    PORT: parseInt(optional('PORT', '5001'), 10),
    API_PREFIX: optional('API_PREFIX', '/api/v1'),
    INSTANCE_ID: optional('INSTANCE_ID', 'pacific-api-1'),
    isDev: optional('NODE_ENV', 'development') === 'development',
    isProd: process.env.NODE_ENV === 'production',
    database: {
        url: process.env.DATABASE_URL || '',
        directUrl: process.env.DIRECT_URL || '',
    },
    jwt: {
        secret: optional('JWT_SECRET', 'dev-secret-change-in-production'),
        refreshSecret: optional('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
        expiresIn: optional('JWT_EXPIRES_IN', '15m'),
        refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
    },
    cors: {
        origin: optional('CORS_ORIGIN', 'http://localhost:5176'),
        allowedOrigins: optional('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5176'),
    },
    frontend: {
        url: optional('FRONTEND_URL', 'http://localhost:5173'),
        adminUrl: optional('ADMIN_URL', 'http://localhost:5176'),
    },
    smtp: {
        host: optional('SMTP_HOST', 'smtp.gmail.com'),
        port: parseInt(optional('SMTP_PORT', '587'), 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: optional('SMTP_FROM', 'Pacific Restroom Cubicle <noreply@pacificrestroomcubicle.com>'),
    },
    keepAlive: {
        url: process.env.KEEP_ALIVE_URL || '',
        intervalMs: parseInt(optional('KEEP_ALIVE_INTERVAL_MS', '600000'), 10),
    },
    supabase: {
        url: optional('SUPABASE_URL', 'https://ydpzlqjnhbcuzmjyylaj.supabase.co'),
        publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
        secretKey: process.env.SUPABASE_SECRET_KEY || '',
        jwksUrl: optional('SUPABASE_JWKS_URL', 'https://ydpzlqjnhbcuzmjyylaj.supabase.co/auth/v1/.well-known/jwks.json'),
    },
    resend: {
        apiKey: process.env.RESEND_API_KEY || '',
        from: optional('RESEND_FROM', 'Pacific Products & Solutions <ejaj@pacificproduct.in>'),
    },
};
//# sourceMappingURL=env.js.map