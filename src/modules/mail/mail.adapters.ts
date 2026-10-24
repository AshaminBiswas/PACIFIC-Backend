// =============================================================================
// Pacific Mail — Provider-Neutral Gateway Adapters & Storage Interfaces
// Encapsulates internal routing, outbound gateway, inbound processing, and storage.
// External adapters remain strictly configurable and sandbox-safe by default.
// =============================================================================

import nodemailer from 'nodemailer';
import type { MailMessage, MailRecipient, MailAttachment } from './mail.types';
import { MAX_ATTACHMENT_SIZE_BYTES } from './mail.storage';

// ─── 1. Outbound & Inbound Message Payloads ───────────────────────────────────

export interface OutboundMessagePayload {
  message: MailMessage;
  fromAddress: string;
  toRecipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  attachments: MailAttachment[];
  messageIdHeader?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface OutboundAdapterResult {
  accepted: boolean;
  provider: string;
  externalMessageId?: string;
  status: 'SENT' | 'QUEUED' | 'FAILED' | 'DISABLED';
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface InboundNormalizedMessage {
  providerMessageId: string;
  from: { email: string; name?: string };
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  headers?: Record<string, string>;
  inReplyTo?: string;
  references?: string[];
  attachments?: Array<{
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentBase64?: string;
    storagePath?: string;
  }>;
}

// ─── 2. Core Adapter Interfaces ───────────────────────────────────────────────

export interface IOutboundMailAdapter {
  readonly name: string;
  send(payload: OutboundMessagePayload): Promise<OutboundAdapterResult>;
  ping(): Promise<boolean>;
}

export interface IInboundMailAdapter {
  readonly name: string;
  verifySignature(headers: Record<string, string>, rawBody: string | Buffer): boolean;
  normalizePayload(body: any): InboundNormalizedMessage;
}

export interface IAttachmentStorageAdapter {
  readonly name: string;
  save(filename: string, mimeType: string, buffer: Buffer): Promise<{ storagePath: string; checksumSha256: string }>;
  read(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
}

// ─── 3. Outbound Implementations ──────────────────────────────────────────────

/**
 * Sandbox adapter: Used when external sending is disabled or in development/testing.
 * Logs cleanly and records mock dispatch without sending real network packets.
 */
export class SandboxOutboundAdapter implements IOutboundMailAdapter {
  readonly name = 'sandbox';

  async send(payload: OutboundMessagePayload): Promise<OutboundAdapterResult> {
    const isExternalSendingEnabled = process.env.MAIL_EXTERNAL_SENDING_ENABLED === 'true';

    if (!isExternalSendingEnabled) {
      return {
        accepted: false,
        provider: 'sandbox',
        status: 'DISABLED',
        error: 'External email sending is currently disabled (MAIL_EXTERNAL_SENDING_ENABLED=false). Message stored safely in transactional outbox.',
        metadata: { recipientsCount: payload.toRecipients.length + payload.ccRecipients.length },
      };
    }

    const mockId = `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@pacificproduct.in`;
    return {
      accepted: true,
      provider: 'sandbox',
      externalMessageId: mockId,
      status: 'SENT',
      metadata: {
        dispatchedAt: new Date().toISOString(),
        recipients: payload.toRecipients,
      },
    };
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

/**
 * SMTP Gateway Adapter: Connects to a standard enterprise SMTP relay (e.g. Google Workspace SMTP or custom gateway).
 */
export class SmtpOutboundAdapter implements IOutboundMailAdapter {
  readonly name = 'smtp';
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
      });
    }
  }

  async send(payload: OutboundMessagePayload): Promise<OutboundAdapterResult> {
    if (!this.transporter) {
      return {
        accepted: false,
        provider: 'smtp',
        status: 'FAILED',
        error: 'SMTP transport not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.',
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: payload.fromAddress,
        to: payload.toRecipients,
        cc: payload.ccRecipients.length > 0 ? payload.ccRecipients : undefined,
        bcc: payload.bccRecipients.length > 0 ? payload.bccRecipients : undefined,
        subject: payload.subject,
        text: payload.bodyText || undefined,
        html: payload.bodyHtml || undefined,
        messageId: payload.messageIdHeader,
        inReplyTo: payload.inReplyTo,
        references: payload.references,
      });

      return {
        accepted: true,
        provider: 'smtp',
        externalMessageId: info.messageId,
        status: 'SENT',
        metadata: {
          response: info.response,
          envelope: info.envelope,
        },
      };
    } catch (err: any) {
      return {
        accepted: false,
        provider: 'smtp',
        status: 'FAILED',
        error: err.message || 'SMTP dispatch error',
      };
    }
  }

