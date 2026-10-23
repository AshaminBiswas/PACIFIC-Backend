// =============================================================================
// Pacific Mail — Zod Validation Schemas
// All schemas validate req.body before the controller processes them.
// =============================================================================

import { z } from 'zod';

// ─── Address / local-part format ──────────────────────────────────────────────
const localPartRegex = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/;

const localPartSchema = z
  .string()
  .min(3)
  .max(64)
  .toLowerCase()
  .regex(localPartRegex, 'local_part must be lowercase alphanumeric with dots, hyphens, or underscores');

// ─── Recipient address string: "Display Name <local@pacific.internal>" or "local@pacific.internal"
const recipientAddressSchema = z
  .string()
  .trim()
  .min(3)
  .max(320);

// ─── 1. Provision / update mail address ───────────────────────────────────────
export const ProvisionAddressBodySchema = z.object({
  localPart: localPartSchema,
  displayName: z.string().trim().max(100).optional(),
});

export const ProvisionAddressSchema = z.object({
  body: ProvisionAddressBodySchema,
});

export type ProvisionAddressInput = z.infer<typeof ProvisionAddressBodySchema>;

// ─── 2. Send / create draft message ──────────────────────────────────────────
export const SendMailBodySchema = z
  .object({
    draftId:       z.string().uuid().optional(),
    threadId:      z.string().uuid().optional(),
    parentId:      z.string().uuid().optional(),
    inReplyTo:     z.string().optional(),
    references:    z.array(z.string()).optional(),
    subject:       z.string().trim().max(998).default('(No Subject)'),
    to:            z.array(recipientAddressSchema).max(50, 'Maximum 50 recipients allowed').optional().default([]),
    cc:            z.array(recipientAddressSchema).max(50, 'Maximum 50 CC recipients allowed').optional().default([]),
    bcc:           z.array(recipientAddressSchema).max(50, 'Maximum 50 BCC recipients allowed').optional().default([]),
    bodyText:      z.string().max(5_000_000, 'Body text exceeds maximum size of 5MB').optional(),
    bodyHtml:      z.string().max(5_000_000, 'Body HTML exceeds maximum size of 5MB').optional(),
    attachmentIds: z.array(z.string().uuid()).optional().default([]),
    isDraft:       z.boolean().optional().default(false),
    idempotencyKey: z.string().trim().max(128).optional(),
  })
  .refine(
    (d) => {
      if (d.draftId) return true;
      if (d.isDraft) return true;
      if (!d.to || d.to.length === 0) return false;
      return d.bodyText !== undefined || d.bodyHtml !== undefined;
    },
    { message: 'For sending, at least one "to" recipient and a message body (text or HTML) are required, or provide a draftId' }
  );

export const SendMailSchema = z.object({
  body: SendMailBodySchema,
});

export type SendMailInput = z.infer<typeof SendMailBodySchema>;

// ─── 2b. Create Draft explicitly ──────────────────────────────────────────────
export const CreateDraftBodySchema = z.object({
  threadId:      z.string().uuid().optional(),
  parentId:      z.string().uuid().optional(),
  inReplyTo:     z.string().optional(),
  references:    z.array(z.string()).optional(),
  subject:       z.string().trim().max(998).optional().default(''),
  to:            z.array(recipientAddressSchema).max(50).optional().default([]),
  cc:            z.array(recipientAddressSchema).max(50).optional().default([]),
  bcc:           z.array(recipientAddressSchema).max(50).optional().default([]),
  bodyText:      z.string().max(5_000_000).optional(),
  bodyHtml:      z.string().max(5_000_000).optional(),
  attachmentIds: z.array(z.string().uuid()).optional().default([]),
});

export const CreateDraftSchema = z.object({
  body: CreateDraftBodySchema,
});

export type CreateDraftInput = z.infer<typeof CreateDraftBodySchema>;

// ─── 2c. Reply to message ─────────────────────────────────────────────────────
export const ReplyMessageBodySchema = z.object({
  to:            z.array(recipientAddressSchema).max(50).optional(),
  cc:            z.array(recipientAddressSchema).max(50).optional(),
  bcc:           z.array(recipientAddressSchema).max(50).optional(),
  bodyText:      z.string().max(5_000_000).optional(),
  bodyHtml:      z.string().max(5_000_000).optional(),
  replyAll:      z.boolean().optional().default(false),
  attachmentIds: z.array(z.string().uuid()).optional().default([]),
  idempotencyKey: z.string().trim().max(128).optional(),
}).refine(
  (d) => d.bodyText !== undefined || d.bodyHtml !== undefined,
  { message: 'Reply message body (text or HTML) is required' }
);

export const ReplyMessageSchema = z.object({
  body:   ReplyMessageBodySchema,
  params: z.object({ id: z.string().uuid() }),
});

export type ReplyMessageInput = z.infer<typeof ReplyMessageBodySchema>;
export type ReplyMailInput = ReplyMessageInput;

