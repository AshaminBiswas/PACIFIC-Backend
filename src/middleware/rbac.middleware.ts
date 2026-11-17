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

  const permissions = new Set<string>();

  for (const ur of user.userRoles) {
    if (ur.role.status && ur.role.status !== 'ACTIVE') continue;
    for (const rp of ur.role.permissions) {
      if (rp.permission?.code) {
        permissions.add(rp.permission.code);
      }
    }
  }

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
