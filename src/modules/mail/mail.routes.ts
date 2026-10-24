// =============================================================================
// Pacific Mail — Routes
// All routes require authentication via requireAuth middleware.
// No parallel auth system; uses the existing JWT middleware.
// =============================================================================

import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { MAX_ATTACHMENT_SIZE_BYTES } from './mail.storage';
import { mailLoggingMiddleware } from './mail.metrics';
import {
  ProvisionAddressSchema,
  SendMailSchema,
  CreateDraftSchema,
  UpdateDraftSchema,
  ReplyMessageSchema,
  ForwardMessageSchema,
  FolderParamSchema,
  UpdateMailboxItemSchema,
  BulkMailboxActionSchema,
  MailListQuerySchema,
  MailSearchQuerySchema,
  CreateAddressAdminSchema,
  AssignAddressSchema,
  UnassignAddressSchema,
  UpdateAddressQuotasSchema,
  CreateAliasSchema,
} from './mail.schema';
import * as ctrl from './mail.controller';

const router = Router();

// ─── 0. Logging Middleware & Public Health Probes (Step 5) ────────────────────
router.use(mailLoggingMiddleware);

/** GET /api/v1/mail/health — Container liveness check */
router.get('/health', ctrl.getMailHealth);

/** GET /api/v1/mail/ready — Database & queue readiness check */
router.get('/ready', ctrl.getMailReadiness);

/** POST /api/v1/mail/webhooks/inbound — Inbound gateway webhook (signature verified) */
router.post('/webhooks/inbound', ctrl.handleInboundWebhook);

// Configure safe memory upload parser
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES, // 25 MB
    files: 1,
  },
});

// All subsequent mail routes require authentication
router.use(requireAuth);

// ─── 1. Identity & Addresses ──────────────────────────────────────────────────
/** GET /api/v1/mail/addresses/me — Get caller's verified internal mail address */
router.get('/addresses/me', ctrl.getMyAddress);
router.get('/me', ctrl.getMyAddress); // backward-compatible alias

/** POST /api/v1/mail/addresses — Custom provision or update caller's mail address */
router.post('/addresses', validate(ProvisionAddressSchema), ctrl.provisionAddress);

// ─── 2. Folder & Thread Listing ───────────────────────────────────────────────
/** GET /api/v1/mail/folders/:folder — Paginated list of threads in a folder */
router.get('/folders/:folder', validate(FolderParamSchema), ctrl.listFolder);

/** GET /api/v1/mail/threads — List threads (supports ?folder=INBOX) */
router.get('/threads', validate(MailListQuerySchema), ctrl.listThreads);

/** GET /api/v1/mail/threads/:id — Thread detail with all visible messages */
router.get('/threads/:id', ctrl.getThreadDetail);

// ─── 3. Compose, Drafts, Reply & Forward ──────────────────────────────────────
/** POST /api/v1/mail/drafts — Create a new draft */
router.post('/drafts', validate(CreateDraftSchema), ctrl.createDraft);

/** PATCH /api/v1/mail/drafts/:id — Update draft or send if send=true */
router.patch('/drafts/:id', validate(UpdateDraftSchema), ctrl.updateDraft);

/** POST /api/v1/mail/send — Send a message atomically */
router.post('/send', validate(SendMailSchema), ctrl.sendMessage);
router.post('/messages', validate(SendMailSchema), ctrl.sendMessage); // alias
router.patch('/messages/:id', validate(UpdateDraftSchema), ctrl.updateDraft); // alias

/** POST /api/v1/mail/messages/:id/reply — Reply to message in existing thread */
router.post('/messages/:id/reply', validate(ReplyMessageSchema), ctrl.replyMessage);

/** POST /api/v1/mail/messages/:id/forward — Forward message */
router.post('/messages/:id/forward', validate(ForwardMessageSchema), ctrl.forwardMessage);

/** GET /api/v1/mail/messages/:id — Single message detail */
router.get('/messages/:id', ctrl.getMessage);

// ─── 4. Mailbox Items & Counts ────────────────────────────────────────────────
/** GET /api/v1/mail/counts — Get total & unread counts for all folders */
router.get('/counts', ctrl.getCounts);
router.get('/unread-counts', ctrl.getCounts); // alias

/** PATCH /api/v1/mail/items/:id — Update mailbox item (read, star, folder, labels) */
router.patch('/items/:id', validate(UpdateMailboxItemSchema), ctrl.updateMailboxItem);
router.patch('/mailbox/:itemId', validate(UpdateMailboxItemSchema), ctrl.updateMailboxItem); // alias

