import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const packingListsController: {
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    acknowledge(req: Request, res: Response, next: NextFunction): Promise<void>;
    getByToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    acknowledgeByToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPdf(req: Request, res: Response, next: NextFunction): Promise<void>;
    listPacketTypes(req: Request, res: Response, next: NextFunction): Promise<void>;
    addPacketType(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=packing-lists.controller.d.ts.map