-- =============================================================================
-- Pacific Mail — Step 1 Database Migration
-- Version : 20261023_mail_schema
-- Database: PostgreSQL via Supabase (Prisma managed)
--
-- NEVER run this file automatically on production.
-- Apply via: npx prisma migrate deploy
-- Rollback : execute rollback.sql manually in psql / Supabase SQL editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enumerations
-- ---------------------------------------------------------------------------

-- Folder categories that a mailbox item can sit in
CREATE TYPE "MailFolder" AS ENUM (
  'INBOX',
  'SENT',
  'DRAFTS',
  'ARCHIVE',
  'SPAM',
  'TRASH'
);

-- Lifecycle state of an outgoing message delivery job
CREATE TYPE "MailJobStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'RETRY'
);

-- Delivery/engagement events tracked per message
CREATE TYPE "MailEventType" AS ENUM (
  'QUEUED',
  'SENT',
  'DELIVERED',
  'BOUNCED',
  'OPENED',
  'CLICKED',
  'SPAM_REPORTED',
  'UNSUBSCRIBED',
  'FAILED'
);

-- Recipient role on a message
CREATE TYPE "MailRecipientType" AS ENUM (
  'TO',
  'CC',
  'BCC'
);

-- Content format of message body
CREATE TYPE "MailContentType" AS ENUM (
  'TEXT',
  'HTML'
);

-- ---------------------------------------------------------------------------
-- 2. mail_addresses
--    One internal email address per user (localpart@pacific.internal).
--    Supports future aliasing (multiple addresses for one user).
-- ---------------------------------------------------------------------------
CREATE TABLE "mail_addresses" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "user_id"       TEXT        NOT NULL,             -- FK -> users.id
  "local_part"    TEXT        NOT NULL,             -- e.g. "ashamin.biswas"
  "domain"        TEXT        NOT NULL DEFAULT 'pacific.internal',
  "display_name"  TEXT,                             -- "Ashamin Biswas"
  "is_primary"    BOOLEAN     NOT NULL DEFAULT TRUE,
  "is_active"     BOOLEAN     NOT NULL DEFAULT TRUE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mail_addresses_pkey"   PRIMARY KEY ("id"),
  CONSTRAINT "mail_addresses_full_address_uq"
    UNIQUE ("local_part", "domain"),
  CONSTRAINT "mail_addresses_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "mail_addresses_user_id_idx"   ON "mail_addresses" ("user_id");
CREATE INDEX "mail_addresses_local_part_idx" ON "mail_addresses" ("local_part");

COMMENT ON TABLE "mail_addresses"  IS 'Internal email identities — one or more per user';
COMMENT ON COLUMN "mail_addresses"."local_part" IS 'Username portion before @; unique within domain';
COMMENT ON COLUMN "mail_addresses"."is_primary" IS 'Exactly one address per user should be primary';

-- ---------------------------------------------------------------------------
-- 3. mail_threads
--    Groups related messages into a conversation.
--    Supports both the initial message and reply chains.
-- ---------------------------------------------------------------------------
CREATE TABLE "mail_threads" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "subject"       TEXT        NOT NULL DEFAULT '(No Subject)',
  "created_by"    TEXT        NOT NULL,             -- user_id of originator
  "last_message_at" TIMESTAMPTZ,                   -- updated on each new message
  "message_count" INTEGER     NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mail_threads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_threads_created_by_fk"
    FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT
);

CREATE INDEX "mail_threads_created_by_idx"     ON "mail_threads" ("created_by");
CREATE INDEX "mail_threads_last_message_at_idx" ON "mail_threads" ("last_message_at" DESC);

COMMENT ON TABLE "mail_threads" IS 'Conversation thread grouping related messages';

