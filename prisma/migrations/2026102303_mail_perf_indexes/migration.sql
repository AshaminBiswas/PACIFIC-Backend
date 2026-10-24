-- =============================================================================
-- Migration: 20261023_mail_perf_indexes
-- Pacific Mail — Step 5 High-Concurrency Query Optimization & Index Justifications
--
-- Justifications:
-- 1. mailbox_items(user_id, thread_id, is_read):
--    Accelerates thread access checks and batch mark-read updates.
-- 2. mail_recipients(message_id, type):
--    Accelerates batch recipient fetches across multi-message thread queries.
-- 3. mail_messages(thread_id, sent_at ASC, created_at ASC):
--    Eliminates in-memory sorting for thread conversation timelines.
-- 4. mail_outbox(status, next_attempt_at) WHERE status IN ('PENDING', 'RETRY'):
--    Partial index specifically optimized for worker polling with SKIP LOCKED.
-- 5. pg_trgm extension & GIN indexes on mail_messages(subject) & mail_addresses(local_part):
--    Accelerates substring ILIKE searches without requiring sequential table scans.
-- =============================================================================

-- 1. Accelerated Thread Participant & Read State Composite Index
CREATE INDEX IF NOT EXISTS "mailbox_items_thread_read_idx"
  ON "mailbox_items" ("user_id", "thread_id", "is_read");

-- 2. Batch Recipient Fetch Composite Index
CREATE INDEX IF NOT EXISTS "mail_recipients_msg_type_idx"
  ON "mail_recipients" ("message_id", "type");

-- 3. Chronological Conversation Ordering Composite Index
CREATE INDEX IF NOT EXISTS "mail_messages_thread_sent_idx"
  ON "mail_messages" ("thread_id", "sent_at" ASC NULLS LAST, "created_at" ASC);

-- 4. Transactional Outbox Worker Polling Partial Index
CREATE INDEX IF NOT EXISTS "mail_outbox_worker_poll_idx"
  ON "mail_outbox" ("status", "next_attempt_at")
  WHERE "status" IN ('PENDING', 'RETRY');

-- 5. Substring Trigram Search Index
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE INDEX IF NOT EXISTS "mail_messages_subject_trgm_idx"
  ON "mail_messages" USING gin ("subject" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "mail_addresses_local_part_trgm_idx"
  ON "mail_addresses" USING gin ("local_part" gin_trgm_ops);
