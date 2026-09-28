import { Request, Response, NextFunction } from 'express';
export declare const rolesController: {
    list(_req: Request, res: Response, next: NextFunction): Promise<void>;
    listPermissions(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=roles.controller.d.ts.map