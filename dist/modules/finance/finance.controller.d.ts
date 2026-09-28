import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const financeController: {
    listPayments(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void>;
    recordPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getReceivables(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPayables(req: Request, res: Response, next: NextFunction): Promise<void>;
    getLedgerSummary(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getCustomerLedger(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendCustomerLedgerEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    recordManualLedgerEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    logFollowupTouchpoint(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    triggerCadenceCheck(_req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=finance.controller.d.ts.map