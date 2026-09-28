import { z } from 'zod';
export declare const submitDesignSchema: z.ZodObject<{
    body: z.ZodObject<{
        designName: z.ZodOptional<z.ZodString>;
        configuration: z.ZodRecord<z.ZodString, z.ZodAny>;
        estimatedPrice: z.ZodOptional<z.ZodNumber>;
        leadId: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        configuration: Record<string, any>;
        designName?: string | undefined;
        estimatedPrice?: number | undefined;
        leadId?: string | undefined;
        notes?: string | undefined;
    }, {
        configuration: Record<string, any>;
        designName?: string | undefined;
        estimatedPrice?: number | undefined;
        leadId?: string | undefined;
        notes?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        configuration: Record<string, any>;
        designName?: string | undefined;
        estimatedPrice?: number | undefined;
        leadId?: string | undefined;
        notes?: string | undefined;
    };
}, {
    body: {
        configuration: Record<string, any>;
        designName?: string | undefined;
        estimatedPrice?: number | undefined;
        leadId?: string | undefined;
        notes?: string | undefined;
    };
}>;
export declare const updateDesignStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodEnum<["DRAFT", "SUBMITTED", "QUOTED", "CONVERTED"]>;
    }, "strip", z.ZodTypeAny, {
        status: "DRAFT" | "SUBMITTED" | "QUOTED" | "CONVERTED";
    }, {
        status: "DRAFT" | "SUBMITTED" | "QUOTED" | "CONVERTED";
    }>;
    params: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        id: string;
    };
    body: {
        status: "DRAFT" | "SUBMITTED" | "QUOTED" | "CONVERTED";
    };
}, {
    params: {
        id: string;
    };
    body: {
        status: "DRAFT" | "SUBMITTED" | "QUOTED" | "CONVERTED";
    };
}>;
//# sourceMappingURL=configurator.schema.d.ts.map