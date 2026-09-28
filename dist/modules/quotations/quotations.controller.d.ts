import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const quotationsController: {
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    revise(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    send(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    sendEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getFollowups(req: Request, res: Response, next: NextFunction): Promise<void>;
    createFollowup(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    sendFollowupEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    convertToPI(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    convertToOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getPdf(req: Request, res: Response, next: NextFunction): Promise<void>;
    listTemplates(req: Request, res: Response, next: NextFunction): Promise<void>;
    saveTemplate(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=quotations.controller.d.ts.map