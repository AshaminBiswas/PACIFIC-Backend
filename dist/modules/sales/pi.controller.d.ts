import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const piController: {
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    issue(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    duplicate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    cancel(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getPdfHtml(req: Request, res: Response, next: NextFunction): Promise<void>;
    recordAdvancePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    convertToOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getFollowups(req: Request, res: Response, next: NextFunction): Promise<void>;
    addFollowup(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=pi.controller.d.ts.map