import { z } from 'zod';

export const submitDesignSchema = z.object({
  body: z.object({
    designName: z.string().optional(),
    configuration: z.record(z.any()),
    estimatedPrice: z.number().positive().optional(),
    leadId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateDesignStatusSchema = z.object({
  body: z.object({
    status: z.enum(['DRAFT', 'SUBMITTED', 'QUOTED', 'CONVERTED']),
  }),
  params: z.object({ id: z.string() }),
});
