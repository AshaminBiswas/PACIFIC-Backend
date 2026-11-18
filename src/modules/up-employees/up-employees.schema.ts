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
  whatsappNo: z.string().trim().max(20).optional().nullable(),
  gender: z.string().trim().default('MALE').optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
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
  status: z.enum(['PENDING', 'RECOVERED', 'ALL']).default('ALL'),
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

// ─── Advance Updates ──────────────────────────────────────────────────────────
export const UpdateUpAdvanceBodySchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().trim().min(2).max(500).optional(),
  recoveryMonth: z.coerce.number().int().min(1).max(12).optional(),
  recoveryYear: z.coerce.number().int().min(2020).max(2050).optional(),
  disbursedVia: z.enum(['CASH', 'BANK', 'UPI']).optional(),
  isRecovered: z.boolean().optional(),
});
export const UpdateUpAdvanceSchema = z.object({
  body: UpdateUpAdvanceBodySchema,
  params: z.object({ id: z.string() }).optional(),
});
export type UpdateUpAdvanceInput = z.infer<typeof UpdateUpAdvanceBodySchema>;

// ─── Deduction Updates ────────────────────────────────────────────────────────
export const UpdateUpDeductionBodySchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().trim().min(2).max(500).optional(),
  applyMonth: z.coerce.number().int().min(1).max(12).optional(),
  applyYear: z.coerce.number().int().min(2020).max(2050).optional(),
  isApplied: z.boolean().optional(),
});
export const UpdateUpDeductionSchema = z.object({
  body: UpdateUpDeductionBodySchema,
  params: z.object({ id: z.string() }).optional(),
});
export type UpdateUpDeductionInput = z.infer<typeof UpdateUpDeductionBodySchema>;

// ─── Salary Simulation Schema ─────────────────────────────────────────────────
export const SimulateUpSalaryCalculationBodySchema = z.object({
  employeeId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2050),
  monthlyCtc: z.coerce.number().min(0),
  standardPayableDays: z.coerce.number().min(1).default(26),
  standardWorkingHours: z.coerce.number().min(1).default(8),
  regularPayableDays: z.coerce.number().min(0).default(0),
  additionalSundayDutyCredits: z.coerce.number().min(0).default(0),
  additionalDoubleDutyCredits: z.coerce.number().min(0).default(0),
  approvedOvertimeHours: z.coerce.number().min(0).default(0),
  overtimeMultiplier: z.coerce.number().min(0).default(1.0),
  partialDeductions: z.coerce.number().min(0).default(0),
  additionalAllowances: z.coerce.number().min(0).default(0),
  saveToPayroll: z.boolean().default(false),
});
export const SimulateUpSalaryCalculationSchema = z.object({
  body: SimulateUpSalaryCalculationBodySchema,
});
export type SimulateUpSalaryCalculationInput = z.infer<typeof SimulateUpSalaryCalculationBodySchema>;

// ─── Report PDF Query Schema ──────────────────────────────────────────────────
export const MonthlyAttendanceReportPdfQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2050),
  workerOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  department: z.string().optional(),
});
export type MonthlyAttendanceReportPdfQuery = z.infer<typeof MonthlyAttendanceReportPdfQuerySchema>;

// ─── UP Conveyance / Travel Expense Schemas ───────────────────────────────────
export const UpConveyanceCategoryEnum = z.enum([
  'PETROL',
  'GARIVARA',
  'MATERIAL_SHIFTING',
  'TOLL_PARKING',
  'FOOD_ALLOWANCE',
  'HOTEL_STAY',
  'OTHER',
]);

export const UpConveyancePurposeEnum = z.enum([
  'SITE_MEASUREMENT',
  'SITE_INSPECTION',
  'MATERIAL_SHIFTING',
  'INSTALLATION_SUPPORT',
  'CLIENT_MEETING',
  'SAMPLE_SUBMISSION',
  'MAINTENANCE_SERVICE',
  'OTHER',
]);

export const UpConveyancePaymentModeEnum = z.enum([
  'PAID_BY_EMPLOYEE',
  'COMPANY_CASH',
  'COMPANY_UPI',
  'COMPANY_CARD',
]);

export const UpConveyanceStatusEnum = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REIMBURSED',
]);

export const CreateUpConveyanceExpenseSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  visitDate: z.coerce.date(),
  siteName: z.string().min(2, 'Site name is required'),
  siteAddress: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  purpose: UpConveyancePurposeEnum.default('SITE_MEASUREMENT'),
  category: UpConveyanceCategoryEnum.default('PETROL'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  paymentMode: UpConveyancePaymentModeEnum.default('PAID_BY_EMPLOYEE'),
  startLocation: z.string().optional().nullable(),
  endLocation: z.string().optional().nullable(),
  transportMode: z.string().optional().nullable(),
  distanceKm: z.coerce.number().optional().nullable(),
  ratePerKm: z.coerce.number().optional().nullable(),
  calculatedFare: z.coerce.number().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  receiptFilename: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  branch: z.string().default('UP'),
  projectName: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});
export type CreateUpConveyanceExpenseInput = z.infer<typeof CreateUpConveyanceExpenseSchema>;

export const UpdateUpConveyanceExpenseSchema = CreateUpConveyanceExpenseSchema.partial();
export type UpdateUpConveyanceExpenseInput = z.infer<typeof UpdateUpConveyanceExpenseSchema>;

export const ListUpConveyanceExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  employeeId: z.string().optional(),
  category: UpConveyanceCategoryEnum.optional(),
  purpose: UpConveyancePurposeEnum.optional(),
  status: UpConveyanceStatusEnum.optional(),
  paymentMode: UpConveyancePaymentModeEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  branch: z.string().optional(),
});
export type ListUpConveyanceExpensesQuery = z.infer<typeof ListUpConveyanceExpensesQuerySchema>;

export const ApproveUpConveyanceSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const RejectUpConveyanceSchema = z.object({
  reason: z.string().min(2, 'Rejection reason is required'),
});

export const SettleUpConveyanceSchema = z.object({
  paymentRef: z.string().min(1, 'Payment reference / transaction ID is required'),
  reimbursedAmount: z.coerce.number().min(0.01).optional(),
});
