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
router.get('/attendance/monthly-report-pdf', controller.downloadMonthlyAttendanceReportPdfHandler);
router.post('/attendance/record', validate(RecordUpAttendanceSchema), controller.recordAttendanceHandler);
router.post('/attendance/batch', validate(BatchUpAttendanceSchema), controller.batchRecordAttendanceHandler);
router.delete('/attendance/record', controller.deleteAttendanceHandler);

// ─── 3. Advances Management ───────────────────────────────────────────────────
router.get('/advances', controller.listAdvancesHandler);
router.get('/advances/summary', controller.getAdvanceSummaryHandler);
router.get('/advances/ledger', controller.getAdvanceLedgerHandler);
router.post('/advances', validate(CreateUpAdvanceSchema), controller.createAdvanceHandler);
router.put('/advances/:id', controller.updateAdvanceHandler);
router.patch('/advances/:id', controller.updateAdvanceHandler);
router.post('/advances/:id/partial-deduct', validate(PartialDeductUpAdvanceSchema), controller.partialDeductAdvanceHandler);
router.post('/advances/:id/recover', controller.recoverAdvanceHandler);
router.delete('/advances/:id', controller.deleteAdvanceHandler);

// ─── 4. Deductions Management ─────────────────────────────────────────────────
router.get('/deductions', controller.listDeductionsHandler);
router.post('/deductions', validate(CreateUpDeductionSchema), controller.createDeductionHandler);
router.put('/deductions/:id', controller.updateDeductionHandler);
router.patch('/deductions/:id', controller.updateDeductionHandler);
router.delete('/deductions/:id', controller.deleteDeductionHandler);

// ─── 5. Payroll / Wage Engine ─────────────────────────────────────────────────
router.get('/payroll', controller.listPayrollHandler);
router.post('/payroll/calculate', validate(CalculateUpPayrollSchema), controller.calculatePayrollHandler);
router.post('/payroll/simulate', controller.simulateSalaryCalculationHandler);
router.get(['/payroll/defaults', '/payroll/defaults/:id'], controller.getEmployeeSalaryDefaultsHandler);
router.post('/payroll/:id/finalize', controller.finalizePayrollHandler);
router.post('/payroll/:id/revert-draft', controller.revertPayrollToDraftHandler);
router.post('/payroll/:id/mark-paid', validate(MarkUpPayrollPaidSchema), controller.markPayrollPaidHandler);
router.get(['/payroll/:id/pdf', '/payroll/:id/payslip-pdf'], controller.downloadPayslipPdfHandler);
router.post(['/payroll/:id/resend-email', '/payroll/:id/resend-payslip-email'], controller.resendPayslipEmailHandler);

// ─── 6. Leave Ledger ──────────────────────────────────────────────────────────
router.post('/leaves/accrue', validate(AccrueUpMonthlyLeaveSchema), controller.accrueMonthlyLeaveHandler);
router.post('/leaves/reset-clean-slate', controller.resetCleanSlateLeavesHandler);
router.post('/leaves/adjust/:id', validate(AdjustUpLeaveSchema), controller.adjustLeaveHandler);
router.get('/leaves/ledger/:id', controller.getLeaveLedgerHandler);

// ─── 7. UP Factory Site Visits & Conveyance Expenses ──────────────────────────
router.get('/conveyance', controller.listConveyanceExpensesHandler);
router.post('/conveyance', controller.createConveyanceExpenseHandler);
router.get('/conveyance/:id', controller.getConveyanceExpenseHandler);
router.put('/conveyance/:id', controller.updateConveyanceExpenseHandler);
router.patch('/conveyance/:id', controller.updateConveyanceExpenseHandler);
router.delete('/conveyance/:id', controller.deleteConveyanceExpenseHandler);
router.post('/conveyance/:id/approve', controller.approveConveyanceExpenseHandler);
router.post('/conveyance/:id/reject', controller.rejectConveyanceExpenseHandler);
router.post('/conveyance/:id/settle', controller.settleConveyanceExpenseHandler);

// ─── 8. Master Employees CRUD (ID wildcard must be last) ──────────────────────
router.get(['/detail/:id', '/:id'], controller.getEmployeeHandler);
router.put(['/detail/:id', '/:id'], validate(UpdateUpEmployeeSchema), controller.updateEmployeeHandler);
router.patch(['/detail/:id', '/:id'], validate(UpdateUpEmployeeSchema), controller.updateEmployeeHandler);
router.delete(['/detail/:id', '/:id'], controller.deleteEmployeeHandler);
router.get('/', controller.listEmployeesHandler);
router.post('/', validate(CreateUpEmployeeSchema), controller.createEmployeeHandler);

export default router;
