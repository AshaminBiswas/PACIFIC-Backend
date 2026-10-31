/**
 * Pacific Restroom Cubicle Enterprise ERP — Asynchronous Background Report Queue
 * 
 * Implements non-blocking, worker-isolated report generation for large ERP transaction sets:
 * - Status lifecycle: PENDING -> PROCESSING -> COMPLETED | FAILED
 * - Idempotency control: Prevents duplicate job creation
 * - Temporary signed download tokens with 24-hour expiration
 * - Worker throttling: Protects main API event loop and database connection pool
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

export type ReportJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ReportType = 'TRANSACTIONS' | 'SALES_SUMMARY' | 'PROCUREMENT_SUMMARY' | 'FINANCIAL_PNL' | 'RECEIVABLES_AGING';
export type ReportFormat = 'xlsx' | 'csv';

export interface AsyncReportJob {
  id: string;
  idempotencyKey?: string;
  reportType: ReportType;
  format: ReportFormat;
  status: ReportJobStatus;
  progress: number; // 0 - 100
  startDate: string;
  endDate: string;
  companyProfileId?: string;
  userId?: string;
  fileName?: string;
  filePath?: string;
  fileSizeBytes?: number;
  downloadToken?: string;
  expiresAt: Date;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

class ReportQueueService {
  private jobs = new Map<string, AsyncReportJob>();
  private idempotencyMap = new Map<string, string>(); // idempotencyKey -> jobId
  private queue: string[] = []; // FIFO jobIds
  private activeWorkers = 0;
  private readonly maxConcurrentWorkers = 2;
  private readonly storageDir: string;

  constructor() {
    this.storageDir = path.join(process.cwd(), 'storage', 'reports');
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch {
      this.storageDir = path.join(os.tmpdir(), 'pacific_reports');
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    }

    // Run cleanup of expired report files every hour
    setInterval(() => this.cleanupExpiredFiles(), 60 * 60 * 1000).unref();
  }

  /**
   * Enqueue a new report generation job. Enforces idempotency controls.
   */
  enqueueReport(params: {
    reportType: ReportType;
    format?: ReportFormat;
    startDate: string;
    endDate: string;
    companyProfileId?: string;
    userId?: string;
    idempotencyKey?: string;
  }): AsyncReportJob {
    const { reportType, format = 'xlsx', startDate, endDate, companyProfileId, userId, idempotencyKey } = params;

    // 1. Idempotency Check: If key provided and job already pending/processing/completed recently, return existing
    if (idempotencyKey) {
      const existingJobId = this.idempotencyMap.get(idempotencyKey);
      if (existingJobId) {
        const existingJob = this.jobs.get(existingJobId);
        if (existingJob && (existingJob.status === 'PENDING' || existingJob.status === 'PROCESSING' || existingJob.status === 'COMPLETED')) {
          return existingJob;
        }
      }
    }

    const jobId = crypto.randomUUID();
    const downloadToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const job: AsyncReportJob = {
      id: jobId,
      idempotencyKey,
      reportType,
      format,
      status: 'PENDING',
      progress: 0,
      startDate,
      endDate,
      companyProfileId,
      userId,
      downloadToken,
      expiresAt,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    if (idempotencyKey) {
      this.idempotencyMap.set(idempotencyKey, jobId);
    }

    this.queue.push(jobId);
    setImmediate(() => this.processNext());

    return job;
  }

  getJob(jobId: string): AsyncReportJob | null {
    return this.jobs.get(jobId) || null;
  }

  getJobByToken(token: string): AsyncReportJob | null {
    for (const job of this.jobs.values()) {
      if (job.downloadToken === token) {
        if (job.expiresAt && Date.now() > job.expiresAt.getTime()) {
          return null; // Expired
        }
        return job;
      }
    }
    return null;
  }

  getQueueMetrics(): { activeWorkers: number; queueLength: number; totalJobs: number } {
    return {
      activeWorkers: this.activeWorkers,
      queueLength: this.queue.length,
      totalJobs: this.jobs.size,
    };
  }

  private async processNext(): Promise<void> {
    if (this.activeWorkers >= this.maxConcurrentWorkers || this.queue.length === 0) {
      return;
    }

    const jobId = this.queue.shift();
    if (!jobId) return;

    const job = this.jobs.get(jobId);
    if (!job) return;

    this.activeWorkers++;
    job.status = 'PROCESSING';
    job.startedAt = new Date();
    job.progress = 10;

    try {
      await this.executeJob(job);
      job.status = 'COMPLETED';
      job.progress = 100;
      job.completedAt = new Date();
    } catch (err: any) {
      logger.error(`[ReportQueue] Job ${job.id} failed:`, err);
      job.status = 'FAILED';
      job.error = err?.message || 'Report generation failed.';
    } finally {
      this.activeWorkers--;
      setImmediate(() => this.processNext());
    }
  }

  private async executeJob(job: AsyncReportJob): Promise<void> {
    const start = new Date(job.startDate);
    const end = new Date(job.endDate);
    const companyFilter = job.companyProfileId ? { companyProfileId: job.companyProfileId } : {};

    const fileName = `Pacific_${job.reportType}_${job.startDate.slice(0, 10)}_to_${job.endDate.slice(0, 10)}_${job.id.slice(0, 8)}.${job.format}`;
    const filePath = path.join(this.storageDir, fileName);

    job.fileName = fileName;
    job.filePath = filePath;

    job.progress = 25;

    // Fetch transactions based on reportType (Delinked from PI — directly from DailySalesPurchase)
    if (job.reportType === 'TRANSACTIONS' || job.reportType === 'SALES_SUMMARY') {
      const [dailySales, dailyPurchases, payments] = await Promise.all([
        prisma.dailySalesPurchase.findMany({
          where: {
            entryDate: { gte: start, lte: end },
            type: 'SALES',
            deletedAt: null,
            ...companyFilter,
          },
          include: { customer: { include: { party: true } } },
          orderBy: { entryDate: 'desc' },
          take: 5000,
        }),
        prisma.dailySalesPurchase.findMany({
          where: {
            entryDate: { gte: start, lte: end },
            type: 'PURCHASE',
            deletedAt: null,
            ...companyFilter,
          },
          include: { vendor: { include: { party: true } } },
          orderBy: { entryDate: 'desc' },
          take: 5000,
        }),
        prisma.payment.findMany({
          where: {
            paymentDate: { gte: start, lte: end },
            ...companyFilter,
          },
          include: { party: true, companyProfile: true },
          orderBy: { paymentDate: 'desc' },
          take: 5000,
        }),
      ]);

      job.progress = 65;

      if (job.format === 'csv') {
        await this.writeTransactionsCsv(filePath, dailySales, dailyPurchases, payments);
      } else {
        await this.writeTransactionsExcel(filePath, dailySales, dailyPurchases, payments, job.startDate, job.endDate);
      }
    } else {
      // Default summary workbook
      await this.writeSummaryExcel(filePath, job);
    }

    job.progress = 95;
    const stats = fs.statSync(filePath);
    job.fileSizeBytes = stats.size;
  }

  private async writeTransactionsExcel(
    filePath: string,
    dailySales: any[],
    dailyPurchases: any[],
    payments: any[],
    startStr: string,
    endStr: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Pacific Restroom Cubicle Enterprise ERP';
    workbook.created = new Date();

    // 1. Sales Sheet (Daily Sales Entries)
    const salesSheet = workbook.addWorksheet('Daily Sales Report');
    salesSheet.columns = [
      { header: 'Ref / Invoice No', key: 'refNo', width: 22 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Customer Name', key: 'customer', width: 32 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Description', key: 'description', width: 28 },
      { header: 'Payment Mode', key: 'mode', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Taxable Amt (₹)', key: 'amount', width: 18 },
      { header: 'Tax Total (₹)', key: 'tax', width: 16 },
      { header: 'Total Revenue (₹)', key: 'total', width: 20 },
    ];
    salesSheet.getRow(1).font = { bold: true };

    dailySales.forEach((p) => {
      salesSheet.addRow({
        refNo: p.referenceNo || `SALE-${p.id.slice(0, 8).toUpperCase()}`,
        date: p.entryDate ? new Date(p.entryDate).toISOString().slice(0, 10) : '',
        customer: p.partyName || p.customer?.party?.tradeName || p.customer?.party?.legalName || 'Direct Customer',
        category: p.category || 'General',
        description: p.description || '—',
        mode: p.paymentMode || 'CASH',
        status: p.paymentStatus || 'PAID',
        amount: Number(p.amount || 0),
        tax: Number(p.taxAmount || 0),
        total: Number(p.totalAmount || 0),
      });
    });

    // 2. Purchases Sheet (Daily Purchase Entries)
    const poSheet = workbook.addWorksheet('Daily Purchases Report');
    poSheet.columns = [
      { header: 'Bill / Ref No', key: 'refNo', width: 22 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Vendor / Supplier', key: 'vendor', width: 32 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Description', key: 'description', width: 28 },
      { header: 'Payment Mode', key: 'mode', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Amount (₹)', key: 'amount', width: 18 },
      { header: 'Tax Total (₹)', key: 'tax', width: 16 },
      { header: 'Total Spend (₹)', key: 'total', width: 20 },
    ];
    poSheet.getRow(1).font = { bold: true };

    dailyPurchases.forEach((po) => {
      poSheet.addRow({
        refNo: po.referenceNo || `PUR-${po.id.slice(0, 8).toUpperCase()}`,
        date: po.entryDate ? new Date(po.entryDate).toISOString().slice(0, 10) : '',
        vendor: po.partyName || po.vendor?.party?.tradeName || po.vendor?.party?.legalName || 'Direct Supplier',
        category: po.category || 'General',
        description: po.description || '—',
        mode: po.paymentMode || 'CASH',
        status: po.paymentStatus || 'PAID',
        amount: Number(po.amount || 0),
        tax: Number(po.taxAmount || 0),
        total: Number(po.totalAmount || 0),
      });
    });

    // 3. Payments Sheet
    const paySheet = workbook.addWorksheet('Payments & Collections');
    paySheet.columns = [
      { header: 'Payment Ref', key: 'ref', width: 20 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Party Name', key: 'party', width: 32 },
      { header: 'Payment Type', key: 'type', width: 20 },
      { header: 'Mode', key: 'mode', width: 14 },
      { header: 'Amount (₹)', key: 'amount', width: 20 },
      { header: 'Status', key: 'status', width: 14 },
    ];
    paySheet.getRow(1).font = { bold: true };

    payments.forEach((py) => {
      paySheet.addRow({
        ref: py.referenceNumber || 'PAY',
        date: py.paymentDate ? new Date(py.paymentDate).toISOString().slice(0, 10) : '',
        party: py.party?.tradeName || py.party?.legalName || '—',
        type: py.paymentType,
        mode: py.paymentMethod || 'BANK_TRANSFER',
        amount: Number(py.amount || 0),
        status: py.status,
      });
    });

    await workbook.xlsx.writeFile(filePath);
  }

  private async writeTransactionsCsv(filePath: string, dailySales: any[], dailyPurchases: any[], payments: any[]): Promise<void> {
    const lines: string[] = [];
    lines.push('Category,DocumentNumber,Date,PartyName,Status,Amount,TaxAmount,GrandTotal');

    dailySales.forEach((s) => {
      lines.push(
        [
          'DAILY_SALES',
          `"${s.referenceNo || s.id}"`,
          s.entryDate ? new Date(s.entryDate).toISOString().slice(0, 10) : '',
          `"${(s.partyName || s.customer?.party?.tradeName || s.customer?.party?.legalName || 'Customer').replace(/"/g, '""')}"`,
          s.paymentStatus || 'PAID',
          Number(s.amount || 0),
          Number(s.taxAmount || 0),
          Number(s.totalAmount || 0),
        ].join(',')
      );
    });

    dailyPurchases.forEach((p) => {
      lines.push(
        [
          'DAILY_PURCHASE',
          `"${p.referenceNo || p.id}"`,
          p.entryDate ? new Date(p.entryDate).toISOString().slice(0, 10) : '',
          `"${(p.partyName || p.vendor?.party?.tradeName || p.vendor?.party?.legalName || 'Supplier').replace(/"/g, '""')}"`,
          p.paymentStatus || 'PAID',
          Number(p.amount || 0),
          Number(p.taxAmount || 0),
          Number(p.totalAmount || 0),
        ].join(',')
      );
    });

    payments.forEach((py) => {
      lines.push(
        [
          'PAYMENT',
          `"${py.referenceNumber || py.id}"`,
          py.paymentDate ? new Date(py.paymentDate).toISOString().slice(0, 10) : '',
          `"${(py.party?.tradeName || py.party?.legalName || 'Party').replace(/"/g, '""')}"`,
          py.status,
          Number(py.amount || 0),
          0,
          Number(py.amount || 0),
        ].join(',')
      );
    });

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }

  private async writeSummaryExcel(filePath: string, job: AsyncReportJob): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report Summary');
    sheet.columns = [
      { header: 'Parameter', key: 'k', width: 25 },
      { header: 'Value', key: 'v', width: 40 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.addRow({ k: 'Report Type', v: job.reportType });
    sheet.addRow({ k: 'Start Date (UTC)', v: job.startDate });
    sheet.addRow({ k: 'End Date (UTC)', v: job.endDate });
    sheet.addRow({ k: 'Generated At', v: new Date().toISOString() });
    await workbook.xlsx.writeFile(filePath);
  }

  private cleanupExpiredFiles(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      if (job.expiresAt && now > job.expiresAt.getTime()) {
        if (job.filePath && fs.existsSync(job.filePath)) {
          try {
            fs.unlinkSync(job.filePath);
          } catch {}
        }
        this.jobs.delete(id);
        if (job.idempotencyKey) {
          this.idempotencyMap.delete(job.idempotencyKey);
        }
      }
    }
  }
}

export const reportQueueService = new ReportQueueService();
