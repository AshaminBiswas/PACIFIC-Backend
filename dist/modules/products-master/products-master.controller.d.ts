import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const productsMasterController: {
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getMaterials(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getFinishes(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getUnits(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getSubcategories(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=products-master.controller.d.ts.map