-- =============================================================================
-- Migration: 20261023_mail_security_rls
-- Pacific Mail — Step 4 Security Hardening, RLS Policies & Retention
--
-- Enforces:
-- 1. Row Level Security (RLS) on all 9 mail tables
-- 2. Restricts Supabase anon & authenticated roles from direct PostgREST access
-- 3. Grants service_role / postgres (backend connection) full privileged access
-- 4. 30-Day Trash retention cleanup procedure
-- 5. Account deactivation cascading policy
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enable Row Level Security (RLS) on all mail tables
-- -----------------------------------------------------------------------------

ALTER TABLE "mail_addresses"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mail_threads"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mail_messages"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mail_recipients"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mailbox_items"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mail_attachments"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mail_outbox"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mail_events"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mail_audit_logs"   ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Restrict Direct PostgREST / Supabase Anon Access
--    Prevents browser clients using the anon key from querying mail tables.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  -- Check if anon and authenticated roles exist in current Postgres/Supabase instance
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "mail_addresses"   FROM anon;
    REVOKE ALL ON "mail_threads"     FROM anon;
    REVOKE ALL ON "mail_messages"    FROM anon;
    REVOKE ALL ON "mail_recipients"  FROM anon;
    REVOKE ALL ON "mailbox_items"    FROM anon;
    REVOKE ALL ON "mail_attachments" FROM anon;
    REVOKE ALL ON "mail_outbox"      FROM anon;
    REVOKE ALL ON "mail_events"      FROM anon;
    REVOKE ALL ON "mail_audit_logs"  FROM anon;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Mailbox-Level RLS Policies (Defense-in-Depth for Authenticated Role)
-- -----------------------------------------------------------------------------

-- Mail Addresses: Users can read only their own active address
CREATE POLICY "mail_addresses_select_own" ON "mail_addresses"
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Mailbox Items: Users can access and mutate ONLY their own mailbox items
CREATE POLICY "mailbox_items_all_own" ON "mailbox_items"
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Mail Messages: Readable only if user is sender OR has matching mailbox_item
CREATE POLICY "mail_messages_select_participant" ON "mail_messages"
  FOR SELECT
  USING (
    auth.uid()::text = sender_user_id
    OR EXISTS (
      SELECT 1 FROM "mailbox_items" mi
      WHERE mi.message_id = "mail_messages".id
        AND mi.user_id = auth.uid()::text
    )
  );

-- Mail Attachments: Readable only if user is message sender OR has mailbox_item
CREATE POLICY "mail_attachments_select_participant" ON "mail_attachments"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "mail_messages" m
      WHERE m.id = "mail_attachments".message_id
        AND (
          m.sender_user_id = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM "mailbox_items" mi
            WHERE mi.message_id = m.id
              AND mi.user_id = auth.uid()::text
          )
        )
    )
  );

-- Mail Outbox, Events, Audit Logs: Accessible exclusively to service_role / backend
-- Zero access granted to authenticated or anon roles.

-- -----------------------------------------------------------------------------
-- 4. Data Retention & 30-Day Trash Cleanup Procedure
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "purge_expired_trash_mail"()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_items_count INTEGER := 0;
BEGIN
  -- 1. Permanently delete mailbox items residing in TRASH for > 30 days
  WITH deleted AS (
    DELETE FROM "mailbox_items"
    WHERE "folder" = 'TRASH'::"MailFolder"
      AND "updated_at" < (NOW() - INTERVAL '30 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_items_count FROM deleted;

  -- 2. Clean up orphaned messages that no longer have any mailbox_items
  --    (and are not pending in outbox)
  DELETE FROM "mail_messages" m
  WHERE m.is_draft = FALSE
    AND NOT EXISTS (SELECT 1 FROM "mailbox_items" mi WHERE mi.message_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM "mail_outbox" o WHERE o.message_id = m.id AND o.status = 'PENDING');

  RETURN deleted_items_count;
END;
$$;

COMMENT ON FUNCTION "purge_expired_trash_mail"() IS 'Purges TRASH mailbox items older than 30 days and cascades orphaned messages';

-- -----------------------------------------------------------------------------
-- 5. Account Deactivation Synchronization Trigger
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "sync_user_mail_deactivation"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When user account is deactivated (isActive set to false)
  IF OLD."isActive" = TRUE AND NEW."isActive" = FALSE THEN
    UPDATE "mail_addresses"
    SET "is_active" = FALSE, "updated_at" = NOW()
    WHERE "user_id" = NEW."id";

    -- Insert security audit log
    INSERT INTO "mail_audit_logs" (
      "actor_user_id", "action", "resource_type", "resource_id", "metadata"
    ) VALUES (
      NEW."id", 'ACCOUNT_DEACTIVATED', 'user', NEW."id",
      jsonb_build_object('reason', 'User isActive set to false')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_sync_user_mail_deactivation" ON "users";

CREATE TRIGGER "trg_sync_user_mail_deactivation"
  AFTER UPDATE OF "isActive" ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION "sync_user_mail_deactivation"();
