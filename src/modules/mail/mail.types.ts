// =============================================================================
// Pacific Mail — Core TypeScript Types
// All entities mirror the database schema exactly.
// =============================================================================

// ─── Enums ────────────────────────────────────────────────────────────────────

export type MailFolder = 'INBOX' | 'SENT' | 'DRAFTS' | 'ARCHIVE' | 'SPAM' | 'TRASH';
export type MailJobStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';
export type MailEventType =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'BOUNCED'
  | 'OPENED'
  | 'CLICKED'
  | 'SPAM_REPORTED'
  | 'UNSUBSCRIBED'
  | 'FAILED';
export type MailRecipientType = 'TO' | 'CC' | 'BCC';
export type MailContentType = 'TEXT' | 'HTML';

// ─── Database Row Shapes ──────────────────────────────────────────────────────

export interface MailAddress {
  id: string;
  userId: string;
  localPart: string;
  domain: string;
  displayName: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Derived full address — not stored, computed as `${localPart}@${domain}` */
  fullAddress?: string;
}

export interface MailThread {
  id: string;
  subject: string;
  createdBy: string;
  lastMessageAt: Date | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailMessage {
  id: string;
  threadId: string;
  parentId: string | null;
  fromAddressId: string;
  senderUserId: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  contentType: MailContentType;
  isDraft: boolean;
  sentAt: Date | null;
  sizeBytes: number;
  messageIdHeader: string | null;
  inReplyTo: string | null;
  references: string[];
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailRecipient {
  id: string;
  messageId: string;
  type: MailRecipientType;
  addressId: string | null;
  userId: string | null;
  rawEmail: string;
  createdAt: Date;
}

export interface MailboxItem {
  id: string;
  userId: string;
  messageId: string;
  threadId: string;
  folder: MailFolder;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  labels: string[];
  receivedAt: Date;
  snoozedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailAttachment {
  id: string;
  messageId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  storageBucket: string;
  checksumSha256: string | null;
  isInline: boolean;
  contentId: string | null;
  uploadedAt: Date;
}

export interface MailOutbox {
  id: string;
  messageId: string;
  status: MailJobStatus;
  transport: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailEvent {
  id: string;
  messageId: string;
  outboxId: string | null;
  eventType: MailEventType;
  recipientId: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: Date;
}

export interface MailAuditLog {
  id: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: Date;
}

// ─── Composite / View Types (returned by service layer) ───────────────────────

/** Full address string helper */
export function formatAddress(addr: Pick<MailAddress, 'localPart' | 'domain' | 'displayName'>): string {
  const email = `${addr.localPart}@${addr.domain}`;
  return addr.displayName ? `${addr.displayName} <${email}>` : email;
}

/** A thread listing row with summary data */
export interface MailThreadSummary {
  id: string;
  subject: string;
  lastMessageAt: Date | null;
  messageCount: number;
  snippet: string | null;
  fromDisplayName: string | null;
  fromEmail: string;
  isRead: boolean;
  isStarred: boolean;
  folder: MailFolder;
  hasAttachments: boolean;
  labels: string[];
  mailboxItemId: string;
}

/** A full thread with all its messages */
export interface MailThreadDetail {
  thread: MailThread;
  messages: MailMessageDetail[];
}

/** A message with recipients and attachments resolved */
export interface MailMessageDetail extends MailMessage {
  fromAddress: Pick<MailAddress, 'id' | 'localPart' | 'domain' | 'displayName'>;
  recipients: Array<{
    id: string;
    type: MailRecipientType;
    rawEmail: string;
    userId: string | null;
  }>;
  attachments: MailAttachment[];
  /** BCC recipients — only present when caller === sender */
  bccRecipients?: Array<{
    id: string;
    rawEmail: string;
    userId: string | null;
  }>;
}

// ─── API Request / Response Shapes ───────────────────────────────────────────

export interface SendMailRequest {
  /** If provided, dispatches an existing saved draft */
  draftId?: string;
  /** Thread to append to (undefined = start a new thread) */
  threadId?: string;
  /** parentId of the message being replied to */
  parentId?: string;
  subject?: string;
  to?: string[];   // array of "Display Name <local@pacific.internal>" strings
  cc?: string[];
  bcc?: string[];
  bodyText?: string;
  bodyHtml?: string;
  attachmentIds?: string[];  // pre-uploaded attachment IDs to link
  isDraft?: boolean;
  idempotencyKey?: string;
}

export interface CreateDraftRequest {
  threadId?: string;
  parentId?: string;
  subject?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  bodyText?: string;
  bodyHtml?: string;
  attachmentIds?: string[];
}

export interface ReplyMailRequest {
  bodyText?: string;
  bodyHtml?: string;
  replyAll?: boolean;
  attachmentIds?: string[];
  idempotencyKey?: string;
}

export interface ForwardMailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  bodyText?: string;
  bodyHtml?: string;
  forwardAttachments?: boolean;
  idempotencyKey?: string;
}

export interface FolderCounts {
  inbox: { total: number; unread: number };
  sent: { total: number; unread: number };
  drafts: { total: number; unread: number };
  archive: { total: number; unread: number };
  spam: { total: number; unread: number };
  trash: { total: number; unread: number };
  starred: { total: number; unread: number };
}

export interface UpdateMailboxItemRequest {
  isRead?: boolean;
  isStarred?: boolean;
  folder?: MailFolder;
  labels?: string[];
  snoozedUntil?: string | null;
}

export interface BulkMailboxActionRequest {
  itemIds: string[];
  action: 'markRead' | 'markUnread' | 'star' | 'unstar' | 'archive' | 'trash' | 'delete' | 'restore';
}

export interface ProvisionAddressRequest {
  localPart: string;
  displayName?: string;
}

export interface MailListQuery {
  folder?: MailFolder;
  page?: number;
  limit?: number;
  search?: string;
  label?: string;
  isRead?: boolean;
  isStarred?: boolean;
}

// ─── Transport Interface (Step 2 slot) ───────────────────────────────────────
// IMailTransport is defined in mail.transport.interface.ts
