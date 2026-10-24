// =============================================================================
// Pacific Mail — Operational Metrics, Structured Logging & Diagnostics (Step 5)
// Tracks throughput, latency percentiles (p50/p95/p99), database health,
// queue depth, error rates, and request ID correlation.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../config/database';

export interface LatencyStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface MetricsCounters {
  messagesAccepted: number;
  messagesDelivered: number;
  messagesFailed: number;
  transactionsFailed: number;
  authFailures: number;
  rateLimitHits: number;
  totalHttpRequests: number;
  http4xxErrors: number;
  http5xxErrors: number;
}

class SlidingWindowLatency {
  private windowSize: number;
  private samples: number[] = [];

  constructor(windowSize = 1000) {
    this.windowSize = windowSize;
  }

  record(durationMs: number): void {
    if (this.samples.length >= this.windowSize) {
      this.samples.shift();
    }
    this.samples.push(durationMs);
  }

  getStats(): LatencyStats {
    if (this.samples.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.samples].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, v) => acc + v, 0);

    const percentile = (p: number) => {
      const idx = Math.min(count - 1, Math.max(0, Math.floor((p / 100) * count)));
      return Math.round(sorted[idx] * 100) / 100;
    };

    return {
      count,
      min: Math.round(sorted[0] * 100) / 100,
      max: Math.round(sorted[count - 1] * 100) / 100,
      avg: Math.round((sum / count) * 100) / 100,
      p50: percentile(50),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
    };
  }

  reset(): void {
    this.samples = [];
  }
}

// ─── Operational Metrics Registry ─────────────────────────────────────────────

export class MailMetricsRegistry {
  private static instance: MailMetricsRegistry;

  public counters = {
    messagesAccepted: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    transactionsFailed: 0,
    authFailures: 0,
    rateLimitHits: 0,
    totalHttpRequests: 0,
    http4xxErrors: 0,
    http5xxErrors: 0,
  };

  public latencies = {
    overall: new SlidingWindowLatency(2000),
    send: new SlidingWindowLatency(1000),
    listFolder: new SlidingWindowLatency(1000),
    getThread: new SlidingWindowLatency(1000),
    search: new SlidingWindowLatency(1000),
    attachmentDownload: new SlidingWindowLatency(500),
  };

  private startTime = Date.now();

  private constructor() {}

  public static getInstance(): MailMetricsRegistry {
    if (!MailMetricsRegistry.instance) {
      MailMetricsRegistry.instance = new MailMetricsRegistry();
    }
    return MailMetricsRegistry.instance;
  }

  public recordRequest(routeCategory: string, durationMs: number, statusCode: number): void {
    this.counters.totalHttpRequests++;
    this.latencies.overall.record(durationMs);

    if (statusCode >= 400 && statusCode < 500) {
      this.counters.http4xxErrors++;
      if (statusCode === 401 || statusCode === 403) {
        this.counters.authFailures++;
      } else if (statusCode === 429) {
        this.counters.rateLimitHits++;
      }
    } else if (statusCode >= 500) {
      this.counters.http5xxErrors++;
    }

    if (routeCategory === 'send') this.latencies.send.record(durationMs);
    else if (routeCategory === 'listFolder') this.latencies.listFolder.record(durationMs);
    else if (routeCategory === 'getThread') this.latencies.getThread.record(durationMs);
    else if (routeCategory === 'search') this.latencies.search.record(durationMs);
    else if (routeCategory === 'download') this.latencies.attachmentDownload.record(durationMs);
  }