-- ---------------------------------------------------------------------------
-- 4. mail_messages
--    Canonical message store — content persisted once regardless of
--    how many recipients receive it (fan-out is in mailbox_items).
-- ---------------------------------------------------------------------------
CREATE TABLE "mail_messages" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "thread_id"     TEXT        NOT NULL,
  "parent_id"     TEXT,                             -- NULL for root, else replied-to message id
  "from_address_id" TEXT      NOT NULL,             -- FK -> mail_addresses.id
  "sender_user_id"  TEXT      NOT NULL,             -- FK -> users.id (server-side identity; never trusted from client)
  "subject"       TEXT        NOT NULL DEFAULT '(No Subject)',
  "body_text"     TEXT,                             -- Plain-text version
  "body_html"     TEXT,                             -- HTML version (sanitised on ingest)
  "content_type"  "MailContentType" NOT NULL DEFAULT 'HTML',
  "is_draft"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "sent_at"       TIMESTAMPTZ,                      -- NULL while draft
  "size_bytes"    INTEGER     NOT NULL DEFAULT 0,   -- Approx content size for quota tracking
  "message_id_header" TEXT,                         -- RFC 2822 Message-ID for external threading
  "in_reply_to"   TEXT,                             -- RFC 2822 In-Reply-To header
  "references"    TEXT[],                           -- RFC 2822 References header chain
  "idempotency_key" TEXT,                           -- Client-supplied idempotency key for safe retries
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mail_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_messages_thread_id_fk"
    FOREIGN KEY ("thread_id") REFERENCES "mail_threads" ("id") ON DELETE CASCADE,
  CONSTRAINT "mail_messages_parent_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "mail_messages" ("id") ON DELETE SET NULL,
  CONSTRAINT "mail_messages_from_address_fk"
    FOREIGN KEY ("from_address_id") REFERENCES "mail_addresses" ("id") ON DELETE RESTRICT,
  CONSTRAINT "mail_messages_sender_user_fk"
    FOREIGN KEY ("sender_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);

CREATE INDEX "mail_messages_thread_id_idx"      ON "mail_messages" ("thread_id");
CREATE INDEX "mail_messages_sender_user_id_idx" ON "mail_messages" ("sender_user_id");
CREATE INDEX "mail_messages_sent_at_idx"        ON "mail_messages" ("sent_at" DESC NULLS LAST);
CREATE INDEX "mail_messages_is_draft_idx"       ON "mail_messages" ("is_draft") WHERE "is_draft" = TRUE;
CREATE UNIQUE INDEX "mail_messages_idempotency_key_idx"
  ON "mail_messages" ("sender_user_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

COMMENT ON TABLE "mail_messages"  IS 'Canonical message content — stored once, referenced by mailbox_items';
COMMENT ON COLUMN "mail_messages"."sender_user_id" IS 'Authoritative server-side user identity — never populated from client input';
COMMENT ON COLUMN "mail_messages"."body_html" IS 'HTML body; must be sanitised server-side before storage';

-- ---------------------------------------------------------------------------
-- 5. mail_recipients
--    Recipient list per message (To / CC / BCC).
--    BCC rows are NEVER returned to non-sender callers.
-- ---------------------------------------------------------------------------
CREATE TABLE "mail_recipients" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "message_id"    TEXT        NOT NULL,
  "type"          "MailRecipientType" NOT NULL,
  "address_id"    TEXT,                             -- NULL if recipient is external (future)
  "user_id"       TEXT,                             -- Resolved internal user; NULL if external
  "raw_email"     TEXT        NOT NULL,             -- Full "Display Name <addr>" string
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mail_recipients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_recipients_message_id_fk"
    FOREIGN KEY ("message_id") REFERENCES "mail_messages" ("id") ON DELETE CASCADE,
  CONSTRAINT "mail_recipients_address_id_fk"
    FOREIGN KEY ("address_id") REFERENCES "mail_addresses" ("id") ON DELETE SET NULL,
  CONSTRAINT "mail_recipients_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
);

CREATE INDEX "mail_recipients_message_id_idx" ON "mail_recipients" ("message_id");
CREATE INDEX "mail_recipients_user_id_idx"    ON "mail_recipients" ("user_id");
CREATE INDEX "mail_recipients_type_idx"       ON "mail_recipients" ("type");

COMMENT ON TABLE "mail_recipients" IS 'Per-message To/CC/BCC list; BCC filtered in service layer';
COMMENT ON COLUMN "mail_recipients"."type" IS 'BCC rows must never be exposed to non-sender recipients';

-- ---------------------------------------------------------------------------
-- 6. mailbox_items
--    Per-user mailbox state — decouples message content from mailbox view.
--    One row per (user, message) pair. Supports multiple folders when copying
--    (e.g., a sent copy + an inbox copy for self-sends).
-- ---------------------------------------------------------------------------
CREATE TABLE "mailbox_items" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "user_id"       TEXT        NOT NULL,
  "message_id"    TEXT        NOT NULL,
  "thread_id"     TEXT        NOT NULL,             -- Denormalised for fast folder queries
  "folder"        "MailFolder" NOT NULL DEFAULT 'INBOX',
  "is_read"       BOOLEAN     NOT NULL DEFAULT FALSE,
  "is_starred"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "is_archived"   BOOLEAN     NOT NULL DEFAULT FALSE,
  "labels"        TEXT[]      NOT NULL DEFAULT '{}',-- Custom user labels
  "received_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "snoozed_until" TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mailbox_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mailbox_items_user_message_folder_uq"
    UNIQUE ("user_id", "message_id", "folder"),
  CONSTRAINT "mailbox_items_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "mailbox_items_message_id_fk"
    FOREIGN KEY ("message_id") REFERENCES "mail_messages" ("id") ON DELETE CASCADE,
  CONSTRAINT "mailbox_items_thread_id_fk"
    FOREIGN KEY ("thread_id") REFERENCES "mail_threads" ("id") ON DELETE CASCADE
);

