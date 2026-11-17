import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import * as service from './up-employees.service';

// ─── 1. Workforce Stats / KPIs ────────────────────────────────────────────────
export const getStatsHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.getUpWorkforceStats();
    sendSuccess(res, data, 'UP Factory workforce metrics retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 2. Master Employees CRUD ─────────────────────────────────────────────────
export const listEmployeesHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.max(1, Math.min(500, parseInt(String(req.query.limit || '50'), 10) || 50));
    const data = await service.listUpEmployees({
      page,
      limit,
      search: req.query.search as string | undefined,
      department: req.query.department as string | undefined,
      designation: req.query.designation as string | undefined,
      status: req.query.status as string | undefined,
      workerType: req.query.workerType as string | undefined,
      paymentMode: req.query.paymentMode as string | undefined,
    });
    sendSuccess(res, data, 'UP Factory employees retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const getEmployeeHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.getUpEmployee(req.params.id);
    sendSuccess(res, data, 'UP Factory employee details retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createEmployeeHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.createUpEmployee(req.body, req.user?.id);
    sendSuccess(res, data, 'UP Factory employee registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateEmployeeHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.updateUpEmployee(req.params.id, req.body);
    sendSuccess(res, data, 'UP Factory employee updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteEmployeeHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.deleteUpEmployee(req.params.id);
    sendSuccess(res, data, 'UP Factory employee deactivated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 3. Attendance Handlers ───────────────────────────────────────────────────
export const listAttendanceHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = Number(req.query.month || new Date().getMonth() + 1);
    const year = Number(req.query.year || new Date().getFullYear());
    const employeeId = req.query.employeeId as string | undefined;

    const data = await service.listUpAttendance({ month, year, employeeId });
    sendSuccess(res, data, 'UP Factory monthly attendance records retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const recordAttendanceHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.recordUpAttendance(req.body, req.user?.id);
    sendSuccess(res, data, 'UP Factory attendance logged successfully');
  } catch (err) {
    next(err);
  }
};

export const batchRecordAttendanceHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.batchRecordUpAttendance(req.body, req.user?.id);
    sendSuccess(res, data, `Batch recorded ${data.count} factory attendance entries`);
  } catch (err) {
    next(err);
  }
};

export const deleteAttendanceHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, date } = req.query as { employeeId: string; date: string };
    if (!employeeId || !date) {
      res.status(400).json({ success: false, message: 'employeeId and date are required' });
      return;
    }
    const data = await service.deleteUpAttendance(employeeId, date);
    sendSuccess(res, data, 'Attendance entry removed successfully');
  } catch (err) {
    next(err);
  }
};

export const downloadMonthlyAttendanceReportPdfHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = parseInt(String(req.query.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);
    const workerOnly = req.query.workerOnly === 'true';
    const department = req.query.department as string | undefined;
    const generatedByName = (req.user as any)?.name || req.user?.email || 'Super Administrator';

    const { buffer, filename } = await service.getUpMonthlyAttendanceReportPdfBuffer({
      month,
      year,
      workerOnly,
      department,
      generatedByName,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// ─── 4. Advances Handlers ─────────────────────────────────────────────────────
export const listAdvancesHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.listUpAdvances({
      employeeId: req.query.employeeId as string | undefined,
      status: (req.query.status as any) || 'PENDING',
      recoveryMonth: req.query.recoveryMonth ? parseInt(String(req.query.recoveryMonth), 10) : undefined,
      recoveryYear: req.query.recoveryYear ? parseInt(String(req.query.recoveryYear), 10) : undefined,
    });
    sendSuccess(res, data, 'UP Factory advances retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const getAdvanceSummaryHandler = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.getUpAdvanceSummary();
    sendSuccess(res, data, 'UP Factory advance summary retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createAdvanceHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.createUpAdvance(req.body, req.user?.id);
    sendSuccess(res, data, 'Factory worker advance disbursed successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const partialDeductAdvanceHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.partialDeductUpAdvance(req.params.id, req.body);
    sendSuccess(res, data, 'Partial advance deduction recorded successfully');
  } catch (err) {
    next(err);
  }
};

export const recoverAdvanceHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.recoverUpAdvance(req.params.id);
    sendSuccess(res, data, 'Advance marked fully recovered');
  } catch (err) {
    next(err);
  }
};

export const updateAdvanceHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.updateUpAdvance(req.params.id, req.body);
    sendSuccess(res, data, 'Advance updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteAdvanceHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.deleteUpAdvance(req.params.id);
    sendSuccess(res, data, 'Advance deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const getAdvanceLedgerHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.getUpAdvanceLedger({
      employeeId: req.query.employeeId as string | undefined,
      status: (req.query.status as any) || 'ALL',
      recoveryMonth: req.query.recoveryMonth ? parseInt(String(req.query.recoveryMonth), 10) : undefined,
      recoveryYear: req.query.recoveryYear ? parseInt(String(req.query.recoveryYear), 10) : undefined,
      search: req.query.search as string | undefined,
    });
    sendSuccess(res, data, 'UP Factory advance ledger retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 5. Deductions Handlers ───────────────────────────────────────────────────
export const listDeductionsHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.listUpDeductions({
      employeeId: req.query.employeeId as string | undefined,
      applyMonth: req.query.applyMonth ? parseInt(String(req.query.applyMonth), 10) : undefined,
      applyYear: req.query.applyYear ? parseInt(String(req.query.applyYear), 10) : undefined,
      isApplied: req.query.isApplied as string | undefined,
    });
    sendSuccess(res, data, 'UP Factory deductions retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createDeductionHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.createUpDeduction(req.body, req.user?.id);
    sendSuccess(res, data, 'Factory deduction recorded successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateDeductionHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.updateUpDeduction(req.params.id, req.body);
    sendSuccess(res, data, 'Deduction updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteDeductionHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.deleteUpDeduction(req.params.id);
    sendSuccess(res, data, 'Deduction deleted successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 6. Payroll Engine Handlers ───────────────────────────────────────────────
export const listPayrollHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = Number(req.query.month || new Date().getMonth() + 1);
    const year = Number(req.query.year || new Date().getFullYear());
    const status = (req.query.status as any) || 'ALL';
    const employeeId = req.query.employeeId as string | undefined;

    const data = await service.listUpPayroll({ month, year, status, employeeId });
    sendSuccess(res, data, 'UP Factory payroll run list retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const calculatePayrollHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.calculateUpPayroll(req.body, req.user?.id);
    sendSuccess(res, data, `Calculated UP Factory payroll for ${data.count} workers`);
  } catch (err) {
    next(err);
  }
};

export const finalizePayrollHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.finalizeUpPayroll(req.params.id, req.user?.id);
    sendSuccess(res, data, 'Payroll run finalized successfully');
  } catch (err) {
    next(err);
  }
};

export const revertPayrollToDraftHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.revertUpPayrollToDraft(req.params.id);
    sendSuccess(res, data, 'Payroll run reverted to draft');
  } catch (err) {
    next(err);
  }
};

export const markPayrollPaidHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.markUpPayrollPaid(req.params.id, req.body);
    sendSuccess(res, data, 'Worker wage disbursed successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 7. Leaves Handlers ───────────────────────────────────────────────────────
export const accrueMonthlyLeaveHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.accrueUpMonthlyLeave(req.body, req.user?.id);
    sendSuccess(res, data, `Accrued leaves for ${data.count} active UP Factory employees`);
  } catch (err) {
    next(err);
  }
};

export const adjustLeaveHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.adjustUpLeave(req.params.id, req.body, req.user?.id);
    sendSuccess(res, data, 'Leave balance adjusted successfully');
  } catch (err) {
    next(err);
  }
};