  public async getDiagnosticsSnapshot(): Promise<{
    uptimeSeconds: number;
    throughputReqPerSec: number;
    counters: MetricsCounters;
    latencies: Record<string, LatencyStats>;
    queue: {
      depth: number;
      oldestPendingJobSeconds: number;
      failedJobs: number;
    };
    storage: {
      attachmentDirBytes: number;
      attachmentCount: number;
    };
    database: {
      status: 'CONNECTED' | 'DISCONNECTED';
      pingLatencyMs: number;
    };
  }> {
    const uptimeSeconds = Math.round((Date.now() - this.startTime) / 1000);
    const throughputReqPerSec =
      uptimeSeconds > 0
        ? Math.round((this.counters.totalHttpRequests / uptimeSeconds) * 100) / 100
        : 0;

    // Database Ping
    let dbStatus: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
    let pingLatencyMs = -1;
    const dbStart = Date.now();
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      pingLatencyMs = Date.now() - dbStart;
      dbStatus = 'CONNECTED';
    } catch {
      pingLatencyMs = -1;
    }

    // Queue depth and oldest pending job
    let queueDepth = 0;
    let oldestAgeSec = 0;
    let failedJobs = 0;

    try {
      const qRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT
           COUNT(*)::int AS depth,
           COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(next_attempt_at))), 0)::int AS oldest_age,
           (SELECT COUNT(*)::int FROM mail_outbox WHERE status = 'FAILED') AS failed_count
         FROM mail_outbox
         WHERE status = 'PENDING'`
      );
      if (qRows[0]) {
        queueDepth = Number(qRows[0].depth ?? 0);
        oldestAgeSec = Math.max(0, Number(qRows[0].oldest_age ?? 0));
        failedJobs = Number(qRows[0].failed_count ?? 0);
      }
    } catch {
      // ignore
    }

    // Attachment storage footprint
    let attachmentDirBytes = 0;
    let attachmentCount = 0;
    try {
      const storageDir = path.resolve(process.cwd(), 'storage', 'mail_attachments');
      if (fs.existsSync(storageDir)) {
        const countFiles = (dir: string) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
              countFiles(full);
            } else if (ent.isFile()) {
              attachmentCount++;
              attachmentDirBytes += fs.statSync(full).size;
            }
          }
        };
        countFiles(storageDir);
      }
    } catch {
      // ignore
    }

    return {
      uptimeSeconds,
      throughputReqPerSec,
      counters: { ...this.counters },
      latencies: {
        overall: this.latencies.overall.getStats(),
        send: this.latencies.send.getStats(),
        listFolder: this.latencies.listFolder.getStats(),
        getThread: this.latencies.getThread.getStats(),
        search: this.latencies.search.getStats(),
        attachmentDownload: this.latencies.attachmentDownload.getStats(),
      },
      queue: {
        depth: queueDepth,
        oldestPendingJobSeconds: oldestAgeSec,
        failedJobs,
      },
      storage: {
        attachmentDirBytes,
        attachmentCount,
      },
      database: {
        status: dbStatus,
        pingLatencyMs,
      },
    };
  }
}

export const mailMetrics = MailMetricsRegistry.getInstance();

// ─── Express Middleware: Request ID & Structured Logging ──────────────────────

export function mailLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `mail-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  (req as any).id = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Categorize request for granular latency histograms
  let category = 'other';
  if (req.method === 'POST' && req.path.endsWith('/send')) category = 'send';
  else if (req.method === 'GET' && req.path.includes('/folders/')) category = 'listFolder';
  else if (req.method === 'GET' && req.path.includes('/threads/')) category = 'getThread';
  else if (req.method === 'GET' && req.path.includes('/search')) category = 'search';
  else if (req.method === 'GET' && req.path.includes('/download')) category = 'download';

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    mailMetrics.recordRequest(category, durationMs, res.statusCode);

    // Output structured JSON log for log aggregation platforms
    if (process.env.NODE_ENV !== 'test') {
      const logEntry = {
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
        category,
        userId: (req as any).user?.id,
        ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
      };

      if (logEntry.level === 'error') {
        console.error(JSON.stringify(logEntry));
      } else if (logEntry.level === 'warn') {
        console.warn(JSON.stringify(logEntry));
      }
    }
  });

  next();
}
