import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
export declare const qrController: {
    /**
     * Admin Scan Handler — called when admin scans any QR code via camera or manual entry.
     */
    scan(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Public Document Verification — safe, non-guessable, never exposes internal database IDs.
     */
    verifyPublicToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Generate QR code for a given entity
     */
    generate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Scan history
     */
    getScanHistory(_req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=qr.controller.d.ts.map