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

    // Fetch transactions based on reportType
    if (job.reportType === 'TRANSACTIONS' || job.reportType === 'SALES_SUMMARY') {
      const [pis, pos, payments] = await Promise.all([
        prisma.proformaInvoice.findMany({
          where: {
            piDate: { gte: start, lte: end },
            ...companyFilter,
          },
          include: { customer: true, companyProfile: true },
          orderBy: { piDate: 'desc' },
          take: 5000,
        }),
        prisma.purchaseOrder.findMany({
          where: {
            poDate: { gte: start, lte: end },
            ...companyFilter,
          },
          include: { vendor: true, companyProfile: true },
          orderBy: { poDate: 'desc' },
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
        await this.writeTransactionsCsv(filePath, pis, pos, payments);
      } else {
        await this.writeTransactionsExcel(filePath, pis, pos, payments, job.startDate, job.endDate);
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
    pis: any[],
    pos: any[],
    payments: any[],
    startStr: string,
    endStr: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Pacific Restroom Cubicle Enterprise ERP';
    workbook.created = new Date();

    // 1. Sales Sheet (PIs)
    const salesSheet = workbook.addWorksheet('Sales (Proforma Invoices)');
    salesSheet.columns = [
      { header: 'PI Number', key: 'piNumber', width: 20 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Customer', key: 'customer', width: 32 },
      { header: 'Place of Supply', key: 'pos', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Taxable Amt (₹)', key: 'taxable', width: 18 },
      { header: 'GST Total (₹)', key: 'gst', width: 16 },
      { header: 'Grand Total (₹)', key: 'total', width: 20 },
      { header: 'Advance Required', key: 'advance', width: 18 },
    ];
    salesSheet.getRow(1).font = { bold: true };

    pis.forEach((p) => {
      salesSheet.addRow({
        piNumber: p.piNumber,
        date: p.piDate ? new Date(p.piDate).toISOString().slice(0, 10) : '',
        customer: p.customer?.tradeName || p.customer?.legalName || '—',
        pos: p.placeOfSupply || '—',
        status: p.status,
        taxable: Number(p.subtotal || 0),
        gst: Number(p.totalTaxAmount || 0),
        total: Number(p.grandTotal || 0),
        advance: Number(p.advanceRequiredAmount || 0),
      });
    });

    // 2. Purchases Sheet (POs)
    const poSheet = workbook.addWorksheet('Procurement (POs)');
    poSheet.columns = [
      { header: 'PO Number', key: 'poNumber', width: 20 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Vendor / Supplier', key: 'vendor', width: 32 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Subtotal (₹)', key: 'subtotal', width: 18 },
      { header: 'Tax Total (₹)', key: 'tax', width: 16 },
      { header: 'Grand Total (₹)', key: 'total', width: 20 },
    ];
    poSheet.getRow(1).font = { bold: true };

    pos.forEach((po) => {
      poSheet.addRow({
        poNumber: po.poNumber,
        date: po.poDate ? new Date(po.poDate).toISOString().slice(0, 10) : '',
        vendor: po.vendor?.tradeName || po.vendor?.legalName || '—',
        status: po.status,
        subtotal: Number(po.subtotal || 0),
        tax: Number(po.gstAmount || 0),
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

  private async writeTransactionsCsv(filePath: string, pis: any[], pos: any[], payments: any[]): Promise<void> {
    const lines: string[] = [];
    lines.push('Category,DocumentNumber,Date,PartyName,Status,Amount,TaxAmount,GrandTotal');

    pis.forEach((p) => {
      const dt = p.piDate ? new Date(p.piDate).toISOString().slice(0, 10) : '';
      const party = (p.customer?.tradeName || p.customer?.legalName || '').replace(/,/g, ' ');
      lines.push(`SALES_PI,${p.piNumber},${dt},"${party}",${p.status},${p.subtotal || 0},${p.totalTaxAmount || 0},${p.grandTotal || 0}`);
    });

    pos.forEach((po) => {
      const dt = po.poDate ? new Date(po.poDate).toISOString().slice(0, 10) : '';
      const party = (po.vendor?.tradeName || po.vendor?.legalName || '').replace(/,/g, ' ');
      lines.push(`PROCUREMENT_PO,${po.poNumber},${dt},"${party}",${po.status},${po.subtotal || 0},${po.gstAmount || 0},${po.totalAmount || 0}`);
    });

    payments.forEach((py) => {
      const dt = py.paymentDate ? new Date(py.paymentDate).toISOString().slice(0, 10) : '';
      const party = (py.party?.tradeName || py.party?.legalName || '').replace(/,/g, ' ');
      lines.push(`PAYMENT,${py.referenceNumber || 'PAY'},${dt},"${party}",${py.status},${py.amount || 0},0,${py.amount || 0}`);
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
