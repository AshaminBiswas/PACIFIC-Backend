// =============================================================================
// Pacific Mail — Service Layer
// Business logic, authorization checks, atomic transactions, and orchestration.
// All user-identity is taken from req.user (JWT-derived) — never from client body.
// =============================================================================

import crypto from 'node:crypto';
import { prisma } from '../../config/database';
import {
  addressRepository,
  threadRepository,
  messageRepository,
  recipientRepository,
  mailboxRepository,
  outboxRepository,
  mailAuditRepository,
  eventRepository,
  searchRepository,
  attachmentRepository,
  adminRepository,
  type DbClient,
} from './mail.repository';
import {
  sanitizeFilename,
  validateAttachmentExtension,
  getMailStorageAdapter,
  MAX_ATTACHMENT_SIZE_BYTES,
} from './mail.storage';
import type {
  MailAddress,
  MailThread,
  MailMessage,
  MailMessageDetail,
  MailThreadSummary,
  MailFolder,
  FolderCounts,
  MailAttachment,
  MailOperationalMetrics,
  MailOutboxFailure,
  MailAdminAddressSummary,
  AttachmentUploadResponse,
} from './mail.types';
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

// ─── Helper: parse "Display Name <local@pacific.internal>" ──────────────────

interface ParsedRecipient {
  displayName: string | null;
  localPart: string;
  domain: string;
  rawEmail: string;
}

export function parseRecipientAddress(raw: string): ParsedRecipient | null {
  raw = raw.trim();
  if (!raw) return null;

  // Format: "Display Name <local@domain>"
  const angleMatch = raw.match(/^(.+?)\s*<([^@]+)@([^>]+)>$/);
  if (angleMatch) {
    return {
      displayName: angleMatch[1].trim() || null,
      localPart: angleMatch[2].trim().toLowerCase(),
      domain: angleMatch[3].trim().toLowerCase(),
      rawEmail: raw,
    };
  }

  // Format: "local@domain"
  const plainMatch = raw.match(/^([^@]+)@(.+)$/);
  if (plainMatch) {
    return {
      displayName: null,
      localPart: plainMatch[1].trim().toLowerCase(),
      domain: plainMatch[2].trim().toLowerCase(),
      rawEmail: raw,
    };
  }

  return null;
}

/** Compute approximate message size in bytes */
export function computeSize(text?: string | null, html?: string | null): number {
  return (text?.length ?? 0) + (html?.length ?? 0);
}

/** Generate RFC 2822 Message-ID */
export function generateMessageId(): string {
  return `<${Date.now()}.${crypto.randomUUID()}@pacific.internal>`;
}

