import { z } from 'zod';

// ─── Contacts Schema ──────────────────────────────────────────────────────────
export const CreateWacrmContactBodySchema = z.object({
  phone: z.string().trim().min(5, 'Valid phone number is required'),
  name: z.string().trim().min(1, 'Contact name is required').max(255),
  email: z.string().trim().email('Invalid email address').optional().nullable(),
  company: z.string().trim().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['lead', 'customer', 'archived']).default('lead'),
  tags: z.array(z.string()).optional().default([]),
});

export const CreateWacrmContactSchema = z.object({
  body: CreateWacrmContactBodySchema,
});

export type CreateWacrmContactInput = z.infer<typeof CreateWacrmContactBodySchema>;

export const UpdateWacrmContactBodySchema = z.object({
  phone: z.string().trim().min(5).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().optional().nullable(),
  company: z.string().trim().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['lead', 'customer', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateWacrmContactSchema = z.object({
  body: UpdateWacrmContactBodySchema,
  params: z.object({ id: z.string().uuid() }).optional(),
});

export type UpdateWacrmContactInput = z.infer<typeof UpdateWacrmContactBodySchema>;

// ─── Messages & Conversations Schema ──────────────────────────────────────────
export const SendWacrmMessageBodySchema = z.object({
  conversationId: z.string().uuid('Valid conversation ID required').optional(),
  contactId: z.string().uuid('Valid contact ID required').optional(),
  phone: z.string().optional(),
  contentType: z.enum(['text', 'image', 'document', 'audio', 'template', 'location']).default('text'),
  contentText: z.string().optional().nullable(),
  mediaUrl: z.string().optional().nullable(),
  templateName: z.string().optional().nullable(),
});

export const SendWacrmMessageSchema = z.object({
  body: SendWacrmMessageBodySchema,
});

export type SendWacrmMessageInput = z.infer<typeof SendWacrmMessageBodySchema>;

export const UpdateConversationStatusBodySchema = z.object({
  status: z.enum(['open', 'pending', 'closed']),
  assignedAgentName: z.string().optional().nullable(),
});

export const UpdateConversationStatusSchema = z.object({
  body: UpdateConversationStatusBodySchema,
  params: z.object({ id: z.string().uuid() }).optional(),
});

export type UpdateConversationStatusInput = z.infer<typeof UpdateConversationStatusBodySchema>;

// ─── Deals & Pipeline Schema ──────────────────────────────────────────────────
export const CreateWacrmDealBodySchema = z.object({
  pipelineId: z.string().uuid('Pipeline ID required'),
  stageId: z.string().uuid('Stage ID required'),
  contactId: z.string().uuid().optional().nullable(),
  conversationId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1, 'Deal title is required').max(255),
  value: z.coerce.number().min(0, 'Deal value cannot be negative').default(0),
  currency: z.string().default('INR'),
  notes: z.string().max(2000).optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  status: z.string().default('active'),
});

export const CreateWacrmDealSchema = z.object({
  body: CreateWacrmDealBodySchema,
});

export type CreateWacrmDealInput = z.infer<typeof CreateWacrmDealBodySchema>;

export const UpdateWacrmDealBodySchema = z.object({
  stageId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(255).optional(),
  value: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  notes: z.string().max(2000).optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  status: z.string().optional(),
});

export const UpdateWacrmDealSchema = z.object({
  body: UpdateWacrmDealBodySchema,
  params: z.object({ id: z.string().uuid() }).optional(),
});

export type UpdateWacrmDealInput = z.infer<typeof UpdateWacrmDealBodySchema>;

// ─── Broadcast Schema ─────────────────────────────────────────────────────────
export const CreateWacrmBroadcastBodySchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required'),
  templateName: z.string().min(1, 'Template selection is required'),
  templateLanguage: z.string().default('en'),
  templateVariables: z.record(z.any()).optional().nullable(),
  audienceFilter: z.record(z.any()).optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
});

export const CreateWacrmBroadcastSchema = z.object({
  body: CreateWacrmBroadcastBodySchema,
});

export type CreateWacrmBroadcastInput = z.infer<typeof CreateWacrmBroadcastBodySchema>;

// ─── Meta WhatsApp Cloud API Config Schema ─────────────────────────────────────
export const SaveWacrmConfigBodySchema = z.object({
  phoneNumberId: z.string().trim().min(1, 'Phone Number ID is required'),
  wabaId: z.string().trim().optional().nullable(),
  accessToken: z.string().trim().min(1, 'Access Token is required'),
  verifyToken: z.string().trim().default('pacific_wacrm_verify_secret'),
  webhookUrl: z.string().trim().optional().nullable(),
});

export const SaveWacrmConfigSchema = z.object({
  body: SaveWacrmConfigBodySchema,
});

export type SaveWacrmConfigInput = z.infer<typeof SaveWacrmConfigBodySchema>;
