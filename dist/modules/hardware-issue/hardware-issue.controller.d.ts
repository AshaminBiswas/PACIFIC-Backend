import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const hardwareIssueController: {
    listCatalog(req: Request, res: Response, next: NextFunction): Promise<void>;
    createCatalogItem(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateCatalogItem(req: Request, res: Response, next: NextFunction): Promise<void>;
    listIssues(req: Request, res: Response, next: NextFunction): Promise<void>;
    getIssueById(req: Request, res: Response, next: NextFunction): Promise<void>;
    createIssue(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateIssue(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteIssue(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    signStep(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPdf(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=hardware-issue.controller.d.ts.map