export interface AuthenticatedSender {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

// =============================================================================
// 1. Address Management Service
// =============================================================================

export const mailAddressService = {
  /**
   * Get the current user's primary mail address.
   * Auto-provisions an address if one does not exist yet.
   */
  async getMyAddress(user: AuthenticatedSender): Promise<MailAddress> {
    const firstName = user.firstName || user.email.split('@')[0];
    const lastName = user.lastName || '';
    return addressRepository.autoProvisionIfMissing(user.id, firstName, lastName, user.email);
  },

  /**
   * Provision or update the caller's custom mail address localPart.
   * Only the authenticated user can provision their own address.
   */
  async provisionAddress(
    user: AuthenticatedSender,
    input: ProvisionAddressInput,
    ipAddress?: string
  ): Promise<MailAddress> {
    const firstName = user.firstName || user.email.split('@')[0];
    const lastName = user.lastName || '';
    const displayName = input.displayName ?? (`${firstName} ${lastName}`.trim() || null);

    const addr = await addressRepository.upsert(user.id, input.localPart, displayName);

    await mailAuditRepository.log({
      actorUserId: user.id,
      action: 'PROVISION_ADDRESS',
      resourceType: 'address',
      resourceId: addr.id,
      ipAddress,
      metadata: { localPart: input.localPart },
    });

    return addr;
  },
};

// =============================================================================
// 2. Compose & Send Service
// =============================================================================

export const mailComposeService = {
  /**
   * Atomically send a new message or promote an existing draft.
   * Sender identity is strictly derived from server-authenticated session.
   */
  async send(
    sender: AuthenticatedSender,
    input: SendMailInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ message: MailMessage; thread: MailThread; replayed?: boolean }> {
    // 1. Verify sender account active status
    if (sender.isActive === false) {
      throw Object.assign(new Error('Sender account is suspended or disabled'), { status: 403 });
    }

    // 2. Resolve / auto-provision sender's internal mail address
    const firstName = sender.firstName || sender.email.split('@')[0];
    const lastName = sender.lastName || '';
    const fromAddr = await addressRepository.autoProvisionIfMissing(
      sender.id,
      firstName,
      lastName,
      sender.email
    );

    if (!fromAddr.isActive) {
      throw Object.assign(new Error('Sender mail address is disabled'), { status: 403 });
    }

    // 3. Rate limiting: max 60 messages per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSendCount = await messageRepository.countRecentSends(sender.id, oneHourAgo);
    if (recentSendCount >= 60) {
      throw Object.assign(
        new Error('Hourly send limit exceeded (maximum 60 messages/hour). Please wait before sending again.'),
        { status: 429 }
      );
    }

    // 4. Idempotency Check: prevent duplicate logical sends
    if (input.idempotencyKey) {
      const existing = await messageRepository.findByIdempotencyKey(sender.id, input.idempotencyKey);
      if (existing) {
        const existingThread = await threadRepository.findById(existing.threadId);
        return {
          message: existing,
          thread: existingThread!,
          replayed: true,
        };
      }
    }

    // 5. Validate & resolve recipients
    const totalRecipients = input.to.length + (input.cc?.length ?? 0) + (input.bcc?.length ?? 0);
    if (totalRecipients > 50) {
      throw Object.assign(new Error('Recipient limit exceeded. Maximum 50 recipients allowed per message.'), {
        status: 400,
      });
    }

    const resolvedRecipients: Array<{
      type: 'TO' | 'CC' | 'BCC';
      rawEmail: string;
      userId: string | null;
      addressId: string | null;
    }> = [];

    const recipientUserIds = new Set<string>();

    const resolveList = async (list: string[], type: 'TO' | 'CC' | 'BCC') => {
      for (const raw of list) {
        const parsed = parseRecipientAddress(raw);
        if (!parsed) {
          throw Object.assign(new Error(`Invalid recipient format: "${raw}"`), { status: 400 });
        }

        // Enforce internal delivery domain
        if (parsed.domain !== 'pacific.internal' && parsed.domain !== fromAddr.domain) {
          throw Object.assign(
            new Error(
              `External sending is not supported in internal mail module. Recipient "${raw}" must be @pacific.internal`
            ),
            { status: 400 }
          );
        }

        // Verify recipient address and active account status in DB
        const resolved = await addressRepository.resolveRecipientWithUserStatus(
          parsed.localPart,
          parsed.domain
        );

        if (!resolved) {
          throw Object.assign(new Error(`Recipient not found: "${raw}"`), { status: 400 });
        }
        if (!resolved.addressActive) {
          throw Object.assign(new Error(`Recipient address is inactive: "${raw}"`), { status: 400 });
        }
        if (!resolved.userActive) {
          throw Object.assign(
            new Error(`Recipient account is suspended or disabled: "${raw}"`),
            { status: 400 }
          );
        }

        resolvedRecipients.push({
          type,
          rawEmail: raw,
          userId: resolved.address.userId,
          addressId: resolved.address.id,
        });

        if (resolved.address.userId) {
          recipientUserIds.add(resolved.address.userId);
        }
      }
    };

    await resolveList(input.to, 'TO');
    if (input.cc?.length) await resolveList(input.cc, 'CC');
    if (input.bcc?.length) await resolveList(input.bcc, 'BCC');

    // 6. Execute atomic database transaction
    const result = await prisma.$transaction(async (tx: DbClient) => {
      let thread: MailThread;
      if (input.threadId) {
        const existingThread = await threadRepository.findById(input.threadId, tx);
        if (!existingThread) throw Object.assign(new Error('Thread not found'), { status: 404 });
        thread = existingThread;
        await threadRepository.touch(thread.id, tx);
      } else {
        thread = await threadRepository.create(input.subject ?? '(No Subject)', sender.id, tx);
      }

      let message: MailMessage;

      if (input.draftId) {
        // Promote draft -> sent message
        const draft = await messageRepository.findById(input.draftId, tx);
        if (!draft || draft.senderUserId !== sender.id || !draft.isDraft) {
          throw Object.assign(new Error('Draft not found or access denied'), { status: 404 });
        }

        message = await messageRepository.updateDraft(
          input.draftId,
          sender.id,
          {
            subject: input.subject ?? draft.subject,
            bodyText: input.bodyText ?? draft.bodyText,
            bodyHtml: input.bodyHtml ?? draft.bodyHtml,
            sizeBytes: computeSize(input.bodyText ?? draft.bodyText, input.bodyHtml ?? draft.bodyHtml),
          },
          tx
        );

        message = await messageRepository.markSent(message.id, tx);
        await recipientRepository.deleteByMessage(message.id, tx);

        // Update sender's mailbox item from DRAFTS -> SENT
        await tx.$executeRawUnsafe(
          `UPDATE mailbox_items SET folder = 'SENT'::"MailFolder", updated_at = NOW()
           WHERE user_id = $1 AND message_id = $2 AND folder = 'DRAFTS'::"MailFolder"`,
          sender.id,
          message.id
        );
      } else {
        // Create new message
        message = await messageRepository.create(
          {
            threadId: thread.id,
            parentId: input.parentId ?? null,
            fromAddressId: fromAddr.id,
            senderUserId: sender.id,
            subject: input.subject ?? '(No Subject)',
            bodyText: input.bodyText ?? null,
            bodyHtml: input.bodyHtml ?? null,
            isDraft: false,
            sizeBytes: computeSize(input.bodyText, input.bodyHtml),
            messageIdHeader: generateMessageId(),
            inReplyTo: input.inReplyTo ?? null,
            references: input.references ?? [],
            idempotencyKey: input.idempotencyKey ?? null,
          },
          tx
        );

        // Mark sent & create SENT item for sender
        message = await messageRepository.markSent(message.id, tx);
        await mailboxRepository.createItems(message.id, thread.id, [sender.id], 'SENT', tx);
      }

      // Persist recipients
      await recipientRepository.createMany(message.id, resolvedRecipients, tx);

      // Fan-out INBOX mailbox items for recipients
      // (If sender is in recipient list, they receive both SENT and INBOX items)
      const inboxRecipients = [...recipientUserIds];
      if (inboxRecipients.length > 0) {
        await mailboxRepository.createItems(message.id, thread.id, inboxRecipients, 'INBOX', tx);
      }

      // Transactional outbox entry (ready for external transport adapter in future steps)
      const outbox = await outboxRepository.create(message.id, 'internal', tx);

      // Record internal delivery event
      await eventRepository.record(
        {
          messageId: message.id,
          outboxId: outbox.id,
          eventType: 'delivered',
          metadata: {
            transport: 'internal',
            deliveredTo: [...recipientUserIds],
          },
        },
        tx
      );

      return { message, thread };
    });

    // 7. Audit log (outside transaction for resilience)
    await mailAuditRepository.log({
      actorUserId: sender.id,
      action: input.draftId ? 'DRAFT_SEND' : 'SEND',
      resourceType: 'message',
      resourceId: result.message.id,
      ipAddress,
      userAgent,
      metadata: {
        threadId: result.thread.id,
        recipientCount: recipientUserIds.size,
        sizeBytes: result.message.sizeBytes,
        idempotencyKey: input.idempotencyKey,
      },
    });

    return result;
  },

  /**
   * Create a new draft message.
   */
  async createDraft(
    sender: AuthenticatedSender,
    input: CreateDraftInput,
    ipAddress?: string
  ): Promise<{ message: MailMessage; thread: MailThread }> {
    const firstName = sender.firstName || sender.email.split('@')[0];
    const lastName = sender.lastName || '';
    const fromAddr = await addressRepository.autoProvisionIfMissing(
      sender.id,
      firstName,
      lastName,
      sender.email
    );

    let thread: MailThread;
    if (input.threadId) {
      const existing = await threadRepository.findById(input.threadId);
      if (!existing) throw Object.assign(new Error('Thread not found'), { status: 404 });
      thread = existing;
    } else {
      thread = await threadRepository.create(input.subject ?? '(No Subject)', sender.id);
    }

    const message = await messageRepository.create({
      threadId: thread.id,
      parentId: input.parentId ?? null,
      fromAddressId: fromAddr.id,
      senderUserId: sender.id,
      subject: input.subject ?? '(No Subject)',
      bodyText: input.bodyText ?? null,
      bodyHtml: input.bodyHtml ?? null,
      isDraft: true,
      sizeBytes: computeSize(input.bodyText, input.bodyHtml),
      messageIdHeader: generateMessageId(),
      inReplyTo: input.inReplyTo ?? null,
      references: input.references ?? [],
    });

    // Save recipients if specified in draft
    const allRecipients: Array<{
      type: 'TO' | 'CC' | 'BCC';
      rawEmail: string;
      userId: string | null;
      addressId: string | null;
    }> = [];

    const collectDraftRecipients = async (list: string[] | undefined, type: 'TO' | 'CC' | 'BCC') => {
      if (!list) return;
      for (const raw of list) {
        const parsed = parseRecipientAddress(raw);
        if (parsed) {
          const addr = await addressRepository.findByLocalPart(parsed.localPart, parsed.domain);
          allRecipients.push({
            type,
            rawEmail: raw,
            userId: addr?.userId ?? null,
            addressId: addr?.id ?? null,
          });
        } else {
          allRecipients.push({ type, rawEmail: raw, userId: null, addressId: null });
        }
      }
    };

    await collectDraftRecipients(input.to, 'TO');
    await collectDraftRecipients(input.cc, 'CC');
    await collectDraftRecipients(input.bcc, 'BCC');

    if (allRecipients.length > 0) {
      await recipientRepository.createMany(message.id, allRecipients);
    }

    // Create DRAFTS mailbox item for sender
    await mailboxRepository.createItems(message.id, thread.id, [sender.id], 'DRAFTS');

    await mailAuditRepository.log({
      actorUserId: sender.id,
      action: 'DRAFT_CREATE',
      resourceType: 'message',
      resourceId: message.id,
      ipAddress,
      metadata: { threadId: thread.id },
    });

    return { message, thread };
  },

  /**
   * Update an existing draft, or send it if send=true.
   */
  async updateDraft(
    sender: AuthenticatedSender,
    draftId: string,
    input: UpdateDraftInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<MailMessage | { message: MailMessage; thread: MailThread }> {
    if (input.send) {
      // Fetch draft to retrieve recipients and subject if not provided in body
      const draft = await messageRepository.findById(draftId);
      if (!draft || draft.senderUserId !== sender.id || !draft.isDraft) {
        throw Object.assign(new Error('Draft not found or access denied'), { status: 404 });
      }

      let toRecipients = input.to;
      if (!toRecipients) {
        const recips = await recipientRepository.findByMessage(draftId);
        toRecipients = recips.filter((r) => r.type === 'TO').map((r) => r.rawEmail);
      }
      if (!toRecipients || toRecipients.length === 0) {
        throw Object.assign(new Error('Cannot send draft without at least one TO recipient'), { status: 400 });
      }

      return this.send(
        sender,
        {
          draftId,
          subject: input.subject ?? draft.subject,
          to: toRecipients,
          cc: input.cc ?? [],
          bcc: input.bcc ?? [],
          bodyText: input.bodyText ?? draft.bodyText ?? undefined,
          bodyHtml: input.bodyHtml ?? draft.bodyHtml ?? undefined,
          threadId: draft.threadId,
          attachmentIds: [],
          isDraft: false,
        },
        ipAddress,
        userAgent
      );
    }

    const updated = await messageRepository.updateDraft(draftId, sender.id, {
      subject: input.subject,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml,
      sizeBytes: computeSize(input.bodyText, input.bodyHtml),
    });

    if (input.to !== undefined || input.cc !== undefined || input.bcc !== undefined) {
      await recipientRepository.deleteByMessage(draftId);

      const allRecipients: Array<{
        type: 'TO' | 'CC' | 'BCC';
        rawEmail: string;
        userId: string | null;
        addressId: string | null;
      }> = [];

      const collectRecipients = async (list: string[] | undefined, type: 'TO' | 'CC' | 'BCC') => {
        if (!list) return;
        for (const raw of list) {
          const parsed = parseRecipientAddress(raw);
          if (parsed) {
            const addr = await addressRepository.findByLocalPart(parsed.localPart, parsed.domain);
            allRecipients.push({
              type,
              rawEmail: raw,
              userId: addr?.userId ?? null,
              addressId: addr?.id ?? null,
            });
          }
        }
      };

      await collectRecipients(input.to, 'TO');
      await collectRecipients(input.cc, 'CC');
      await collectRecipients(input.bcc, 'BCC');

      if (allRecipients.length > 0) {
        await recipientRepository.createMany(draftId, allRecipients);
      }
    }

    await mailAuditRepository.log({
      actorUserId: sender.id,
      action: 'DRAFT_UPDATE',
      resourceType: 'message',
      resourceId: draftId,
      ipAddress,
    });

    return updated;
  },

  /**
   * Reply to an existing message within its thread.
   */
  async reply(
    sender: AuthenticatedSender,
    originalMessageId: string,
    input: ReplyMailInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ message: MailMessage; thread: MailThread }> {
    // 1. Verify caller has access to the message they are replying to
    const originalDetail = await messageRepository.findDetailById(originalMessageId, sender.id);
    if (!originalDetail) {
      throw Object.assign(new Error('Original message not found or access denied'), { status: 404 });
    }

    const accessCheck = await mailboxRepository.findItemByMessageId(originalMessageId, sender.id);
    if (!accessCheck && originalDetail.senderUserId !== sender.id) {
      throw Object.assign(new Error('You do not have access to this conversation'), { status: 403 });
    }

    // 2. Format subject with "Re: " prefix if not present
    const origSubj = originalDetail.subject.trim();
    const subject = /^re:/i.test(origSubj) ? origSubj : `Re: ${origSubj}`;

    // 3. Resolve reply recipients
    let toList: string[] = [];
    let ccList: string[] = input.cc ?? [];

    if (input.to && input.to.length > 0) {
      toList = input.to;
    } else {
      const originalSenderEmail = `${originalDetail.fromAddress.localPart}@${originalDetail.fromAddress.domain}`;
      if (input.replyAll) {
        // To: original sender + all original TO recipients (excluding caller)
        const otherTo = originalDetail.recipients
          .filter((r) => r.type === 'TO' && r.userId !== sender.id)
          .map((r) => r.rawEmail);
        toList = Array.from(new Set([originalSenderEmail, ...otherTo]));

        // CC: all original CC recipients (excluding caller)
        const otherCc = originalDetail.recipients
          .filter((r) => r.type === 'CC' && r.userId !== sender.id)
          .map((r) => r.rawEmail);
        ccList = Array.from(new Set([...ccList, ...otherCc]));
      } else {
        toList = [originalSenderEmail];
      }
    }

    // 4. Threading references
    const inReplyTo = originalDetail.messageIdHeader ?? undefined;
    const references = [
      ...(originalDetail.references ?? []),
      originalDetail.messageIdHeader,
    ].filter((x): x is string => Boolean(x));

    return this.send(
      sender,
      {
        threadId: originalDetail.threadId,
        parentId: originalDetail.id,
        subject,
        to: toList,
        cc: ccList,
        bcc: input.bcc ?? [],
        bodyText: input.bodyText,
        bodyHtml: input.bodyHtml,
        inReplyTo,
        references,
        attachmentIds: input.attachmentIds ?? [],
        isDraft: false,
        idempotencyKey: input.idempotencyKey,
      },
      ipAddress,
      userAgent
    );
  },

  /**
   * Forward an existing message with citation headers.
   */
  async forward(
    sender: AuthenticatedSender,
    originalMessageId: string,
    input: ForwardMailInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ message: MailMessage; thread: MailThread }> {
    const originalDetail = await messageRepository.findDetailById(originalMessageId, sender.id);
    if (!originalDetail) {
      throw Object.assign(new Error('Original message not found or access denied'), { status: 404 });
    }

    const origSubj = originalDetail.subject.trim();
    const subject = /^fwd:/i.test(origSubj) ? origSubj : `Fwd: ${origSubj}`;

    const senderDisplay = originalDetail.fromAddress.displayName
      ? `${originalDetail.fromAddress.displayName} <${originalDetail.fromAddress.localPart}@${originalDetail.fromAddress.domain}>`
      : `${originalDetail.fromAddress.localPart}@${originalDetail.fromAddress.domain}`;

    const sentDateStr = originalDetail.sentAt
      ? new Date(originalDetail.sentAt).toUTCString()
      : new Date(originalDetail.createdAt).toUTCString();

    const toStr = originalDetail.recipients
      .filter((r) => r.type === 'TO')
      .map((r) => r.rawEmail)
      .join(', ');

    const citationHeader = [
      '---------- Forwarded message ---------',
      `From: ${senderDisplay}`,
      `Date: ${sentDateStr}`,
      `Subject: ${originalDetail.subject}`,
      `To: ${toStr}`,
    ].join('\n');

    const quotedText = [
      input.bodyText?.trim() || '',
      '',
      citationHeader,
      '',
      originalDetail.bodyText || '',
    ]
      .filter((x) => x !== undefined)
      .join('\n');

    let quotedHtml: string | undefined = input.bodyHtml;
    if (originalDetail.bodyHtml || input.bodyHtml) {
      quotedHtml = `
        <div>${input.bodyHtml || ''}</div>
        <br />
        <div class="pacific-mail-forward-header" style="border-top: 1px solid #ccc; padding-top: 8px; margin-top: 12px; color: #555;">
          <strong>---------- Forwarded message ---------</strong><br />
          <strong>From:</strong> ${escapeHtml(senderDisplay)}<br />
          <strong>Date:</strong> ${escapeHtml(sentDateStr)}<br />
          <strong>Subject:</strong> ${escapeHtml(originalDetail.subject)}<br />
          <strong>To:</strong> ${escapeHtml(toStr)}<br />
        </div>
        <br />
        <blockquote style="margin: 0 0 0 0.8ex; border-left: 2px solid #ccc; padding-left: 1ex;">
          ${originalDetail.bodyHtml || escapeHtml(originalDetail.bodyText || '')}
        </blockquote>
      `;
    }

    return this.send(
      sender,
      {
        subject,
        to: input.to,
        cc: input.cc ?? [],
        bcc: input.bcc ?? [],
        bodyText: quotedText,
        bodyHtml: quotedHtml,
        attachmentIds: [],
        isDraft: false,
        idempotencyKey: input.idempotencyKey,
      },
      ipAddress,
      userAgent
    );
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================================================
// 3. Mailbox Read Operations Service
// =============================================================================

export const mailboxService = {
  /**
   * List paginated thread summaries for a given folder or starred view.
   */
  async listFolder(
    userId: string,
    folder: string,
    query: MailListQueryInput
  ): Promise<{ items: MailThreadSummary[]; total: number; page: number; limit: number }> {
    const normalizedFolder = folder.toUpperCase();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    if (normalizedFolder === 'STARRED') {
      const result = await mailboxRepository.listThreadSummaries(userId, {
        page,
        limit,
        isStarred: true,
        search: query.search,
        isRead: query.isRead as boolean | undefined,
      });
      return { ...result, page, limit };
    }

    const result = await mailboxRepository.listThreadSummaries(userId, {
      folder: normalizedFolder as MailFolder,
      page,
      limit,
      search: query.search,
      label: query.label,
      isRead: query.isRead as boolean | undefined,
      isStarred: query.isStarred as boolean | undefined,
    });

    return { ...result, page, limit };
  },

  /**
   * Get full thread detail with all participant messages.
   * Enforces participant access check and marks messages read.
   * Optimized: uses batch set queries to eliminate N+1 DB round trips.
   */
  async getThreadDetail(
    userId: string,
    threadId: string,
    ipAddress?: string
  ): Promise<{ thread: MailThread; messages: MailMessageDetail[] }> {
    const thread = await threadRepository.findById(threadId);
    if (!thread) throw Object.assign(new Error('Thread not found'), { status: 404 });

    // Verify caller has at least one mailbox_item in this thread
    const accessCheck = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 1 FROM mailbox_items WHERE user_id = $1 AND thread_id = $2 LIMIT 1`,
      userId,
      threadId
    );
    if (!accessCheck[0]) throw Object.assign(new Error('Thread not found or access denied'), { status: 404 });

    // High-performance batch retrieval (3 set queries total for messages, recipients & attachments)
    const messages = await messageRepository.findDetailsByThreadId(threadId, userId);

    // Batch mark thread unread items as read in a single update query
    await mailboxRepository.markThreadRead(threadId, userId);

    await mailAuditRepository.log({
      actorUserId: userId,
      action: 'VIEW_THREAD',
      resourceType: 'thread',
      resourceId: threadId,
      ipAddress,
    });

    return { thread, messages };
  },

  /**
   * Get a single message detail with privacy filtering.
   */
  async getMessage(
    userId: string,
    messageId: string,
    ipAddress?: string
  ): Promise<MailMessageDetail> {
    const accessCheck = await mailboxRepository.findItemByMessageId(messageId, userId);
    if (!accessCheck) {
      // Also check if sender
      const msg = await messageRepository.findById(messageId);
      if (!msg || msg.senderUserId !== userId) {
        throw Object.assign(new Error('Message not found or access denied'), { status: 404 });
      }
    }

    const detail = await messageRepository.findDetailById(messageId, userId);
    if (!detail) throw Object.assign(new Error('Message not found'), { status: 404 });

    // Mark as read on view
    await prisma.$executeRawUnsafe(
      `UPDATE mailbox_items SET is_read = TRUE, updated_at = NOW()
       WHERE user_id = $1 AND message_id = $2 AND is_read = FALSE`,
      userId,
      messageId
    );

    await mailAuditRepository.log({
      actorUserId: userId,
      action: 'VIEW_MESSAGE',
      resourceType: 'message',
      resourceId: messageId,
      ipAddress,
    });

    return detail;
  },

  /**
   * Get total and unread counts for all mailbox folders.
   */
  async getCounts(userId: string): Promise<FolderCounts> {
    return mailboxRepository.getFolderCounts(userId);
  },
};

// =============================================================================
// 4. Mailbox Item Mutation Service
// =============================================================================

export const mailboxItemService = {
  /**
   * Update state of a single mailbox item (read, starred, folder, labels).
   */
  async updateItem(
    userId: string,
    itemId: string,
    input: UpdateMailboxItemInput,
    ipAddress?: string
  ) {
    const item = await mailboxRepository.findItemById(itemId, userId);
    if (!item) throw Object.assign(new Error('Mailbox item not found'), { status: 404 });

    const updated = await mailboxRepository.updateItem(itemId, userId, {
      isRead: input.isRead,
      isStarred: input.isStarred,
      folder: input.folder,
      labels: input.labels,
      snoozedUntil: input.snoozedUntil !== undefined
        ? input.snoozedUntil ? new Date(input.snoozedUntil) : null
        : undefined,
    });

    await mailAuditRepository.log({
      actorUserId: userId,
      action: 'UPDATE_ITEM',
      resourceType: 'mailbox_item',
      resourceId: itemId,
      ipAddress,
      metadata: { changes: input },
    });

    return updated;
  },

  /**
   * Delete or move to Trash.
   * If already in TRASH, permanently removes the item.
   * If in another folder, moves to TRASH.
   */
  async deleteItem(
    userId: string,
    itemId: string,
    ipAddress?: string
  ): Promise<{ action: 'TRASHED' | 'PERMANENTLY_DELETED' }> {
    const item = await mailboxRepository.findItemById(itemId, userId);
    if (!item) throw Object.assign(new Error('Mailbox item not found'), { status: 404 });

    if (item.folder === 'TRASH') {
      await mailboxRepository.permanentlyDelete(itemId, userId);
      await mailAuditRepository.log({
        actorUserId: userId,
        action: 'DELETE_PERMANENT',
        resourceType: 'mailbox_item',
        resourceId: itemId,
        ipAddress,
      });
      return { action: 'PERMANENTLY_DELETED' };
    } else {
      await mailboxRepository.updateItem(itemId, userId, { folder: 'TRASH' });
      await mailAuditRepository.log({
        actorUserId: userId,
        action: 'TRASH',
        resourceType: 'mailbox_item',
        resourceId: itemId,
        ipAddress,
        metadata: { previousFolder: item.folder },
      });
      return { action: 'TRASHED' };
    }
  },

  /**
   * Bulk mailbox operations.
   */
  async bulkAction(
    userId: string,
    input: BulkMailboxActionInput,
    ipAddress?: string
  ): Promise<{ affected: number }> {
    let updateData: Partial<{ isRead: boolean; isStarred: boolean; folder: MailFolder }> = {};

    switch (input.action) {
      case 'markRead':   updateData = { isRead: true }; break;
      case 'markUnread': updateData = { isRead: false }; break;
      case 'star':       updateData = { isStarred: true }; break;
      case 'unstar':     updateData = { isStarred: false }; break;
      case 'archive':    updateData = { folder: 'ARCHIVE' }; break;
      case 'spam':       updateData = { folder: 'SPAM' }; break;
      case 'trash':      updateData = { folder: 'TRASH' }; break;
      case 'restore':    updateData = { folder: 'INBOX' }; break;
      case 'delete': {
        let count = 0;
        for (const id of input.itemIds) {
          try {
            await mailboxRepository.permanentlyDelete(id, userId);
            count++;
          } catch {
            // ignore non-trash items
          }
        }
        return { affected: count };
      }
    }

    const count = await mailboxRepository.bulkUpdate(input.itemIds, userId, updateData);

    await mailAuditRepository.log({
      actorUserId: userId,
      action: `BULK_${input.action.toUpperCase()}`,
      resourceType: 'mailbox_item',
      resourceId: input.itemIds[0] ?? '',
      ipAddress,
      metadata: { count, action: input.action },
    });

    return { affected: count };
  },
};

// =============================================================================
// 5. Search Service
// =============================================================================

export const mailSearchService = {
  async search(
    userId: string,
    input: MailSearchQueryInput
  ): Promise<{ items: MailThreadSummary[]; total: number; page: number; limit: number }> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const result = await searchRepository.search(userId, {
      q: input.q,
      from: input.from,
      to: input.to,
      subject: input.subject,
      folder: input.folder as MailFolder | undefined,
      since: input.since,
      until: input.until,
      page,
      limit,
    });

    return { ...result, page, limit };
  },
};

// =============================================================================
// 6. Attachment Service (Step 4 Security & Storage)
// =============================================================================

export const mailAttachmentService = {
  /**
   * Upload an attachment linked to a draft or message owned by the caller.
   * Validates size, extension, sanitizes filename, and writes to private storage.
   */
  async uploadAttachment(
    user: AuthenticatedSender,
    messageId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    ipAddress?: string
  ): Promise<AttachmentUploadResponse> {
    // 1. Verify user account status
    if (user.isActive === false) {
      throw Object.assign(new Error('User account is suspended or disabled'), { status: 403 });
    }

    // 2. Verify caller is the owner/sender of the message
    const message = await messageRepository.findById(messageId);
    if (!message) {
      throw Object.assign(new Error('Message not found'), { status: 404 });
    }
    if (message.senderUserId !== user.id) {
      throw Object.assign(new Error('Access denied: You are not the sender of this message'), { status: 403 });
    }

    // 3. Validate size
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES || file.buffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
      throw Object.assign(
        new Error(`Attachment size exceeds maximum limit of 25MB (${file.size} bytes)`),
        { status: 400 }
      );
    }

    // 4. Sanitize filename and validate extension against security policy
    const cleanFilename = sanitizeFilename(file.originalname);
    const extValidation = validateAttachmentExtension(cleanFilename);
    if (!extValidation.isValid) {
      throw Object.assign(new Error(extValidation.error), { status: 400 });
    }

    // 5. Store file securely via storage adapter
    const storageAdapter = getMailStorageAdapter();
    const storageResult = await storageAdapter.save(
      file.buffer,
      cleanFilename,
      file.mimetype || 'application/octet-stream'
    );

    // 6. Persist metadata in database
    const attachment = await attachmentRepository.create({
      messageId,
      filename: cleanFilename,
      mimeType: file.mimetype || 'application/octet-stream',
      sizeBytes: storageResult.sizeBytes,
      storagePath: storageResult.storagePath,
      storageBucket: storageResult.storageBucket,
      checksumSha256: storageResult.checksumSha256,
      isInline: false,
    });

    // 7. Audit log
    await mailAuditRepository.log({
      actorUserId: user.id,
      action: 'ATTACHMENT_UPLOAD',
      resourceType: 'attachment',
      resourceId: attachment.id,
      ipAddress,
      metadata: {
        messageId,
        filename: cleanFilename,
        sizeBytes: storageResult.sizeBytes,
      },
    });

    return {
      id: attachment.id,
      messageId: attachment.messageId,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      checksumSha256: attachment.checksumSha256,
      uploadedAt: attachment.uploadedAt,
    };
  },

  /**
   * Retrieve an attachment stream for download.
   * Enforces strict mailbox-level authorization: caller must have a mailbox_item
   * for the parent message, or be the original sender.
   */
  async getAttachmentStream(
    userId: string,
    attachmentId: string,
    ipAddress?: string
  ): Promise<{ stream: NodeJS.ReadableStream; attachment: MailAttachment }> {
    const authCheck = await attachmentRepository.checkUserAccessToAttachment(attachmentId, userId);
    if (!authCheck.allowed || !authCheck.attachment) {
      // Return 404 to avoid leaking existence of private attachments
      throw Object.assign(new Error('Attachment not found or access denied'), { status: 404 });
    }

    const storageAdapter = getMailStorageAdapter();
    const stream = await storageAdapter.getStream(
      authCheck.attachment.storagePath,
      authCheck.attachment.storageBucket
    );

    await mailAuditRepository.log({
      actorUserId: userId,
      action: 'ATTACHMENT_DOWNLOAD',
      resourceType: 'attachment',
      resourceId: attachmentId,
      ipAddress,
      metadata: {
        filename: authCheck.attachment.filename,
        sizeBytes: authCheck.attachment.sizeBytes,
      },
    });

    return { stream, attachment: authCheck.attachment };
  },

  /**
   * Get metadata of an attachment with authorization check.
   */
  async getAttachmentMetadata(userId: string, attachmentId: string): Promise<MailAttachment> {
    const authCheck = await attachmentRepository.checkUserAccessToAttachment(attachmentId, userId);
    if (!authCheck.allowed || !authCheck.attachment) {
      throw Object.assign(new Error('Attachment not found or access denied'), { status: 404 });
    }
    return authCheck.attachment;
  },
};

// =============================================================================
// 7. Admin Control & Operations Service (Step 4)
// =============================================================================

export const mailAdminService = {
  async getAuditLogs(page: number, limit: number, actorUserId?: string) {
    return mailAuditRepository.list(page, limit, actorUserId);
  },

  async getOperationalMetrics(adminUserId: string, ipAddress?: string): Promise<MailOperationalMetrics> {
    const metrics = await adminRepository.getOperationalMetrics();
    await mailAuditRepository.log({
      actorUserId: adminUserId,
      action: 'ADMIN_VIEW_METRICS',
      resourceType: 'system',
      resourceId: 'metrics',
      ipAddress,
    });
    return metrics;
  },

  async getOutboxFailures(
    adminUserId: string,
    page = 1,
    limit = 20,
    ipAddress?: string
  ): Promise<{ items: MailOutboxFailure[]; total: number }> {
    const failures = await adminRepository.getOutboxFailures(page, limit);
    await mailAuditRepository.log({
      actorUserId: adminUserId,
      action: 'ADMIN_VIEW_OUTBOX_FAILURES',
      resourceType: 'system',
      resourceId: 'outbox',
      ipAddress,
      metadata: { count: failures.items.length },
    });
    return failures;
  },

  async listAddresses(
    _adminUserId: string,
    page = 1,
    limit = 20,
    search?: string
  ): Promise<{ items: MailAdminAddressSummary[]; total: number }> {
    return adminRepository.listAddresses(page, limit, search);
  },

  async updateAddressStatus(
    adminUserId: string,
    addressId: string,
    isActive: boolean,
    ipAddress?: string
  ): Promise<MailAddress> {
    const updated = await adminRepository.updateAddressStatus(addressId, isActive);
    await mailAuditRepository.log({
      actorUserId: adminUserId,
      action: 'ADMIN_UPDATE_ADDRESS_STATUS',
      resourceType: 'address',
      resourceId: addressId,
      ipAddress,
      metadata: { isActive, targetUserId: updated.userId },
    });
    return updated;
  },

  async toggleUserAccess(
    adminUserId: string,
    targetUserId: string,
    isActive: boolean,
    ipAddress?: string
  ): Promise<{ success: boolean; targetUserId: string; isActive: boolean }> {
    await adminRepository.updateUserMailAccess(targetUserId, isActive);
    await mailAuditRepository.log({
      actorUserId: adminUserId,
      action: 'ADMIN_TOGGLE_USER_ACCESS',
      resourceType: 'user',
      resourceId: targetUserId,
      ipAddress,
      metadata: { isActive },
    });
    return { success: true, targetUserId, isActive };
  },

  async createAddress(
    adminUserId: string,
    input: any,
    ipAddress?: string
  ): Promise<MailAddress> {
    const domain = input.domain || 'pacificproduct.in';
    const localPart = input.localPart.toLowerCase().trim();

    // Check collision in addresses
    const existing = await addressRepository.findByLocalPart(localPart, domain);
    if (existing) {
      throw new Error(`The email address ${localPart}@${domain} already exists.`);
    }

    const created = await addressRepository.createAddress({
      localPart,
      domain,
      displayName: input.displayName || null,
      userId: input.userId || null,
      maxStorageBytes: input.maxStorageBytes,
      dailySendQuota: input.dailySendQuota,
      isShared: Boolean(input.isShared),
      assignedBy: adminUserId,
    });

    await mailAuditRepository.log({
      actorUserId: adminUserId,
      action: 'ADMIN_CREATE_ADDRESS',
      resourceType: 'address',
      resourceId: created.id,
      ipAddress,
      metadata: { fullAddress: created.fullAddress, userId: input.userId },
    });

    return created;
  },

  async assignAddress(
    adminUserId: string,
    addressId: string,
    userId: string,
    reason?: string,
    ipAddress?: string
  ): Promise<MailAddress> {
    const targetAddr = await addressRepository.findById(addressId);
    if (!targetAddr) {
      throw new Error('Mail address not found.');
    }

    const updated = await addressRepository.assignUser(addressId, userId, adminUserId, reason);

    await mailAuditRepository.log({
      actorUserId: adminUserId,
      action: 'ADMIN_ASSIGN_ADDRESS',
      resourceType: 'address',
      resourceId: addressId,
      ipAddress,
      metadata: { targetUserId: userId, previousUserId: targetAddr.userId, reason },
    });

    return updated;
  },

  async unassignAddress(
    adminUserId: string,
    addressId: string,
    reason?: string,
    ipAddress?: string
  ): Promise<MailAddress> {
    const targetAddr = await addressRepository.findById(addressId);
    if (!targetAddr) {
      throw new Error('Mail address not found.');
    }

    const updated = await addressRepository.unassignUser(addressId, adminUserId, reason);

    await mailAuditRepository.log({
      actorUserId: adminUserId,
      action: 'ADMIN_UNASSIGN_ADDRESS',
      resourceType: 'address',
      resourceId: addressId,
      ipAddress,
      metadata: { previousUserId: targetAddr.userId, reason },
    });

    return updated;
  },

  async updateAddressQuotas(
    adminUserId: string,
    addressId: string,
    quotas: { maxStorageBytes?: number; dailySendQuota?: number },
    ipAddress?: string
  ): Promise<MailAddress> {
    const updated = await addressRepository.updateQuotas(addressId, quotas);

    await mailAuditRepository.log({
      actorUserId: adminUserId,
      action: 'ADMIN_UPDATE_QUOTAS',
      resourceType: 'address',
      resourceId: addressId,
      ipAddress,
      metadata: quotas,
    });

    return updated;
  },

  async getAssignmentHistory(adminUserId: string, addressId: string): Promise<any[]> {
    return addressRepository.getAssignmentHistory(addressId);
  },

  async createAlias(
    adminUserId: string,
    input: any,
    ipAddress?: string
  ): Promise<any> {
    const created = await addressRepository.createAlias(
      input.addressId,
      input.aliasLocalPart.toLowerCase().trim(),
      input.aliasDomain || 'pacificproduct.in',
      input.displayName
    );

    await mailAuditRepository.log({
      actorUserId: adminUserId,
      action: 'ADMIN_CREATE_ALIAS',
      resourceType: 'alias',
      resourceId: created.id,
      ipAddress,
      metadata: { alias: `${created.alias_local_part}@${created.alias_domain}` },
    });

    return created;
  },

  async deleteAlias(
    adminUserId: string,
    aliasId: string,
    ipAddress?: string
  ): Promise<boolean> {
    const deleted = await addressRepository.deleteAlias(aliasId);

    await mailAuditRepository.log({
      actorUserId: adminUserId,
      action: 'ADMIN_DELETE_ALIAS',
      resourceType: 'alias',
      resourceId: aliasId,
      ipAddress,
    });

    return deleted;
  },

  async listAliases(addressId: string): Promise<any[]> {
    return addressRepository.listAliases(addressId);
  },

  async getDnsReadinessReport(): Promise<any> {
    const dns = await import('dns').then((d) => d.promises).catch(() => null);
    const domain = 'pacificproduct.in';
    let mxRecords: any[] = [];
    let txtRecords: any[] = [];
    let dmarcRecords: any[] = [];

    if (dns) {
      try {
        mxRecords = await dns.resolveMx(domain);
      } catch {}
      try {
        txtRecords = await dns.resolveTxt(domain);
      } catch {}
      try {
        dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
      } catch {}
    }

    const flatTxt = txtRecords.map((t) => (Array.isArray(t) ? t.join('') : String(t)));
    const spfRecord = flatTxt.find((t) => t.startsWith('v=spf1')) || null;
    const flatDmarc = dmarcRecords.map((t) => (Array.isArray(t) ? t.join('') : String(t)));
    const dmarcRecord = flatDmarc.find((t) => t.startsWith('v=DMARC1')) || null;

    const isGoogleActive = mxRecords.some((r) => r.exchange?.includes('google'));

    return {
      domain,
      inspectedAt: new Date().toISOString(),
      hasMx: mxRecords.length > 0,
      currentMx: mxRecords,
      hasSpf: Boolean(spfRecord),
      currentSpf: spfRecord,
      hasDmarc: Boolean(dmarcRecord),
      currentDmarc: dmarcRecord,
      isGoogleWorkspaceActive: isGoogleActive,
      isExternalSendingReady: process.env.MAIL_EXTERNAL_SENDING_ENABLED === 'true',
      isExternalReceivingReady: process.env.MAIL_EXTERNAL_RECEIVING_ENABLED === 'true',
      proposedChangesPlan: {
        status: 'PROPOSED_NOT_APPLIED',
        subdomainOutbound: `mail.${domain}`,
        subdomainInbound: `inbound.${domain}`,
        requiredRecords: [
          {
            type: 'TXT',
            host: `mail.${domain}`,
            value: 'v=spf1 include:_spf.google.com ~all',
            purpose: 'Authorized outbound sending for Pacific Mail without disturbing primary root SPF',
          },
          {
            type: 'TXT',
            host: `_dmarc.${domain}`,
            value: 'v=DMARC1; p=none; rua=mailto:dmarc-reports@pacificproduct.in',
            purpose: 'Standard monitoring DMARC policy (reports-only; zero disruption to delivery)',
          },
          {
            type: 'MX',
            host: `inbound.${domain}`,
            value: 'inbound-gateway.pacificproduct.in',
            priority: 10,
            purpose: 'Dedicated inbound gateway subdomain preserving root Google Workspace MX',
          },
        ],
        notes: [
          'DO NOT replace or remove root MX: smtp.google.com priority 1 (live Google Workspace business mail).',
          'DO NOT publish multiple SPF strings on root @.',
          'Subdomain routing isolates Pacific Mail transactional gateway while preserving 100% of existing office mail.',
          'All proposed changes must be reviewed and explicitly approved before any nameserver update.',
        ],
      },
    };
  },
};
