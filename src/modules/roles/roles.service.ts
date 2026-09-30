import { prisma } from '../../config/database';

export interface PermissionSeed {
  code: string;
  module: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionSeed[] = [
  // ─── Sales & CRM ────────────────────────────────────────────────────────────
  { code: 'quotations:view', module: 'Sales Quotations', description: 'View formal sales quotations and PDF letters' },
  { code: 'quotations:create', module: 'Sales Quotations', description: 'Draft and create sales quotations' },
  { code: 'quotations:edit', module: 'Sales Quotations', description: 'Modify and revise existing sales quotations' },
  { code: 'quotations:delete', module: 'Sales Quotations', description: 'Permanently delete sales quotations' },
  
  { code: 'orders:view', module: 'Sales Orders', description: 'View central sales orders and timeline' },
  { code: 'orders:create', module: 'Sales Orders', description: 'Create direct sales orders or convert from quotation' },
  { code: 'orders:edit', module: 'Sales Orders', description: 'Edit sales order details and status transitions' },
  { code: 'orders:delete', module: 'Sales Orders', description: 'Permanently delete sales orders' },

  { code: 'pi:view', module: 'Proforma Invoices', description: 'View proforma invoices and tax breakdowns' },
  { code: 'pi:create', module: 'Proforma Invoices', description: 'Create and duplicate proforma invoices' },
  { code: 'pi:edit', module: 'Proforma Invoices', description: 'Edit proforma invoice terms, transport, and items' },
  { code: 'pi:delete', module: 'Proforma Invoices', description: 'Permanently delete proforma invoices' },

  { code: 'customers:view', module: 'B2B Customers', description: 'View customer 360 profiles and transaction history' },
  { code: 'customers:create', module: 'B2B Customers', description: 'Add new B2B client and billing accounts' },
  { code: 'customers:edit', module: 'B2B Customers', description: 'Update customer profiles, credit limits, and addresses' },
  { code: 'customers:delete', module: 'B2B Customers', description: 'Delete or merge customer accounts' },

  // ─── Logistics & Warehouse ──────────────────────────────────────────────────
  { code: 'packing_lists:view', module: 'Packing Lists', description: 'View dispatch packing lists and consignment data' },
  { code: 'packing_lists:create', module: 'Packing Lists', description: 'Generate packing lists with BOM explosion' },
  { code: 'packing_lists:edit', module: 'Packing Lists', description: 'Update package items, packet counts, and signatories' },
  { code: 'packing_lists:delete', module: 'Packing Lists', description: 'Permanently delete packing lists' },

  { code: 'hardware_issues:view', module: 'Hardware Store', description: 'View hardware issue checklists' },
  { code: 'hardware_issues:create', module: 'Hardware Store', description: 'Issue hardware pieces from the store catalog' },
  { code: 'hardware_issues:edit', module: 'Hardware Store', description: 'Edit hardware store issues and piece counts' },
  { code: 'hardware_issues:sign', module: 'Hardware Store', description: 'Sign sequential verification steps (Packed/Checked/Incharge)' },
  { code: 'hardware_issues:delete', module: 'Hardware Store', description: 'Permanently delete hardware issues' },

  { code: 'inventory:view', module: 'Products Master', description: 'View cubicle catalog, finishes, and hardware materials' },
  { code: 'inventory:manage', module: 'Products Master', description: 'Create and update products, HSN/SAC codes, and prices' },

  // ─── Global Trade & Export ──────────────────────────────────────────────────
  { code: 'export:view', module: 'Export & Trade', description: 'View export quotations, orders, and vessel tracking' },
  { code: 'export:create', module: 'Export & Trade', description: 'Create export quotations and international customer profiles' },
  { code: 'export:edit', module: 'Export & Trade', description: 'Edit export shipping bills, containers, and Incoterms' },
  { code: 'export:delete', module: 'Export & Trade', description: 'Delete export quotations, shipments, and orders' },
  { code: 'export:realization', module: 'Export & Trade', description: 'Record IRM inward remittances and DGFT eBRC realization' },

  // ─── Procurement & Suppliers ────────────────────────────────────────────────
  { code: 'procurement:view', module: 'Purchase Orders', description: 'View vendor purchase orders and approvals' },
  { code: 'procurement:create', module: 'Purchase Orders', description: 'Create purchase orders for raw materials and hardware' },
  { code: 'procurement:edit', module: 'Purchase Orders', description: 'Edit purchase order terms and items' },
  { code: 'procurement:approve', module: 'Purchase Orders', description: 'Authorize and approve vendor purchase orders' },
  { code: 'procurement:delete', module: 'Purchase Orders', description: 'Permanently delete purchase orders' },

  { code: 'vendors:view', module: 'Suppliers Master', description: 'View supplier directory and credit limits' },
  { code: 'vendors:manage', module: 'Suppliers Master', description: 'Add, update, or deactivate suppliers' },

  // ─── Finance & Payments ─────────────────────────────────────────────────────
  { code: 'finance:view', module: 'Finance & Ledger', description: 'View payments ledger and invoice balance aging' },
  { code: 'finance:record', module: 'Finance & Ledger', description: 'Record customer and vendor payments' },
  { code: 'finance:allocate', module: 'Finance & Ledger', description: 'Allocate payment receipts across outstanding PIs' },

  // ─── CMS & Marketing ────────────────────────────────────────────────────────
  { code: 'cms:view', module: 'Website CMS', description: 'View website content, blogs, solutions, and catalogs' },
  { code: 'cms:manage', module: 'Website CMS', description: 'Create, publish, and edit website pages and media' },
  { code: 'leads:view', module: 'Leads & Enquiries', description: 'View visitor leads and 3D configurator designs' },
  { code: 'leads:manage', module: 'Leads & Enquiries', description: 'Assign leads, update status, and convert to quotes' },

  // ─── Administration & Security ──────────────────────────────────────────────
  { code: 'users:view', module: 'Admin Users', description: 'View administrator and staff directory' },
  { code: 'users:manage', module: 'Admin Users', description: 'Create admins, update roles, and reset passwords' },
  { code: 'roles:view', module: 'Roles & Security', description: 'View custom and system roles and permission sets' },
  { code: 'roles:manage', module: 'Roles & Security', description: 'Create custom roles and configure permission matrices' },
  { code: 'settings:manage', module: 'Company Settings', description: 'Configure entity GST, banks, and authorized signatories' },
  { code: 'audit:view', module: 'Audit Logs', description: 'View immutable security and compliance audit logs' },
];

export const rolesService = {
  /**
   * Auto-seed baseline permissions and standard system roles
   */
  async seedDefaultRolesAndPermissions() {
    try {
      // 1. Seed Permissions
      for (const perm of SYSTEM_PERMISSIONS) {
        await prisma.permission.upsert({
          where: { code: perm.code },
          create: {
            code: perm.code,
            module: perm.module,
            description: perm.description,
          },
          update: {
            module: perm.module,
            description: perm.description,
          },
        });
      }

      const allPerms = await prisma.permission.findMany();
      const permMap = new Map<string, string>(allPerms.map((p) => [p.code, p.id]));

      // 2. Define baseline system roles
      const defaultRoles = [
        {
          code: 'SUPER_ADMIN',
          name: 'Super Administrator',
          description: 'Full master platform authority, system configuration, and exclusive deletion privileges across all modules',
          isSystem: true,
          perms: allPerms.map((p) => p.id),
        },
        {
          code: 'ADMIN',
          name: 'Administrator',
          description: 'Complete operational and management access across all ERP, CRM, and CMS modules without deletion rights',
          isSystem: true,
          perms: allPerms
            .filter((p) => !p.code.endsWith(':delete'))
            .map((p) => p.id),
        },
        {
          code: 'SALES_MANAGER',
          name: 'Sales Manager',
          description: 'Full management of Sales Quotations, Sales Orders, Proforma Invoices, and B2B Customers',
          isSystem: true,
          perms: allPerms
            .filter((p) => ['quotations:', 'orders:', 'pi:', 'customers:'].some((prefix) => p.code.startsWith(prefix)))
            .filter((p) => !p.code.endsWith(':delete'))
            .map((p) => p.id),
        },
        {
          code: 'WAREHOUSE_MANAGER',
          name: 'Warehouse & Logistics Manager',
          description: 'Dispatches, packing lists, BOM auto-explosion, store hardware checklist sign-off, and inventory',
          isSystem: true,
          perms: allPerms
            .filter((p) => ['packing_lists:', 'hardware_issues:', 'inventory:'].some((prefix) => p.code.startsWith(prefix)))
            .filter((p) => !p.code.endsWith(':delete'))
            .map((p) => p.id),
        },
        {
          code: 'FINANCE_OFFICER',
          name: 'Finance & Accounts Officer',
          description: 'Payment recording, invoice reconciliation, aging ledgers, and bank realization',
          isSystem: true,
          perms: allPerms
            .filter((p) => ['finance:', 'pi:view', 'export:realization'].some((prefix) => p.code.startsWith(prefix)))
            .map((p) => p.id),
        },
        {
          code: 'PROCUREMENT_MANAGER',
          name: 'Procurement Manager',
          description: 'Vendor supplier master, purchase order creation, and supplier authorization',
          isSystem: true,
          perms: allPerms
            .filter((p) => ['procurement:', 'vendors:'].some((prefix) => p.code.startsWith(prefix)))
            .filter((p) => !p.code.endsWith(':delete'))
            .map((p) => p.id),
        },
        {
          code: 'EXPORT_MANAGER',
          name: 'Export & Trade Manager',
          description: 'International buyer CRM, export quotations, ocean logistics, and container seal tracking',
          isSystem: true,
          perms: allPerms
            .filter((p) => p.code.startsWith('export:'))
            .filter((p) => !p.code.endsWith(':delete'))
            .map((p) => p.id),
        },
        {
          code: 'EDITOR',
          name: 'Content Editor',
          description: 'CMS management, commercial project portfolios, blogs, catalogs, and media gallery',
          isSystem: true,
          perms: allPerms
            .filter((p) => ['cms:', 'leads:view'].some((prefix) => p.code.startsWith(prefix)))
            .map((p) => p.id),
        },
        {
          code: 'VIEWER',
          name: 'Read-Only Observer',
          description: 'Read-only visibility across ERP, CRM, and website activities',
          isSystem: true,
          perms: allPerms
            .filter((p) => p.code.endsWith(':view'))
            .map((p) => p.id),
        },
      ];

      for (const r of defaultRoles) {
        const role = await prisma.role.upsert({
          where: { code: r.code },
          create: {
            code: r.code,
            name: r.name,
            description: r.description,
            isSystem: r.isSystem,
          },
          update: {
            name: r.name,
            description: r.description,
            isSystem: r.isSystem,
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

      console.log(`[RBAC] Seeded ${allPerms.length} permissions and ${defaultRoles.length} baseline roles.`);
    } catch (err: any) {
      console.warn('[RBAC] Note during permissions seeding:', err.message);
    }
  },

  /**
   * List all roles with permission count and assigned user count
   */
  async listRoles() {
    const roles = await prisma.role.findMany({
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
      isSystem: r.isSystem,
      permissionCount: r.permissions.length,
      assignedUsersCount: r._count.userRoles,
      permissions: r.permissions.map((rp) => rp.permission),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  /**
   * Get role details with full permissions
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
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
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
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission),
      users: role.userRoles.map((ur) => ur.user),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  },

  /**
   * List all available permissions grouped by functional module
   */
  async listPermissions() {
    const perms = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    const grouped: Record<string, typeof perms> = {};
    for (const p of perms) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    }

    return {
      total: perms.length,
      modules: Object.keys(grouped),
      grouped,
      all: perms,
    };
  },

  /**
   * Create a custom role
   */
  async createRole(data: {
    name: string;
    code?: string;
    description?: string;
    permissionIds?: string[];
  }) {
    const name = data.name.trim();
    if (!name) throw Object.assign(new Error('Role name is required'), { status: 400 });

    const rawCode = (data.code || name).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const code = rawCode.startsWith('ROLE_') ? rawCode : rawCode;

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
        isSystem: false,
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

    return this.getRoleById(role.id);
  },

  /**
   * Update a custom or system role
   */
  async updateRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissionIds?: string[];
    }
  ) {
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) throw Object.assign(new Error('Role not found'), { status: 404 });

    const updateData: any = {};
    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await prisma.role.findFirst({
        where: { name: data.name.trim(), id: { not: id } },
      });
      if (duplicate) throw Object.assign(new Error('Another role already has this name'), { status: 409 });
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }

    await prisma.role.update({
      where: { id },
      data: updateData,
    });

    // Update permissions if supplied
    if (Array.isArray(data.permissionIds)) {
      // Cannot remove all permissions from SUPER_ADMIN
      if (existing.code === 'SUPER_ADMIN' && data.permissionIds.length === 0) {
        throw Object.assign(new Error('SUPER_ADMIN role must retain all permissions'), { status: 400 });
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
    }

    return this.getRoleById(id);
  },

  /**
   * Delete a role (system or custom), protecting only SUPER_ADMIN
   */
  async deleteRole(id: string) {
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
      throw Object.assign(new Error('The Master Super Administrator role is protected and cannot be deleted'), { status: 403 });
    }

    // Cascade unassign any users from this role before deleting
    await prisma.userRoleAssignment.deleteMany({ where: { roleId: id } });
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });

    return { success: true, message: `Role "${existing.name}" deleted successfully` };
  },
};