CREATE INDEX "mailbox_items_user_folder_idx"
  ON "mailbox_items" ("user_id", "folder", "received_at" DESC);
CREATE INDEX "mailbox_items_user_thread_idx"
  ON "mailbox_items" ("user_id", "thread_id");
CREATE INDEX "mailbox_items_unread_idx"
  ON "mailbox_items" ("user_id", "is_read") WHERE "is_read" = FALSE;
CREATE INDEX "mailbox_items_starred_idx"
  ON "mailbox_items" ("user_id", "is_starred") WHERE "is_starred" = TRUE;

COMMENT ON TABLE "mailbox_items" IS 'Per-user mailbox state — decoupled from canonical message content';
COMMENT ON COLUMN "mailbox_items"."thread_id" IS 'Denormalised from mail_messages for O(1) folder thread queries';

-- ---------------------------------------------------------------------------
-- 7. mail_attachments
--    Metadata ONLY — binary content lives in Supabase Storage (or S3).
--    Never store binary blobs in PostgreSQL.
-- ---------------------------------------------------------------------------
CREATE TABLE "mail_attachments" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "message_id"    TEXT        NOT NULL,
  "filename"      TEXT        NOT NULL,
  "mime_type"     TEXT        NOT NULL DEFAULT 'application/octet-stream',
  "size_bytes"    INTEGER     NOT NULL DEFAULT 0,
  "storage_path"  TEXT        NOT NULL,             -- Supabase Storage object path
  "storage_bucket" TEXT       NOT NULL DEFAULT 'mail-attachments',
  "checksum_sha256" TEXT,                           -- For integrity verification
  "is_inline"     BOOLEAN     NOT NULL DEFAULT FALSE, -- True = embedded image (CID)
  "content_id"    TEXT,                             -- RFC 2392 Content-ID for inline images
  "uploaded_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mail_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_attachments_message_id_fk"
    FOREIGN KEY ("message_id") REFERENCES "mail_messages" ("id") ON DELETE CASCADE
);

CREATE INDEX "mail_attachments_message_id_idx" ON "mail_attachments" ("message_id");

COMMENT ON TABLE "mail_attachments" IS 'Attachment metadata only; binaries stored in Supabase Storage';
COMMENT ON COLUMN "mail_attachments"."storage_path" IS 'Supabase Storage object path; never expose signed URLs in responses';

-- ---------------------------------------------------------------------------
-- 8. mail_outbox  (Transactional Outbox pattern)
--    Jobs written atomically with message creation; a background worker
--    polls for PENDING rows and delivers them. Safe for exactly-once delivery.
-- ---------------------------------------------------------------------------
CREATE TABLE "mail_outbox" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "message_id"    TEXT        NOT NULL,
  "status"        "MailJobStatus" NOT NULL DEFAULT 'PENDING',
  "transport"     TEXT        NOT NULL DEFAULT 'internal', -- 'internal' | 'smtp' | 'resend' (future)
  "attempts"      INTEGER     NOT NULL DEFAULT 0,
  "max_attempts"  INTEGER     NOT NULL DEFAULT 3,
  "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "last_error"    TEXT,
  "processed_at"  TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mail_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_outbox_message_id_fk"
    FOREIGN KEY ("message_id") REFERENCES "mail_messages" ("id") ON DELETE CASCADE,
  CONSTRAINT "mail_outbox_message_id_uq" UNIQUE ("message_id") -- one outbox row per message
);

