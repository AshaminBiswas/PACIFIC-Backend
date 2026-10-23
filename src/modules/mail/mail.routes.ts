// =============================================================================
// Pacific Mail — Routes
// All routes require authentication via requireAuth middleware.
// No parallel auth system; uses the existing JWT middleware.
// =============================================================================

import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
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
} from './mail.schema';
import * as ctrl from './mail.controller';

const router = Router();

// All mail routes require authentication
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

// ─── 6. Admin Audit Logs ──────────────────────────────────────────────────────
/** GET /api/v1/mail/audit — Immutable audit logs (ADMIN / SUPER_ADMIN only) */
router.get('/audit', requireRole('SUPER_ADMIN', 'ADMIN'), ctrl.getAuditLogs);

export default router;