export const getLeaveLedgerHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.getUpLeaveLedger(req.params.id);
    sendSuccess(res, data, 'Leave ledger history retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const resetCleanSlateLeavesHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.resetUpCleanSlateLeaves(req.user?.id);
    sendSuccess(res, data, data.message);
  } catch (err) {
    next(err);
  }
};

// ─── Payroll Calculator & Document Generation Handlers ────────────────────────
export const simulateSalaryCalculationHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.simulateUpSalaryCalculation(req.body, req.user?.id);
    sendSuccess(res, data, 'Salary calculation simulated successfully');
  } catch (err) {
    next(err);
  }
};

export const getEmployeeSalaryDefaultsHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = (req.params.id as string) || (req.query.employeeId as string);
    if (!id) {
      res.status(400).json({ success: false, message: 'Employee ID is required' });
      return;
    }
    const month = parseInt(String(req.query.month || new Date().getMonth() + 1), 10);
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);
    const data = await service.getUpEmployeeSalaryDefaults(id, month, year);
    sendSuccess(res, data, 'Employee salary defaults retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const downloadPayslipPdfHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await service.getUpPayslipPdfBuffer(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

export const resendPayslipEmailHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const success = await service.dispatchUpPayslipEmail(req.params.id, req.body?.recipientEmail);
    if (success) {
      sendSuccess(res, { success: true }, 'Payslip email dispatched successfully');
    } else {
      res.status(200).json({
        success: true,
        message: 'No external email configured for worker; payslip remains available via PDF download',
      });
    }
  } catch (err) {
    next(err);
  }
};

// ─── UP Factory Conveyance / Site Visit Expenses Handlers ─────────────────────
export const listConveyanceExpensesHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.listUpConveyanceExpenses({
      page: parseInt(String(req.query.page || '1'), 10) || 1,
      limit: parseInt(String(req.query.limit || '20'), 10) || 20,
      employeeId: req.query.employeeId as string | undefined,
      category: req.query.category as any,
      purpose: req.query.purpose as any,
      status: req.query.status as any,
      paymentMode: req.query.paymentMode as any,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      search: req.query.search as string | undefined,
      branch: req.query.branch as string | undefined,
    });
    sendSuccess(res, data, 'UP Factory conveyance expenses retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createConveyanceExpenseHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.createUpConveyanceExpense(req.body, req.user?.id);
    sendSuccess(res, data, 'Site visit conveyance expense recorded successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getConveyanceExpenseHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.getUpConveyanceExpense(req.params.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

export const updateConveyanceExpenseHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.updateUpConveyanceExpense(req.params.id, req.body);
    sendSuccess(res, data, 'Conveyance expense updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteConveyanceExpenseHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.deleteUpConveyanceExpense(req.params.id);
    sendSuccess(res, data, 'Conveyance expense deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const approveConveyanceExpenseHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.approveUpConveyanceExpense(req.params.id, req.body?.notes, req.user?.id);
    sendSuccess(res, data, 'Conveyance expense approved successfully');
  } catch (err) {
    next(err);
  }
};

export const rejectConveyanceExpenseHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.rejectUpConveyanceExpense(req.params.id, req.body?.reason, req.user?.id);
    sendSuccess(res, data, 'Conveyance expense rejected');
  } catch (err) {
    next(err);
  }
};

export const settleConveyanceExpenseHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.settleUpConveyanceExpense(req.params.id, req.body, req.user?.id);
    sendSuccess(res, data, 'Conveyance expense marked settled/reimbursed');
  } catch (err) {
    next(err);
  }
};

export const downloadUpEmployeeDirectoryPdfHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { department, designation, status, search } = req.query;
    const generatedByName =
      (req as any).user?.firstName
        ? `${(req as any).user.firstName} ${(req as any).user.lastName || ''}`.trim()
        : (req as any).user?.email || 'HR Administrator';

    const { buffer, filename } = await service.getUpEmployeeDirectoryPdfBuffer({
      department: department ? String(department) : undefined,
      designation: designation ? String(designation) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
      generatedByName,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
