import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const vendorsController: {
    listVendors(req: Request, res: Response, next: NextFunction): Promise<void>;
    getVendorById(req: Request, res: Response, next: NextFunction): Promise<void>;
    createVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=vendors.controller.d.ts.map