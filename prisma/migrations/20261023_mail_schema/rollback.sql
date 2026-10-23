-- =============================================================================
-- Pacific Mail Step 1 — ROLLBACK script
-- Run manually in psql or Supabase SQL editor ONLY.
-- DO NOT run automatically.
-- =============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS mail_messages_thread_count   ON "mail_messages";
DROP TRIGGER IF EXISTS mail_outbox_updated_at        ON "mail_outbox";
DROP TRIGGER IF EXISTS mailbox_items_updated_at      ON "mailbox_items";
DROP TRIGGER IF EXISTS mail_messages_updated_at      ON "mail_messages";
DROP TRIGGER IF EXISTS mail_threads_updated_at       ON "mail_threads";
DROP TRIGGER IF EXISTS mail_addresses_updated_at     ON "mail_addresses";

-- Drop trigger functions (only if not used by other tables)
DROP FUNCTION IF EXISTS mail_thread_message_count_update();
-- Note: update_updated_at_column() may be shared; only drop if safe
-- DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in dependency order (children before parents)
DROP TABLE IF EXISTS "mail_audit_logs"   CASCADE;
DROP TABLE IF EXISTS "mail_events"       CASCADE;
DROP TABLE IF EXISTS "mail_outbox"       CASCADE;
DROP TABLE IF EXISTS "mail_attachments"  CASCADE;
DROP TABLE IF EXISTS "mailbox_items"     CASCADE;
DROP TABLE IF EXISTS "mail_recipients"   CASCADE;
DROP TABLE IF EXISTS "mail_messages"     CASCADE;
DROP TABLE IF EXISTS "mail_threads"      CASCADE;
DROP TABLE IF EXISTS "mail_addresses"    CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "MailContentType"   CASCADE;
DROP TYPE IF EXISTS "MailRecipientType" CASCADE;
DROP TYPE IF EXISTS "MailEventType"     CASCADE;
DROP TYPE IF EXISTS "MailJobStatus"     CASCADE;
DROP TYPE IF EXISTS "MailFolder"        CASCADE;
