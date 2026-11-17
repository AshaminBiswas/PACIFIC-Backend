import { prisma } from '../../config/database';
import { COMPLETE_PERMISSION_CATALOG, PermissionDefinition } from './permissions.constants';

export const rolesService = {
  /**
   * Seed all permissions from the comprehensive Pacific Admin Permissions Catalog
   * and configure default system roles.
   */
  async seedDefaultRolesAndPermissions() {
    try {
      console.log(`[RBAC] Seeding ${COMPLETE_PERMISSION_CATALOG.length} granular permissions...`);

      // 1. Upsert every permission in catalog
      for (const perm of COMPLETE_PERMISSION_CATALOG) {
        await prisma.permission.upsert({
          where: { code: perm.code },
          create: {
            code: perm.code,
            module: perm.module,
            submodule: perm.submodule,
            action: perm.action,
            category: perm.category,
            description: perm.description,
          },
          update: {
            module: perm.module,
            submodule: perm.submodule,
            action: perm.action,
            category: perm.category,
            description: perm.description,
          },
        });
      }

      const allPerms = await prisma.permission.findMany();
      const permMap = new Map<string, string>(allPerms.map((p) => [p.code, p.id]));

      // 2. Define baseline system role templates
      const defaultRoles = [
        {
          code: 'SUPER_ADMIN',
          name: 'Super Admin',
          department: 'Executive',
          category: 'System',
          description: 'Unrestricted master platform authority across all modules, administrative settings, and security controls',
          isSystem: true,
          perms: allPerms.map((p) => p.id),
        },
        {
          code: 'MANAGER',
          name: 'Manager',
          department: 'Operations',
          category: 'Management',
          description: 'High-level operational management across orders, products, inventory, customers, and business reports',
          isSystem: true,
          perms: allPerms
            .filter((p) =>
              [
                'dashboard.',
                'orders.',
                'products.',
                'categories.',
                'brands.',
                'collections.',
                'customers.',
                'inventory.',
                'reports.',
                'quotations.',
                'pi.',
                'packing_lists.',
                'hardware_issues.',
              ].some((prefix) => p.code.startsWith(prefix)) &&
              !p.code.endsWith('.delete') &&
              !p.code.startsWith('admins.') &&
              !p.code.startsWith('roles.') &&
              !p.code.startsWith('settings.')
            )
            .map((p) => p.id),
        },
        {
          code: 'SALES_MANAGER',
          name: 'Sales Manager',
          department: 'Sales & Marketing',
          category: 'Sales',
          description: 'Full management of CRM, Sales Quotations, Proforma Invoices, Sales Orders, B2B Clients, and Sales Reports',
          isSystem: true,
          perms: allPerms
            .filter((p) =>
              [
                'dashboard.view',
                'dashboard.sales_overview',
                'dashboard.orders_summary',
                'orders.',
                'quotations.',
                'pi.',
                'customers.',
                'reports.',
              ].some((prefix) => p.code.startsWith(prefix)) &&
              !p.code.endsWith('.delete')
            )
            .map((p) => p.id),
        },
        {
          code: 'INVENTORY_MANAGER',
          name: 'Inventory Manager',
          department: 'Logistics & Warehouse',
          category: 'Logistics',
          description: 'Complete control of raw materials, board & hardware stock registries, warehouses, suppliers, and store issues',
          isSystem: true,
          perms: allPerms
            .filter((p) =>
              [
                'dashboard.view',
                'dashboard.inventory_summary',
                'inventory.',
                'packing_lists.',
                'hardware_issues.',
                'procurement.',
                'products.read',
              ].some((prefix) => p.code.startsWith(prefix)) &&
              !p.code.endsWith('.delete')
            )
            .map((p) => p.id),
        },
        {
          code: 'CONTENT_MANAGER',
          name: 'Content Manager',
          department: 'Digital Marketing',
          category: 'Content',
          description: 'Management of website CMS, blog articles, media library, hero banners, categories, and product listings',
          isSystem: true,
          perms: allPerms
            .filter((p) =>
              [
                'cms.',
                'blogs.',
                'media.',
                'banners.',
                'categories.',
                'collections.',
                'products.',
                'seo.',
                'reviews.',
              ].some((prefix) => p.code.startsWith(prefix)) &&
              !p.code.endsWith('.delete')
            )
            .map((p) => p.id),
        },
        {
          code: 'CUSTOMER_SUPPORT',
          name: 'Customer Support',
          department: 'Support & CRM',
          category: 'Support',
          description: 'Customer communication, review responses, lead inquiry tracking, and order status lookups',
          isSystem: true,
          perms: allPerms
            .filter((p) =>
              [
                'customers.read',
                'customers.view_details',
                'customers.view_orders',
                'orders.read',
                'orders.details',
                'reviews.read',
                'reviews.reply',
                'notifications.read',
              ].some((code) => p.code === code)
            )
            .map((p) => p.id),
        },
        {
          code: 'MARKETING_MANAGER',
          name: 'Marketing Manager',
          department: 'Growth & Strategy',
          category: 'Marketing',
          description: 'Management of offers, volume discounts, coupons, banners, visitor analytics, and SEO campaigns',
          isSystem: true,
          perms: allPerms
            .filter((p) =>
              [
                'dashboard.view',
                'dashboard.sales_overview',
                'offers.',
                'coupons.',
                'banners.',
                'collections.',
                'analytics.',
                'seo.',
                'blogs.',
              ].some((prefix) => p.code.startsWith(prefix)) &&
              !p.code.endsWith('.delete')
            )
            .map((p) => p.id),
        },
      ];

      for (const r of defaultRoles) {
        const role = await prisma.role.upsert({
          where: { code: r.code },
          create: {
            code: r.code,
            name: r.name,
            department: r.department,
            category: r.category,
            description: r.description,
            isSystem: r.isSystem,
            status: 'ACTIVE',
          },
          update: {
            name: r.name,
            department: r.department,
            category: r.category,
            description: r.description,
            isSystem: r.isSystem,
            status: 'ACTIVE',
          },
        });

        // Link permissions to system role
        for (const pId of r.perms) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: pId } },
            create: { roleId: role.id, permissionId: pId },
            update: {},
          });
        }
      }

      // Link any existing SUPER_ADMIN users to the SUPER_ADMIN role
      const superRole = await prisma.role.findFirst({ where: { code: 'SUPER_ADMIN' } });
      if (superRole) {
        const superUsers = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
        for (const su of superUsers) {
          await prisma.userRoleAssignment.upsert({
            where: { userId_roleId: { userId: su.id, roleId: superRole.id } },
            create: { userId: su.id, roleId: superRole.id },
            update: {},
          });
        }
      }

      console.log(`[RBAC] Seeded ${allPerms.length} permissions and ${defaultRoles.length} default roles.`);
    } catch (err: any) {
      console.warn('[RBAC] Note during permissions seeding:', err.message);
    }
  },

  /**
   * List all roles with permission count, assigned admin count, department, and category
   */
  async listRoles(filter?: { search?: string; category?: string; status?: string }) {
    const where: any = {};
    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filter?.category && filter.category !== 'ALL') {
      where.category = filter.category;
    }
    if (filter?.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }

    const roles = await prisma.role.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      department: r.department || 'General',
      category: r.category || (r.isSystem ? 'System' : 'Custom'),
      status: r.status || 'ACTIVE',
      isSystem: r.isSystem,
      permissionCount: r.permissions.length,
      assignedUsersCount: r._count.userRoles,
      permissions: r.permissions.map((rp) => rp.permission),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  /**
   * Get role details with full permissions and assigned users
   */
  async getRoleById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                adminId: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                isActive: true,
                department: true,
                designation: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw Object.assign(new Error('Role not found'), { status: 404 });
    }

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      department: role.department || 'General',
      category: role.category || (role.isSystem ? 'System' : 'Custom'),
      status: role.status || 'ACTIVE',
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission),
      permissionCodes: role.permissions.map((rp) => rp.permission.code),
      users: role.userRoles.map((ur) => ur.user),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  },

  /**
   * List all available permissions grouped by functional module and submodule
   */
  async listPermissions() {
    const perms = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { submodule: 'asc' }, { code: 'asc' }],
    });

    const grouped: Record<string, {
      module: string;
      submodules: Record<string, typeof perms>;
      permissions: typeof perms;
    }> = {};

    for (const p of perms) {
      if (!grouped[p.module]) {
        grouped[p.module] = {
          module: p.module,
          submodules: {},
          permissions: [],
        };
      }
      grouped[p.module].permissions.push(p);

      const subKey = p.submodule || 'General';
      if (!grouped[p.module].submodules[subKey]) {
        grouped[p.module].submodules[subKey] = [];
      }
      grouped[p.module].submodules[subKey].push(p);
    }

    return {
      total: perms.length,
      modules: Object.keys(grouped),
      grouped,
      all: perms,
    };
  },

  /**
   * Create a custom role with optional initial permissions and audit logging
   */
  async createRole(data: {
    name: string;
    code?: string;
    description?: string;
    department?: string;
    category?: string;
    permissionIds?: string[];
  }, actorId?: string) {
    const name = data.name.trim();
    if (!name) throw Object.assign(new Error('Role name is required'), { status: 400 });

    const rawCode = (data.code || name).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const code = rawCode.startsWith('ROLE_') ? rawCode : rawCode;

    if (code === 'SUPER_ADMIN') {
      throw Object.assign(new Error('Cannot create another role with SUPER_ADMIN code'), { status: 400 });
    }

    const existing = await prisma.role.findFirst({
      where: {
        OR: [{ code }, { name }],
      },
    });
    if (existing) {
      throw Object.assign(new Error('A role with this name or code already exists'), { status: 409 });
    }

    const role = await prisma.role.create({
      data: {
        name,
        code,
        description: data.description?.trim() || null,
        department: data.department?.trim() || 'General',
        category: data.category?.trim() || 'Custom',
        isSystem: false,
        status: 'ACTIVE',
      },
    });

    if (data.permissionIds && data.permissionIds.length > 0) {
      const validPerms = await prisma.permission.findMany({
        where: { id: { in: data.permissionIds } },
      });

      for (const p of validPerms) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: p.id,
          },
        });
      }
    }

    // Log in admin_activity_logs
    if (actorId) {
      await prisma.adminActivityLog.create({
        data: {
          actorId,
          targetType: 'ROLE',
          targetId: role.id,
          action: 'CREATE_ROLE',
          details: `Created custom role "${role.name}" (${role.code}) with ${data.permissionIds?.length || 0} permissions`,
          newState: {
            id: role.id,
            name: role.name,
            code: role.code,
            permissionsCount: data.permissionIds?.length || 0,
          },
        },
      }).catch(() => {});
    }

    return this.getRoleById(role.id);
  },

  /**
   * Duplicate an existing role into a new custom template
   */
  async duplicateRole(id: string, newName?: string, actorId?: string) {
    const sourceRole = await this.getRoleById(id);
    const targetName = (newName || `${sourceRole.name} (Copy)`).trim();
    const targetCode = `${sourceRole.code}_COPY_${Date.now().toString().slice(-4)}`;

    const newRole = await this.createRole(
      {
        name: targetName,
        code: targetCode,
        description: `Duplicated from ${sourceRole.name}. ${sourceRole.description || ''}`,
        department: sourceRole.department,
        category: 'Custom',
        permissionIds: sourceRole.permissions.map((p) => p.id),
      },
      actorId
    );

    return newRole;
  },

  /**
   * Update a role's metadata, permissions, or status
   */
  async updateRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      department?: string;
      category?: string;
      status?: string;
      permissionIds?: string[];
    },
    actorId?: string
  ) {
    const existing = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!existing) throw Object.assign(new Error('Role not found'), { status: 404 });

    const updateData: any = {};
    if (data.name && data.name.trim() !== existing.name) {
      if (existing.code === 'SUPER_ADMIN') {
        throw Object.assign(new Error('The Super Admin role name cannot be changed'), { status: 400 });
      }
      const duplicate = await prisma.role.findFirst({
        where: { name: data.name.trim(), id: { not: id } },
      });
      if (duplicate) throw Object.assign(new Error('Another role already has this name'), { status: 409 });
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }
    if (data.department !== undefined) {
      updateData.department = data.department.trim() || 'General';
    }
    if (data.category !== undefined) {
      updateData.category = data.category.trim() || 'Custom';
    }
    if (data.status !== undefined) {
      if (existing.code === 'SUPER_ADMIN' && data.status !== 'ACTIVE') {
        throw Object.assign(new Error('Super Admin role cannot be deactivated'), { status: 400 });
      }
      updateData.status = data.status;
    }

    await prisma.role.update({
      where: { id },
      data: updateData,
    });

    const oldPermissionIds = existing.permissions.map((p) => p.permissionId);
    let addedPermCount = 0;
    let removedPermCount = 0;

    // Update permissions if supplied
    if (Array.isArray(data.permissionIds)) {
      if (existing.code === 'SUPER_ADMIN' && data.permissionIds.length === 0) {
        throw Object.assign(new Error('Super Admin role must retain all permissions'), { status: 400 });
      }

      await prisma.rolePermission.deleteMany({ where: { roleId: id } });

      if (data.permissionIds.length > 0) {
        const validPerms = await prisma.permission.findMany({
          where: { id: { in: data.permissionIds } },
        });

        for (const p of validPerms) {
          await prisma.rolePermission.create({
            data: {
              roleId: id,
              permissionId: p.id,
            },
          });
        }
      }

      addedPermCount = data.permissionIds.filter((pid) => !oldPermissionIds.includes(pid)).length;
      removedPermCount = oldPermissionIds.filter((pid) => !data.permissionIds!.includes(pid)).length;
    }

    // Log in admin_activity_logs
    if (actorId) {
      await prisma.adminActivityLog.create({
        data: {
          actorId,
          targetType: 'ROLE',
          targetId: id,
          action: 'UPDATE_ROLE',
          details: `Updated role "${existing.name}". (+${addedPermCount}/-${removedPermCount} permissions)`,
          previousState: {
            name: existing.name,
            permissionsCount: oldPermissionIds.length,
            status: existing.status,
          },
          newState: {
            name: updateData.name || existing.name,
            permissionsCount: data.permissionIds ? data.permissionIds.length : oldPermissionIds.length,
            status: updateData.status || existing.status,
          },
        },
      }).catch(() => {});
    }

    return this.getRoleById(id);
  },

  /**
   * Delete a role with safety checks (must have 0 assigned users, cannot delete system roles)
   */
  async deleteRole(id: string, actorId?: string) {
    const existing = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!existing) throw Object.assign(new Error('Role not found'), { status: 404 });
    if (existing.code === 'SUPER_ADMIN') {
      throw Object.assign(new Error('The Master Super Admin role is protected and cannot be deleted'), { status: 403 });
    }
    if (existing.isSystem) {
      throw Object.assign(new Error(`System role "${existing.name}" is a default template and cannot be deleted. You can deactivate it instead.`), { status: 403 });
    }

    if (existing._count.userRoles > 0) {
      throw Object.assign(
        new Error(`Cannot delete role "${existing.name}" because it is currently assigned to ${existing._count.userRoles} admin user(s). Reassign them first.`),
        { status: 400 }
      );
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });

    if (actorId) {
      await prisma.adminActivityLog.create({
        data: {
          actorId,
          targetType: 'ROLE',
          targetId: id,
          action: 'DELETE_ROLE',
          details: `Deleted custom role "${existing.name}" (${existing.code})`,
          previousState: {
            id: existing.id,
            name: existing.name,
            code: existing.code,
          },
        },
      }).catch(() => {});
    }

    return { success: true, message: `Role "${existing.name}" deleted successfully` };
  },
};
