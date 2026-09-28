import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
export declare const requirePermission: (permissionCode: string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireEntityScope: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rbac.middleware.d.ts.map