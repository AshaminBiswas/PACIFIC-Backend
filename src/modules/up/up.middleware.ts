import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';

/**
 * UP Daily Expense Super Admin Guard
 * Strictly restricts ALL read, write, update, delete, export, and verification operations
 * to users with the 'SUPER_ADMIN' role.
 */
export const requireUPSuperAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const roleClean = (req.user.role || '').toUpperCase().replace(/[-_]/g, '');
  if (roleClean !== 'SUPERADMIN') {
    res.status(403).json({
      success: false,
      message: 'Access Denied: UP Daily Expense module is strictly restricted to Super Admin only.',
    });
    return;
  }

  next();
};
