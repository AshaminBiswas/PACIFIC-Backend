/**
 * Pacific Restroom Cubicle Enterprise ERP — Analytics Controller
 */

import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { analyticsService } from './analytics.service';
import { reportQueueService, ReportType, ReportFormat } from './reportQueue.service';
import { analyticsCache } from './analytics.cache';
import { ReportingPeriodType, ComparisonMode } from '../utils/reportingPeriods';

export const analyticsController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;

      const selection = {
        type: (q.type as ReportingPeriodType) || 'MONTHLY',
        date: q.date as string | undefined,
        week: q.week as string | undefined,
        month: q.month as string | undefined,
        quarter: q.quarter as 'Q1' | 'Q2' | 'Q3' | 'Q4' | undefined,
        quarterYear: q.quarterYear ? Number(q.quarterYear) : undefined,
        quarterType: (q.quarterType as 'FY' | 'CALENDAR') || 'FY',
        halfYear: q.halfYear as 'H1' | 'H2' | undefined,
        halfYearFiscalYear: q.halfYearFiscalYear as string | undefined,
        year: q.year ? Number(q.year) : undefined,
        financialYear: q.financialYear as string | undefined,
        customStart: q.customStart as string | undefined,
        customEnd: q.customEnd as string | undefined,
        compareCustomStart: q.compareCustomStart as string | undefined,
        compareCustomEnd: q.compareCustomEnd as string | undefined,
        comparisonMode: (q.comparisonMode as ComparisonMode) || 'PREVIOUS_PERIOD',
      };

      const companyProfileId = (q.companyProfileId as string) || (req as any).user?.companyProfileId;
      const skipCache = q.refresh === 'true';

      const data = await analyticsService.getDashboardAnalytics({
        selection,
        companyProfileId,
        skipCache,
      });

      res.set('X-Server-Timing', `analytics;dur=${data.serverTimingMs}`);
      res.json({ success: true, data });
      return;
    } catch (err) {
      next(err);
    }
  },

  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, type, page, limit, companyProfileId } = req.query;
      if (!startDate || !endDate) {
        res.status(400).json({ success: false, message: 'startDate and endDate are required query parameters.' });
        return;
      }

      const effectiveCompanyId = (companyProfileId as string) || (req as any).user?.companyProfileId;

      const data = await analyticsService.getTransactionLedger({
        startDate: String(startDate),
        endDate: String(endDate),
        type: type as any,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 25,
        companyProfileId: effectiveCompanyId,
      });

      res.json({ success: true, data });
      return;
    } catch (err) {
      next(err);
    }
  },

  async enqueueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reportType, format, startDate, endDate, companyProfileId, idempotencyKey } = req.body;

      if (!reportType || !startDate || !endDate) {
        res.status(400).json({ success: false, message: 'reportType, startDate, and endDate are required.' });
        return;
      }

      const effectiveCompanyId = companyProfileId || (req as any).user?.companyProfileId;
      const userId = (req as any).user?.id;

      const job = reportQueueService.enqueueReport({
        reportType: reportType as ReportType,
        format: (format as ReportFormat) || 'xlsx',
        startDate,
        endDate,
        companyProfileId: effectiveCompanyId,
        userId,
        idempotencyKey,
      });

      res.status(202).json({
        success: true,
        message: 'Report job successfully enqueued for background processing.',
        data: {
          jobId: job.id,
          status: job.status,
          reportType: job.reportType,
          format: job.format,
          createdAt: job.createdAt,
        },
      });
      return;
    } catch (err) {
      next(err);
    }
  },

  async getReportJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const job = reportQueueService.getJob(id);

      if (!job) {
        res.status(404).json({ success: false, message: 'Report job not found.' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: job.id,
          status: job.status,
          progress: job.progress,
          reportType: job.reportType,
          format: job.format,
          fileName: job.fileName,
          fileSizeBytes: job.fileSizeBytes,
          downloadUrl: job.status === 'COMPLETED' ? `/api/v1/analytics/reports/download/${job.downloadToken}` : undefined,
          error: job.error,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        },
      });
      return;
    } catch (err) {
      next(err);
    }
  },

  async downloadReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const job = reportQueueService.getJobByToken(token);

      if (!job || !job.filePath || !fs.existsSync(job.filePath)) {
        res.status(404).json({ success: false, message: 'Report download link is invalid or has expired.' });
        return;
      }

      const contentType = job.format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${job.fileName || 'report.' + job.format}"`);

      const readStream = fs.createReadStream(job.filePath);
      readStream.pipe(res);
      return;
    } catch (err) {
      next(err);
    }
  },

  getCacheMetrics(_req: Request, res: Response) {
    const metrics = analyticsCache.getMetrics();
    res.json({ success: true, data: metrics });
  },
};