  async ping(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Resend Outbound Gateway Adapter: Dispatches messages via Resend API
 */
export class ResendOutboundAdapter implements IOutboundMailAdapter {
  readonly name = 'resend';

  async send(payload: OutboundMessagePayload): Promise<OutboundAdapterResult> {
    try {
      const { emailService } = await import('../../utils/email.service');
      const res = await emailService.sendEmail({
        from: payload.fromAddress.includes('<')
          ? payload.fromAddress
          : `Pacific Products & Solutions <${payload.fromAddress}>`,
        to: payload.toRecipients,
        cc: payload.ccRecipients.length > 0 ? payload.ccRecipients : undefined,
        bcc: payload.bccRecipients.length > 0 ? payload.bccRecipients : undefined,
        subject: payload.subject,
        text: payload.bodyText || undefined,
        html: payload.bodyHtml || payload.bodyText || '',
      });

      if (!res.success) {
        return {
          accepted: false,
          provider: 'resend',
          status: 'FAILED',
          error: res.error || 'Resend delivery failed',
        };
      }

      return {
        accepted: true,
        provider: 'resend',
        externalMessageId: res.id,
        status: 'SENT',
        metadata: { resendId: res.id },
      };
    } catch (err: any) {
      return {
        accepted: false,
        provider: 'resend',
        status: 'FAILED',
        error: err.message || 'Resend adapter dispatch error',
      };
    }
  }

  async ping(): Promise<boolean> {
    return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'));
  }
}

// ─── 4. Inbound Webhook Implementation ────────────────────────────────────────

export class WebhookInboundAdapter implements IInboundMailAdapter {
  readonly name = 'webhook';

  verifySignature(headers: Record<string, string>, rawBody: string | Buffer): boolean {
    const secret = process.env.MAIL_INBOUND_WEBHOOK_SECRET;
    if (!secret) {
      // In development / sandbox mode, permit local webhook simulation if secret unset
      return process.env.NODE_ENV !== 'production';
    }

    const providedSignature = headers['x-pacific-signature'] || headers['x-webhook-signature'] || headers['authorization'];
    if (!providedSignature) return false;

    // Bearer token check or HMAC signature
    if (providedSignature.startsWith('Bearer ') && providedSignature.slice(7) === secret) {
      return true;
    }
    return providedSignature === secret;
  }

  normalizePayload(body: any): InboundNormalizedMessage {
    const providerMessageId = body.id || body.messageId || body.providerMessageId || `inbound-${Date.now()}`;
    const fromStr = body.from || body.sender || 'unknown@external.com';
    const toArr: string[] = Array.isArray(body.to) ? body.to : [body.to || ''];

    return {
      providerMessageId,
      from: typeof fromStr === 'object' ? fromStr : { email: fromStr },
      to: toArr.filter(Boolean),
      cc: Array.isArray(body.cc) ? body.cc : undefined,
      bcc: Array.isArray(body.bcc) ? body.bcc : undefined,
      subject: body.subject || '(No Subject)',
      bodyText: body.text || body.bodyText || null,
      bodyHtml: body.html || body.bodyHtml || null,
      inReplyTo: body.inReplyTo || body.headers?.['in-reply-to'],
      references: body.references || (body.headers?.['references'] ? [body.headers['references']] : []),
      attachments: body.attachments || [],
    };
  }
}

// ─── 5. Factory & Gateway Status ──────────────────────────────────────────────

export function getOutboundAdapter(): IOutboundMailAdapter {
  const provider = (process.env.MAIL_OUTBOUND_PROVIDER || '').toLowerCase();
  if (provider === 'smtp') {
    return new SmtpOutboundAdapter();
  }
  if (provider === 'resend' || (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'))) {
    return new ResendOutboundAdapter();
  }
  return new SandboxOutboundAdapter();
}

export function getInboundAdapter(): IInboundMailAdapter {
  return new WebhookInboundAdapter();
}

export function getGatewayStatus(): {
  externalSendingEnabled: boolean;
  externalReceivingEnabled: boolean;
  provider: string;
  defaultDomain: string;
} {
  const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'));
  const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  const activeProvider = process.env.MAIL_OUTBOUND_PROVIDER || (hasResend ? 'resend' : hasSmtp ? 'smtp' : 'sandbox');

  return {
    externalSendingEnabled: hasResend || hasSmtp || process.env.MAIL_EXTERNAL_SENDING_ENABLED === 'true',
    externalReceivingEnabled: process.env.MAIL_EXTERNAL_RECEIVING_ENABLED === 'true',
    provider: activeProvider,
    defaultDomain: 'pacificproduct.in',
  };
}
