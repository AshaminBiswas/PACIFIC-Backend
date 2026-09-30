"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersService = void 0;
const database_1 = require("../../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const session_service_1 = require("../auth/session.service");
const email_service_1 = require("../utils/email.service");
exports.usersService = {
    /**
     * List users with pagination, search, role filter, custom role assignments, and 2FA status
     */
    async listUsers(params) {
        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {};
        if (params.search && params.search.trim()) {
            const q = params.search.trim();
            where.OR = [
                { email: { contains: q, mode: 'insensitive' } },
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (params.role && params.role !== 'ALL') {
            where.role = params.role;
        }
        if (params.status && params.status !== 'ALL') {
            where.isActive = params.status === 'ACTIVE';
        }
        const [total, users] = await Promise.all([
            database_1.prisma.user.count({ where }),
            database_1.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
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
                    createdAt: true,
                    updatedAt: true,
                    userRoles: {
                        include: {
                            role: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                    isSystem: true,
                                },
                            },
                        },
                    },
                },
            }),
        ]);
        const formattedUsers = users.map((u) => ({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            isActive: u.isActive,
            mustChangePassword: u.mustChangePassword,
            twoFactorEnabled: u.twoFactorEnabled,
            isTwoFactorPending: u.isTwoFactorPending,
            lastLoginAt: u.lastLoginAt,
            lastLoginIp: u.lastLoginIp,
            customRoles: u.userRoles.map((ur) => ur.role),
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
        }));
        return {
            items: formattedUsers,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    },
    /**
     * Get single user with assigned roles and security attributes
     */
    async getUserById(id) {
        const user = await database_1.prisma.user.findUnique({
            where: { id },
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
                createdAt: true,
                updatedAt: true,
                userRoles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!user)
            throw Object.assign(new Error('User not found'), { status: 404 });
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            mustChangePassword: user.mustChangePassword,
            twoFactorEnabled: user.twoFactorEnabled,
            isTwoFactorPending: user.isTwoFactorPending,
            lastLoginAt: user.lastLoginAt,
            lastLoginIp: user.lastLoginIp,
            customRoles: user.userRoles.map((ur) => ({
                id: ur.role.id,
                name: ur.role.name,
                code: ur.role.code,
                isSystem: ur.role.isSystem,
                permissions: ur.role.permissions.map((rp) => rp.permission),
            })),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    },
    /**
     * Create an admin / staff user with secure password hash, mustChangePassword flag, and 2FA onboarding
     */
    async createUser(data) {
        const email = data.email.trim().toLowerCase();
        if (!email)
            throw Object.assign(new Error('Email is required'), { status: 400 });
        const existing = await database_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            throw Object.assign(new Error('Email is already registered'), { status: 409 });
        const passwordRaw = data.password && data.password.trim().length >= 6
            ? data.password.trim()
            : 'PacificAdmin@2026';
        const hashedPassword = await bcryptjs_1.default.hash(passwordRaw, 12);
        const role = data.role?.toUpperCase() || 'EDITOR';
        // When created with temporary/dummy password, enforce password change on first login
        const mustChangePassword = data.mustChangePassword !== false;
        const isTwoFactorPending = true;
        const user = await database_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName: data.firstName.trim() || 'Staff',
                lastName: data.lastName.trim() || '',
                role,
                isActive: data.isActive !== false,
                mustChangePassword,
                isTwoFactorPending,
            },
        });
        // Attach custom role assignments
        if (Array.isArray(data.roleIds) && data.roleIds.length > 0) {
            const validRoles = await database_1.prisma.role.findMany({
                where: { id: { in: data.roleIds } },
            });
            for (const r of validRoles) {
                await database_1.prisma.userRoleAssignment.create({
                    data: {
                        userId: user.id,
                        roleId: r.id,
                    },
                });
            }
        }
        const createdUser = await this.getUserById(user.id);
        // Send welcome email with temporary credentials (fire-and-forget, non-blocking)
        email_service_1.emailService
            .sendWelcomeEmail({
            to: email,
            firstName: data.firstName.trim() || 'Admin',
            lastName: data.lastName.trim() || '',
            temporaryPassword: passwordRaw,
        })
            .catch((err) => console.warn(`[EMAIL] Failed to send welcome email to ${email}:`, err?.message || err));
        return createdUser;
    },
    /**
     * Update user details, primary role, custom roles, and active status
     */
    async updateUser(id, data, requesterId) {
        const existing = await database_1.prisma.user.findUnique({ where: { id } });
        if (!existing)
            throw Object.assign(new Error('User not found'), { status: 404 });
        // Protect against self-deactivation
        if (requesterId && id === requesterId && data.isActive === false) {
            throw Object.assign(new Error('You cannot deactivate your own active account'), { status: 400 });
        }
        // Protect last active SUPER_ADMIN from role demotion or deactivation
        if (existing.role === 'SUPER_ADMIN' && ((data.role && data.role !== 'SUPER_ADMIN') || data.isActive === false)) {
            const superAdminsCount = await database_1.prisma.user.count({
                where: { role: 'SUPER_ADMIN', isActive: true, id: { not: id } },
            });
            if (superAdminsCount === 0) {
                throw Object.assign(new Error('Cannot demote or deactivate the only active Super Admin'), { status: 400 });
            }
        }
        const updateData = {};
        if (data.firstName !== undefined)
            updateData.firstName = data.firstName.trim();
        if (data.lastName !== undefined)
            updateData.lastName = data.lastName.trim();
        if (data.role !== undefined)
            updateData.role = data.role.toUpperCase();
        if (data.isActive !== undefined)
            updateData.isActive = Boolean(data.isActive);
        if (data.mustChangePassword !== undefined)
            updateData.mustChangePassword = Boolean(data.mustChangePassword);
        await database_1.prisma.user.update({
            where: { id },
            data: updateData,
        });
        // If deactivated, revoke all active sessions
        if (data.isActive === false) {
            await session_service_1.sessionService.revokeAllSessions(id, 'DEACTIVATED');
        }
        // Synchronize role assignments if provided
        if (Array.isArray(data.roleIds)) {
            await database_1.prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
            if (data.roleIds.length > 0) {
                const validRoles = await database_1.prisma.role.findMany({
                    where: { id: { in: data.roleIds } },
                });
                for (const r of validRoles) {
                    await database_1.prisma.userRoleAssignment.create({
                        data: {
                            userId: id,
                            roleId: r.id,
                        },
                    });
                }
            }
        }
        return this.getUserById(id);
    },
    /**
     * Reset user password, invalidate all active sessions, and optionally force change on next login
     */
    async resetPassword(id, newPasswordRaw, forceChangeOnLogin = true) {
        const user = await database_1.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw Object.assign(new Error('User not found'), { status: 404 });
        if (!newPasswordRaw || newPasswordRaw.trim().length < 6) {
            throw Object.assign(new Error('Password must be at least 6 characters long'), { status: 400 });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPasswordRaw.trim(), 12);
        // Invalidate all active sessions for this user across all devices
        await session_service_1.sessionService.revokeAllSessions(id, 'SUPER_ADMIN_PASSWORD_RESET');
        await database_1.prisma.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                refreshToken: null,
                mustChangePassword: forceChangeOnLogin,
            },
        });
        // Send password reset notification email (fire-and-forget)
        email_service_1.emailService
            .sendPasswordResetEmail({
            to: user.email,
            firstName: user.firstName || 'Admin',
            newPassword: newPasswordRaw.trim(),
        })
            .catch((err) => console.warn(`[EMAIL] Failed to send reset email to ${user.email}:`, err?.message || err));
        return {
            success: true,
            message: `Password reset successfully for ${user.email}. All previous device sessions revoked.`,
        };
    },
    /**
     * Reset 2FA for a locked out user (Super Admin action)
     */
    async reset2fa(id) {
        const user = await database_1.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw Object.assign(new Error('User not found'), { status: 404 });
        await database_1.prisma.user.update({
            where: { id },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorRecoveryCodes: [],
                isTwoFactorPending: true, // Forces re-setup on next login
            },
        });
        return { success: true, message: `Two-factor authentication reset for ${user.email}. User will be prompted to re-enroll on next login.` };
    },
    /**
     * Delete user (Super Admin only, self-deletion guarded)
     */
    async deleteUser(id, requesterId) {
        if (id === requesterId) {
            throw Object.assign(new Error('You cannot delete your own user account'), { status: 400 });
        }
        const user = await database_1.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw Object.assign(new Error('User not found'), { status: 404 });
        if (user.role === 'SUPER_ADMIN') {
            const otherSuperAdmins = await database_1.prisma.user.count({
                where: { role: 'SUPER_ADMIN', id: { not: id } },
            });
            if (otherSuperAdmins === 0) {
                throw Object.assign(new Error('Cannot delete the last remaining Super Admin'), { status: 400 });
            }
        }
        await session_service_1.sessionService.revokeAllSessions(id, 'USER_DELETED');
        await database_1.prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
        await database_1.prisma.user.delete({ where: { id } });
        return { success: true, message: `User ${user.email} deleted successfully` };
    },
};
//# sourceMappingURL=users.service.js.map