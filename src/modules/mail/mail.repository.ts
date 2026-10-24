// =============================================================================
// Pacific Mail — Repository Layer
// All database access goes through this layer.
// Uses parameterised SQL queries to prevent SQL injection.
// Supports passing transaction client (tx) for atomic operations.
// =============================================================================

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

export type DbClient = PrismaClient | Prisma.TransactionClient;
import type {
  MailAddress,
  MailThread,
  MailMessage,
  MailRecipient,
  MailboxItem,
  MailAttachment,
  MailOutbox,
  MailThreadSummary,
  MailMessageDetail,
  MailListQuery,
  MailFolder,
  FolderCounts,
  MailOperationalMetrics,
  MailOutboxFailure,
  MailAdminAddressSummary,
} from './mail.types';

// ─────────────────────────────────────────────────────────────────────────────
// Address Repository
// ─────────────────────────────────────────────────────────────────────────────

export const addressRepository = {
  /** Find the primary active address for a user. */
  async findByUserId(userId: string, client: DbClient = prisma): Promise<MailAddress | null> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT a.*, u.email as user_email, u."firstName" as user_first_name, u."lastName" as user_last_name
       FROM mail_addresses a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.user_id = $1 AND a.is_primary = TRUE AND a.is_active = TRUE
       LIMIT 1`,
      userId
    );
    return rows[0] ? mapAddress(rows[0]) : null;
  },

  async findById(id: string, client: DbClient = prisma): Promise<MailAddress | null> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT a.*, u.email as user_email, u."firstName" as user_first_name, u."lastName" as user_last_name
       FROM mail_addresses a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      id
    );
    return rows[0] ? mapAddress(rows[0]) : null;
  },

  async findByLocalPart(localPart: string, domain = 'pacificproduct.in', client: DbClient = prisma): Promise<MailAddress | null> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT a.*, u.email as user_email, u."firstName" as user_first_name, u."lastName" as user_last_name
       FROM mail_addresses a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.local_part = $1 AND a.domain = $2`,
      localPart,
      domain
    );
    return rows[0] ? mapAddress(rows[0]) : null;
  },

  /** Resolve recipient address together with user active status (supports aliases & dual domains) */
  async resolveRecipientWithUserStatus(
    localPart: string,
    domain = 'pacificproduct.in',
    client: DbClient = prisma
  ): Promise<{ address: MailAddress; userActive: boolean; addressActive: boolean } | null> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT a.*,
              u."isActive" as user_active,
              u.email as user_email,
              u."firstName" as user_first_name,
              u."lastName" as user_last_name
       FROM mail_addresses a
       LEFT JOIN mail_aliases al ON al.address_id = a.id AND al.is_active = TRUE
       LEFT JOIN users u ON u.id = a.user_id
       WHERE (a.local_part = $1 AND (a.domain = $2 OR a.domain = 'pacific.internal' OR a.domain = 'pacificproduct.in'))
          OR (al.alias_local_part = $1 AND (al.alias_domain = $2 OR al.alias_domain = 'pacificproduct.in'))
       LIMIT 1`,
      localPart,
      domain
    );
    if (!rows[0]) return null;
    return {
      address: mapAddress(rows[0]),
      userActive: rows[0].user_id ? Boolean(rows[0].user_active) : true,
      addressActive: Boolean(rows[0].is_active),
    };
  },

  /** Admin create a new address record */
  async createAddress(
    params: {
      localPart: string;
      domain?: string;
      displayName?: string | null;
      userId?: string | null;
      maxStorageBytes?: number;
      dailySendQuota?: number;
      isShared?: boolean;
      assignedBy?: string | null;
    },
    client: DbClient = prisma
  ): Promise<MailAddress> {
    const domain = params.domain || 'pacificproduct.in';
    const isPrimary = params.userId ? true : false;

    if (params.userId) {
      await client.$executeRawUnsafe(
        `UPDATE mail_addresses SET is_primary = FALSE WHERE user_id = $1 AND is_primary = TRUE`,
        params.userId
      );
    }

    const rows = await client.$queryRawUnsafe<any[]>(
      `INSERT INTO mail_addresses (
         user_id, local_part, domain, display_name, is_primary, is_active,
         verification_status, max_storage_bytes, daily_send_quota, is_shared,
         assigned_by, assigned_at
       )
       VALUES (
         $1::TEXT, $2, $3, $4, $5, TRUE,
         'INTERNAL_ONLY'::"MailAddressStatus",
         $6::BIGINT, $7::INT, $8::BOOLEAN, $9::TEXT,
         CASE WHEN $1::TEXT IS NOT NULL THEN NOW() ELSE NULL END
       )
       RETURNING *`,
      params.userId ?? null,
      params.localPart,
      domain,
      params.displayName ?? null,
      isPrimary,
      params.maxStorageBytes ?? 524288000,
      params.dailySendQuota ?? 100,
      Boolean(params.isShared),
      params.assignedBy ?? null
    );

    const created = mapAddress(rows[0]);

    if (params.userId) {
      await client.$executeRawUnsafe(
        `INSERT INTO mail_address_assignments (address_id, user_id, assigned_by, assigned_at, reason)
         VALUES ($1, $2, $3, NOW(), 'Initial address creation & assignment')`,
        created.id,
        params.userId,
        params.assignedBy ?? null
      );
    }

    return created;
  },

  /** Admin assign an address to a user */
  async assignUser(
    addressId: string,
    userId: string,
    assignedBy: string | null,
    reason?: string,
    client: DbClient = prisma
  ): Promise<MailAddress> {
    // 1. Close any previous open assignment in history
    await client.$executeRawUnsafe(
      `UPDATE mail_address_assignments
       SET unassigned_at = NOW(), reason = COALESCE($1::TEXT, reason)
       WHERE address_id = $2 AND unassigned_at IS NULL`,
      reason ? `Reassigned: ${reason}` : 'Reassigned to another user',
      addressId
    );

    // 2. Clear is_primary on previous user's addresses if making this one primary
    await client.$executeRawUnsafe(
      `UPDATE mail_addresses SET is_primary = FALSE WHERE user_id = $1 AND is_primary = TRUE`,
      userId
    );

    // 3. Update address row
    const rows = await client.$queryRawUnsafe<any[]>(
      `UPDATE mail_addresses
       SET user_id = $1, assigned_by = $2::TEXT, assigned_at = NOW(), is_primary = TRUE, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      userId,
      assignedBy,
      addressId
    );

    // 4. Record new assignment entry
    await client.$executeRawUnsafe(
      `INSERT INTO mail_address_assignments (address_id, user_id, assigned_by, assigned_at, reason)
       VALUES ($1, $2, $3::TEXT, NOW(), $4::TEXT)`,
      addressId,
      userId,
      assignedBy,
      reason ?? 'Assigned by administrator'
    );

    return mapAddress(rows[0]);
  },

  /** Admin unassign an address from a user */
  async unassignUser(
    addressId: string,
    assignedBy: string | null,
    reason?: string,
    client: DbClient = prisma
  ): Promise<MailAddress> {
    // 1. Close open assignment in history
    await client.$executeRawUnsafe(
      `UPDATE mail_address_assignments
       SET unassigned_at = NOW(), reason = COALESCE($1::TEXT, 'Unassigned by administrator')
       WHERE address_id = $2 AND unassigned_at IS NULL`,
      reason ?? null,
      addressId
    );

    // 2. Set user_id to NULL
    const rows = await client.$queryRawUnsafe<any[]>(
      `UPDATE mail_addresses
       SET user_id = NULL, assigned_by = $1::TEXT, assigned_at = NULL, is_primary = FALSE, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      assignedBy,
      addressId
    );

    return mapAddress(rows[0]);
  },

  /** Admin update storage & send quotas */
  async updateQuotas(
    addressId: string,
    quotas: { maxStorageBytes?: number; dailySendQuota?: number },
    client: DbClient = prisma
  ): Promise<MailAddress> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `UPDATE mail_addresses
       SET max_storage_bytes = COALESCE($1::BIGINT, max_storage_bytes),
           daily_send_quota  = COALESCE($2::INT, daily_send_quota),
           updated_at        = NOW()
       WHERE id = $3
       RETURNING *`,
      quotas.maxStorageBytes ?? null,
      quotas.dailySendQuota ?? null,
      addressId
    );
    return mapAddress(rows[0]);
  },

  /** Get assignment history */
  async getAssignmentHistory(addressId: string, client: DbClient = prisma): Promise<any[]> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT a.*,
              u.email AS user_email,
              admin_u.email AS assigned_by_email
       FROM mail_address_assignments a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN users admin_u ON admin_u.id = a.assigned_by
       WHERE a.address_id = $1
       ORDER BY a.assigned_at DESC`,
      addressId
    );
    return rows.map((r) => ({
      id: r.id,
      addressId: r.address_id,
      userId: r.user_id,
      userEmail: r.user_email,
      assignedBy: r.assigned_by,
      assignedByEmail: r.assigned_by_email,
      assignedAt: r.assigned_at,
      unassignedAt: r.unassigned_at,
      reason: r.reason,
      createdAt: r.created_at,
    }));
  },

  /** Alias Management */
  async createAlias(
    addressId: string,
    aliasLocalPart: string,
    aliasDomain = 'pacificproduct.in',
    displayName?: string | null,
    client: DbClient = prisma
  ): Promise<any> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `INSERT INTO mail_aliases (address_id, alias_local_part, alias_domain, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      addressId,
      aliasLocalPart,
      aliasDomain,
      displayName ?? null
    );
    return rows[0];
  },

  async deleteAlias(aliasId: string, client: DbClient = prisma): Promise<boolean> {
    const count = await client.$executeRawUnsafe(`DELETE FROM mail_aliases WHERE id = $1`, aliasId);
    return count > 0;
  },

  async listAliases(addressId: string, client: DbClient = prisma): Promise<any[]> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT * FROM mail_aliases WHERE address_id = $1 ORDER BY created_at DESC`,
      addressId
    );
    return rows;
  },

  async upsert(
    userId: string,
    localPart: string,
    displayName: string | null,
    domain = 'pacificproduct.in',
    client: DbClient = prisma
  ): Promise<MailAddress> {
    await client.$executeRawUnsafe(
      `UPDATE mail_addresses SET is_primary = FALSE WHERE user_id = $1 AND is_primary = TRUE`,
      userId
    );

    const rows = await client.$queryRawUnsafe<any[]>(
      `INSERT INTO mail_addresses (user_id, local_part, domain, display_name, is_primary, is_active)
       VALUES ($1, $2, $3, $4, TRUE, TRUE)
       ON CONFLICT (local_part, domain) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             is_primary   = TRUE,
             is_active    = TRUE,
             updated_at   = NOW()
       RETURNING *`,
      userId,
      localPart,
      domain,
      displayName
    );
    return mapAddress(rows[0]);
  },

  /** Auto-provision an internal email address for any authenticated user if they don't have one */
  async autoProvisionIfMissing(
    userId: string,
    firstName: string,
    lastName: string,
    email: string,
    client: DbClient = prisma
  ): Promise<MailAddress> {
    const existing = await this.findByUserId(userId, client);
    if (existing) return existing;

    // Create a sensible local_part: firstName.lastName or email prefix
    let candidate = `${firstName}.${lastName}`.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!candidate || candidate.length < 3) {
      candidate = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
    }
    if (!candidate || candidate.length < 3) {
      candidate = `user.${userId.slice(0, 8)}`;
    }
    if (candidate.length > 50) {
      candidate = candidate.slice(0, 50);
    }

    const domain = 'pacific.internal';
    const displayName = `${firstName} ${lastName}`.trim() || null;

    // Check collision
    const collision = await this.findByLocalPart(candidate, domain, client);
    if (collision && collision.userId !== userId) {
      candidate = `${candidate}.${userId.slice(0, 4)}`;
    }

    return this.upsert(userId, candidate, displayName, domain, client);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Thread Repository
