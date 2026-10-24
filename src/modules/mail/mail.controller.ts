// =============================================================================
// Pacific Mail — Controller Layer
// Extracts req.user from JWT auth middleware — NEVER from req.body.
// All business logic is delegated to the service layer.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { mailMetrics } from './mail.metrics';
import type {
  ProvisionAddressInput,
  SendMailInput,
  CreateDraftInput,
  UpdateDraftInput,
  ReplyMailInput,
  ForwardMailInput,
  UpdateMailboxItemInput,
  BulkMailboxActionInput,
  MailListQueryInput,
  MailSearchQueryInput,
} from './mail.schema';
import {
  mailAddressService,
  mailComposeService,
  mailboxService,
  mailboxItemService,
  mailSearchService,
  mailAdminService,
  mailAttachmentService,
  type AuthenticatedSender,
} from './mail.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCaller(req: AuthRequest): {
  sender: AuthenticatedSender;
  ipAddress?: string;
  userAgent?: string;
} {
  const user = req.user!;
  return {
    sender: {
      id: user.id,
      email: user.email,
      firstName: (user as any).firstName,
      lastName: (user as any).lastName,
      isActive: (user as any).isActive ?? true,
    },
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

function extractIdempotencyKey(req: AuthRequest): string | undefined {
  return (
    (req.headers['idempotency-key'] as string) ||
    (req.headers['x-idempotency-key'] as string) ||
    undefined
  );
}

// ─── 1. Address Management ────────────────────────────────────────────────────

/**
 * GET /api/v1/mail/addresses/me (and alias GET /api/v1/mail/me)
 * Resolves caller to verified internal mail address, auto-provisioning if missing.
 */
export const getMyAddress = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender } = getCaller(req);
    const addr = await mailAddressService.getMyAddress(sender);
    sendSuccess(res, addr, 'Mail address retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/mail/addresses
 * Custom provisioning of localPart.
 */
export const provisionAddress = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const input = req.body as ProvisionAddressInput;
    const addr = await mailAddressService.provisionAddress(sender, input, ipAddress);
    sendSuccess(res, addr, 'Mail address provisioned successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ─── 2. Compose & Send ────────────────────────────────────────────────────────

/**
 * POST /api/v1/mail/send (and alias POST /api/v1/mail/messages)
 * Send a new message or dispatch an existing draft atomically.
 */
export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress, userAgent } = getCaller(req);
    const input = req.body as SendMailInput;
    if (!input.idempotencyKey) {
      input.idempotencyKey = extractIdempotencyKey(req);
    }

    const result = await mailComposeService.send(sender, input, ipAddress, userAgent);
    const message = result.replayed
      ? 'Message already sent (idempotent replay)'
      : 'Message sent successfully';
    sendSuccess(res, result, message, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/mail/drafts
 * Create a new draft.
 */
export const createDraft = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const input = req.body as CreateDraftInput;
    const result = await mailComposeService.createDraft(sender, input, ipAddress);
    sendSuccess(res, result, 'Draft created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/mail/drafts/:id (and alias PATCH /api/v1/mail/messages/:id)
 * Update an existing draft, or send it if send=true in body.
 */
export const updateDraft = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress, userAgent } = getCaller(req);
    const { id } = req.params;
    const input = req.body as UpdateDraftInput;

    const result = await mailComposeService.updateDraft(sender, id, input, ipAddress, userAgent);
    sendSuccess(res, result, input.send ? 'Draft sent successfully' : 'Draft updated');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/mail/messages/:id/reply
 * Reply to an existing message within its thread.
 */
export const replyMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress, userAgent } = getCaller(req);
    const { id } = req.params;
    const input = req.body as ReplyMailInput;
    if (!input.idempotencyKey) {
      input.idempotencyKey = extractIdempotencyKey(req);
    }

    const result = await mailComposeService.reply(sender, id, input, ipAddress, userAgent);
    sendSuccess(res, result, 'Reply sent successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/mail/messages/:id/forward
 * Forward an existing message with citations and original references.
 */
export const forwardMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress, userAgent } = getCaller(req);
    const { id } = req.params;
    const input = req.body as ForwardMailInput;
    if (!input.idempotencyKey) {
      input.idempotencyKey = extractIdempotencyKey(req);
    }

    const result = await mailComposeService.forward(sender, id, input, ipAddress, userAgent);
    sendSuccess(res, result, 'Message forwarded successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ─── 3. Mailbox Read Operations ───────────────────────────────────────────────

/**
 * GET /api/v1/mail/folders/:folder
 * Paginated listing of threads in a given folder (INBOX, SENT, DRAFTS, ARCHIVE, SPAM, TRASH, STARRED).
 */
export const listFolder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender } = getCaller(req);
    const folder = req.params.folder;
    const query = req.query as unknown as MailListQueryInput;

    const result = await mailboxService.listFolder(sender.id, folder, query);

    sendPaginated(res, result.items, {
      page: result.page,
      limit: result.limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / result.limit),
      hasNextPage: result.page * result.limit < result.total,
      hasPrevPage: result.page > 1,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/mail/threads
 * Alias for folder listing with ?folder= query param.
 */
export const listThreads = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender } = getCaller(req);
    const query = req.query as unknown as MailListQueryInput;
    const folder = query.folder || 'INBOX';

    const result = await mailboxService.listFolder(sender.id, folder, query);

    sendPaginated(res, result.items, {
      page: result.page,
      limit: result.limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / result.limit),
      hasNextPage: result.page * result.limit < result.total,
      hasPrevPage: result.page > 1,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/mail/threads/:id
 * Retrieve all messages in a thread with participant access check.
 */
export const getThreadDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const id = req.params.id || req.params.threadId;

    const result = await mailboxService.getThreadDetail(sender.id, id, ipAddress);
    sendSuccess(res, result, 'Thread retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/mail/messages/:id
 * Retrieve single message detail with BCC privacy protection.
 */
export const getMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const { id } = req.params;

    const message = await mailboxService.getMessage(sender.id, id, ipAddress);
    sendSuccess(res, message, 'Message retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/mail/counts (and alias GET /api/v1/mail/unread-counts)
 * Total and unread counts for all folders.
 */
export const getCounts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender } = getCaller(req);
    const counts = await mailboxService.getCounts(sender.id);
    sendSuccess(res, counts, 'Mailbox counts retrieved');
  } catch (err) {
    next(err);
  }
};

// ─── 4. Mailbox Item Mutations ────────────────────────────────────────────────

/**
 * PATCH /api/v1/mail/items/:id (and alias PATCH /api/v1/mail/mailbox/:itemId)
 * Mark read/unread, star, move folder, set labels.
 */
export const updateMailboxItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const id = req.params.id || req.params.itemId;
    const input = req.body as UpdateMailboxItemInput;

    const updated = await mailboxItemService.updateItem(sender.id, id, input, ipAddress);
    sendSuccess(res, updated, 'Mailbox item updated');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/mail/items/:id (and alias DELETE /api/v1/mail/mailbox/:itemId)
 * Moves to TRASH or permanently deletes if already in TRASH.
 */
export const deleteMailboxItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const id = req.params.id || req.params.itemId;

    const result = await mailboxItemService.deleteItem(sender.id, id, ipAddress);
    sendSuccess(
      res,
      result,
      result.action === 'PERMANENTLY_DELETED' ? 'Permanently deleted' : 'Moved to Trash'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/mail/items/bulk (and alias POST /api/v1/mail/mailbox/bulk)
 * Bulk mailbox operations (markRead, markUnread, star, unstar, archive, spam, trash, restore, delete).
 */
export const bulkAction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const input = req.body as BulkMailboxActionInput;

    const result = await mailboxItemService.bulkAction(sender.id, input, ipAddress);
    sendSuccess(res, result, `Bulk ${input.action} applied to ${result.affected} item(s)`);
  } catch (err) {
    next(err);
  }
};

// ─── 5. Search ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/mail/search?q=
 * Multi-criteria search across threads, messages, senders, and dates.
 */
export const searchMail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender } = getCaller(req);
    const query = req.query as unknown as MailSearchQueryInput;

    const result = await mailSearchService.search(sender.id, query);

    sendPaginated(res, result.items, {
      page: result.page,
      limit: result.limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / result.limit),
      hasNextPage: result.page * result.limit < result.total,
      hasPrevPage: result.page > 1,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 6. Admin Audit Logs ──────────────────────────────────────────────────────

export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const actorUserId = req.query.actorUserId as string | undefined;

    const result = await mailAdminService.getAuditLogs(page, limit, actorUserId);

    sendPaginated(res, result.items, {
      page,
      limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNextPage: page * limit < result.total,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 7. Attachment Handling (Step 4 Security & Storage) ───────────────────────

/**
 * POST /api/v1/mail/attachments (or /api/v1/mail/messages/:messageId/attachments)
 * Uploads an attachment linked to a draft or message.
 */
export const uploadAttachment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const messageId = (req.params.messageId || req.body.messageId || req.params.id) as string;
    if (!messageId) {
      res.status(400).json({ success: false, message: 'messageId is required to associate attachment' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No attachment file provided in request' });
      return;
    }

    const attachment = await mailAttachmentService.uploadAttachment(
      sender,
      messageId,
      {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      ipAddress
    );

    sendSuccess(res, attachment, 'Attachment uploaded successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/mail/attachments/:id/download
 * Streams the attachment with safe security headers after verifying mailbox authorization.
 */
export const downloadAttachment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const attachmentId = req.params.id;

    const { stream, attachment } = await mailAttachmentService.getAttachmentStream(
      sender.id,
      attachmentId,
      ipAddress
    );

    const safeFilename = attachment.filename.replace(/"/g, '\\"');
    const encodedFilename = encodeURIComponent(attachment.filename);

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('Content-Length', attachment.sizeBytes);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/mail/attachments/:id
 * Retrieves attachment metadata after verifying mailbox authorization.
 */
export const getAttachmentMetadata = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender } = getCaller(req);
    const attachmentId = req.params.id;
    const meta = await mailAttachmentService.getAttachmentMetadata(sender.id, attachmentId);
    sendSuccess(res, meta, 'Attachment metadata retrieved');
  } catch (err) {
    next(err);
  }
};

// ─── 8. Admin Control Plane (Step 4 RBAC & Boundary Enforcement) ──────────────

/**
 * GET /api/v1/mail/admin/metrics
 * Returns operational delivery metrics, active address totals, and queue health.
 * Strictly omits message bodies to protect private mailboxes from administrative snooping.
 */
export const getOperationalMetrics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const metrics = await mailAdminService.getOperationalMetrics(sender.id, ipAddress);
    sendSuccess(res, metrics, 'Operational metrics retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/mail/admin/outbox-failures
 * Lists delivery job failures with errors. Message bodies are omitted.
 */
export const getOutboxFailures = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const result = await mailAdminService.getOutboxFailures(sender.id, page, limit, ipAddress);

    sendPaginated(res, result.items, {
      page,
      limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNextPage: page * limit < result.total,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/mail/admin/addresses
 * Lists internal mail addresses with associated account info and quotas.
 */
export const listAdminAddresses = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender } = getCaller(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = req.query.search as string | undefined;

    const result = await mailAdminService.listAddresses(sender.id, page, limit, search);

    sendPaginated(res, result.items, {
      page,
      limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNextPage: page * limit < result.total,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/mail/admin/addresses/:id/status
 * Enables or disables an internal mail address.
 */
export const updateAddressStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const addressId = req.params.id;
    const isActive = Boolean(req.body.isActive);

    const updated = await mailAdminService.updateAddressStatus(sender.id, addressId, isActive, ipAddress);
    sendSuccess(res, updated, `Address ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/mail/admin/users/:userId/access
 * Enables or disables all internal mail addresses for a specific user.
 */
export const toggleUserMailAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sender, ipAddress } = getCaller(req);
    const userId = req.params.userId;
    const isActive = Boolean(req.body.isActive);

    const result = await mailAdminService.toggleUserAccess(sender.id, userId, isActive, ipAddress);
    sendSuccess(res, result, `User mail access ${isActive ? 'granted' : 'revoked'} successfully`);
  } catch (err) {
    next(err);
  }
};

// ─── 9. Health & Diagnostics Checks (Step 5) ──────────────────────────────────

/**
 * GET /api/v1/mail/health
 * Public liveness probe for orchestrator container health monitoring.
 */
export const getMailHealth = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    status: 'HEALTHY',
    service: 'pacific-mail',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
};

/**
 * GET /api/v1/mail/ready
 * Readiness probe checking database connectivity and queue health.
 */
export const getMailReadiness = async (_req: Request, res: Response): Promise<void> => {
  try {
    const snap = await mailMetrics.getDiagnosticsSnapshot();
    const isReady = snap.database.status === 'CONNECTED';
    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'READY' : 'DEGRADED',
      service: 'pacific-mail',
      database: snap.database,
      queueDepth: snap.queue.depth,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'UNAVAILABLE',
      error: err.message,
    });
  }
};

/**
 * GET /api/v1/mail/admin/diagnostics
 * Detailed operational metrics, latency percentiles, error rates, and queue depth.
 * (SUPER_ADMIN and ADMIN only).
 */
export const getOperationalDiagnostics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const diagnostics = await mailMetrics.getDiagnosticsSnapshot();
    sendSuccess(res, diagnostics, 'Operational diagnostics snapshot retrieved');
  } catch (err) {
    next(err);
  }
};
