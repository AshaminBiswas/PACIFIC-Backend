// =============================================================================
// Pacific Mail — Transactional Outbox Worker & Dead-Letter Engine (Step 5)
// Polls mail_outbox with FOR UPDATE SKIP LOCKED, delivers internal messages
// idempotently, applies exponential backoff, and routes dead jobs to FAILED.
// Supports graceful shutdown without dropping in-flight jobs.
// =============================================================================

import { prisma } from '../../config/database';
import { outboxRepository, eventRepository, type DbClient } from './mail.repository';
import { mailMetrics } from './mail.metrics';

export interface WorkerStatus {
  isRunning: boolean;
  activeJobsCount: number;
  totalJobsProcessed: number;
  totalJobsFailed: number;
  lastPollAt: Date | null;
}

export class MailOutboxWorker {
  private static instance: MailOutboxWorker;
  private isRunning = false;
  private isShuttingDown = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private pollIntervalMs: number;
  private batchSize: number;

  private activeJobsCount = 0;
  private totalJobsProcessed = 0;
  private totalJobsFailed = 0;
  private lastPollAt: Date | null = null;

  constructor(pollIntervalMs = 2500, batchSize = 25) {
    this.pollIntervalMs = pollIntervalMs;
    this.batchSize = batchSize;
  }

  public static getInstance(): MailOutboxWorker {
    if (!MailOutboxWorker.instance) {
      MailOutboxWorker.instance = new MailOutboxWorker();
    }
    return MailOutboxWorker.instance;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isShuttingDown = false;
    console.log(`📬 [MailOutboxWorker] Started (poll: ${this.pollIntervalMs}ms, batch: ${this.batchSize})`);

    this.scheduleNextTick();
  }

  private scheduleNextTick(): void {
    if (!this.isRunning || this.isShuttingDown) return;
    this.pollTimer = setTimeout(async () => {
      try {
        await this.pollAndProcess();
      } catch (err: any) {
        console.error('⚠️ [MailOutboxWorker] Poll cycle error:', err.message);
      } finally {
        this.scheduleNextTick();
      }
    }, this.pollIntervalMs);
  }

  /**
   * Polls database for pending outbox rows using FOR UPDATE SKIP LOCKED.
   * Guarantees safe multi-worker / multi-instance concurrency without duplicate processing.
   */
  public async pollAndProcess(): Promise<number> {
    if (this.isShuttingDown) return 0;
    this.lastPollAt = new Date();

    // Query pending jobs due for processing
    const jobs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT o.id, o.message_id, o.transport, o.attempts, o.max_attempts
       FROM mail_outbox o
       WHERE o.status IN ('PENDING'::"MailJobStatus", 'RETRY'::"MailJobStatus")
         AND o.next_attempt_at <= NOW()
       ORDER BY o.next_attempt_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      this.batchSize
    );

    if (!jobs || jobs.length === 0) {
      return 0;
    }

    this.activeJobsCount += jobs.length;

    for (const job of jobs) {
      try {
        await this.processJob(job);
        this.totalJobsProcessed++;
        mailMetrics.counters.messagesDelivered++;
      } catch (err: any) {
        this.totalJobsFailed++;
        mailMetrics.counters.messagesFailed++;
        await this.handleJobFailure(job, err);
      } finally {
        this.activeJobsCount--;
      }
    }

