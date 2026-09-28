import { Request } from 'express';
import { UserRole } from '@prisma/client';
export interface AuthenticatedUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
}
export interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown[];
    };
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
//# sourceMappingURL=common.types.d.ts.map