// ─────────────────────────────────────────────────────────────────────────────

export const threadRepository = {
  async create(subject: string, createdBy: string, client: DbClient = prisma): Promise<MailThread> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `INSERT INTO mail_threads (subject, created_by, last_message_at)
       VALUES ($1, $2, NOW())
       RETURNING id, subject, created_by, last_message_at, message_count, created_at, updated_at`,
      subject,
      createdBy
    );
    return mapThread(rows[0]);
  },

  async findById(id: string, client: DbClient = prisma): Promise<MailThread | null> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT id, subject, created_by, last_message_at, message_count, created_at, updated_at
       FROM mail_threads WHERE id = $1`,
      id
    );
    return rows[0] ? mapThread(rows[0]) : null;
  },

  async touch(id: string, client: DbClient = prisma): Promise<void> {
    await client.$executeRawUnsafe(
      `UPDATE mail_threads
       SET last_message_at = NOW(),
           message_count = message_count + 1,
           updated_at = NOW()
       WHERE id = $1`,
      id
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Message Repository
// ─────────────────────────────────────────────────────────────────────────────

export const messageRepository = {
  async create(data: {
    threadId: string;
    parentId: string | null;
    fromAddressId: string;
    senderUserId: string;
    subject: string;
    bodyText: string | null;
    bodyHtml: string | null;
    isDraft: boolean;
    sizeBytes: number;
    messageIdHeader: string | null;
    inReplyTo?: string | null;
    references?: string[];
    idempotencyKey?: string | null;
  }, client: DbClient = prisma): Promise<MailMessage> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `INSERT INTO mail_messages
         (thread_id, parent_id, from_address_id, sender_user_id, subject,
          body_text, body_html, is_draft, size_bytes, message_id_header,
          in_reply_to, "references", idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      data.threadId,
      data.parentId,
      data.fromAddressId,
      data.senderUserId,
      data.subject,
      data.bodyText,
      data.bodyHtml,
      data.isDraft,
      data.sizeBytes,
      data.messageIdHeader,
      data.inReplyTo ?? null,
      data.references ?? [],
      data.idempotencyKey ?? null
    );
    return mapMessage(rows[0]);
  },

  async markSent(id: string, client: DbClient = prisma): Promise<MailMessage> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `UPDATE mail_messages SET is_draft = FALSE, sent_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      id
    );
    if (!rows[0]) throw Object.assign(new Error('Message not found'), { status: 404 });
    return mapMessage(rows[0]);
  },

  async findById(id: string, client: DbClient = prisma): Promise<MailMessage | null> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT * FROM mail_messages WHERE id = $1`,
      id
    );
    return rows[0] ? mapMessage(rows[0]) : null;
  },

  async findByIdempotencyKey(senderUserId: string, idempotencyKey: string, client: DbClient = prisma): Promise<MailMessage | null> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT * FROM mail_messages WHERE sender_user_id = $1 AND idempotency_key = $2 LIMIT 1`,
      senderUserId,
      idempotencyKey
    );
    return rows[0] ? mapMessage(rows[0]) : null;
  },

  async countRecentSends(senderUserId: string, sinceDate: Date, client: DbClient = prisma): Promise<number> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as count FROM mail_messages
       WHERE sender_user_id = $1 AND sent_at >= $2 AND is_draft = FALSE`,
      senderUserId,
      sinceDate
    );
    return rows[0] ? Number(rows[0].count) : 0;
  },

  async findDetailById(id: string, callerUserId: string, client: DbClient = prisma): Promise<MailMessageDetail | null> {
    const msgRows = await client.$queryRawUnsafe<any[]>(
      `SELECT m.*,
              a.local_part as from_local_part, a.domain as from_domain, a.display_name as from_display_name
       FROM mail_messages m
       JOIN mail_addresses a ON a.id = m.from_address_id
       WHERE m.id = $1`,
      id
    );
    if (!msgRows[0]) return null;

    const msg = mapMessage(msgRows[0]);

    // BCC Privacy Protection: BCC rows are NEVER returned to non-sender callers
    const isSender = msg.senderUserId === callerUserId;
    const recipRows = await client.$queryRawUnsafe<any[]>(
      isSender
        ? `SELECT id, type, raw_email, user_id FROM mail_recipients WHERE message_id = $1`
        : `SELECT id, type, raw_email, user_id FROM mail_recipients WHERE message_id = $1 AND type != 'BCC'::"MailRecipientType"`,
      id
    );

    const attachRows = await client.$queryRawUnsafe<any[]>(
      `SELECT * FROM mail_attachments WHERE message_id = $1`,
      id
    );

    const result: MailMessageDetail = {
      ...msg,
      fromAddress: {
        id: msgRows[0].from_address_id,
        localPart: msgRows[0].from_local_part,
        domain: msgRows[0].from_domain,
        displayName: msgRows[0].from_display_name,
      },
      recipients: recipRows
        .filter((r: any) => r.type !== 'BCC')
        .map((r: any) => ({ id: r.id, type: r.type, rawEmail: r.raw_email, userId: r.user_id })),
      attachments: attachRows.map(mapAttachment),
    };

    if (isSender) {
      result.bccRecipients = recipRows
        .filter((r: any) => r.type === 'BCC')
        .map((r: any) => ({ id: r.id, rawEmail: r.raw_email, userId: r.user_id }));
    }

    return result;
  },

  /**
   * High-Performance Thread Detail Fetcher:
   * Eliminates N+1 database queries by batch-loading messages, recipients,
   * and attachments for the entire thread in just 3 set queries.
   */
  async findDetailsByThreadId(
    threadId: string,
    callerUserId: string,
    client: DbClient = prisma
  ): Promise<MailMessageDetail[]> {
    // 1. Fetch all messages in thread visible to the caller
    const msgRows = await client.$queryRawUnsafe<any[]>(
      `SELECT m.*,
              a.local_part as from_local_part, a.domain as from_domain, a.display_name as from_display_name
       FROM mail_messages m
       JOIN mail_addresses a ON a.id = m.from_address_id
       JOIN mailbox_items mi ON mi.message_id = m.id
       WHERE mi.user_id = $1 AND mi.thread_id = $2
       ORDER BY m.sent_at ASC NULLS LAST, m.created_at ASC`,
      callerUserId,
      threadId
    );

    if (!msgRows || msgRows.length === 0) {
      return [];
    }

    const messageIds = msgRows.map((r) => r.id);

    // 2. Batch fetch all recipients for all messages in thread
    const recipRows = await client.$queryRawUnsafe<any[]>(
      `SELECT id, message_id, type, raw_email, user_id
       FROM mail_recipients
       WHERE message_id = ANY($1)`,
      messageIds
    );

    const recipsByMessage = new Map<string, any[]>();
    for (const r of recipRows) {
      const list = recipsByMessage.get(r.message_id) || [];
      list.push(r);
      recipsByMessage.set(r.message_id, list);
    }

    // 3. Batch fetch all attachments for all messages in thread
    const attachRows = await client.$queryRawUnsafe<any[]>(
      `SELECT * FROM mail_attachments WHERE message_id = ANY($1) ORDER BY uploaded_at ASC`,
      messageIds
    );

    const attachesByMessage = new Map<string, any[]>();
    for (const a of attachRows) {
      const list = attachesByMessage.get(a.message_id) || [];
      list.push(a);
      attachesByMessage.set(a.message_id, list);
    }

    // 4. Assemble message details with strict BCC isolation
    return msgRows.map((r) => {
      const msg = mapMessage(r);
      const isSender = msg.senderUserId === callerUserId;
      const allRecips = recipsByMessage.get(msg.id) || [];
      const allAttaches = attachesByMessage.get(msg.id) || [];

      const publicRecips = allRecips
        .filter((recip) => recip.type !== 'BCC')
        .map((recip) => ({
          id: recip.id,
          type: recip.type,
          rawEmail: recip.raw_email,
          userId: recip.user_id,
        }));

      const detail: MailMessageDetail = {
        ...msg,
        fromAddress: {
          id: r.from_address_id,
          localPart: r.from_local_part,
          domain: r.from_domain,
          displayName: r.from_display_name,
        },
        recipients: publicRecips,
        attachments: allAttaches.map(mapAttachment),
      };

      if (isSender) {
        detail.bccRecipients = allRecips
          .filter((recip) => recip.type === 'BCC')
          .map((recip) => ({
            id: recip.id,
            rawEmail: recip.raw_email,
            userId: recip.user_id,
          }));
      }

      return detail;
    });
  },

  async updateDraft(
    id: string,
    senderUserId: string,
    data: Partial<{
      subject: string;
      bodyText: string | null;
      bodyHtml: string | null;
      sizeBytes: number;
    }>,
    client: DbClient = prisma
  ): Promise<MailMessage> {
    const check = await client.$queryRawUnsafe<any[]>(
      `SELECT id FROM mail_messages WHERE id = $1 AND sender_user_id = $2 AND is_draft = TRUE`,
      id,
      senderUserId
    );
    if (!check[0]) throw Object.assign(new Error('Draft not found or access denied'), { status: 404 });

    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [id, senderUserId];
    let idx = 3;

    if (data.subject !== undefined) { sets.push(`subject = $${idx++}`); params.push(data.subject); }
    if (data.bodyText !== undefined) { sets.push(`body_text = $${idx++}`); params.push(data.bodyText); }
    if (data.bodyHtml !== undefined) { sets.push(`body_html = $${idx++}`); params.push(data.bodyHtml); }
    if (data.sizeBytes !== undefined) { sets.push(`size_bytes = $${idx++}`); params.push(data.sizeBytes); }

    const rows = await client.$queryRawUnsafe<any[]>(
      `UPDATE mail_messages SET ${sets.join(', ')} WHERE id = $1 AND sender_user_id = $2 RETURNING *`,
      ...params
    );
    return mapMessage(rows[0]);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Recipient Repository
// ─────────────────────────────────────────────────────────────────────────────

export const recipientRepository = {
  async createMany(
    messageId: string,
    recipients: Array<{ type: 'TO' | 'CC' | 'BCC'; addressId: string | null; userId: string | null; rawEmail: string }>,
    client: DbClient = prisma
  ): Promise<void> {
    if (recipients.length === 0) return;

    const valuePlaceholders = recipients
      .map((_, i) => {
        const base = i * 4;
        return `($${base + 1}, $${base + 2}, $${base + 3}::"MailRecipientType", $${base + 4})`;
      })
      .join(', ');

    const params: any[] = [];
    for (const r of recipients) {
      params.push(messageId, r.rawEmail, r.type, r.userId ?? null);
    }

    await client.$executeRawUnsafe(
      `INSERT INTO mail_recipients (message_id, raw_email, type, user_id) VALUES ${valuePlaceholders}`,
      ...params
    );
  },

  async deleteByMessage(messageId: string, client: DbClient = prisma): Promise<void> {
    await client.$executeRawUnsafe(
      `DELETE FROM mail_recipients WHERE message_id = $1`,
      messageId
    );
  },

  async findByMessage(messageId: string, client: DbClient = prisma): Promise<MailRecipient[]> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT * FROM mail_recipients WHERE message_id = $1`,
      messageId
    );
    return rows.map((r: any) => ({
      id: r.id,
      messageId: r.message_id,
      type: r.type,
      addressId: r.address_id,
      userId: r.user_id,
      rawEmail: r.raw_email,
      createdAt: r.created_at,
    }));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Mailbox Item Repository
// ─────────────────────────────────────────────────────────────────────────────

export const mailboxRepository = {
  async createItems(
    messageId: string,
    threadId: string,
    recipientUserIds: string[],
    folder: MailFolder = 'INBOX',
    client: DbClient = prisma
  ): Promise<void> {
    if (recipientUserIds.length === 0) return;

    const valuePlaceholders = recipientUserIds
      .map((_, i) => {
        const base = i * 4;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::"MailFolder")`;
      })
      .join(', ');

    const params: any[] = [];
    for (const uid of recipientUserIds) {
      params.push(uid, messageId, threadId, folder);
    }

    await client.$executeRawUnsafe(
      `INSERT INTO mailbox_items (user_id, message_id, thread_id, folder)
       VALUES ${valuePlaceholders}
       ON CONFLICT ("user_id", "message_id", "folder") DO NOTHING`,
      ...params
    );
  },

  async listThreadSummaries(
    userId: string,
    query: MailListQuery,
    client: DbClient = prisma
  ): Promise<{ items: MailThreadSummary[]; total: number }> {
    const folder = query.folder ?? 'INBOX';
    const page  = Math.max(1, query.page  ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const params: any[] = [userId, folder];
    let idx = 3;

    const extraConditions: string[] = [];

    if (query.isRead !== undefined) {
      extraConditions.push(`mi.is_read = $${idx++}`);
      params.push(query.isRead);
    }
    if (query.isStarred !== undefined) {
      extraConditions.push(`mi.is_starred = $${idx++}`);
      params.push(query.isStarred);
    }
    if (query.label) {
      extraConditions.push(`$${idx++} = ANY(mi.labels)`);
      params.push(query.label);
    }
    if (query.search) {
      extraConditions.push(`(t.subject ILIKE $${idx} OR m.body_text ILIKE $${idx})`);
      params.push(`%${query.search}%`);
      idx++;
    }

    const where = extraConditions.length
      ? `AND ${extraConditions.join(' AND ')}`
      : '';

    const sql = `
      WITH latest_msg AS (
        SELECT DISTINCT ON (mi.thread_id)
          mi.id          AS mailbox_item_id,
          mi.thread_id,
          mi.folder,
          mi.is_read,
          mi.is_starred,
          mi.labels,
          mi.received_at,
          m.id           AS message_id,
          m.subject,
          m.body_text,
          m.sent_at,
          a.local_part   AS from_local,
          a.domain       AS from_domain,
          a.display_name AS from_display_name,
          t.message_count,
          t.last_message_at
        FROM mailbox_items mi
        JOIN mail_messages m  ON m.id  = mi.message_id
        JOIN mail_threads  t  ON t.id  = mi.thread_id
        JOIN mail_addresses a ON a.id  = m.from_address_id
        WHERE mi.user_id = $1
          AND mi.folder  = $2::"MailFolder"
          ${where}
        ORDER BY mi.thread_id, mi.received_at DESC
      ),
      with_attachments AS (
        SELECT lm.*,
               EXISTS(
                 SELECT 1 FROM mail_attachments att WHERE att.message_id = lm.message_id
               ) AS has_attachments
        FROM latest_msg lm
      )
      SELECT *, COUNT(*) OVER() AS total_count
      FROM with_attachments
      ORDER BY last_message_at DESC NULLS LAST, received_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    params.push(limit, offset);

    const rows = await client.$queryRawUnsafe<any[]>(sql, ...params);
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return {
      total,
      items: rows.map((r: any) => ({
        id: r.thread_id,
        subject: r.subject,
        lastMessageAt: r.last_message_at,
        messageCount: Number(r.message_count),
        snippet: r.body_text ? r.body_text.slice(0, 180) : null,
        fromDisplayName: r.from_display_name,
        fromEmail: `${r.from_local}@${r.from_domain}`,
        isRead: r.is_read,
        isStarred: r.is_starred,
        folder: r.folder,
        hasAttachments: r.has_attachments,
        labels: r.labels ?? [],
        mailboxItemId: r.mailbox_item_id,
      })),
    };
  },

  async findItemById(itemId: string, userId: string, client: DbClient = prisma): Promise<MailboxItem | null> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT * FROM mailbox_items WHERE id = $1 AND user_id = $2`,
      itemId,
      userId
    );
    return rows[0] ? mapMailboxItem(rows[0]) : null;
  },

  async findItemByMessageId(messageId: string, userId: string, client: DbClient = prisma): Promise<MailboxItem | null> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT * FROM mailbox_items WHERE message_id = $1 AND user_id = $2 LIMIT 1`,
      messageId,
      userId
    );
    return rows[0] ? mapMailboxItem(rows[0]) : null;
  },

  async updateItem(
    itemId: string,
    userId: string,
    data: Partial<{
      isRead: boolean;
      isStarred: boolean;
      folder: MailFolder;
      labels: string[];
      snoozedUntil: Date | null;
    }>,
    client: DbClient = prisma
  ): Promise<MailboxItem> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [itemId, userId];
    let idx = 3;

    if (data.isRead     !== undefined) { sets.push(`is_read     = $${idx++}`); params.push(data.isRead); }
    if (data.isStarred  !== undefined) { sets.push(`is_starred  = $${idx++}`); params.push(data.isStarred); }
    if (data.folder     !== undefined) { sets.push(`folder      = $${idx++}::"MailFolder"`); params.push(data.folder); }
    if (data.labels     !== undefined) { sets.push(`labels      = $${idx++}`); params.push(data.labels); }
    if (data.snoozedUntil !== undefined) { sets.push(`snoozed_until = $${idx++}`); params.push(data.snoozedUntil); }

    const rows = await client.$queryRawUnsafe<any[]>(
      `UPDATE mailbox_items SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`,
      ...params
    );
    if (!rows[0]) throw Object.assign(new Error('Mailbox item not found'), { status: 404 });
    return mapMailboxItem(rows[0]);
  },

  async bulkUpdate(
    itemIds: string[],
    userId: string,
    data: Partial<{ isRead: boolean; isStarred: boolean; folder: MailFolder }>,
    client: DbClient = prisma
  ): Promise<number> {
    if (itemIds.length === 0) return 0;

    const sets: string[] = ['updated_at = NOW()'];
    const idPlaceholders = itemIds.map((_, i) => `$${i + 1}`).join(', ');
    const params: any[] = [...itemIds, userId];
    let idx = itemIds.length + 2;

    if (data.isRead     !== undefined) { sets.push(`is_read     = $${idx++}`); params.push(data.isRead); }
    if (data.isStarred  !== undefined) { sets.push(`is_starred  = $${idx++}`); params.push(data.isStarred); }
    if (data.folder     !== undefined) { sets.push(`folder      = $${idx++}::"MailFolder"`); params.push(data.folder); }

    const result = await client.$executeRawUnsafe(
      `UPDATE mailbox_items
       SET ${sets.join(', ')}
       WHERE id IN (${idPlaceholders}) AND user_id = $${itemIds.length + 1}`,
      ...params
    );
    return Number(result);
  },

  async permanentlyDelete(itemId: string, userId: string, client: DbClient = prisma): Promise<void> {
    const check = await client.$queryRawUnsafe<any[]>(
      `SELECT id FROM mailbox_items WHERE id = $1 AND user_id = $2 AND folder = 'TRASH'::"MailFolder"`,
      itemId,
      userId
    );
    if (!check[0]) throw Object.assign(new Error('Item not in Trash or not found'), { status: 400 });

    await client.$executeRawUnsafe(
      `DELETE FROM mailbox_items WHERE id = $1 AND user_id = $2`,
      itemId,
      userId
    );
  },

  async getFolderCounts(userId: string, client: DbClient = prisma): Promise<FolderCounts> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT
         folder,
         COUNT(*)::int AS total,
         COUNT(CASE WHEN is_read = FALSE THEN 1 END)::int AS unread
       FROM mailbox_items
       WHERE user_id = $1
       GROUP BY folder`,
      userId
    );

    const starredRow = await client.$queryRawUnsafe<any[]>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(CASE WHEN is_read = FALSE THEN 1 END)::int AS unread
       FROM mailbox_items
       WHERE user_id = $1 AND is_starred = TRUE`,
      userId
    );

    const counts: FolderCounts = {
      inbox:   { total: 0, unread: 0 },
      sent:    { total: 0, unread: 0 },
      drafts:  { total: 0, unread: 0 },
      archive: { total: 0, unread: 0 },
      spam:    { total: 0, unread: 0 },
      trash:   { total: 0, unread: 0 },
      starred: {
        total: starredRow[0] ? Number(starredRow[0].total) : 0,
        unread: starredRow[0] ? Number(starredRow[0].unread) : 0,
      },
    };

    for (const r of rows) {
      const f = String(r.folder).toLowerCase() as keyof Omit<FolderCounts, 'starred'>;
      if (counts[f]) {
        counts[f].total = Number(r.total);
        counts[f].unread = Number(r.unread);
      }
    }

    return counts;
  },

  /** Batch mark all unread messages in a thread as read in a single SQL update */
  async markThreadRead(threadId: string, userId: string, client: DbClient = prisma): Promise<number> {
    return client.$executeRawUnsafe(
      `UPDATE mailbox_items
       SET is_read = TRUE, updated_at = NOW()
       WHERE user_id = $1 AND thread_id = $2 AND is_read = FALSE`,
      userId,
      threadId
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Outbox Repository
// ─────────────────────────────────────────────────────────────────────────────

export const outboxRepository = {
  async create(messageId: string, transport = 'internal', client: DbClient = prisma): Promise<MailOutbox> {
    const isInternal = transport === 'internal';
    const initialStatus = isInternal ? 'SENT' : 'PENDING';
    const rows = await client.$queryRawUnsafe<any[]>(
      `INSERT INTO mail_outbox (message_id, transport, status, processed_at)
       VALUES ($1, $2, $3::"MailJobStatus", ${isInternal ? 'NOW()' : 'NULL'})
       ON CONFLICT (message_id) DO UPDATE SET status = $3::"MailJobStatus", updated_at = NOW()
       RETURNING *`,
      messageId,
      transport,
      initialStatus
    );
    return mapOutbox(rows[0]);
  },

  async markProcessing(id: string, client: DbClient = prisma): Promise<void> {
    await client.$executeRawUnsafe(
      `UPDATE mail_outbox SET status = 'PROCESSING'::"MailJobStatus", attempts = attempts + 1, updated_at = NOW() WHERE id = $1`,
      id
    );
  },

  async markSent(id: string, client: DbClient = prisma): Promise<void> {
    await client.$executeRawUnsafe(
      `UPDATE mail_outbox SET status = 'SENT'::"MailJobStatus", processed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      id
    );
  },

  async markFailed(id: string, error: string, client: DbClient = prisma): Promise<void> {
    await client.$executeRawUnsafe(
      `UPDATE mail_outbox
       SET status = CASE WHEN attempts >= max_attempts THEN 'FAILED'::"MailJobStatus" ELSE 'PENDING'::"MailJobStatus" END,
           last_error = $2,
           next_attempt_at = NOW() + INTERVAL '5 minutes' * attempts,
           updated_at = NOW()
       WHERE id = $1`,
      id,
      error
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Event Repository
// ─────────────────────────────────────────────────────────────────────────────

export const eventRepository = {
  async record(params: {
    messageId: string;
    outboxId?: string | null;
    eventType: string;
    recipientId?: string | null;
    metadata?: Record<string, unknown>;
  }, client: DbClient = prisma): Promise<void> {
    try {
      await client.$executeRawUnsafe(
        `INSERT INTO mail_events (message_id, outbox_id, event_type, recipient_id, metadata)
         VALUES ($1, $2, $3::"MailEventType", $4, $5::jsonb)`,
        params.messageId,
        params.outboxId ?? null,
        params.eventType.toUpperCase(),
        params.recipientId ?? null,
        params.metadata ? JSON.stringify(params.metadata) : null
      );
    } catch (err) {
      console.warn('[MailEvent] Failed to record event:', err);
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Audit Repository
// ─────────────────────────────────────────────────────────────────────────────

export const mailAuditRepository = {
  async log(params: {
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }, client: DbClient = prisma): Promise<void> {
    try {
      await client.$executeRawUnsafe(
        `INSERT INTO mail_audit_logs (actor_user_id, action, resource_type, resource_id, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        params.actorUserId,
        params.action,
        params.resourceType,
        params.resourceId,
        params.ipAddress ?? null,
        params.userAgent ?? null,
        params.metadata ? JSON.stringify(params.metadata) : null
      );
    } catch (err) {
      console.error('[MailAudit] Failed to write audit log:', err);
    }
  },

  async list(
    page: number,
    limit: number,
    actorUserId?: string,
    client: DbClient = prisma
  ): Promise<{ items: any[]; total: number }> {
    const params: any[] = [];
    let where = '';
    if (actorUserId) {
      where = 'WHERE a.actor_user_id = $1';
      params.push(actorUserId);
    }

    const offsetIdx = params.length + 1;
    const limitIdx  = offsetIdx + 1;
    params.push((page - 1) * limit, limit);

    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT
         a.id,
         a.actor_user_id,
         a.action,
         a.resource_type,
         a.resource_id,
         a.ip_address,
         a.user_agent,
         a.metadata,
         a.occurred_at,
         COALESCE(NULLIF(TRIM(u."firstName" || ' ' || COALESCE(u."lastName", '')), ''), u.email) AS actor_name,
         u.email AS actor_email,
         (COUNT(*) OVER())::int AS total_count
       FROM mail_audit_logs a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ${where}
       ORDER BY a.occurred_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      ...params
    );

    return {
      total: rows[0] ? Number(rows[0].total_count) : 0,
      items: rows.map((r: any) => ({
        id: r.id,
        actorUserId: r.actor_user_id,
        actor_user_id: r.actor_user_id,
        actorName: r.actor_name ?? null,
        actorEmail: r.actor_email ?? null,
        action: r.action,
        resourceType: r.resource_type,
        resource_type: r.resource_type,
        resourceId: r.resource_id,
        resource_id: r.resource_id,
        ipAddress: r.ip_address,
        ip_address: r.ip_address,
        userAgent: r.user_agent,
        user_agent: r.user_agent,
        metadata: r.metadata,
        occurredAt: r.occurred_at,
        occurred_at: r.occurred_at,
        createdAt: r.occurred_at,
        created_at: r.occurred_at,
      })),
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Search Repository
// ─────────────────────────────────────────────────────────────────────────────

export const searchRepository = {
  async search(
    userId: string,
    filters: {
      q?: string;
      from?: string;
      to?: string;
      subject?: string;
      folder?: MailFolder;
      since?: string;
      until?: string;
      page?: number;
      limit?: number;
    },
    client: DbClient = prisma
  ): Promise<{ items: MailThreadSummary[]; total: number }> {
    const page  = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['mi.user_id = $1'];
    const params: any[] = [userId];
    let idx = 2;

    if (filters.folder) {
      conditions.push(`mi.folder = $${idx++}::"MailFolder"`);
      params.push(filters.folder);
    } else {
      conditions.push(`mi.folder != 'TRASH'::"MailFolder"`);
    }

    if (filters.q) {
      conditions.push(`(t.subject ILIKE $${idx} OR m.body_text ILIKE $${idx} OR a.display_name ILIKE $${idx} OR a.local_part ILIKE $${idx})`);
      params.push(`%${filters.q}%`);
      idx++;
    }

    if (filters.subject) {
      conditions.push(`t.subject ILIKE $${idx++}`);
      params.push(`%${filters.subject}%`);
    }

    if (filters.from) {
      conditions.push(`(a.local_part ILIKE $${idx} OR a.display_name ILIKE $${idx})`);
      params.push(`%${filters.from}%`);
      idx++;
    }

    if (filters.since) {
      conditions.push(`mi.received_at >= $${idx++}::timestamptz`);
      params.push(filters.since);
    }

    if (filters.until) {
      conditions.push(`mi.received_at <= $${idx++}::timestamptz`);
      params.push(filters.until);
    }

    const whereClause = conditions.join(' AND ');

    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT
         mi.id             AS mailbox_item_id,
         t.id              AS thread_id,
         t.subject,
         t.last_message_at,
         t.message_count,
         mi.folder,
         mi.is_read,
         mi.is_starred,
         mi.labels,
         m.body_text,
         a.local_part      AS from_local,
         a.domain          AS from_domain,
         a.display_name    AS from_display_name,
         EXISTS(SELECT 1 FROM mail_attachments att WHERE att.message_id = m.id) AS has_attachments,
         COUNT(*) OVER() AS total_count
       FROM mailbox_items mi
       JOIN mail_messages  m  ON m.id  = mi.message_id
       JOIN mail_threads   t  ON t.id  = mi.thread_id
       JOIN mail_addresses a  ON a.id  = m.from_address_id
       WHERE ${whereClause}
       ORDER BY t.last_message_at DESC NULLS LAST, mi.received_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      ...params,
      limit,
      offset
    );

    return {
      total: rows[0] ? Number(rows[0].total_count) : 0,
      items: rows.map((r: any) => ({
        id: r.thread_id,
        subject: r.subject,
        lastMessageAt: r.last_message_at,
        messageCount: Number(r.message_count),
        snippet: r.body_text ? r.body_text.slice(0, 180) : null,
        fromDisplayName: r.from_display_name,
        fromEmail: `${r.from_local}@${r.from_domain}`,
        isRead: r.is_read,
        isStarred: r.is_starred,
        folder: r.folder,
        hasAttachments: r.has_attachments,
        labels: r.labels ?? [],
        mailboxItemId: r.mailbox_item_id,
      })),
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Attachment Repository (Step 4 Security & Storage)
// ─────────────────────────────────────────────────────────────────────────────

export const attachmentRepository = {
  /** Create attachment record linked to a message (e.g. draft). */
  async create(
    data: {
      messageId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      storagePath: string;
      storageBucket?: string;
      checksumSha256?: string;
      isInline?: boolean;
      contentId?: string | null;
    },
    client: DbClient = prisma
  ): Promise<MailAttachment> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `INSERT INTO mail_attachments (
         message_id, filename, mime_type, size_bytes, storage_path, storage_bucket,
         checksum_sha256, is_inline, content_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      data.messageId,
      data.filename,
      data.mimeType,
      data.sizeBytes,
      data.storagePath,
      data.storageBucket || 'mail-attachments',
      data.checksumSha256 ?? null,
      data.isInline ?? false,
      data.contentId ?? null
    );
    return mapAttachment(rows[0]);
  },

  /** Find attachment metadata by ID. */
  async findById(id: string, client: DbClient = prisma): Promise<MailAttachment | null> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT * FROM mail_attachments WHERE id = $1 LIMIT 1`,
      id
    );
    return rows[0] ? mapAttachment(rows[0]) : null;
  },

  /** Find all attachments for a message. */
  async findByMessageId(messageId: string, client: DbClient = prisma): Promise<MailAttachment[]> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT * FROM mail_attachments WHERE message_id = $1 ORDER BY uploaded_at ASC`,
      messageId
    );
    return rows.map(mapAttachment);
  },

  /**
   * Enforces strict mailbox-level authorization for attachment download.
   * A user is permitted to download an attachment ONLY if:
   * 1. They are the original sender of the message, OR
   * 2. They possess a corresponding row in mailbox_items for that message.
   */
  async checkUserAccessToAttachment(
    attachmentId: string,
    userId: string,
    client: DbClient = prisma
  ): Promise<{ allowed: boolean; attachment: MailAttachment | null }> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT att.*,
              m.sender_user_id,
              EXISTS(
                SELECT 1 FROM mailbox_items mi
                WHERE mi.message_id = att.message_id AND mi.user_id = $2
              ) AS in_mailbox
       FROM mail_attachments att
       JOIN mail_messages m ON m.id = att.message_id
       WHERE att.id = $1
       LIMIT 1`,
      attachmentId,
      userId
    );

    if (!rows || rows.length === 0) {
      return { allowed: false, attachment: null };
    }

    const row = rows[0];
    const isSender = row.sender_user_id === userId;
    const inMailbox = Boolean(row.in_mailbox);
    const allowed = isSender || inMailbox;

    return {
      allowed,
      attachment: mapAttachment(row),
    };
  },

  /** Delete an attachment row. */
  async delete(id: string, client: DbClient = prisma): Promise<boolean> {
    const count = await client.$executeRawUnsafe(
      `DELETE FROM mail_attachments WHERE id = $1`,
      id
    );
    return count > 0;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin Repository (Step 4 Operations & Privacy Boundary)
// ─────────────────────────────────────────────────────────────────────────────

export const adminRepository = {
  /**
   * Aggregates operational delivery metrics and queue health.
   * Does NOT access or expose any private message body text or HTML.
   */
  async getOperationalMetrics(client: DbClient = prisma): Promise<MailOperationalMetrics> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT
         (SELECT COUNT(*)::int FROM mail_messages WHERE is_draft = FALSE) AS total_sent,
         (SELECT COUNT(*)::int FROM mail_addresses WHERE is_active = TRUE) AS total_active_addrs,
         (SELECT COUNT(*)::int FROM mail_outbox WHERE status = 'PENDING') AS pending_outbox,
         (SELECT COUNT(*)::int FROM mail_outbox WHERE status = 'FAILED') AS failed_outbox,
         (SELECT COUNT(*)::int FROM mail_outbox WHERE status = 'COMPLETED') AS completed_outbox,
         (SELECT COUNT(*)::int FROM mail_outbox WHERE status = 'FAILED' AND updated_at >= NOW() - INTERVAL '24 hours') AS recent_failures_24h`
    );

    const r = rows[0] || {};
    const totalSent = Number(r.total_sent ?? 0);
    const totalActiveAddrs = Number(r.total_active_addrs ?? 0);
    const pendingOutbox = Number(r.pending_outbox ?? 0);
    const failedOutbox = Number(r.failed_outbox ?? 0);
    const completedOutbox = Number(r.completed_outbox ?? 0);
    const recentFailures24h = Number(r.recent_failures_24h ?? 0);

    const totalOutbox = pendingOutbox + failedOutbox + completedOutbox;
    const deliverySuccessRate = totalOutbox > 0
      ? Math.round((completedOutbox / totalOutbox) * 100)
      : 100;

    return {
      totalMessagesSent: totalSent,
      totalActiveAddresses: totalActiveAddrs,
      pendingOutboxCount: pendingOutbox,
      failedOutboxCount: failedOutbox,
      completedOutboxCount: completedOutbox,
      recentFailures24h,
      deliverySuccessRate,
    };
  },

  /**
   * Retrieves delivery job failures for troubleshooting.
   * Strictly omits message bodies to protect mailbox privacy from administrative snooping.
   */
  async getOutboxFailures(
    page = 1,
    limit = 20,
    client: DbClient = prisma
  ): Promise<{ items: MailOutboxFailure[]; total: number }> {
    const offset = (page - 1) * limit;

    const countRows = await client.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS total FROM mail_outbox WHERE status = 'FAILED'`
    );
    const total = Number(countRows[0]?.total ?? 0);

    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT o.id, o.message_id, o.status, o.transport, o.attempts, o.max_attempts,
              o.last_error, o.next_attempt_at, o.created_at, o.updated_at,
              m.subject,
              addr.local_part, addr.domain
       FROM mail_outbox o
       JOIN mail_messages m ON m.id = o.message_id
       JOIN mail_addresses addr ON addr.id = m.from_address_id
       WHERE o.status = 'FAILED'
       ORDER BY o.updated_at DESC
       LIMIT $1 OFFSET $2`,
      limit,
      offset
    );

    const items: MailOutboxFailure[] = rows.map((r) => ({
      id: r.id,
      messageId: r.message_id,
      status: r.status,
      transport: r.transport,
      attempts: Number(r.attempts),
      maxAttempts: Number(r.max_attempts),
      lastError: r.last_error,
      nextAttemptAt: r.next_attempt_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      subject: r.subject,
      senderAddress: `${r.local_part}@${r.domain}`,
    }));

    return { items, total };
  },

  /**
   * List internal mail addresses with associated account info and quotas.
   */
  async listAddresses(
    page = 1,
    limit = 20,
    search?: string,
    client: DbClient = prisma
  ): Promise<{ items: MailAdminAddressSummary[]; total: number }> {
    const offset = (page - 1) * limit;
    let whereClause = `WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      whereClause += ` AND (LOWER(a.local_part) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }

    const countRows = await client.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS total
       FROM mail_addresses a
       LEFT JOIN users u ON u.id = a.user_id
       ${whereClause}`,
      ...params
    );
    const total = Number(countRows[0]?.total ?? 0);

    params.push(limit, offset);
    const rows = await client.$queryRawUnsafe<any[]>(
      `SELECT a.id, a.user_id, a.local_part, a.domain, a.display_name, a.is_active, a.is_primary, a.created_at,
              a.verification_status, a.max_storage_bytes, a.daily_send_quota, a.is_shared, a.assigned_at,
              u.email AS user_email,
              COALESCE(NULLIF(TRIM(u."firstName" || ' ' || COALESCE(u."lastName", '')), ''), u.email) AS user_name,
              (SELECT COUNT(*)::int FROM mail_aliases al WHERE al.address_id = a.id AND al.is_active = TRUE) AS alias_count
       FROM mail_addresses a
       LEFT JOIN users u ON u.id = a.user_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params
    );

    const items: MailAdminAddressSummary[] = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      localPart: r.local_part,
      domain: r.domain,
      fullAddress: `${r.local_part}@${r.domain}`,
      displayName: r.display_name,
      isActive: r.is_active,
      isPrimary: r.is_primary,
      userEmail: r.user_email,
      userName: r.user_name || (r.user_id ? 'Assigned User' : 'Unassigned'),
      createdAt: r.created_at,
      hourlyQuota: 60, // standard default quota
      verificationStatus: r.verification_status || 'INTERNAL_ONLY',
      maxStorageBytes: Number(r.max_storage_bytes || 524288000),
      dailySendQuota: Number(r.daily_send_quota || 100),
      isShared: Boolean(r.is_shared),
      assignedAt: r.assigned_at,
      aliasCount: Number(r.alias_count || 0),
    }));

    return { items, total };
  },

  /** Enable or disable an internal mail address */
  async updateAddressStatus(
    addressId: string,
    isActive: boolean,
    client: DbClient = prisma
  ): Promise<MailAddress> {
    const rows = await client.$queryRawUnsafe<any[]>(
      `UPDATE mail_addresses
       SET is_active = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      addressId,
      isActive
    );
    if (!rows[0]) throw Object.assign(new Error('Address not found'), { status: 404 });
    return mapAddress(rows[0]);
  },

  /** Toggle internal mail access for all addresses of a user */
  async updateUserMailAccess(
    userId: string,
    isActive: boolean,
    client: DbClient = prisma
  ): Promise<void> {
    await client.$executeRawUnsafe(
      `UPDATE mail_addresses
       SET is_active = $2, updated_at = NOW()
       WHERE user_id = $1`,
      userId,
      isActive
    );
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// Row → Domain Object Mappers (snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

function mapAddress(r: any): MailAddress {
  return {
    id: r.id,
    userId: r.user_id || null,
    localPart: r.local_part,
    domain: r.domain,
    displayName: r.display_name,
    isPrimary: Boolean(r.is_primary),
    isActive: Boolean(r.is_active),
    verificationStatus: r.verification_status || 'INTERNAL_ONLY',
    maxStorageBytes: Number(r.max_storage_bytes || 524288000),
    dailySendQuota: Number(r.daily_send_quota || 100),
    isShared: Boolean(r.is_shared),
    assignedBy: r.assigned_by || null,
    assignedAt: r.assigned_at ? new Date(r.assigned_at) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    fullAddress: `${r.local_part}@${r.domain}`,
    user: r.user_email
      ? {
          email: r.user_email,
          firstName: r.user_first_name || '',
          lastName: r.user_last_name || '',
        }
      : undefined,
  };
}

function mapThread(r: any): MailThread {
  return {
    id: r.id,
    subject: r.subject,
    createdBy: r.created_by,
    lastMessageAt: r.last_message_at,
    messageCount: Number(r.message_count ?? 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapMessage(r: any): MailMessage {
  return {
    id: r.id,
    threadId: r.thread_id,
    parentId: r.parent_id,
    fromAddressId: r.from_address_id,
    senderUserId: r.sender_user_id,
    subject: r.subject,
    bodyText: r.body_text,
    bodyHtml: r.body_html,
    contentType: r.content_type ?? 'HTML',
    isDraft: r.is_draft,
    sentAt: r.sent_at,
    sizeBytes: Number(r.size_bytes ?? 0),
    messageIdHeader: r.message_id_header,
    inReplyTo: r.in_reply_to,
    references: r.references ?? [],
    idempotencyKey: r.idempotency_key ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapMailboxItem(r: any): MailboxItem {
  return {
    id: r.id,
    userId: r.user_id,
    messageId: r.message_id,
    threadId: r.thread_id,
    folder: r.folder,
    isRead: r.is_read,
    isStarred: r.is_starred,
    isArchived: r.is_archived,
    labels: r.labels ?? [],
    receivedAt: r.received_at,
    snoozedUntil: r.snoozed_until,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapAttachment(r: any): MailAttachment {
  return {
    id: r.id,
    messageId: r.message_id,
    filename: r.filename,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes ?? 0),
    storagePath: r.storage_path,
    storageBucket: r.storage_bucket,
    checksumSha256: r.checksum_sha256,
    isInline: r.is_inline,
    contentId: r.content_id,
    uploadedAt: r.uploaded_at,
  };
}

function mapOutbox(r: any): MailOutbox {
  return {
    id: r.id,
    messageId: r.message_id,
    status: r.status,
    transport: r.transport,
    attempts: Number(r.attempts),
    maxAttempts: Number(r.max_attempts),
    nextAttemptAt: r.next_attempt_at,
    lastError: r.last_error,
    processedAt: r.processed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
