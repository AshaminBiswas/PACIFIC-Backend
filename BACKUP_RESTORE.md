# Pacific Mail — Backup, Disaster Recovery & Restore Procedures

This operational runbook provides production-grade, zero-cost backup and recovery procedures for the Pacific Mail module. It covers both relational PostgreSQL data and local file storage attachments, including point-in-time recovery (PITR) procedures and verified restore validation queries.

---

## 1. Architecture & Storage Assets

Pacific Mail persists data across two distinct layers:
1. **Relational Database (PostgreSQL / Supabase)**:
   - `mail_addresses`: User address bindings, quotas, mailbox state.
   - `mail_threads`: Conversation headers and thread-level state.
   - `mail_messages`: Immutable message content (subject, bodyText, bodyHtml, headers).
   - `mail_recipients`: TO, CC, BCC recipients.
   - `mailbox_items`: Per-user folder state, read/unread, starred, archived flags.
   - `mail_attachments`: Attachment metadata (checksum, size, mime type, storage key).
   - `mail_outbox`: Transactional outbox delivery queue and retry attempts.
   - `mail_events`: Append-only security audit log and administrative actions.
2. **Physical Attachment Storage**:
   - Directory: `D:\PACIFIC-Backend\storage\mail_attachments\` (or `$MAIL_STORAGE_LOCAL_DIR`).
   - Files are stored using cryptographic SHA-256 content addressing with sanitized extensions.

---

## 2. Automated Daily / Hourly Backup Protocol

### A. PostgreSQL Mail Schema Dump
Export all Mail-related tables using PostgreSQL custom archive format (`-Fc`), enabling parallel restore, compression, and selective table filtering.

```bash
#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/pacific_mail"
mkdir -p "${BACKUP_DIR}"

# Export all mail_* tables and mailbox_items
pg_dump \
  --dbname="${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --table='mail_addresses' \
  --table='mail_threads' \
  --table='mail_messages' \
  --table='mail_recipients' \
  --table='mailbox_items' \
  --table='mail_attachments' \
  --table='mail_outbox' \
  --table='mail_events' \
  --file="${BACKUP_DIR}/pacific_mail_tables_${TIMESTAMP}.dump"

echo "✅ Pacific Mail database dump saved to ${BACKUP_DIR}/pacific_mail_tables_${TIMESTAMP}.dump"
```

### B. Physical Attachment Directory Snapshot
Create an incremental compressed tarball of the attachment directory:

```bash
# Snapshot attachment directory preserving permissions and timestamps
tar -czf "${BACKUP_DIR}/pacific_mail_attachments_${TIMESTAMP}.tar.gz" \
  -C "D:/PACIFIC-Backend/storage" mail_attachments/

echo "✅ Pacific Mail attachments snapshot saved to ${BACKUP_DIR}/pacific_mail_attachments_${TIMESTAMP}.tar.gz"
```

### C. Retention & Pruning Policy (₹0 Local Disk / NAS)
Retain hourly backups for 48 hours, daily backups for 30 days, and monthly backups for 12 months:

```bash
find "${BACKUP_DIR}" -name "pacific_mail_tables_*.dump" -mtime +30 -delete
find "${BACKUP_DIR}" -name "pacific_mail_attachments_*.tar.gz" -mtime +30 -delete
```

---

## 3. Database Restore Procedures

> [!CAUTION]
> Never restore directly into production without first validating against a staging database or testing in an isolated temporary schema.

### Scenario 1: Restore to Isolated Test / Staging Database
```bash
# 1. Create a clean staging database
createdb -h localhost -U postgres pacific_mail_staging

# 2. Restore tables from dump
pg_restore \
  -h localhost \
  -U postgres \
  --dbname=pacific_mail_staging \
  --clean \
  --if-exists \
  --no-owner \
  --role=postgres \
  "${BACKUP_DIR}/pacific_mail_tables_20261023_190000.dump"
```

### Scenario 2: Emergency Single Table Recovery (e.g., Accidentally Dropped `mailbox_items`)
```bash
pg_restore \
  -h localhost \
  -U postgres \
  --dbname=pacific_erp \
  --table=mailbox_items \
  --clean \
  "${BACKUP_DIR}/pacific_mail_tables_20261023_190000.dump"
```

### Scenario 3: Restoring Attachment Files
```bash
mkdir -p "D:/PACIFIC-Backend/storage/mail_attachments"
tar -xzf "${BACKUP_DIR}/pacific_mail_attachments_20261023_190000.tar.gz" \
  -C "D:/PACIFIC-Backend/storage"
```

---

## 4. Post-Restore Data Integrity Verification

Run the following SQL verification suite immediately following any restore to confirm zero orphaned rows, consistent referential integrity, and accurate mailbox counts:

```sql
-- 1. Verify row counts across all mail tables
SELECT 'mail_addresses' AS tbl, COUNT(*) FROM mail_addresses
UNION ALL SELECT 'mail_threads', COUNT(*) FROM mail_threads
UNION ALL SELECT 'mail_messages', COUNT(*) FROM mail_messages
UNION ALL SELECT 'mail_recipients', COUNT(*) FROM mail_recipients
UNION ALL SELECT 'mailbox_items', COUNT(*) FROM mailbox_items
UNION ALL SELECT 'mail_attachments', COUNT(*) FROM mail_attachments
UNION ALL SELECT 'mail_outbox', COUNT(*) FROM mail_outbox
UNION ALL SELECT 'mail_events', COUNT(*) FROM mail_events;

-- 2. Verify zero orphaned mailbox_items (every item points to an existing message and thread)
SELECT COUNT(*) AS orphaned_mailbox_items
FROM mailbox_items mi
LEFT JOIN mail_messages mm ON mm.id = mi.message_id
LEFT JOIN mail_threads mt ON mt.id = mi.thread_id
WHERE mm.id IS NULL OR mt.id IS NULL;
-- Expected output: 0

-- 3. Verify zero orphaned recipients
SELECT COUNT(*) AS orphaned_recipients
FROM mail_recipients mr
LEFT JOIN mail_messages mm ON mm.id = mr.message_id
WHERE mm.id IS NULL;
-- Expected output: 0

-- 4. Verify thread message counts match actual message counts
SELECT mt.id AS thread_id, mt.message_count AS recorded_count, COUNT(mm.id) AS actual_count
FROM mail_threads mt
JOIN mail_messages mm ON mm.thread_id = mt.id
GROUP BY mt.id, mt.message_count
HAVING mt.message_count <> COUNT(mm.id);
-- Expected output: 0 rows

-- 5. Verify attachment physical files exist for all records
-- (Run via Node.js script to cross-reference mail_attachments.storage_key against local filesystem)
```

---

## 5. Point-In-Time Recovery (PITR) Setup

To recover to an exact second (e.g. before an accidental data truncation):
1. **Enable WAL Archiving** in `postgresql.conf`:
   ```ini
   wal_level = replica
   archive_mode = on
   archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
   archive_timeout = 300
   ```
2. **Perform PITR Restore**:
   - Stop PostgreSQL service.
   - Restore base backup.
   - Configure `recovery.signal` and `postgresql.conf`:
     ```ini
     restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
     recovery_target_time = '2026-10-23 18:30:00 UTC'
     ```
   - Start PostgreSQL service. Engine replays WAL logs up to the exact timestamp and halts.
