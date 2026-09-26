import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
      (typeof req.query?.token === 'string' ? req.query.token : null) ||
      (typeof (req as any).cookies?.accessToken === 'string' ? (req as any).cookies.accessToken : null) ||
      null;

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const payload = jwt.verify(token, env.jwt.secret) as {
      id: string;
      email: string;
      role: string;
    };

    req.user = payload;

    // Enforce system-wide rule: Only Super Admin and Admin can delete records
    const roleUpper = req.user.role?.toUpperCase();
    if (req.method === 'DELETE' && roleUpper !== 'SUPER_ADMIN' && roleUpper !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Only Super Admin and Admin can delete records' });
      return;
    }

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
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

export const requireRole = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
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
