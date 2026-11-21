import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../config/database';

interface CachedUserPermissions {
  permissions: Set<string>;
  isSuperAdmin: boolean;
  expiresAt: number;
}

const permissionsCache = new Map<string, CachedUserPermissions>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Invalidate cached permissions for a single user, or all users
 */
export function clearUserPermissionCache(userId?: string) {
  if (userId) {
    permissionsCache.delete(userId);
  } else {
    permissionsCache.clear();
  }
}

/**
 * Expands a set of permissions by mapping dot-notation codes (e.g. quotations.read, customers.read)
 * and legacy colon-notation codes (e.g. quotation:view, crm:view) bidirectionally, ensuring
 * seamless interoperability across all legacy route guards and modern RBAC checks.
 */
export function expandPermissionAliases(source: Set<string> | string[]): Set<string> {
  const result = new Set<string>(source);

  if (result.has('*')) return result;

  // Specific high-frequency operational aliases
  const aliasMap: Record<string, string[]> = {
    // Quotations
    'quotations.read': ['quotation:view', 'quotations:view', 'quotations:read', 'quotation:list'],
    'quotations.create': ['quotation:create', 'quotations:create'],
    'quotations.update': ['quotation:edit', 'quotations:edit', 'quotation:update', 'quotations:update'],
    'quotations.delete': ['quotation:delete', 'quotations:delete'],
    'quotations.approve': ['quotation:approve', 'quotation:issue'],
    'quotations.export': ['quotation:send', 'quotation:download', 'quotations:export'],

    // Proforma Invoices (PI)
    'pi.read': ['pi:view', 'pi:read', 'pi.view'],
    'pi.create': ['pi:create'],
    'pi.update': ['pi:edit', 'pi:update'],
    'pi.delete': ['pi:cancel', 'pi:delete'],
    'pi.issue': ['pi:issue'],
    'pi.export': ['pi:download', 'pi:duplicate', 'pi:export'],

    // Tax Invoices & Bills
    'invoices.read': ['invoice:view', 'invoices:view', 'invoices:read', 'invoice:read'],
    'invoices.create': ['invoice:create', 'invoices:create'],
    'invoices.update': ['invoice:edit', 'invoices:edit', 'invoices:update', 'invoice:update'],
    'invoices.delete': ['invoice:delete', 'invoices:delete'],
    'invoices.record_payment': ['invoice:payment', 'payment:create', 'invoices.payment'],
    'invoices.export': ['invoice:download', 'invoice:export', 'invoices:export'],

    // B2B Customers & CRM
    'customers.read': ['crm:view', 'customers:read', 'customers:view', 'crm:read', 'customer:view'],
    'customers.create': ['crm:create', 'customers:create'],
    'customers.update': ['crm:edit', 'customers:edit', 'customers:update', 'crm:update'],
    'customers.delete': ['crm:delete', 'customers:delete'],
    'customers.view_orders': ['crm:view', 'order:view'],
    'customers.view_payments': ['crm:view', 'payment:view'],
    'customers.export': ['crm:export', 'customers:export'],

    // Inventory & Warehouse
    'inventory.read': ['inventory:view', 'warehouse:view', 'inventory:read'],
    'inventory.add_stock': ['inventory:create', 'inventory:edit', 'warehouse:create'],
    'inventory.update_stock': ['inventory:edit', 'warehouse:create', 'warehouse:edit'],
    'inventory.view_history': ['inventory:view', 'warehouse:view'],
    'inventory.export': ['inventory:export', 'warehouse:export'],

    // Hardware Issues & Store Catalog
    'hardware_issues.read': ['warehouse:view', 'hardware_issues:view'],
    'hardware_issues.create': ['warehouse:create', 'inventory:edit', 'hardware_issues:create'],
    'hardware_issues.update': ['warehouse:create', 'inventory:edit', 'warehouse:edit', 'hardware_issues:update'],
    'hardware_issues.sign': ['warehouse:sign', 'hardware_issues:sign'],
    'hardware_issues.delete': ['warehouse:create', 'hardware_issues:delete'],

    // Expenses
    'expenses.read': ['expense:view', 'expenses:read', 'expenses:view'],
    'expenses.create': ['expense:create', 'expenses:create'],
    'expenses.update': ['expense:edit', 'expenses:edit', 'expenses:update'],
    'expenses.delete': ['expense:delete', 'expenses:delete'],
    'expenses.approve': ['expense:approve', 'expenses:approve'],
    'expenses.categories': ['expense:categories', 'expenses:categories'],
    'expenses.export': ['expense:export', 'expenses:export'],

    // Orders
    'orders.read': ['order:view', 'orders:view', 'orders:read'],
    'orders.create': ['order:create', 'orders:create'],
    'orders.update': ['order:edit', 'orders:edit', 'orders:update'],
    'orders.delete': ['order:delete', 'orders:delete'],
    'orders.approve': ['order:approve'],
    'orders.cancel': ['order:cancel'],

    // Procurement
    'procurement.read': ['po:view', 'vendor:view', 'po:read', 'vendor:read'],
    'procurement.create': ['po:create', 'vendor:create'],
    'procurement.update': ['po:edit', 'vendor:edit'],
    'procurement.delete': ['po:cancel', 'vendor:delete'],
    'procurement.approve': ['po:approve'],

    // Finance & Payments
    'finance.read': ['payment:view', 'finance:view'],
    'finance.create': ['payment:create'],

    // Follow-ups & Touchpoints
    'followups.read': ['followup:view'],
    'followups.create': ['followup:create'],
    'followups.update': ['followup:edit'],

    // Logistics & Packing Lists
    'packing_lists.read': ['logistics:view', 'packing_lists:view'],
    'packing_lists.create': ['logistics:create', 'packing_lists:create'],
    'packing_lists.update': ['logistics:edit', 'packing_lists:edit'],

    // Dashboard
    'dashboard.view': ['dashboard:view'],
  };

  for (const [code, aliases] of Object.entries(aliasMap)) {
    if (result.has(code)) {
      for (const a of aliases) result.add(a);
    }
    // Also reverse-map if source had legacy alias
    for (const a of aliases) {
      if (result.has(a)) {
        result.add(code);
      }
    }
  }

  // Generic syntax mappings (e.g. module.action <-> module:action)
  for (const perm of Array.from(result)) {
    if (perm.includes('.')) {
      const [mod, act] = perm.split('.');
      if (act === 'read') result.add(`${mod}:view`);
      if (act === 'update') result.add(`${mod}:edit`);
      if (act === 'create') result.add(`${mod}:create`);
      if (act === 'delete') result.add(`${mod}:delete`);
    } else if (perm.includes(':')) {
      const [mod, act] = perm.split(':');
      if (act === 'view') result.add(`${mod}.read`);
      if (act === 'edit') result.add(`${mod}.update`);
      if (act === 'create') result.add(`${mod}.create`);
      if (act === 'delete') result.add(`${mod}.delete`);
    }
  }

  return result;
}

