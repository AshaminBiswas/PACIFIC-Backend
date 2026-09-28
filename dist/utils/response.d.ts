import { Response } from 'express';
export interface PaginationMeta {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}
export interface ApiError {
    code: string;
    message: string;
    details?: unknown[];
}
export interface CursorPaginationMeta {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
}
export declare const sendSuccess: (res: Response, data: unknown, message?: string, statusCode?: number) => Response;
export declare const sendPaginated: (res: Response, data: unknown[], pagination: PaginationMeta, statusCode?: number) => Response;
export declare const sendCursorPaginated: (res: Response, data: unknown[], nextCursor: string | null, limit: number, statusCode?: number) => Response;
export declare const sendError: (res: Response, error: ApiError, statusCode?: number) => Response;
export declare const sendMessage: (res: Response, message: string, statusCode?: number) => Response;
export declare const buildPagination: (page: number, limit: number, totalItems: number) => PaginationMeta;
export declare const getPaginationParams: (query: Record<string, unknown>) => {
    page: number;
    limit: number;
    skip: number;
};
export declare const getCursorParams: (query: Record<string, unknown>) => {
    cursor: string | null;
    limit: number;
};
export declare const sanitizePayload: <T = any>(obj: T) => T;
//# sourceMappingURL=response.d.ts.map