import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireUPSuperAdmin } from '../up/up.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './up-employees.controller';
import {
  CreateUpEmployeeSchema,
  UpdateUpEmployeeSchema,
  RecordUpAttendanceSchema,
  BatchUpAttendanceSchema,
  CreateUpAdvanceSchema,
  PartialDeductUpAdvanceSchema,
  CreateUpDeductionSchema,
  CalculateUpPayrollSchema,
  MarkUpPayrollPaidSchema,
  AdjustUpLeaveSchema,
  AccrueUpMonthlyLeaveSchema,
} from './up-employees.schema';

const router = Router();

// ─── STRICT SECURITY POLICY ───────────────────────────────────────────────────
// UP Factory Employee & Wage Management System endpoints are strictly restricted
// to authenticated users who possess the 'SUPER_ADMIN' role. All other roles
// receive HTTP 403 Forbidden.
router.use(requireAuth);
router.use(requireUPSuperAdmin);

// ─── 1. Stats & KPIs ──────────────────────────────────────────────────────────
router.get('/stats', controller.getStatsHandler);

// ─── 2. Attendance Management ─────────────────────────────────────────────────
router.get('/attendance', controller.listAttendanceHandler);
router.get('/attendance/monthly', controller.listAttendanceHandler);
router.post('/attendance/record', validate(RecordUpAttendanceSchema), controller.recordAttendanceHandler);
router.post('/attendance/batch', validate(BatchUpAttendanceSchema), controller.batchRecordAttendanceHandler);
router.delete('/attendance/record', controller.deleteAttendanceHandler);

// ─── 3. Advances Management ───────────────────────────────────────────────────
router.get('/advances', controller.listAdvancesHandler);
router.get('/advances/summary', controller.getAdvanceSummaryHandler);
router.post('/advances', validate(CreateUpAdvanceSchema), controller.createAdvanceHandler);
router.post('/advances/:id/partial-deduct', validate(PartialDeductUpAdvanceSchema), controller.partialDeductAdvanceHandler);
router.post('/advances/:id/recover', controller.recoverAdvanceHandler);

// ─── 4. Deductions Management ─────────────────────────────────────────────────
router.get('/deductions', controller.listDeductionsHandler);
router.post('/deductions', validate(CreateUpDeductionSchema), controller.createDeductionHandler);
router.delete('/deductions/:id', controller.deleteDeductionHandler);

// ─── 5. Payroll / Wage Engine ─────────────────────────────────────────────────
router.get('/payroll', controller.listPayrollHandler);
router.post('/payroll/calculate', validate(CalculateUpPayrollSchema), controller.calculatePayrollHandler);
router.post('/payroll/:id/finalize', controller.finalizePayrollHandler);
router.post('/payroll/:id/revert-draft', controller.revertPayrollToDraftHandler);
router.post('/payroll/:id/mark-paid', validate(MarkUpPayrollPaidSchema), controller.markPayrollPaidHandler);

// ─── 6. Leave Ledger ──────────────────────────────────────────────────────────
router.post('/leaves/accrue', validate(AccrueUpMonthlyLeaveSchema), controller.accrueMonthlyLeaveHandler);
router.post('/leaves/adjust/:id', validate(AdjustUpLeaveSchema), controller.adjustLeaveHandler);
router.get('/leaves/ledger/:id', controller.getLeaveLedgerHandler);

// ─── 7. Master Employees CRUD (ID wildcard must be last) ──────────────────────
router.get('/', controller.listEmployeesHandler);
router.post('/', validate(CreateUpEmployeeSchema), controller.createEmployeeHandler);
router.get('/:id', controller.getEmployeeHandler);
router.patch('/:id', validate(UpdateUpEmployeeSchema), controller.updateEmployeeHandler);
router.delete('/:id', controller.deleteEmployeeHandler);

export default router;