// ─── 2d. Forward message ──────────────────────────────────────────────────────
export const ForwardMessageBodySchema = z.object({
  to:            z.array(recipientAddressSchema).min(1, 'At least one recipient is required').max(50),
  cc:            z.array(recipientAddressSchema).max(50).optional().default([]),
  bcc:           z.array(recipientAddressSchema).max(50).optional().default([]),
  bodyText:      z.string().max(5_000_000).optional(),
  bodyHtml:      z.string().max(5_000_000).optional(),
  forwardAttachments: z.boolean().optional().default(true),
  idempotencyKey: z.string().trim().max(128).optional(),
});

export const ForwardMessageSchema = z.object({
  body:   ForwardMessageBodySchema,
  params: z.object({ id: z.string().uuid() }),
});

export type ForwardMessageInput = z.infer<typeof ForwardMessageBodySchema>;
export type ForwardMailInput = ForwardMessageInput;

// ─── 3. Update a draft ───────────────────────────────────────────────────────
export const UpdateDraftBodySchema = z.object({
  subject:       z.string().trim().max(998).optional(),
  to:            z.array(recipientAddressSchema).optional(),
  cc:            z.array(recipientAddressSchema).optional(),
  bcc:           z.array(recipientAddressSchema).optional(),
  bodyText:      z.string().max(5_000_000).optional(),
  bodyHtml:      z.string().max(5_000_000).optional(),
  attachmentIds: z.array(z.string().uuid()).optional(),
  /** Set to true to transition from DRAFT to SENT */
  send:          z.boolean().optional().default(false),
});

export const UpdateDraftSchema = z.object({
  body:   UpdateDraftBodySchema,
  params: z.object({ id: z.string().uuid() }),
});

export type UpdateDraftInput = z.infer<typeof UpdateDraftBodySchema>;

// ─── 4. List mailbox query ────────────────────────────────────────────────────
const FOLDERS = ['INBOX', 'SENT', 'DRAFTS', 'ARCHIVE', 'SPAM', 'TRASH'] as const;

export const MailListQuerySchema = z.object({
  query: z.object({
    folder:    z.enum(FOLDERS).optional().default('INBOX'),
    page:      z.string().regex(/^\d+$/).optional().transform(Number).pipe(z.number().int().min(1)).optional(),
    limit:     z.string().regex(/^\d+$/).optional().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
    search:    z.string().trim().max(200).optional(),
    label:     z.string().trim().max(100).optional(),
    isRead:    z.enum(['true', 'false']).optional().transform((v) => v === 'true').pipe(z.boolean().optional()),
    isStarred: z.enum(['true', 'false']).optional().transform((v) => v === 'true').pipe(z.boolean().optional()),
  }),
});

export type MailListQueryInput = z.infer<typeof MailListQuerySchema>['query'];

// ─── 5. Update a mailbox item ─────────────────────────────────────────────────
export const UpdateMailboxItemBodySchema = z.object({
  isRead:       z.boolean().optional(),
  isStarred:    z.boolean().optional(),
  folder:       z.enum(FOLDERS).optional(),
  labels:       z.array(z.string().max(50)).max(20).optional(),
  snoozedUntil: z.string().datetime({ offset: true }).nullable().optional(),
});

export const UpdateMailboxItemSchema = z.object({
  body:   UpdateMailboxItemBodySchema,
  params: z.object({
    id:     z.string().uuid().optional(),
    itemId: z.string().uuid().optional(),
  }).refine((p) => p.id !== undefined || p.itemId !== undefined, { message: 'Item ID is required' }),
});

export type UpdateMailboxItemInput = z.infer<typeof UpdateMailboxItemBodySchema>;

// ─── 6. Bulk mailbox action ───────────────────────────────────────────────────
const BULK_ACTIONS = ['markRead', 'markUnread', 'star', 'unstar', 'archive', 'spam', 'trash', 'delete', 'restore'] as const;

export const BulkMailboxActionBodySchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(100),
  action:  z.enum(BULK_ACTIONS),
});

export const BulkMailboxActionSchema = z.object({
  body: BulkMailboxActionBodySchema,
});

export type BulkMailboxActionInput = z.infer<typeof BulkMailboxActionBodySchema>;

// ─── 7. Search ────────────────────────────────────────────────────────────────
export const MailSearchQuerySchema = z.object({
  query: z.object({
    q:       z.string().trim().max(200).optional(),
    from:    z.string().trim().max(200).optional(),
    to:      z.string().trim().max(200).optional(),
    subject: z.string().trim().max(200).optional(),
    folder:  z.enum(FOLDERS).optional(),
    since:   z.string().optional(),
    until:   z.string().optional(),
    page:    z.string().regex(/^\d+$/).optional().transform(Number).pipe(z.number().int().min(1)).optional(),
    limit:   z.string().regex(/^\d+$/).optional().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  }),
});

export type MailSearchQueryInput = z.infer<typeof MailSearchQuerySchema>['query'];

// ─── 8. Folder Parameter ──────────────────────────────────────────────────────
const VIEW_FOLDERS = ['INBOX', 'SENT', 'DRAFTS', 'ARCHIVE', 'SPAM', 'TRASH', 'STARRED'] as const;

export const FolderParamSchema = z.object({
  params: z.object({
    folder: z.string().transform((v) => v.toUpperCase()).pipe(z.enum(VIEW_FOLDERS)),
  }),
  query: MailListQuerySchema.shape.query,
});

export type FolderParamInput = z.infer<typeof FolderParamSchema>;
