import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const authController: {
    login(req: Request, res: Response, next: NextFunction): Promise<void>;
    register(req: Request, res: Response, next: NextFunction): Promise<void>;
    firstTimeChangePassword(req: Request, res: Response, next: NextFunction): Promise<void>;
    firstTimeVerify2fa(req: Request, res: Response, next: NextFunction): Promise<void>;
    verify2fa(req: Request, res: Response, next: NextFunction): Promise<void>;
    setup2fa(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    enable2fa(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    disable2fa(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    regenerateRecoveryCodes(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    listSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    revokeSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    revokeOtherSessions(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    refresh(req: Request, res: Response, next: NextFunction): Promise<void>;
    logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    createSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void>;
    changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=auth.controller.d.ts.map