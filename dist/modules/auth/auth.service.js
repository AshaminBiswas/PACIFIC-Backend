"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const database_1 = require("../../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const signAccessToken = (payload) => jsonwebtoken_1.default.sign(payload, env_1.env.jwt.secret, { expiresIn: env_1.env.jwt.expiresIn });
const signRefreshToken = (payload) => jsonwebtoken_1.default.sign(payload, env_1.env.jwt.refreshSecret, { expiresIn: env_1.env.jwt.refreshExpiresIn });
exports.authService = {
    async login(data) {
        const user = await database_1.prisma.user.findUnique({ where: { email: data.email } });
        if (!user || !user.isActive)
            throw Object.assign(new Error('Invalid credentials'), { status: 401 });
        const valid = await bcryptjs_1.default.compare(data.password, user.password);
        if (!valid)
            throw Object.assign(new Error('Invalid credentials'), { status: 401 });
        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
        const refreshToken = signRefreshToken({ id: user.id });
        await database_1.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
        return {
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        };
    },
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
        const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
        const newRefreshToken = signRefreshToken({ id: user.id });
        await database_1.prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });
        return { accessToken, refreshToken: newRefreshToken };
    },
    async logout(userId) {
        await database_1.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
    },
    async getMe(userId) {
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
        });
        if (!user)
            throw Object.assign(new Error('User not found'), { status: 404 });
        return user;
    },
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
        // Attach system role if available
        try {
            const superRole = await database_1.prisma.role.findFirst({ where: { code: 'SUPER_ADMIN' } });
            if (superRole) {
                await database_1.prisma.userRoleAssignment.upsert({
                    where: { userId_roleId: { userId: user.id, roleId: superRole.id } },
                    create: { userId: user.id, roleId: superRole.id },
                    update: {},
                });
            }
        }
        catch (_e) { }
        // Synchronize to Supabase Auth if secret key is present
        let supabaseSynced = false;
        let supabaseMessage = 'Supabase admin sync skipped (keys pending unmasking in .env)';
        const supabaseSecret = env_1.env.supabase.secretKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseSecret && !supabaseSecret.includes('••') && !supabaseSecret.includes('..')) {
            try {
                const supRes = await fetch(`${env_1.env.supabase.url}/auth/v1/admin/users`, {
                    method: 'POST',
                    headers: {
                        apikey: supabaseSecret,
                        Authorization: `Bearer ${supabaseSecret}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email,
                        password: data.password,
                        email_confirm: true,
                        user_metadata: { firstName, lastName, role: 'SUPER_ADMIN' },
                    }),
                });
                const supData = await supRes.json();
                if (supRes.ok || supData?.id) {
                    supabaseSynced = true;
                    supabaseMessage = 'User successfully created and auto-confirmed in Supabase Auth';
                }
                else if (supData?.message?.includes('already been registered') || supData?.msg?.includes('already registered')) {
                    try {
                        const listRes = await fetch(`${env_1.env.supabase.url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
                            headers: { apikey: supabaseSecret, Authorization: `Bearer ${supabaseSecret}` },
                        });
                        const listData = await listRes.json();
                        const existingSupUser = listData?.users?.find((u) => u.email === email);
                        if (existingSupUser?.id) {
                            await fetch(`${env_1.env.supabase.url}/auth/v1/admin/users/${existingSupUser.id}`, {
                                method: 'PUT',
                                headers: { apikey: supabaseSecret, Authorization: `Bearer ${supabaseSecret}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ password: data.password, email_confirm: true }),
                            });
                        }
                    }
                    catch (_ignore) { }
                    supabaseSynced = true;
                    supabaseMessage = 'User password synchronized and auto-confirmed in Supabase Auth';
                }
                else {
                    supabaseMessage = `Supabase Auth notice: ${supData?.message || supData?.msg || 'Could not auto-sync'}`;
                }
            }
            catch (sErr) {
                supabaseMessage = `Supabase sync error: ${sErr.message}`;
            }
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
            supabase: {
                synced: supabaseSynced,
                status: supabaseMessage,
            },
            loginUrl: 'http://localhost:5176/login',
        };
    },
};
//# sourceMappingURL=auth.service.js.map