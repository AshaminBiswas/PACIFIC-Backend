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
    const data = await service.listUpEmployees(req.query as any);
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

// ─── 4. Advances Handlers ─────────────────────────────────────────────────────
export const listAdvancesHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.listUpAdvances(req.query as any);
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

// ─── 5. Deductions Handlers ───────────────────────────────────────────────────
export const listDeductionsHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.listUpDeductions(req.query as any);
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
