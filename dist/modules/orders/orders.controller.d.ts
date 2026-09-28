import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const ordersController: {
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    createDirect(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    approve(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    cancel(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getTimeline(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    globalSearch(req: Request, res: Response, next: NextFunction): Promise<void>;
    getFollowups(req: Request, res: Response, next: NextFunction): Promise<void>;
    createFollowup(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    sendFollowupEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getPdf(req: Request, res: Response, next: NextFunction): Promise<void>;
    createDispatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getDispatchPdf(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteDispatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=orders.controller.d.ts.map