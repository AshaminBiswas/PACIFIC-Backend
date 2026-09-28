import { Request, Response, NextFunction } from 'express';
export declare const notFoundHandler: (req: Request, res: Response) => void;
export declare const errorHandler: (err: Error & {
    status?: number;
    statusCode?: number;
}, req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=error.middleware.d.ts.map