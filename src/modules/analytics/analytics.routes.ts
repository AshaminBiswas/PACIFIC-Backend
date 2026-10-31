/**
 * Pacific Restroom Cubicle Enterprise ERP — Analytics Routes
 */

import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Master Synchronized Dashboard Analytics (All 8 reporting periods)
router.get('/dashboard', requireAuth, analyticsController.getDashboard);

// Paginated Transaction Ledger
router.get('/transactions', requireAuth, analyticsController.getTransactions);

// Asynchronous Background Report Queue Endpoints
router.post('/reports/async', requireAuth, analyticsController.enqueueReport);
router.get('/reports/status/:id', requireAuth, analyticsController.getReportJobStatus);
router.get('/reports/download/:token', analyticsController.downloadReport); // Token-authenticated download

// Performance & Cache Diagnostics
router.get('/cache-metrics', requireAuth, analyticsController.getCacheMetrics);

export default router;