/**
 * Fetch and cache effective permissions and Super Admin status for a user
 */
export async function getEffectiveUserPermissions(userId: string): Promise<{ permissions: Set<string>; isSuperAdmin: boolean }> {
  const cached = permissionsCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { permissions: cached.permissions, isSuperAdmin: cached.isSuperAdmin };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      status: true,
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

  if (!user || !user.isActive || user.status !== 'ACTIVE') {
    const empty = { permissions: new Set<string>(), isSuperAdmin: false };
    permissionsCache.set(userId, { ...empty, expiresAt: Date.now() + CACHE_TTL_MS });
    return empty;
  }

  const isSuperAdmin =
    user.role === 'SUPER_ADMIN' ||
    user.userRoles.some((ur) => ur.role.code === 'SUPER_ADMIN' || ur.role.name === 'Super Admin');

  const rawPermissions = new Set<string>();

  for (const ur of user.userRoles) {
    if (ur.role.status && ur.role.status !== 'ACTIVE') continue;
    for (const rp of ur.role.permissions) {
      if (rp.permission?.code) {
        rawPermissions.add(rp.permission.code);
      }
    }
  }

  // Expand with legacy and interoperability aliases
  const permissions = expandPermissionAliases(rawPermissions);

  const result = { permissions, isSuperAdmin };
  permissionsCache.set(userId, { ...result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

/**
 * Deny-by-default permission check middleware.
 * Only Super Admin has automatic unrestricted bypass.
 * Regular admins and staff are strictly checked against their granted permissions.
 */
export const requirePermission = (permissionCode: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // Fast check for primary SUPER_ADMIN role
      if (req.user.role === 'SUPER_ADMIN') {
        next();
        return;
      }

      const { permissions, isSuperAdmin } = await getEffectiveUserPermissions(req.user.id);

      if (isSuperAdmin || permissions.has('*') || permissions.has(permissionCode)) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        message: `Forbidden: Missing required permission '${permissionCode}'`,
        requiredPermission: permissionCode,
      });
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Deny-by-default check for requiring ANY of the listed permissions
 */
export const requireAnyPermission = (permissionCodes: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      if (req.user.role === 'SUPER_ADMIN') {
        next();
        return;
      }

      const { permissions, isSuperAdmin } = await getEffectiveUserPermissions(req.user.id);

      if (isSuperAdmin || permissions.has('*')) {
        next();
        return;
      }

      const hasAny = permissionCodes.some((code) => permissions.has(code));
      if (hasAny) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        message: `Forbidden: Missing one of required permissions: [${permissionCodes.join(', ')}]`,
        requiredPermissions: permissionCodes,
      });
    } catch (err) {
      next(err);
    }
  };
};

export const requireEntityScope = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const roleUpper = req.user.role?.toUpperCase();
    if (roleUpper === 'SUPER_ADMIN') {
      next();
      return;
    }

    const companyId = (req.params.companyId || req.body.companyProfileId || req.query.companyProfileId) as string;
    if (!companyId) {
      next();
      return;
    }

    const hasAccess = await prisma.userEntityAccess.findUnique({
      where: {
        userId_companyProfileId: {
          userId: req.user.id,
          companyProfileId: companyId,
        },
      },
    });

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this company entity',
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
};
