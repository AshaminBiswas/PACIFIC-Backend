import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';
import type { UserRole } from '@prisma/client';
import { sessionService } from '../auth/session.service';
import { emailService } from '../utils/email.service';
import { clearUserPermissionCache } from '../../middleware/rbac.middleware';

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  department?: string;
  status?: string;
  sortBy?: 'createdAt' | 'name' | 'lastLoginAt' | 'adminId';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Generate next sequential Admin ID: ADM-1001, ADM-1002, ...
 */
async function generateNextAdminId(): Promise<string> {
  const usersWithAdminId = await prisma.user.findMany({
    where: {
      adminId: { startsWith: 'ADM-' },
    },
    select: { adminId: true },
  });

  let maxNum = 1000;
  for (const u of usersWithAdminId) {
    if (u.adminId) {
      const match = u.adminId.match(/^ADM-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  return `ADM-${maxNum + 1}`;
}

export const usersService = {
  /**
   * List users with pagination, search, role & department filters, custom role assignments, and 2FA status
   */
  async listUsers(params: ListUsersParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { adminId: { contains: q, mode: 'insensitive' } },
        { mobileNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params.role && params.role !== 'ALL') {
      where.OR = [
        ...(where.OR || []),
        { role: params.role as any },
        { userRoles: { some: { role: { code: params.role } } } },
        { userRoles: { some: { roleId: params.role } } },
      ];
    }

    if (params.department && params.department !== 'ALL') {
      where.department = { equals: params.department, mode: 'insensitive' };
    }

    if (params.status && params.status !== 'ALL') {
      const st = params.status.toUpperCase();
      if (['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'].includes(st)) {
        where.status = st;
      } else if (params.status === 'TRUE') {
        where.isActive = true;
      } else if (params.status === 'FALSE') {
        where.isActive = false;
      }
    }

    const orderBy: any[] = [];
    if (params.sortBy === 'name') {
      orderBy.push({ firstName: params.sortOrder || 'asc' }, { lastName: params.sortOrder || 'asc' });
    } else if (params.sortBy === 'lastLoginAt') {
      orderBy.push({ lastLoginAt: params.sortOrder || 'desc' });
    } else if (params.sortBy === 'adminId') {
      orderBy.push({ adminId: params.sortOrder || 'asc' });
    } else {
      orderBy.push({ role: 'asc' }, { createdAt: 'desc' });
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          adminId: true,
          profilePhoto: true,
          email: true,
          firstName: true,
          lastName: true,
          mobileNumber: true,
          department: true,
          designation: true,
          status: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          twoFactorEnabled: true,
          isTwoFactorPending: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdById: true,
          createdBy: {
            select: {
              id: true,
              adminId: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  department: true,
                  category: true,
                  isSystem: true,
                  _count: {
                    select: { permissions: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map((u) => {
      const roles = u.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        code: ur.role.code,
        department: ur.role.department,
        category: ur.role.category,
        isSystem: ur.role.isSystem,
        permissionCount: ur.role._count.permissions,
      }));

      const isSuperAdmin = u.role === 'SUPER_ADMIN' || roles.some((r) => r.code === 'SUPER_ADMIN');

      return {
        id: u.id,
        adminId: u.adminId || 'ADM-PENDING',
        profilePhoto: u.profilePhoto || null,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        mobileNumber: u.mobileNumber || null,
        department: u.department || 'General',
        designation: u.designation || 'Staff',
        status: u.status || (u.isActive ? 'ACTIVE' : 'INACTIVE'),
        role: u.role,
        isSuperAdmin,
        isActive: u.isActive && u.status === 'ACTIVE',
        mustChangePassword: u.mustChangePassword,
        twoFactorEnabled: u.twoFactorEnabled,
        isTwoFactorPending: u.isTwoFactorPending,
        lastLoginAt: u.lastLoginAt,
        lastLoginIp: u.lastLoginIp,
        createdById: u.createdById,
        createdBy: u.createdBy ? `${u.createdBy.firstName} ${u.createdBy.lastName}`.trim() || u.createdBy.email : null,
        roles,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    });

    return {
      items: formattedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get single user with assigned roles, effective permissions, and security attributes
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        adminId: true,
        profilePhoto: true,
        email: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        department: true,
        designation: true,
        status: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        twoFactorEnabled: true,
        isTwoFactorPending: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdById: true,
        createdBy: {
          select: {
            id: true,
            adminId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
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

    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      code: ur.role.code,
      department: ur.role.department,
      category: ur.role.category,
      isSystem: ur.role.isSystem,
      permissions: ur.role.permissions.map((rp) => rp.permission),
    }));

    const isSuperAdmin = user.role === 'SUPER_ADMIN' || roles.some((r) => r.code === 'SUPER_ADMIN');

    // Resolve unique effective permissions
    const permissionsMap = new Map<string, any>();
    for (const r of roles) {
      for (const p of r.permissions) {
        if (!permissionsMap.has(p.code)) {
          permissionsMap.set(p.code, p);
        }
      }
    }

    return {
      id: user.id,
      adminId: user.adminId || 'ADM-PENDING',
      profilePhoto: user.profilePhoto || null,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      mobileNumber: user.mobileNumber || null,
      department: user.department || 'General',
      designation: user.designation || 'Staff',
      status: user.status || (user.isActive ? 'ACTIVE' : 'INACTIVE'),
      role: user.role,
      isSuperAdmin,
      isActive: user.isActive && user.status === 'ACTIVE',
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
      isTwoFactorPending: user.isTwoFactorPending,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      createdById: user.createdById,
      createdBy: user.createdBy,
      roles,
      effectivePermissions: Array.from(permissionsMap.values()),
      effectivePermissionCodes: Array.from(permissionsMap.keys()),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },

  /**
   * Create an admin / staff user with secure password hash, mustChangePassword flag, and 2FA onboarding
   */
  async createUser(
    data: {
      adminId?: string;
      email: string;
      password?: string;
      firstName: string;
      lastName: string;
      profilePhoto?: string;
      mobileNumber?: string;
      department?: string;
      designation?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
      role?: string;
      roleIds?: string[];
      isActive?: boolean;
      mustChangePassword?: boolean;
    },
    requesterId?: string
  ) {
    const email = data.email.trim().toLowerCase();
    if (!email) throw Object.assign(new Error('Email is required'), { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw Object.assign(new Error('Email is already registered'), { status: 409 });

    // Validate or auto-generate adminId
    let adminId = data.adminId?.trim().toUpperCase();
    if (adminId) {
      const existingAdminId = await prisma.user.findUnique({ where: { adminId } });
      if (existingAdminId) throw Object.assign(new Error(`Admin ID ${adminId} is already in use`), { status: 409 });
    } else {
      adminId = await generateNextAdminId();
    }

    const passwordRaw =
      data.password && data.password.trim().length >= 6
        ? data.password.trim()
        : 'PacificAdmin@2026';

    const hashedPassword = await bcrypt.hash(passwordRaw, 12);

    // Primary role determination
    let primaryRole: UserRole = 'ADMIN';
    if (data.role && ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'WAREHOUSE_MANAGER', 'FINANCE_OFFICER', 'PROCUREMENT_MANAGER', 'EXPORT_MANAGER', 'EDITOR', 'VIEWER'].includes(data.role.toUpperCase())) {
      primaryRole = data.role.toUpperCase() as UserRole;
    }

    const status = data.status || (data.isActive === false ? 'INACTIVE' : 'ACTIVE');
    const isActive = status === 'ACTIVE';
    const mustChangePassword = data.mustChangePassword !== false;
    const isTwoFactorPending = true;

    const user = await prisma.user.create({
      data: {
        adminId,
        email,
        password: hashedPassword,
        firstName: data.firstName.trim() || 'Admin',
        lastName: data.lastName.trim() || '',
        profilePhoto: data.profilePhoto || null,
        mobileNumber: data.mobileNumber?.trim() || null,
        department: data.department?.trim() || 'General',
        designation: data.designation?.trim() || 'Administrator',
        status,
        role: primaryRole,
        isActive,
        mustChangePassword,
        isTwoFactorPending,
        createdById: requesterId || null,
      },
    });

    // Attach role assignments
    if (Array.isArray(data.roleIds) && data.roleIds.length > 0) {
      const validRoles = await prisma.role.findMany({
        where: { id: { in: data.roleIds } },
      });
      for (const r of validRoles) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: user.id,
            roleId: r.id,
          },
        });
      }
    }

    // Log admin creation in AdminActivityLog
    if (requesterId) {
      await prisma.adminActivityLog.create({
        data: {
          actorId: requesterId,
          targetType: 'USER',
          targetId: user.id,
          action: 'CREATE_ADMIN',
          details: `Created new admin account "${user.firstName} ${user.lastName}" (${user.adminId}) with role "${primaryRole}"`,
          newState: {
            id: user.id,
            adminId: user.adminId,
            email: user.email,
            department: user.department,
            designation: user.designation,
            status: user.status,
            roleIds: data.roleIds || [],
          },
        },
      }).catch(() => {});
    }

    const createdUser = await this.getUserById(user.id);

    // Send welcome email with temporary credentials (fire-and-forget)
    emailService
      .sendWelcomeEmail({
        to: email,
        firstName: data.firstName.trim() || 'Admin',
        lastName: data.lastName.trim() || '',
        temporaryPassword: passwordRaw,
      })
      .catch((err) =>
        console.warn(`[EMAIL] Failed to send welcome email to ${email}:`, err?.message || err)
      );

    return createdUser;
  },

  /**
   * Update user details, roles, department, designation, and status
   */
  async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      profilePhoto?: string;
      mobileNumber?: string;
      department?: string;
      designation?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
      role?: string;
      isActive?: boolean;
      roleIds?: string[];
      mustChangePassword?: boolean;
    },
    requesterId?: string
  ) {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: true,
      },
    });
    if (!existing) throw Object.assign(new Error('User not found'), { status: 404 });

    // Protect against self-deactivation or self-suspension
    if (requesterId && id === requesterId && (data.isActive === false || data.status === 'INACTIVE' || data.status === 'SUSPENDED')) {
      throw Object.assign(new Error('You cannot deactivate or suspend your own active account'), { status: 400 });
    }

    // Protect last active SUPER_ADMIN from role demotion or deactivation
    if (existing.role === 'SUPER_ADMIN' && ((data.role && data.role !== 'SUPER_ADMIN') || data.isActive === false || data.status === 'INACTIVE' || data.status === 'SUSPENDED')) {
      const superAdminsCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true, status: 'ACTIVE', id: { not: id } },
      });
      if (superAdminsCount === 0) {
        throw Object.assign(new Error('Cannot demote, deactivate, or suspend the only active Super Admin'), { status: 400 });
      }
    }

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
    if (data.profilePhoto !== undefined) updateData.profilePhoto = data.profilePhoto || null;
    if (data.mobileNumber !== undefined) updateData.mobileNumber = data.mobileNumber?.trim() || null;
    if (data.department !== undefined) updateData.department = data.department.trim() || 'General';
    if (data.designation !== undefined) updateData.designation = data.designation.trim() || 'Staff';

    if (data.status !== undefined) {
      updateData.status = data.status;
      updateData.isActive = data.status === 'ACTIVE';
    } else if (data.isActive !== undefined) {
      updateData.isActive = Boolean(data.isActive);
      updateData.status = data.isActive ? 'ACTIVE' : 'INACTIVE';
    }

    if (data.role !== undefined && ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'WAREHOUSE_MANAGER', 'FINANCE_OFFICER', 'PROCUREMENT_MANAGER', 'EXPORT_MANAGER', 'EDITOR', 'VIEWER'].includes(data.role.toUpperCase())) {
      updateData.role = data.role.toUpperCase() as UserRole;
    }
    if (data.mustChangePassword !== undefined) updateData.mustChangePassword = Boolean(data.mustChangePassword);

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // If deactivated or suspended, revoke all active sessions across all devices
    if (updateData.status === 'INACTIVE' || updateData.status === 'SUSPENDED' || updateData.isActive === false) {
      await sessionService.revokeAllSessions(id, updateData.status || 'DEACTIVATED');
    }

    // Synchronize role assignments if provided
    const oldRoleIds = existing.userRoles.map((ur) => ur.roleId);
    let rolesChanged = false;

    if (Array.isArray(data.roleIds)) {
      rolesChanged = true;
      await prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
      if (data.roleIds.length > 0) {
        const validRoles = await prisma.role.findMany({
          where: { id: { in: data.roleIds } },
        });
        for (const r of validRoles) {
          await prisma.userRoleAssignment.create({
            data: {
              userId: id,
              roleId: r.id,
            },
          });
        }
      }
    }

    // Invalidate cached permissions
    clearUserPermissionCache(id);

    // Record audit in AdminActivityLog
    if (requesterId) {
      await prisma.adminActivityLog.create({
        data: {
          actorId: requesterId,
          targetType: 'USER',
          targetId: id,
          action: 'UPDATE_ADMIN',
          details: `Updated admin account "${existing.firstName} ${existing.lastName}" (${existing.adminId})`,
          previousState: {
            firstName: existing.firstName,
            lastName: existing.lastName,
            department: existing.department,
            designation: existing.designation,
            status: existing.status,
            role: existing.role,
            roleIds: oldRoleIds,
          },
          newState: {
            firstName: updateData.firstName ?? existing.firstName,
            lastName: updateData.lastName ?? existing.lastName,
            department: updateData.department ?? existing.department,
            designation: updateData.designation ?? existing.designation,
            status: updateData.status ?? existing.status,
            role: updateData.role ?? existing.role,
            roleIds: data.roleIds ?? oldRoleIds,
          },
        },
      }).catch(() => {});
    }

    return this.getUserById(id);
  },

  /**
   * Reset user password, invalidate all active sessions, and force change on next login
   */
  async resetPassword(id: string, newPasswordRaw: string, requesterId?: string, forceChangeOnLogin = true) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    if (!newPasswordRaw || newPasswordRaw.trim().length < 6) {
      throw Object.assign(new Error('Password must be at least 6 characters long'), { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPasswordRaw.trim(), 12);

    // Invalidate all active sessions across all devices
    await sessionService.revokeAllSessions(id, 'SUPER_ADMIN_PASSWORD_RESET');

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        refreshToken: null,
        mustChangePassword: forceChangeOnLogin,
      },
    });

    if (requesterId) {
      await prisma.adminActivityLog.create({
        data: {
          actorId: requesterId,
          targetType: 'USER',
          targetId: id,
          action: 'RESET_PASSWORD',
          details: `Reset password for admin account "${user.firstName} ${user.lastName}" (${user.adminId || user.email})`,
        },
      }).catch(() => {});
    }

    // Send password reset notification email (fire-and-forget)
    emailService
      .sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName || 'Admin',
        newPassword: newPasswordRaw.trim(),
      })
      .catch((err) =>
        console.warn(`[EMAIL] Failed to send reset email to ${user.email}:`, err?.message || err)
      );

    return {
      success: true,
      message: `Password reset successfully for ${user.email}. All previous device sessions revoked.`,
    };
  },

  /**
   * Reset 2FA for a locked out user
   */
  async reset2fa(id: string, requesterId?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    await prisma.user.update({
      where: { id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: [],
        isTwoFactorPending: true, // Forces re-setup on next login
      },
    });

    if (requesterId) {
      await prisma.adminActivityLog.create({
        data: {
          actorId: requesterId,
          targetType: 'USER',
          targetId: id,
          action: 'RESET_2FA',
          details: `Reset two-factor authentication for admin account "${user.firstName} ${user.lastName}" (${user.adminId || user.email})`,
        },
      }).catch(() => {});
    }

    return { success: true, message: `Two-factor authentication reset for ${user.email}. User will be prompted to re-enroll on next login.` };
  },

  /**
   * Revoke all active sessions for a user immediately
   */
  async revokeSessions(id: string, requesterId?: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    await sessionService.revokeAllSessions(id, 'MANUAL_SUPERADMIN_REVOKE');

    if (requesterId) {
      await prisma.adminActivityLog.create({
        data: {
          actorId: requesterId,
          targetType: 'USER',
          targetId: id,
          action: 'REVOKE_SESSION',
          details: `Manually terminated all active device sessions for "${user.firstName} ${user.lastName}" (${user.adminId || user.email})`,
        },
      }).catch(() => {});
    }

    return { success: true, message: `All active sessions revoked for ${user.email}.` };
  },

  /**
   * Get activity logs specific to an admin user (actions performed by them or on them)
   */
  async getUserActivity(id: string, query?: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { actorId: id },
        { targetId: id },
      ],
    };

    const [total, items] = await Promise.all([
      prisma.adminActivityLog.count({ where }),
      prisma.adminActivityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              adminId: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePhoto: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Delete user (Super Admin only, self-deletion guarded)
   */
  async deleteUser(id: string, requesterId: string) {
    if (id === requesterId) {
      throw Object.assign(new Error('You cannot delete your own user account'), { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    if (user.role === 'SUPER_ADMIN') {
      const otherSuperAdmins = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', id: { not: id } },
      });
      if (otherSuperAdmins === 0) {
        throw Object.assign(new Error('Cannot delete the last remaining Super Admin'), { status: 400 });
      }
    }

    await sessionService.revokeAllSessions(id, 'USER_DELETED');
    await prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    // Invalidate cache
    clearUserPermissionCache(id);

    // Record audit in AdminActivityLog
    await prisma.adminActivityLog.create({
      data: {
        actorId: requesterId,
        targetType: 'USER',
        targetId: id,
        action: 'DELETE_ADMIN',
        details: `Deleted admin account "${user.firstName} ${user.lastName}" (${user.adminId || user.email})`,
        previousState: {
          id: user.id,
          adminId: user.adminId,
          email: user.email,
          role: user.role,
        },
      },
    }).catch(() => {});

    return { success: true, message: `User ${user.email} deleted successfully` };
  },
};
