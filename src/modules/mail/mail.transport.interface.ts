// =============================================================================
// Pacific Mail — Transport Interface
// Defines the contract that any delivery transport must satisfy.
// Step 1 ships InternalTransport only; Step 2 will add SmtpTransport / ResendTransport.
// =============================================================================

import type { MailMessage, MailRecipient, MailAttachment } from './mail.types';

export interface TransportMessage {
  message: MailMessage;
  recipients: MailRecipient[];
  attachments: MailAttachment[];
  /** Sender's full address string, e.g. "Ashamin Biswas <ashamin.biswas@pacific.internal>" */
  fromAddress: string;
}

export interface TransportResult {
  /** Whether the transport accepted the message for delivery */
  accepted: boolean;
  /** Transport-assigned message ID (e.g. SMTP message-id, Resend ID) */
  externalMessageId?: string;
  /** Human-readable error if accepted=false */
  error?: string;
  /** Raw transport response metadata (for mail_events) */
  metadata?: Record<string, unknown>;
}

/**
 * IMailTransport — contract for all delivery transports.
 * Implementations must be stateless and safe to call from any async context.
 */
export interface IMailTransport {
  /** Unique transport identifier, e.g. 'internal' | 'smtp' | 'resend' */
  readonly name: string;

  /**
   * Deliver a prepared outgoing message.
   * Must NOT throw — return TransportResult with accepted=false on error.
   */
  deliver(msg: TransportMessage): Promise<TransportResult>;

  /**
   * Health-check: verify the transport is reachable.
   * Returns true if ready, false otherwise.
   */
  ping(): Promise<boolean>;
}

// ─── Step 1: Internal Transport (delivers only to internal addresses) ─────────

/**
 * InternalTransport resolves recipients to mailbox_items rows in the same
 * database. No external SMTP is involved. This is always available.
 */
export class InternalTransport implements IMailTransport {
  readonly name = 'internal' as const;

  /**
   * Internal delivery is always synchronous within the DB transaction,
   * so this deliver() method is intentionally a no-op stub — the actual
   * fan-out happens inside MailService.send() via mailboxRepository.createItems().
   *
   * It is preserved here to satisfy the IMailTransport contract for future
   * polymorphic transport dispatch.
   */
  async deliver(_msg: TransportMessage): Promise<TransportResult> {
    return { accepted: true, metadata: { transport: 'internal' } };
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

export const internalTransport = new InternalTransport();
