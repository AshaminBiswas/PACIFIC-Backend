import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const companiesController: {
    list(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    addAddress(req: Request, res: Response, next: NextFunction): Promise<void>;
    addBankAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
    addSignatory(req: Request, res: Response, next: NextFunction): Promise<void>;
    addTerm(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=companies.controller.d.ts.map