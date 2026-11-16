import prisma from '../../config/database';
import { logger } from '../../config/logger';
import {
  CreateUpEmployeeInput,
  UpdateUpEmployeeInput,
  ListUpEmployeesQuery,
  RecordUpAttendanceInput,
  BatchUpAttendanceInput,
  ListUpAttendanceQuery,
  CreateUpAdvanceInput,
  PartialDeductUpAdvanceInput,
  ListUpAdvancesQuery,
  CreateUpDeductionInput,
  ListUpDeductionsQuery,
  CalculateUpPayrollInput,
  MarkUpPayrollPaidInput,
  ListUpPayrollQuery,
  AdjustUpLeaveInput,
  AccrueUpMonthlyLeaveInput,
} from './up-employees.schema';
import { Prisma } from '@prisma/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getYearMonthString(year: number, month: number): string {
  return `${year}${String(month).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function countSundaysInMonth(year: number, month: number): number {
  const totalDays = getDaysInMonth(year, month);
  let sundays = 0;
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === 0) sundays++;
  }
  return sundays;
}

// ─── Sequence Generator ───────────────────────────────────────────────────────
export async function generateUpEmployeeId(date = new Date()): Promise<string> {
  const ym = getYearMonthString(date.getFullYear(), date.getMonth() + 1);
  const seq = await prisma.upEmployeeIdSequence.upsert({
    where: { yearMonth: ym },
    create: { yearMonth: ym, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return `UPFE${ym}${String(seq.lastNumber).padStart(3, '0')}`;
}

// ─── UP Worker Master Data ────────────────────────────────────────────────────
export async function createUpEmployee(data: CreateUpEmployeeInput, _createdById?: string) {
  const employeeId = await generateUpEmployeeId(new Date(data.joiningDate));

  let finalEmail = data.email ? data.email.trim().toLowerCase() : '';
  if (!finalEmail) {
    finalEmail = `${employeeId.toLowerCase()}@upfactory.prc`;
  }

  const cleanPhone = (data.phone || '').replace(/[\s-]/g, '').trim();

  // If daily wage is specified but monthlyCtc is 0, estimate monthlyCtc (26 working days)
  let monthlyCtc = Number(data.monthlyCtc || 0);
  let dailyWage = data.dailyWage !== undefined && data.dailyWage !== null ? Number(data.dailyWage) : null;
  if (data.workerType === 'DAILY_WAGE' && dailyWage && monthlyCtc === 0) {
    monthlyCtc = Math.round(dailyWage * 26);
  } else if (dailyWage === null && monthlyCtc > 0) {
    dailyWage = Math.round((monthlyCtc / 26) * 100) / 100;
  }

  // Calculate default OT rate if 0
  let overtimeHourlyRate = Number(data.overtimeHourlyRate || 0);
  if (overtimeHourlyRate === 0 && monthlyCtc > 0) {
    // Normal 8-hour shift rate: (monthlyCtc / 26 days / 8 hours)
    overtimeHourlyRate = Math.round((monthlyCtc / (26 * 8)) * 100) / 100;
  }

  const employee = await prisma.upEmployee.create({
    data: {
      employeeId,
      name: data.name.trim(),
      email: finalEmail,
      phone: cleanPhone,
      address: data.address.trim(),
      governmentIdType: data.governmentIdType as any,
      governmentIdNumber: data.governmentIdNumber.trim().toUpperCase(),
      bankAccountNumber: data.bankAccountNumber?.trim() || null,
      bankIfsc: data.bankIfsc?.trim().toUpperCase() || null,
      bankName: data.bankName?.trim() || null,
      bankAccountHolder: data.bankAccountHolder?.trim() || null,
      paymentMode: data.paymentMode || 'CASH',
      designation: data.designation.trim(),
      department: data.department.trim(),
      workerType: data.workerType || 'MONTHLY',
      dailyWage: dailyWage !== null ? new Prisma.Decimal(dailyWage) : null,
      monthlyCtc: new Prisma.Decimal(monthlyCtc),
      overtimeHourlyRate: new Prisma.Decimal(overtimeHourlyRate),
      joiningDate: new Date(data.joiningDate),
      status: (data.status as any) || 'ACTIVE',
      clBalance: new Prisma.Decimal(data.clBalance || 0),
      elBalance: new Prisma.Decimal(data.elBalance || 0),
      emergencyContact: data.emergencyContact?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });

  logger.info(`[UP Factory] Created employee ${employee.employeeId} - ${employee.name}`);
  return employee;
}

export async function updateUpEmployee(id: string, data: UpdateUpEmployeeInput) {
  const existing = await prisma.upEmployee.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('UP Factory employee not found');
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.email !== undefined && data.email !== null) updateData.email = data.email.trim().toLowerCase();
  if (data.phone !== undefined) updateData.phone = data.phone.replace(/[\s-]/g, '').trim();
  if (data.address !== undefined) updateData.address = data.address.trim();
  if (data.governmentIdType !== undefined) updateData.governmentIdType = data.governmentIdType;
  if (data.governmentIdNumber !== undefined) updateData.governmentIdNumber = data.governmentIdNumber.trim().toUpperCase();
  if (data.bankAccountNumber !== undefined) updateData.bankAccountNumber = data.bankAccountNumber?.trim() || null;
  if (data.bankIfsc !== undefined) updateData.bankIfsc = data.bankIfsc?.trim().toUpperCase() || null;
  if (data.bankName !== undefined) updateData.bankName = data.bankName?.trim() || null;
  if (data.bankAccountHolder !== undefined) updateData.bankAccountHolder = data.bankAccountHolder?.trim() || null;
  if (data.paymentMode !== undefined) updateData.paymentMode = data.paymentMode;
  if (data.designation !== undefined) updateData.designation = data.designation.trim();
  if (data.department !== undefined) updateData.department = data.department.trim();
  if (data.workerType !== undefined) updateData.workerType = data.workerType;
  if (data.dailyWage !== undefined) {
    updateData.dailyWage = data.dailyWage !== null ? new Prisma.Decimal(data.dailyWage) : null;
  }
  if (data.monthlyCtc !== undefined) {
    updateData.monthlyCtc = new Prisma.Decimal(data.monthlyCtc);
  }
  if (data.overtimeHourlyRate !== undefined) {
    updateData.overtimeHourlyRate = new Prisma.Decimal(data.overtimeHourlyRate);
  }
  if (data.joiningDate !== undefined) updateData.joiningDate = new Date(data.joiningDate);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.clBalance !== undefined) updateData.clBalance = new Prisma.Decimal(data.clBalance);
  if (data.elBalance !== undefined) updateData.elBalance = new Prisma.Decimal(data.elBalance);
  if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact?.trim() || null;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

  const updated = await prisma.upEmployee.update({
    where: { id },
    data: updateData,
  });

  return updated;
}

export async function getUpEmployee(id: string) {
  const employee = await prisma.upEmployee.findUnique({
    where: { id },
    include: {
      attendances: {
        take: 31,
        orderBy: { date: 'desc' },
      },
      advances: {
        where: { isRecovered: false },
        orderBy: { advanceDate: 'desc' },
      },
      deductions: {
        where: { isApplied: false },
        orderBy: { createdAt: 'desc' },
      },
      payrollRuns: {
        take: 6,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      },
    },
  });

  if (!employee) {
    throw new Error('UP Factory employee not found');
  }

  return employee;
}

export async function listUpEmployees(query: ListUpEmployeesQuery) {
  const page = Math.max(1, parseInt(String(query.page || 1), 10) || 1);
  const limit = Math.max(1, parseInt(String(query.limit || 50), 10) || 50);
  const skip = (page - 1) * limit;

  const { search, department, designation, status, workerType, paymentMode } = query;

  const where: Prisma.UpEmployeeWhereInput = {};

  if (search) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { employeeId: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
      { governmentIdNumber: { contains: s, mode: 'insensitive' } },
    ];
  }

  if (department && department !== 'ALL' && department !== 'All Departments') {
    where.department = department;
  }
  if (designation && designation !== 'ALL' && designation !== 'All Designations') {
    where.designation = designation;
  }
  if (status && status !== 'ALL') {
    where.status = status as any;
  }
  if (workerType && workerType !== 'ALL') {
    where.workerType = workerType;
  }
  if (paymentMode && paymentMode !== 'ALL') {
    where.paymentMode = paymentMode;
  }

  const [total, items] = await Promise.all([
    prisma.upEmployee.count({ where }),
    prisma.upEmployee.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: {
        advances: {
          where: { isRecovered: false },
          select: { amount: true },
        },
      },
    }),
  ]);

  const mapped = items.map((emp) => {
    const pendingAdvancesTotal = emp.advances.reduce((acc, adv) => acc + Number(adv.amount || 0), 0);
    return {
      ...emp,
      pendingAdvancesTotal,
    };
  });

  return {
    items: mapped,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function deleteUpEmployee(id: string) {
  return prisma.upEmployee.update({
    where: { id },
    data: { status: 'TERMINATED' },
  });
}

// ─── UP Factory Workforce KPI Summary ─────────────────────────────────────────
export async function getUpWorkforceStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalStaff, activeStaff, dailyWageWorkers, monthlyWorkers] = await Promise.all([
    prisma.upEmployee.count(),
    prisma.upEmployee.count({ where: { status: 'ACTIVE' } }),
    prisma.upEmployee.count({ where: { status: 'ACTIVE', workerType: 'DAILY_WAGE' } }),
    prisma.upEmployee.count({ where: { status: 'ACTIVE', workerType: 'MONTHLY' } }),
  ]);

  // Today's attendance snapshot
  const todayAttendances = await prisma.upEmployeeAttendance.findMany({
    where: { date: today },
  });

  const presentToday = todayAttendances.filter(
    (a) => a.status === 'PRESENT' || a.status === 'DOUBLE_DUTY'
  ).length;
  const doubleDutyToday = todayAttendances.filter((a) => a.status === 'DOUBLE_DUTY').length;
  const onLeaveToday = todayAttendances.filter(
    (a) => a.status === 'CL' || a.status === 'EL' || a.status === 'LEAVE' || a.status === 'UL'
  ).length;
  const totalOtHoursToday = todayAttendances.reduce((acc, a) => acc + Number(a.overtimeHours || 0), 0);

  // Pending advances
  const pendingAdvances = await prisma.upEmployeeAdvance.findMany({
    where: { isRecovered: false },
    select: { amount: true },
  });
  const totalPendingAdvanceAmount = pendingAdvances.reduce((acc, a) => acc + Number(a.amount || 0), 0);

  // Current month payroll status
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const payrollRuns = await prisma.upEmployeePayrollRun.findMany({
    where: { month: currentMonth, year: currentYear },
    select: { status: true, netSalary: true },
  });

  const totalCurrentMonthPayroll = payrollRuns.reduce((acc, p) => acc + Number(p.netSalary || 0), 0);
  const finalizedCount = payrollRuns.filter((p) => p.status === 'FINALIZED' || p.status === 'PAID').length;

  return {
    totalStaff,
    activeStaff,
    dailyWageWorkers,
    monthlyWorkers,
    today: {
      date: today.toISOString().split('T')[0],
      markedCount: todayAttendances.length,
      present: presentToday,
      doubleDuty: doubleDutyToday,
      onLeave: onLeaveToday,
      totalOtHours: totalOtHoursToday,
    },
    advances: {
      count: pendingAdvances.length,
      totalPendingAmount: totalPendingAdvanceAmount,
    },
    payroll: {
      month: currentMonth,
      year: currentYear,
      totalCount: payrollRuns.length,
      finalizedCount,
      totalAmount: totalCurrentMonthPayroll,
    },
  };
}

// ─── Attendance Services ──────────────────────────────────────────────────────
export async function recordUpAttendance(data: RecordUpAttendanceInput, markedById?: string) {
  const attDate = new Date(data.date);
  attDate.setHours(0, 0, 0, 0);

  const isSunday = attDate.getDay() === 0;

  const attendance = await prisma.upEmployeeAttendance.upsert({
    where: {
      employeeId_date: {
        employeeId: data.employeeId,
        date: attDate,
      },
    },
    create: {
      employeeId: data.employeeId,
      date: attDate,
      status: data.status as any,
      isSunday: isSunday || data.isSunday,
      isSundayOverride: isSunday ? data.isSundayOverride : false,
      overtimeHours: new Prisma.Decimal(data.overtimeHours || 0),
      shift: data.shift || 'GENERAL',
      notes: data.notes || null,
      markedById: markedById || null,
    },
    update: {
      status: data.status as any,
      isSunday: isSunday || data.isSunday,
      isSundayOverride: isSunday ? data.isSundayOverride : false,
      overtimeHours: new Prisma.Decimal(data.overtimeHours || 0),
      shift: data.shift || 'GENERAL',
      notes: data.notes || null,
      markedById: markedById || null,
    },
    include: {
      employee: {
        select: { id: true, employeeId: true, name: true, department: true, designation: true },
      },
    },
  });

  return attendance;
}

export async function batchRecordUpAttendance(data: BatchUpAttendanceInput, markedById?: string) {
  const attDate = new Date(data.date);
  attDate.setHours(0, 0, 0, 0);
  const isSunday = attDate.getDay() === 0;

  const results = [];
  for (const item of data.records) {
    const record = await prisma.upEmployeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId: item.employeeId,
          date: attDate,
        },
      },
      create: {
        employeeId: item.employeeId,
        date: attDate,
        status: item.status as any,
        isSunday,
        isSundayOverride: isSunday ? item.isSundayOverride : false,
        overtimeHours: new Prisma.Decimal(item.overtimeHours || 0),
        shift: item.shift || 'GENERAL',
        notes: item.notes || null,
        markedById: markedById || null,
      },
      update: {
        status: item.status as any,
        isSunday,
        isSundayOverride: isSunday ? item.isSundayOverride : false,
        overtimeHours: new Prisma.Decimal(item.overtimeHours || 0),
        shift: item.shift || 'GENERAL',
        notes: item.notes || null,
        markedById: markedById || null,
      },
    });
    results.push(record);
  }

  return { count: results.length, date: data.date };
}

export async function listUpAttendance(query: ListUpAttendanceQuery) {
  const month = parseInt(String(query.month), 10);
  const year = parseInt(String(query.year), 10);
  const employeeId = query.employeeId;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const where: Prisma.UpEmployeeAttendanceWhereInput = {
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (employeeId) {
    where.employeeId = employeeId;
  }

  const attendances = await prisma.upEmployeeAttendance.findMany({
    where,
    orderBy: [{ date: 'asc' }],
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          department: true,
          designation: true,
          workerType: true,
        },
      },
    },
  });

  return {
    month,
    year,
    daysInMonth: getDaysInMonth(year, month),
    sundaysCount: countSundaysInMonth(year, month),
    items: attendances,
  };
}

export async function deleteUpAttendance(employeeId: string, dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);

  return prisma.upEmployeeAttendance.delete({
    where: {
      employeeId_date: {
        employeeId,
        date: d,
      },
    },
  });
}

// ─── Advances Services ────────────────────────────────────────────────────────
export async function createUpAdvance(data: CreateUpAdvanceInput, createdById?: string) {
  const employee = await prisma.upEmployee.findUnique({ where: { id: data.employeeId } });
  if (!employee) {
    throw new Error('UP Factory employee not found');
  }

  const advance = await prisma.upEmployeeAdvance.create({
    data: {
      employeeId: data.employeeId,
      amount: new Prisma.Decimal(data.amount),
      originalAmount: new Prisma.Decimal(data.amount),
      reason: data.reason.trim(),
      recoveryMonth: data.recoveryMonth,
      recoveryYear: data.recoveryYear,
      advanceDate: data.advanceDate ? new Date(data.advanceDate) : new Date(),
      disbursedVia: data.disbursedVia || 'CASH',
      createdById: createdById || null,
    },
    include: {
      employee: {
        select: { id: true, employeeId: true, name: true, department: true },
      },
    },
  });

  logger.info(`[UP Factory] Disbursed ₹${data.amount} cash advance to ${employee.name}`);
  return advance;
}

export async function partialDeductUpAdvance(id: string, data: PartialDeductUpAdvanceInput) {
  const advance = await prisma.upEmployeeAdvance.findUnique({ where: { id } });
  if (!advance) throw new Error('Advance record not found');

  const currentAmount = Number(advance.amount);
  const deduct = Number(data.deductionAmount);

  if (deduct >= currentAmount) {
    // Fully recovered
    return prisma.upEmployeeAdvance.update({
      where: { id },
      data: {
        amount: new Prisma.Decimal(0),
        isRecovered: true,
        recoveredAt: new Date(),
      },
    });
  }

  const remaining = currentAmount - deduct;
  const updateData: any = {
    amount: new Prisma.Decimal(remaining),
  };
  if (data.newRecoveryMonth) updateData.recoveryMonth = data.newRecoveryMonth;
  if (data.newRecoveryYear) updateData.recoveryYear = data.newRecoveryYear;

  return prisma.upEmployeeAdvance.update({
    where: { id },
    data: updateData,
  });
}

export async function recoverUpAdvance(id: string) {
  return prisma.upEmployeeAdvance.update({
    where: { id },
    data: {
      isRecovered: true,
      recoveredAt: new Date(),
    },
  });
}

export async function listUpAdvances(query: ListUpAdvancesQuery) {
  const { employeeId, status = 'PENDING' } = query;
  const recoveryMonth = query.recoveryMonth ? parseInt(String(query.recoveryMonth), 10) : undefined;
  const recoveryYear = query.recoveryYear ? parseInt(String(query.recoveryYear), 10) : undefined;
  const where: Prisma.UpEmployeeAdvanceWhereInput = {};

  if (employeeId) where.employeeId = employeeId;
  if (status === 'PENDING') where.isRecovered = false;
  if (status === 'RECOVERED') where.isRecovered = true;
  if (recoveryMonth) where.recoveryMonth = recoveryMonth;
  if (recoveryYear) where.recoveryYear = recoveryYear;

  return prisma.upEmployeeAdvance.findMany({
    where,
    orderBy: [{ advanceDate: 'desc' }],
    include: {
      employee: {
        select: { id: true, employeeId: true, name: true, department: true, designation: true },
      },
    },
  });
}

export async function getUpAdvanceSummary() {
  const [totalDisbursedAgg, totalPendingAgg] = await Promise.all([
    prisma.upEmployeeAdvance.aggregate({
      _sum: { originalAmount: true },
    }),
    prisma.upEmployeeAdvance.aggregate({
      where: { isRecovered: false },
      _sum: { amount: true },
    }),
  ]);

  const totalDisbursed = Number(totalDisbursedAgg._sum.originalAmount || 0);
  const totalPending = Number(totalPendingAgg._sum.amount || 0);
  const totalRecovered = Math.max(0, totalDisbursed - totalPending);

  return {
    totalDisbursed,
    totalRecovered,
    totalPendingRecovery: totalPending,
  };
}

// ─── Deductions Services ──────────────────────────────────────────────────────
export async function createUpDeduction(data: CreateUpDeductionInput, createdById?: string) {
  return prisma.upEmployeeDeduction.create({
    data: {
      employeeId: data.employeeId,
      amount: new Prisma.Decimal(data.amount),
      reason: data.reason.trim(),
      applyMonth: data.applyMonth,
      applyYear: data.applyYear,
      createdById: createdById || null,
    },
    include: {
      employee: {
        select: { id: true, employeeId: true, name: true, department: true },
      },
    },
  });
}

export async function listUpDeductions(query: ListUpDeductionsQuery) {
  const { employeeId, isApplied } = query;
  const applyMonth = query.applyMonth ? parseInt(String(query.applyMonth), 10) : undefined;
  const applyYear = query.applyYear ? parseInt(String(query.applyYear), 10) : undefined;
  const where: Prisma.UpEmployeeDeductionWhereInput = {};

  if (employeeId) where.employeeId = employeeId;
  if (applyMonth) where.applyMonth = applyMonth;
  if (applyYear) where.applyYear = applyYear;
  if (isApplied === 'true') where.isApplied = true;
  if (isApplied === 'false') where.isApplied = false;

  return prisma.upEmployeeDeduction.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    include: {
      employee: {
        select: { id: true, employeeId: true, name: true, department: true, designation: true },
      },
    },
  });
}

export async function deleteUpDeduction(id: string) {
  return prisma.upEmployeeDeduction.delete({ where: { id } });
}

// ─── Payroll Engine Services ──────────────────────────────────────────────────
export async function calculateUpPayroll(data: CalculateUpPayrollInput, createdById?: string) {
  const { month, year, employeeIds, overtimeMultiplier = 1.0, workingHoursPerDay = 8 } = data;

  const totalCalendarDays = getDaysInMonth(year, month);
  const sundaysCount = countSundaysInMonth(year, month);

  // Fetch employees
  const whereEmp: Prisma.UpEmployeeWhereInput = { status: 'ACTIVE' };
  if (employeeIds && employeeIds.length > 0) {
    whereEmp.id = { in: employeeIds };
  }
  const employees = await prisma.upEmployee.findMany({ where: whereEmp });

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const results = [];

  for (const emp of employees) {
    // 1. Fetch worker attendances in the month
    const attendances = await prisma.upEmployeeAttendance.findMany({
      where: {
        employeeId: emp.id,
        date: { gte: startDate, lte: endDate },
      },
    });

    let presentDays = 0;
    let doubleDutyDays = 0;
    let clDays = 0;
    let elDays = 0;
    let halfDays = 0;
    let unpaidDays = 0;
    let holidayDays = 0;
    let approvedSundays = 0;
    let totalOtHours = 0;

    for (const att of attendances) {
      totalOtHours += Number(att.overtimeHours || 0);

      if (att.isSunday && att.isSundayOverride) {
        approvedSundays += 1;
      }

      switch (att.status) {
        case 'PRESENT':
          presentDays += 1;
          break;
        case 'DOUBLE_DUTY':
          doubleDutyDays += 1;
          break;
        case 'HALF_DAY':
          halfDays += 1;
          break;
        case 'CL':
          clDays += 1;
          break;
        case 'EL':
          elDays += 1;
          break;
        case 'HOLIDAY':
          holidayDays += 1;
          break;
        case 'UL':
        case 'LEAVE':
          unpaidDays += 1;
          break;
        default:
          break;
      }
    }

    // Double duty counts as 2x full shift
    const payableDays =
      presentDays +
      doubleDutyDays * 2 +
      halfDays * 0.5 +
      clDays +
      elDays +
      holidayDays +
      approvedSundays;

    const monthlyCtc = Number(emp.monthlyCtc || 0);
    const perDayRate =
      emp.workerType === 'DAILY_WAGE' && emp.dailyWage
        ? Number(emp.dailyWage)
        : Math.round((monthlyCtc / totalCalendarDays) * 100) / 100;

    // OT rate
    let overtimeRate = Number(emp.overtimeHourlyRate || 0);
    if (overtimeRate === 0) {
      overtimeRate = Math.round((perDayRate / workingHoursPerDay) * overtimeMultiplier * 100) / 100;
    }
    const overtimePay = Math.round(totalOtHours * overtimeRate * 100) / 100;

    const basePay = Math.round(payableDays * perDayRate * 100) / 100;
    const grossSalary = Math.round((basePay + overtimePay) * 100) / 100;

    // 2. Fetch pending advances scheduled for this recovery month
    const advances = await prisma.upEmployeeAdvance.findMany({
      where: {
        employeeId: emp.id,
        recoveryMonth: month,
        recoveryYear: year,
        isRecovered: false,
      },
    });
    const advanceDeduction = advances.reduce((acc, a) => acc + Number(a.amount || 0), 0);

    // 3. Fetch deductions scheduled for this month
    const deductions = await prisma.upEmployeeDeduction.findMany({
      where: {
        employeeId: emp.id,
        applyMonth: month,
        applyYear: year,
        isApplied: false,
      },
    });
    const otherDeductions = deductions.reduce((acc, d) => acc + Number(d.amount || 0), 0);

    // Net Salary
    const netSalary = Math.max(0, Math.round((grossSalary - advanceDeduction - otherDeductions) * 100) / 100);

    // Upsert payroll run
    const payrollRun = await prisma.upEmployeePayrollRun.upsert({
      where: {
        employeeId_year_month: {
          employeeId: emp.id,
          year,
          month,
        },
      },
      create: {
        employeeId: emp.id,
        month,
        year,
        monthlyCtc: new Prisma.Decimal(monthlyCtc),
        totalCalendarDays,
        sundaysCount,
        approvedSundays,
        payableDays: new Prisma.Decimal(payableDays),
        perDayRate: new Prisma.Decimal(perDayRate),
        presentDays: new Prisma.Decimal(presentDays),
        doubleDutyDays: new Prisma.Decimal(doubleDutyDays),
        clDays: new Prisma.Decimal(clDays),
        elDays: new Prisma.Decimal(elDays),
        halfDays: new Prisma.Decimal(halfDays),
        unpaidDays: new Prisma.Decimal(unpaidDays),
        holidayDays: new Prisma.Decimal(holidayDays),
        paidDays: new Prisma.Decimal(payableDays),
        overtimeHours: new Prisma.Decimal(totalOtHours),
        overtimeRate: new Prisma.Decimal(overtimeRate),
        overtimeMultiplier: new Prisma.Decimal(overtimeMultiplier),
        overtimePay: new Prisma.Decimal(overtimePay),
        workingHoursPerDay: new Prisma.Decimal(workingHoursPerDay),
        additionalAllowances: new Prisma.Decimal(0),
        grossSalary: new Prisma.Decimal(grossSalary),
        advanceDeduction: new Prisma.Decimal(advanceDeduction),
        otherDeductions: new Prisma.Decimal(otherDeductions),
        netSalary: new Prisma.Decimal(netSalary),
        status: 'DRAFT',
        paymentMode: emp.paymentMode || 'CASH',
        createdById: createdById || null,
        deductionSummary: {
          advances: advances.map((a) => ({ id: a.id, amount: Number(a.amount), reason: a.reason })),
          deductions: deductions.map((d) => ({ id: d.id, amount: Number(d.amount), reason: d.reason })),
        },
      },
      update: {
        monthlyCtc: new Prisma.Decimal(monthlyCtc),
        totalCalendarDays,
        sundaysCount,
        approvedSundays,
        payableDays: new Prisma.Decimal(payableDays),
        perDayRate: new Prisma.Decimal(perDayRate),
        presentDays: new Prisma.Decimal(presentDays),
        doubleDutyDays: new Prisma.Decimal(doubleDutyDays),
        clDays: new Prisma.Decimal(clDays),
        elDays: new Prisma.Decimal(elDays),
        halfDays: new Prisma.Decimal(halfDays),
        unpaidDays: new Prisma.Decimal(unpaidDays),
        holidayDays: new Prisma.Decimal(holidayDays),
        paidDays: new Prisma.Decimal(payableDays),
        overtimeHours: new Prisma.Decimal(totalOtHours),
        overtimeRate: new Prisma.Decimal(overtimeRate),
        overtimeMultiplier: new Prisma.Decimal(overtimeMultiplier),
        overtimePay: new Prisma.Decimal(overtimePay),
        grossSalary: new Prisma.Decimal(grossSalary),
        advanceDeduction: new Prisma.Decimal(advanceDeduction),
        otherDeductions: new Prisma.Decimal(otherDeductions),
        netSalary: new Prisma.Decimal(netSalary),
        paymentMode: emp.paymentMode || 'CASH',
        deductionSummary: {
          advances: advances.map((a) => ({ id: a.id, amount: Number(a.amount), reason: a.reason })),
          deductions: deductions.map((d) => ({ id: d.id, amount: Number(d.amount), reason: d.reason })),
        },
      },
    });

    results.push(payrollRun);
  }

  return {
    month,
    year,
    count: results.length,
    runs: results,
  };
}

export async function finalizeUpPayroll(id: string, finalizedById?: string) {
  const run = await prisma.upEmployeePayrollRun.findUnique({ where: { id } });
  if (!run) throw new Error('Payroll run not found');

  return prisma.upEmployeePayrollRun.update({
    where: { id },
    data: {
      status: 'FINALIZED',
      finalizedById: finalizedById || null,
    },
  });
}

export async function revertUpPayrollToDraft(id: string) {
  return prisma.upEmployeePayrollRun.update({
    where: { id },
    data: { status: 'DRAFT' },
  });
}

export async function markUpPayrollPaid(id: string, data: MarkUpPayrollPaidInput) {
  const run = await prisma.upEmployeePayrollRun.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!run) throw new Error('Payroll run not found');

  // Mark advances as recovered
  await prisma.upEmployeeAdvance.updateMany({
    where: {
      employeeId: run.employeeId,
      recoveryMonth: run.month,
      recoveryYear: run.year,
      isRecovered: false,
    },
    data: {
      isRecovered: true,
      recoveredAt: new Date(),
    },
  });

  // Mark deductions as applied
  await prisma.upEmployeeDeduction.updateMany({
    where: {
      employeeId: run.employeeId,
      applyMonth: run.month,
      applyYear: run.year,
      isApplied: false,
    },
    data: {
      isApplied: true,
      appliedAt: new Date(),
    },
  });

  const updated = await prisma.upEmployeePayrollRun.update({
    where: { id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paymentMode: data.paymentMode || 'CASH',
      paymentReference: data.paymentReference?.trim() || null,
      paymentNotes: data.paymentNotes?.trim() || null,
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          phone: true,
          department: true,
          designation: true,
          bankAccountNumber: true,
          bankIfsc: true,
        },
      },
    },
  });

  return updated;
}

export async function listUpPayroll(query: ListUpPayrollQuery) {
  const month = parseInt(String(query.month), 10);
  const year = parseInt(String(query.year), 10);
  const status = query.status || 'ALL';
  const employeeId = query.employeeId;
  const where: Prisma.UpEmployeePayrollRunWhereInput = {
    month,
    year,
  };

  if (status !== 'ALL') {
    where.status = status as any;
  }
  if (employeeId) {
    where.employeeId = employeeId;
  }

  const items = await prisma.upEmployeePayrollRun.findMany({
    where,
    orderBy: [{ netSalary: 'desc' }],
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          department: true,
          designation: true,
          workerType: true,
          paymentMode: true,
          bankAccountNumber: true,
          bankIfsc: true,
        },
      },
    },
  });

  const totalAmount = items.reduce((acc, item) => acc + Number(item.netSalary || 0), 0);
  const paidCount = items.filter((item) => item.status === 'PAID').length;
  const finalizedCount = items.filter((item) => item.status === 'FINALIZED').length;
  const draftCount = items.filter((item) => item.status === 'DRAFT').length;

  return {
    month,
    year,
    summary: {
      totalEmployees: items.length,
      totalAmount,
      paidCount,
      finalizedCount,
      draftCount,
    },
    items,
  };
}

// ─── Leave Services ───────────────────────────────────────────────────────────
export async function accrueUpMonthlyLeave(data: AccrueUpMonthlyLeaveInput, recordedById?: string) {
  const { month, year, clAmount = 1.0, elAmount = 1.25 } = data;
  const activeEmployees = await prisma.upEmployee.findMany({ where: { status: 'ACTIVE' } });

  for (const emp of activeEmployees) {
    const newCl = Number(emp.clBalance) + clAmount;
    const newEl = Number(emp.elBalance) + elAmount;

    await prisma.upEmployee.update({
      where: { id: emp.id },
      data: {
        clBalance: new Prisma.Decimal(newCl),
        elBalance: new Prisma.Decimal(newEl),
      },
    });

    await prisma.upEmployeeLeaveLedger.createMany({
      data: [
        {
          employeeId: emp.id,
          leaveType: 'CL',
          transactionType: 'ACCRUAL',
          amount: new Prisma.Decimal(clAmount),
          balanceAfter: new Prisma.Decimal(newCl),
          month,
          year,
          reason: `Automatic Monthly Accrual (${month}/${year})`,
          recordedById: recordedById || null,
        },
        {
          employeeId: emp.id,
          leaveType: 'EL',
          transactionType: 'ACCRUAL',
          amount: new Prisma.Decimal(elAmount),
          balanceAfter: new Prisma.Decimal(newEl),
          month,
          year,
          reason: `Automatic Monthly Accrual (${month}/${year})`,
          recordedById: recordedById || null,
        },
      ],
    });
  }

  return { count: activeEmployees.length, clAmount, elAmount };
}

export async function adjustUpLeave(id: string, data: AdjustUpLeaveInput, recordedById?: string) {
  const emp = await prisma.upEmployee.findUnique({ where: { id } });
  if (!emp) throw new Error('UP Factory employee not found');

  const isCl = data.leaveType === 'CL';
  const currentBalance = isCl ? Number(emp.clBalance) : Number(emp.elBalance);
  const newBalance = Math.max(0, currentBalance + Number(data.amount));

  await prisma.upEmployee.update({
    where: { id },
    data: isCl
      ? { clBalance: new Prisma.Decimal(newBalance) }
      : { elBalance: new Prisma.Decimal(newBalance) },
  });

  const ledger = await prisma.upEmployeeLeaveLedger.create({
    data: {
      employeeId: id,
      leaveType: data.leaveType as any,
      transactionType: 'ADJUSTMENT',
      amount: new Prisma.Decimal(data.amount),
      balanceAfter: new Prisma.Decimal(newBalance),
      month: data.month,
      year: data.year,
      reason: data.reason.trim(),
      recordedById: recordedById || null,
    },
  });

  return ledger;
}

export async function getUpLeaveLedger(employeeId: string) {
  return prisma.upEmployeeLeaveLedger.findMany({
    where: { employeeId },
    orderBy: [{ createdAt: 'desc' }],
  });
}
