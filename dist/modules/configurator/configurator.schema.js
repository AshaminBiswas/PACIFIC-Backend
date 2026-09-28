"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDesignStatusSchema = exports.submitDesignSchema = void 0;
const zod_1 = require("zod");
exports.submitDesignSchema = zod_1.z.object({
    body: zod_1.z.object({
        designName: zod_1.z.string().optional(),
        configuration: zod_1.z.record(zod_1.z.any()),
        estimatedPrice: zod_1.z.number().positive().optional(),
        leadId: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.updateDesignStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['DRAFT', 'SUBMITTED', 'QUOTED', 'CONVERTED']),
    }),
    params: zod_1.z.object({ id: zod_1.z.string() }),
});
//# sourceMappingURL=configurator.schema.js.map