import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const crmController: {
    listCustomers(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCustomer360(req: Request, res: Response, next: NextFunction): Promise<void>;
    createCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    addContact(req: Request, res: Response, next: NextFunction): Promise<void>;
    addAddress(req: Request, res: Response, next: NextFunction): Promise<void>;
    checkDuplicates(req: Request, res: Response, next: NextFunction): Promise<void>;
    mergeCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=crm.controller.d.ts.map