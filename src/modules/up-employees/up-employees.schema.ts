import { z } from 'zod';

export const GovernmentIdTypeEnum = z.enum(['AADHAAR', 'PAN', 'VOTER_ID']);
export const EmployeeStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']);
export const AttendanceStatusEnum = z.enum([
  'PRESENT',
  'DOUBLE_DUTY',
  'CL',
  'EL',
  'UL',
  'HALF_DAY',
  'LEAVE',
  'HOLIDAY',
]);
export const PayrollStatusEnum = z.enum(['DRAFT', 'FINALIZED', 'PAID']);
export const LeaveTypeEnum = z.enum(['CL', 'EL']);
export const LeaveTransactionTypeEnum = z.enum(['ACCRUAL', 'USAGE', 'ADJUSTMENT']);

// ─── Master Worker Schemas ───────────────────────────────────────────────────
export const CreateUpEmployeeBodySchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(150),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 digits').max(20),
  address: z.string().trim().min(1, 'Address is required'),
  governmentIdType: GovernmentIdTypeEnum.default('AADHAAR'),
  governmentIdNumber: z.string().trim().min(3, 'Govt ID number is required'),
  bankAccountNumber: z.string().trim().optional().nullable(),
  bankIfsc: z.string().trim().optional().nullable(),
  bankName: z.string().trim().optional().nullable(),
  bankAccountHolder: z.string().trim().optional().nullable(),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'UPI']).default('CASH'),
  designation: z.string().trim().min(1, 'Designation is required'),
  department: z.string().trim().min(1, 'Department is required'),
  workerType: z.enum(['MONTHLY', 'DAILY_WAGE', 'CONTRACT']).default('MONTHLY'),
  dailyWage: z.coerce.number().min(0).optional().nullable(),
  monthlyCtc: z.coerce.number().min(0, 'Monthly CTC / Base pay must be 0 or greater'),
  overtimeHourlyRate: z.coerce.number().min(0).default(0),
  joiningDate: z.string().min(1, 'Joining date is required'),
  status: EmployeeStatusEnum.default('ACTIVE'),
  clBalance: z.coerce.number().min(0).default(0),
  elBalance: z.coerce.number().min(0).default(0),
  emergencyContact: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const CreateUpEmployeeSchema = z.object({
  body: CreateUpEmployeeBodySchema,
});
export type CreateUpEmployeeInput = z.infer<typeof CreateUpEmployeeBodySchema>;

export const UpdateUpEmployeeBodySchema = CreateUpEmployeeBodySchema.partial();
export const UpdateUpEmployeeSchema = z.object({
  body: UpdateUpEmployeeBodySchema,
  params: z.object({ id: z.string() }).optional(),
});
export type UpdateUpEmployeeInput = z.infer<typeof UpdateUpEmployeeBodySchema>;

export const ListUpEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  search: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  status: z.string().optional(),
  workerType: z.string().optional(),
  paymentMode: z.string().optional(),
});
export type ListUpEmployeesQuery = z.infer<typeof ListUpEmployeesQuerySchema>;

// ─── Attendance Schemas ──────────────────────────────────────────────────────
export const RecordUpAttendanceBodySchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  date: z.string().min(1, 'Date is required'),
  status: AttendanceStatusEnum.default('PRESENT'),
  isSunday: z.boolean().default(false),
  isSundayOverride: z.boolean().default(false),
  overtimeHours: z.coerce.number().min(0).max(24).default(0),
  shift: z.string().default('GENERAL'),
  notes: z.string().trim().max(500).optional().nullable(),
});
export const RecordUpAttendanceSchema = z.object({
  body: RecordUpAttendanceBodySchema,
});
export type RecordUpAttendanceInput = z.infer<typeof RecordUpAttendanceBodySchema>;

export const BatchUpAttendanceBodySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  records: z.array(
    z.object({
      employeeId: z.string().min(1),
      status: AttendanceStatusEnum.default('PRESENT'),
      overtimeHours: z.coerce.number().min(0).max(24).default(0),
      shift: z.string().default('GENERAL'),
      notes: z.string().optional().nullable(),
      isSundayOverride: z.boolean().default(false),
    })
  ).min(1, 'At least one attendance record is required'),
});
export const BatchUpAttendanceSchema = z.object({
  body: BatchUpAttendanceBodySchema,
});
export type BatchUpAttendanceInput = z.infer<typeof BatchUpAttendanceBodySchema>;

export const ListUpAttendanceQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2050),
  employeeId: z.string().optional(),
});
export type ListUpAttendanceQuery = z.infer<typeof ListUpAttendanceQuerySchema>;

