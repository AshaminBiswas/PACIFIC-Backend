-- =============================================================================
-- Migration: 2026102401_mail_address_assignments_and_aliases
-- Pacific Mail — Enterprise Address Directory, Assignments & Aliases
-- =============================================================================

-- 1. Verification & Routing Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MailAddressStatus') THEN
    CREATE TYPE "MailAddressStatus" AS ENUM (
      'INTERNAL_ONLY',
      'PENDING_VERIFICATION',
      'VERIFIED',
      'EXTERNAL_ROUTABLE'
    );
  END IF;
END $$;

-- 2. Alter mail_addresses to support standalone directory records & quotas
ALTER TABLE "mail_addresses"
  ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "mail_addresses"
  ADD COLUMN IF NOT EXISTS "verification_status" "MailAddressStatus" NOT NULL DEFAULT 'INTERNAL_ONLY',
  ADD COLUMN IF NOT EXISTS "max_storage_bytes" BIGINT NOT NULL DEFAULT 524288000, -- 500 MB
  ADD COLUMN IF NOT EXISTS "daily_send_quota" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "is_shared" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "assigned_by" TEXT,
  ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mail_addresses_assigned_by_fk'
  ) THEN
    ALTER TABLE "mail_addresses"
      ADD CONSTRAINT "mail_addresses_assigned_by_fk"
      FOREIGN KEY ("assigned_by") REFERENCES "users" ("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "mail_addresses_domain_status_idx"
  ON "mail_addresses" ("domain", "verification_status");

-- 3. Address Assignment History Table
CREATE TABLE IF NOT EXISTS "mail_address_assignments" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "address_id"    TEXT        NOT NULL,
  "user_id"       TEXT        NOT NULL,
  "assigned_by"   TEXT,
  "assigned_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "unassigned_at" TIMESTAMPTZ,
  "reason"        TEXT,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mail_address_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_address_assignments_address_fk"
    FOREIGN KEY ("address_id") REFERENCES "mail_addresses" ("id") ON DELETE CASCADE,
  CONSTRAINT "mail_address_assignments_user_fk"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "mail_address_assignments_assigned_by_fk"
    FOREIGN KEY ("assigned_by") REFERENCES "users" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "mail_address_assignments_address_idx"
  ON "mail_address_assignments" ("address_id", "assigned_at" DESC);
CREATE INDEX IF NOT EXISTS "mail_address_assignments_user_idx"
  ON "mail_address_assignments" ("user_id");

-- 4. Mail Aliases Table
CREATE TABLE IF NOT EXISTS "mail_aliases" (
  "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "address_id"       TEXT        NOT NULL,
  "alias_local_part" TEXT        NOT NULL,
  "alias_domain"     TEXT        NOT NULL DEFAULT 'pacificproduct.in',
  "display_name"     TEXT,
  "is_active"        BOOLEAN     NOT NULL DEFAULT TRUE,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "mail_aliases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mail_aliases_full_uq" UNIQUE ("alias_local_part", "alias_domain"),
  CONSTRAINT "mail_aliases_address_fk"
    FOREIGN KEY ("address_id") REFERENCES "mail_addresses" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "mail_aliases_lookup_idx"
  ON "mail_aliases" ("alias_local_part", "alias_domain") WHERE "is_active" = TRUE;

-- 5. Trigger for updated_at on mail_aliases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'mail_aliases_updated_at'
  ) THEN
    CREATE TRIGGER mail_aliases_updated_at
      BEFORE UPDATE ON "mail_aliases"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 6. Enable Row Level Security (RLS) on new tables
ALTER TABLE "mail_address_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mail_aliases" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "mail_address_assignments" FROM anon;
    REVOKE ALL ON "mail_aliases" FROM anon;
  END IF;
END $$;
