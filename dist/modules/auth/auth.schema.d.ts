import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
    }, {
        email: string;
        password: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        password: string;
    };
}, {
    body: {
        email: string;
        password: string;
    };
}>;
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<["SUPER_ADMIN", "ADMIN", "EDITOR", "VIEWER"]>>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER" | undefined;
    }, {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER" | undefined;
    };
}, {
    body: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER" | undefined;
    };
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    body: z.ZodObject<{
        refreshToken: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        refreshToken?: string | undefined;
    }, {
        refreshToken?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        refreshToken?: string | undefined;
    };
}, {
    body: {
        refreshToken?: string | undefined;
    };
}>;
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RegisterInput = z.infer<typeof registerSchema>['body'];
//# sourceMappingURL=auth.schema.d.ts.map