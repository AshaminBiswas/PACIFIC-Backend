import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const followupsController: {
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    getByCustomer(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    addLog(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    logCustomerTouchpoint(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    runCadence(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getRecoveryDashboard(_req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=followups.controller.d.ts.map