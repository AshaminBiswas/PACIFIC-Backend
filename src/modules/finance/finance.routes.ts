import { Router } from 'express';
import { financeController } from './finance.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/payments', requireAuth, requirePermission('payment:view'), financeController.listPayments);
router.get('/payments/:id', requireAuth, requirePermission('payment:view'), financeController.getPaymentById);
router.post('/payments', requireAuth, requirePermission('payment:create'), financeController.recordPayment);
router.patch('/payments/:id', requireAuth, requirePermission('payment:create'), financeController.updatePayment);
router.delete('/payments/:id', requireAuth, requirePermission('payment:create'), financeController.deletePayment);
router.get('/receivables', requireAuth, requirePermission('payment:view'), financeController.getReceivables);
router.get('/payables', requireAuth, requirePermission('payment:view'), financeController.getPayables);
router.get('/summary', requireAuth, requirePermission('payment:view'), financeController.getLedgerSummary);
router.get('/ledger/:customerId', requireAuth, requirePermission('payment:view'), financeController.getCustomerLedger);
router.post('/ledger/:customerId/send-email', requireAuth, requirePermission('payment:create'), financeController.sendCustomerLedgerEmail);
router.post('/ledger/:customerId/manual-entry', requireAuth, requirePermission('payment:create'), financeController.recordManualLedgerEntry);
router.post('/ledger/:customerId/followup', requireAuth, requirePermission('payment:create'), financeController.logFollowupTouchpoint);
router.post('/cadence-check', requireAuth, requirePermission('payment:create'), financeController.triggerCadenceCheck);

export default router;