/** DELETE /api/v1/mail/items/:id — Move to TRASH or permanently delete if in TRASH */
router.delete('/items/:id', ctrl.deleteMailboxItem);
router.delete('/mailbox/:itemId', ctrl.deleteMailboxItem); // alias

/** POST /api/v1/mail/items/bulk — Bulk action (markRead, star, archive, trash, delete) */
router.post('/items/bulk', validate(BulkMailboxActionSchema), ctrl.bulkAction);
router.post('/mailbox/bulk', validate(BulkMailboxActionSchema), ctrl.bulkAction); // alias

// ─── 5. Search ────────────────────────────────────────────────────────────────
/** GET /api/v1/mail/search?q= — Search across messages, threads, subjects, dates */
router.get('/search', validate(MailSearchQuerySchema), ctrl.searchMail);

// ─── 6. Attachment Management & Downloads (Step 4) ────────────────────────────
/** POST /api/v1/mail/attachments — Upload attachment linked to messageId */
router.post('/attachments', upload.single('file'), ctrl.uploadAttachment);
router.post('/messages/:messageId/attachments', upload.single('file'), ctrl.uploadAttachment);

/** GET /api/v1/mail/attachments/:id/download — Authorized download with safe headers */
router.get('/attachments/:id/download', ctrl.downloadAttachment);

/** GET /api/v1/mail/attachments/:id — Attachment metadata */
router.get('/attachments/:id', ctrl.getAttachmentMetadata);

// ─── 7. Admin Control Plane (Step 4: SUPER_ADMIN & ADMIN only) ────────────────
/** GET /api/v1/mail/admin/metrics — Operational metrics and delivery stats */
router.get('/admin/metrics', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.getOperationalMetrics);

/** GET /api/v1/mail/admin/diagnostics — Performance percentiles, queue depth & storage (Step 5) */
router.get('/admin/diagnostics', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.getOperationalDiagnostics);

/** GET /api/v1/mail/admin/outbox-failures — Troubleshooting failures (omits bodies) */
router.get('/admin/outbox-failures', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.getOutboxFailures);
router.get('/admin/outbox/failures', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.getOutboxFailures); // alias

/** GET /api/v1/mail/admin/addresses — List addresses with status and quota */
router.get('/admin/addresses', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.listAdminAddresses);

/** POST /api/v1/mail/admin/addresses — Create new address under @pacificproduct.in */
router.post('/admin/addresses', requireRole('SUPER_ADMIN', 'ADMIN'), validate(CreateAddressAdminSchema), ctrl.createAddressAdmin);

/** POST /api/v1/mail/admin/addresses/:id/assign — Assign address to user */
router.post('/admin/addresses/:id/assign', requireRole('SUPER_ADMIN', 'ADMIN'), validate(AssignAddressSchema), ctrl.assignAddress);

/** POST /api/v1/mail/admin/addresses/:id/unassign — Unassign address from user */
router.post('/admin/addresses/:id/unassign', requireRole('SUPER_ADMIN', 'ADMIN'), validate(UnassignAddressSchema), ctrl.unassignAddress);

/** PATCH /api/v1/mail/admin/addresses/:id/quotas — Update storage & daily send quotas */
router.patch('/admin/addresses/:id/quotas', requireRole('SUPER_ADMIN', 'ADMIN'), validate(UpdateAddressQuotasSchema), ctrl.updateAddressQuotas);

/** GET /api/v1/mail/admin/addresses/:id/history — Assignment history audit log */
router.get('/admin/addresses/:id/history', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.getAssignmentHistory);

/** GET /api/v1/mail/admin/addresses/:id/aliases — List aliases for address */
router.get('/admin/addresses/:id/aliases', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.listAliases);

/** POST /api/v1/mail/admin/aliases — Create alias for address */
router.post('/admin/aliases', requireRole('SUPER_ADMIN', 'ADMIN'), validate(CreateAliasSchema), ctrl.createAlias);

/** DELETE /api/v1/mail/admin/aliases/:id — Delete alias */
router.delete('/admin/aliases/:id', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.deleteAlias);

/** GET /api/v1/mail/admin/dns/readiness — Read-only DNS audit and proposed change plan */
router.get('/admin/dns/readiness', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.getDnsReadiness);

/** PATCH /api/v1/mail/admin/addresses/:id/status — Enable or disable mail address */
router.patch('/admin/addresses/:id/status', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.updateAddressStatus);

/** PATCH /api/v1/mail/admin/users/:userId/access — Enable/disable mail access for user */
router.patch('/admin/users/:userId/access', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.toggleUserMailAccess);

/** GET /api/v1/mail/audit — Immutable audit logs */
router.get('/audit', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.getAuditLogs);
router.get('/admin/audit', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.getAuditLogs); // alias

export default router;