CREATE INDEX "mail_outbox_status_next_idx"
  ON "mail_outbox" ("status", "next_attempt_at")
  WHERE "status" IN ('PENDING', 'FAILED');

COMMENT ON TABLE "mail_outbox" IS 'Transactional outbox for reliable message delivery; polled by background worker';

-- ---------------------------------------------------------------------------
-- 9. mail_events
--    Immutable delivery/engagement event log.
-- ---------------------------------------------------------------------------
CREATE TABLE "mail_events" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "message_id"    TEXT        NOT NULL,
  "outbox_id"     TEXT,                             -- NULL for engagement events
  "event_type"    "MailEventType" NOT NULL,
  "recipient_id"  TEXT,                             -- FK -> mail_recipients.id
  "metadata"      JSONB,                            -- Transport-specific data (timestamps, MX, etc.)
  "occurred_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mail_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_events_message_id_fk"
    FOREIGN KEY ("message_id") REFERENCES "mail_messages" ("id") ON DELETE CASCADE,
  CONSTRAINT "mail_events_recipient_id_fk"
    FOREIGN KEY ("recipient_id") REFERENCES "mail_recipients" ("id") ON DELETE SET NULL
);

CREATE INDEX "mail_events_message_id_idx"  ON "mail_events" ("message_id");
CREATE INDEX "mail_events_event_type_idx"  ON "mail_events" ("event_type");
CREATE INDEX "mail_events_occurred_at_idx" ON "mail_events" ("occurred_at" DESC);

COMMENT ON TABLE "mail_events" IS 'Immutable delivery and engagement event log per message';

-- ---------------------------------------------------------------------------
-- 10. mail_audit_logs
--     Security-grade immutable audit trail for mailbox operations.
--     Separate from the general audit_logs table to allow independent
--     retention policies and access controls.
-- ---------------------------------------------------------------------------
CREATE TABLE "mail_audit_logs" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "actor_user_id" TEXT        NOT NULL,             -- Always from req.user.id — never client-supplied
  "action"        TEXT        NOT NULL,             -- 'SEND', 'READ', 'TRASH', 'DELETE', 'RESTORE', etc.
  "resource_type" TEXT        NOT NULL,             -- 'message', 'thread', 'mailbox_item', 'address'
  "resource_id"   TEXT        NOT NULL,
  "ip_address"    TEXT,
  "user_agent"    TEXT,
  "metadata"      JSONB,                            -- Additional context (folder changes, etc.)
  "occurred_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mail_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_audit_logs_actor_user_id_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);

CREATE INDEX "mail_audit_logs_actor_idx"    ON "mail_audit_logs" ("actor_user_id");
CREATE INDEX "mail_audit_logs_resource_idx" ON "mail_audit_logs" ("resource_type", "resource_id");
CREATE INDEX "mail_audit_logs_occurred_idx" ON "mail_audit_logs" ("occurred_at" DESC);

COMMENT ON TABLE "mail_audit_logs" IS 'Security-grade immutable audit trail; actor_user_id always from JWT — never client-supplied';

-- ---------------------------------------------------------------------------
-- 11. Updated-at trigger for mutable tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER mail_addresses_updated_at
  BEFORE UPDATE ON "mail_addresses"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mail_threads_updated_at
  BEFORE UPDATE ON "mail_threads"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mail_messages_updated_at
  BEFORE UPDATE ON "mail_messages"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mailbox_items_updated_at
  BEFORE UPDATE ON "mailbox_items"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mail_outbox_updated_at
  BEFORE UPDATE ON "mail_outbox"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 12. Thread message_count maintenance trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mail_thread_message_count_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "mail_threads"
    SET
      "message_count"  = "message_count" + 1,
      "last_message_at" = COALESCE(NEW.sent_at, NOW()),
      "updated_at"     = NOW()
    WHERE "id" = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "mail_threads"
    SET
      "message_count" = GREATEST("message_count" - 1, 0),
      "updated_at"    = NOW()
    WHERE "id" = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER mail_messages_thread_count
  AFTER INSERT OR DELETE ON "mail_messages"
  FOR EACH ROW EXECUTE FUNCTION mail_thread_message_count_update();