// ─── Advances Schemas ────────────────────────────────────────────────────────
export const CreateUpAdvanceBodySchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  amount: z.coerce.number().positive('Advance amount must be greater than 0'),
  reason: z.string().trim().min(2, 'Reason is required').max(500),
  recoveryMonth: z.coerce.number().int().min(1).max(12),
  recoveryYear: z.coerce.number().int().min(2020).max(2050),
  advanceDate: z.string().optional(),
  disbursedVia: z.enum(['CASH', 'BANK', 'UPI']).default('CASH'),
});
export const CreateUpAdvanceSchema = z.object({
  body: CreateUpAdvanceBodySchema,
});
export type CreateUpAdvanceInput = z.infer<typeof CreateUpAdvanceBodySchema>;

export const PartialDeductUpAdvanceBodySchema = z.object({
  deductionAmount: z.coerce.number().positive('Deduction amount must be greater than 0'),
  notes: z.string().trim().optional().nullable(),
  newRecoveryMonth: z.coerce.number().int().min(1).max(12).optional(),
  newRecoveryYear: z.coerce.number().int().min(2020).max(2050).optional(),
});
export const PartialDeductUpAdvanceSchema = z.object({
  body: PartialDeductUpAdvanceBodySchema,
  params: z.object({ id: z.string() }).optional(),
});
export type PartialDeductUpAdvanceInput = z.infer<typeof PartialDeductUpAdvanceBodySchema>;

export const ListUpAdvancesQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(['PENDING', 'RECOVERED', 'ALL']).default('PENDING'),
  recoveryMonth: z.coerce.number().int().min(1).max(12).optional(),
  recoveryYear: z.coerce.number().int().min(2020).max(2050).optional(),
});
export type ListUpAdvancesQuery = z.infer<typeof ListUpAdvancesQuerySchema>;

// ─── Deductions Schemas ──────────────────────────────────────────────────────
export const CreateUpDeductionBodySchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  amount: z.coerce.number().positive('Deduction amount must be greater than 0'),
  reason: z.string().trim().min(2, 'Reason is required').max(500),
  applyMonth: z.coerce.number().int().min(1).max(12),
  applyYear: z.coerce.number().int().min(2020).max(2050),
});
export const CreateUpDeductionSchema = z.object({
  body: CreateUpDeductionBodySchema,
});
export type CreateUpDeductionInput = z.infer<typeof CreateUpDeductionBodySchema>;

export const ListUpDeductionsQuerySchema = z.object({
  employeeId: z.string().optional(),
  applyMonth: z.coerce.number().int().min(1).max(12).optional(),
  applyYear: z.coerce.number().int().min(2020).max(2050).optional(),
  isApplied: z.string().optional(), // 'true', 'false', 'all'
});
export type ListUpDeductionsQuery = z.infer<typeof ListUpDeductionsQuerySchema>;

// ─── Payroll Schemas ─────────────────────────────────────────────────────────
export const CalculateUpPayrollBodySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2050),
  employeeIds: z.array(z.string()).optional(),
  overtimeMultiplier: z.coerce.number().min(0.5).max(3.0).default(1.0),
  workingHoursPerDay: z.coerce.number().min(4).max(16).default(8),
});
export const CalculateUpPayrollSchema = z.object({
  body: CalculateUpPayrollBodySchema,
});
export type CalculateUpPayrollInput = z.infer<typeof CalculateUpPayrollBodySchema>;

export const MarkUpPayrollPaidBodySchema = z.object({
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'UPI']).default('CASH'),
  paymentReference: z.string().trim().optional().nullable(),
  paymentNotes: z.string().trim().optional().nullable(),
});
export const MarkUpPayrollPaidSchema = z.object({
  body: MarkUpPayrollPaidBodySchema,
  params: z.object({ id: z.string() }).optional(),
});
export type MarkUpPayrollPaidInput = z.infer<typeof MarkUpPayrollPaidBodySchema>;

export const ListUpPayrollQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2050),
  status: z.enum(['DRAFT', 'FINALIZED', 'PAID', 'ALL']).default('ALL'),
  employeeId: z.string().optional(),
});
export type ListUpPayrollQuery = z.infer<typeof ListUpPayrollQuerySchema>;

// ─── Leave Schemas ───────────────────────────────────────────────────────────
export const AdjustUpLeaveBodySchema = z.object({
  leaveType: LeaveTypeEnum,
  amount: z.coerce.number().refine((n) => n !== 0, 'Amount cannot be 0'),
  reason: z.string().trim().min(2, 'Reason is required').max(500),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2050),
});
export const AdjustUpLeaveSchema = z.object({
  body: AdjustUpLeaveBodySchema,
  params: z.object({ id: z.string() }).optional(),
});
export type AdjustUpLeaveInput = z.infer<typeof AdjustUpLeaveBodySchema>;

export const AccrueUpMonthlyLeaveBodySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2050),
  clAmount: z.coerce.number().min(0).default(1.0),
  elAmount: z.coerce.number().min(0).default(1.25),
});
export const AccrueUpMonthlyLeaveSchema = z.object({
  body: AccrueUpMonthlyLeaveBodySchema,
});
export type AccrueUpMonthlyLeaveInput = z.infer<typeof AccrueUpMonthlyLeaveBodySchema>;