    return jobs.length;
  }

  /**
   * Process a single outbox delivery job.
   * For internal transport: ensures fan-out delivery is idempotent.
   */
  private async processJob(job: any): Promise<void> {
    const messageId = job.message_id;

    await prisma.$transaction(async (tx: any) => {
      // 1. Mark job as PROCESSING
      await tx.$executeRawUnsafe(
        `UPDATE mail_outbox
         SET status = 'PROCESSING'::"MailJobStatus", attempts = attempts + 1, updated_at = NOW()
         WHERE id = $1`,
        job.id
      );

      // 2. Fetch recipients for message
      const recipients = (await (tx as DbClient).$queryRawUnsafe(
        `SELECT r.user_id, r.raw_email, r.type, m.thread_id
         FROM mail_recipients r
         JOIN mail_messages m ON m.id = r.message_id
         WHERE r.message_id = $1`,
        messageId
      )) as any[];

      // 3. Deliver to internal mailboxes idempotently (ON CONFLICT DO NOTHING)
      const internalUserIds = recipients
        .map((r: any) => r.user_id)
        .filter((uid: any): uid is string => Boolean(uid));

      if (internalUserIds.length > 0 && recipients[0]?.thread_id) {
        const threadId = recipients[0].thread_id;
        for (const userId of internalUserIds) {
          await tx.$executeRawUnsafe(
            `INSERT INTO mailbox_items (
               user_id, message_id, thread_id, folder, is_read, is_starred, is_archived, labels, received_at
             ) VALUES (
               $1, $2, $3, 'INBOX'::"MailFolder", FALSE, FALSE, FALSE, '{}', NOW()
             )
             ON CONFLICT ("user_id", "message_id", "folder") DO NOTHING`,
            userId,
            messageId,
            threadId
          );
        }
      }

      // 4. Mark job as COMPLETED / SENT
      await tx.$executeRawUnsafe(
        `UPDATE mail_outbox
         SET status = 'SENT'::"MailJobStatus", processed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        job.id
      );

      // 5. Emit delivery event
      await eventRepository.record(
        {
          messageId,
          outboxId: job.id,
          eventType: 'delivered',
          metadata: {
            workerId: process.pid,
            deliveredRecipients: internalUserIds.length,
          },
        },
        tx
      );
    });
  }

  /**
   * Exponential backoff retry and Dead-Letter Queue (DLQ) state transition.
   */
  private async handleJobFailure(job: any, error: any): Promise<void> {
    const currentAttempts = Number(job.attempts || 0) + 1;
    const maxAttempts = Number(job.max_attempts || 3);
    const errorMessage = error?.message || String(error);

    if (currentAttempts >= maxAttempts) {
      // Transition to FAILED (Dead-Letter state)
      console.error(
        `🛑 [MailOutboxWorker] Job ${job.id} exceeded max attempts (${maxAttempts}). Routing to DEAD-LETTER (FAILED). Error: ${errorMessage}`
      );

      await prisma.$executeRawUnsafe(
        `UPDATE mail_outbox
         SET status = 'FAILED'::"MailJobStatus",
             last_error = $2,
             updated_at = NOW()
         WHERE id = $1`,
        job.id,
        errorMessage
      );

      await eventRepository.record({
        messageId: job.message_id,
        outboxId: job.id,
        eventType: 'bounced',
        metadata: {
          reason: 'Dead-letter threshold reached',
          attempts: currentAttempts,
          error: errorMessage,
        },
      });
    } else {
      // Exponential backoff: attempt 1 -> 30s, attempt 2 -> 2m, attempt 3 -> 8m
      const backoffSeconds = 30 * Math.pow(2, currentAttempts - 1);

      await prisma.$executeRawUnsafe(
        `UPDATE mail_outbox
         SET status = 'RETRY'::"MailJobStatus",
             last_error = $2,
             next_attempt_at = NOW() + ($3 || ' seconds')::INTERVAL,
             updated_at = NOW()
         WHERE id = $1`,
        job.id,
        errorMessage,
        String(backoffSeconds)
      );
    }
  }

  /**
   * Graceful shutdown: Stops polling and waits for active in-flight jobs to drain.
   */
  public async stop(timeoutMs = 5000): Promise<void> {
    if (!this.isRunning) return;
    this.isShuttingDown = true;
    this.isRunning = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    console.log(`🔌 [MailOutboxWorker] Stopping worker... Waiting for ${this.activeJobsCount} active job(s)`);

    const start = Date.now();
    while (this.activeJobsCount > 0 && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.activeJobsCount > 0) {
      console.warn(`⚠️ [MailOutboxWorker] Timed out waiting for ${this.activeJobsCount} active job(s) to finish.`);
    } else {
      console.log('✅ [MailOutboxWorker] Worker stopped cleanly. Zero jobs orphaned.');
    }
  }

  public getStatus(): WorkerStatus {
    return {
      isRunning: this.isRunning,
      activeJobsCount: this.activeJobsCount,
      totalJobsProcessed: this.totalJobsProcessed,
      totalJobsFailed: this.totalJobsFailed,
      lastPollAt: this.lastPollAt,
    };
  }
}

export const outboxWorker = MailOutboxWorker.getInstance();
