import { prisma } from '../../config/database';

export interface BranchInput {
  name: string;
  code?: string;
  city: string;
  state: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  openingBalance?: number;
  isDefault?: boolean;
  isActive?: boolean;
  companyProfileId?: string;
}

export interface BranchTransactionInput {
  branchId: string;
  entryDate: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  category: string;
  partyName: string;
  partyType?: string;
  referenceNo?: string;
  paymentMode?: string;
  paymentStatus?: string;
  description?: string;
  voucherUrl?: string;
  companyProfileId?: string;
}

export interface TransactionFilterQuery {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  type?: 'ALL' | 'CREDIT' | 'DEBIT';
  category?: string;
  paymentMode?: string;
  paymentStatus?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
  companyProfileId?: string;
}

export const branchLedgerService = {
  /**
   * List all branches with live financial statistics and book balances.
   */
  async getBranches(params?: { isActive?: boolean; companyProfileId?: string }) {
    const where: any = {};
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    if (params?.companyProfileId) where.companyProfileId = params.companyProfileId;

    const branches = await prisma.branch.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Compute live balances for each branch from active transactions
    const branchStats = await Promise.all(
      branches.map(async (b) => {
        const aggregates = await prisma.branchTransaction.groupBy({
          by: ['type'],
          where: {
            branchId: b.id,
            deletedAt: null,
          },
          _sum: { amount: true },
          _count: { id: true },
        });

        let totalCredits = 0;
        let totalDebits = 0;
        let totalCount = 0;

        aggregates.forEach((agg) => {
          const amt = Number(agg._sum.amount || 0);
          totalCount += agg._count.id;
          if (agg.type === 'CREDIT') totalCredits += amt;
          if (agg.type === 'DEBIT') totalDebits += amt;
        });

        const opening = Number(b.openingBalance || 0);
        const computedCurrent = opening + totalCredits - totalDebits;

        return {
          id: b.id,
          code: b.code,
          name: b.name,
          city: b.city,
          state: b.state,
          address: b.address,
          phone: b.phone,
          email: b.email,
          contactPerson: b.contactPerson,
          openingBalance: opening,
          currentBalance: computedCurrent,
          totalCredits,
          totalDebits,
          netFlow: totalCredits - totalDebits,
          transactionCount: totalCount,
          isDefault: b.isDefault,
          isActive: b.isActive,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        };
      })
    );

    return branchStats;
  },

  /**
   * Get branch details by ID with current balance.
   */
  async getBranchById(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
    });
    if (!branch) throw new Error(`Branch with ID "${id}" not found.`);

    const aggregates = await prisma.branchTransaction.groupBy({
      by: ['type'],
      where: { branchId: id, deletedAt: null },
      _sum: { amount: true },
      _count: { id: true },
    });

    let totalCredits = 0;
    let totalDebits = 0;
    let count = 0;

    aggregates.forEach((agg) => {
      const amt = Number(agg._sum.amount || 0);
      count += agg._count.id;
      if (agg.type === 'CREDIT') totalCredits += amt;
      if (agg.type === 'DEBIT') totalDebits += amt;
    });

    const opening = Number(branch.openingBalance || 0);
    const computedCurrent = opening + totalCredits - totalDebits;

    return {
      ...branch,
      openingBalance: opening,
      currentBalance: computedCurrent,
      totalCredits,
      totalDebits,
      netFlow: totalCredits - totalDebits,
      transactionCount: count,
    };
  },

  /**
   * Create a new branch dynamically.
   */
  async createBranch(input: BranchInput) {
    const code = (input.code || input.name.slice(0, 4)).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const id = `branch-${code.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const opening = Number(input.openingBalance || 0);

    const branch = await prisma.branch.create({
      data: {
        id,
        code,
        name: input.name.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        address: input.address?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        contactPerson: input.contactPerson?.trim() || null,
        openingBalance: opening,
        currentBalance: opening,
        isDefault: !!input.isDefault,
        isActive: input.isActive !== false,
        companyProfileId: input.companyProfileId || null,
      },
    });

    // Mirror to hardware_branches for cross-inventory compatibility
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO hardware_branches (id, code, name, city, state, address, phone, contact_person, is_default, is_active, created_at)
        VALUES ('${branch.id}', '${branch.code}', '${branch.name}', '${branch.city}', '${branch.state}', ${branch.address ? `'${branch.address}'` : 'NULL'}, ${branch.phone ? `'${branch.phone}'` : 'NULL'}, ${branch.contactPerson ? `'${branch.contactPerson}'` : 'NULL'}, ${branch.isDefault}, ${branch.isActive}, NOW())
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name, code = EXCLUDED.code, city = EXCLUDED.city, state = EXCLUDED.state, is_active = EXCLUDED.is_active;
      `);
    } catch (err: any) {
      console.warn('[Branch Creation] Mirror to hardware_branches note:', err?.message);
    }

    return branch;
  },

  /**
   * Update branch metadata and opening balance.
   */
  async updateBranch(id: string, input: Partial<BranchInput>) {
    const data: any = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.code !== undefined) data.code = input.code.trim().toUpperCase();
    if (input.city !== undefined) data.city = input.city.trim();
    if (input.state !== undefined) data.state = input.state.trim();
    if (input.address !== undefined) data.address = input.address?.trim() || null;
    if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
    if (input.email !== undefined) data.email = input.email?.trim() || null;
    if (input.contactPerson !== undefined) data.contactPerson = input.contactPerson?.trim() || null;
    if (input.openingBalance !== undefined) data.openingBalance = Number(input.openingBalance);
    if (input.isDefault !== undefined) data.isDefault = !!input.isDefault;
    if (input.isActive !== undefined) data.isActive = !!input.isActive;

    const updated = await prisma.branch.update({
      where: { id },
      data,
    });

    // Mirror updates to hardware_branches
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE hardware_branches
        SET name = '${updated.name}',
            code = '${updated.code}',
            city = '${updated.city}',
            state = '${updated.state}',
            is_active = ${updated.isActive}
        WHERE id = '${updated.id}';
      `);
    } catch (err) {}

    return this.getBranchById(id);
  },

  /**
   * List transactions with dynamic multi-filtering, search, and pagination.
   */
  async getTransactions(query: TransactionFilterQuery) {
    const where: any = {
      deletedAt: null,
    };

    if (query.branchId && query.branchId !== 'ALL') {
      where.branchId = query.branchId;
    }

    if (query.date) {
      where.entryDate = new Date(query.date);
    } else if (query.startDate && query.endDate) {
      where.entryDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    if (query.type && query.type !== 'ALL') {
      where.type = query.type;
    }

    if (query.category && query.category !== 'ALL') {
      where.category = query.category;
    }

    if (query.paymentMode && query.paymentMode !== 'ALL') {
      where.paymentMode = query.paymentMode;
    }

    if (query.paymentStatus && query.paymentStatus !== 'ALL') {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.companyProfileId) {
      where.companyProfileId = query.companyProfileId;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { partyName: { contains: term, mode: 'insensitive' } },
        { referenceNo: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.branchTransaction.count({ where }),
      prisma.branchTransaction.findMany({
        where,
        include: {
          branch: {
            select: { id: true, code: true, name: true, city: true },
          },
        },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        branchId: t.branchId,
        branchName: t.branch?.name,
        branchCode: t.branch?.code,
        branchCity: t.branch?.city,
        entryDate: t.entryDate.toISOString().slice(0, 10),
        type: t.type as 'CREDIT' | 'DEBIT',
        amount: Number(t.amount),
        runningBalance: Number(t.runningBalance),
        category: t.category,
        partyName: t.partyName,
        partyType: t.partyType,
        referenceNo: t.referenceNo,
        paymentMode: t.paymentMode,
        paymentStatus: t.paymentStatus,
        description: t.description,
        voucherUrl: t.voucherUrl,
        createdAt: t.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get single transaction by ID.
   */
  async getTransactionById(id: string) {
    const tx = await prisma.branchTransaction.findUnique({
      where: { id },
      include: { branch: true },
    });
    if (!tx || tx.deletedAt) throw new Error(`Transaction with ID "${id}" not found.`);
    return {
      ...tx,
      amount: Number(tx.amount),
      runningBalance: Number(tx.runningBalance),
      entryDate: tx.entryDate.toISOString().slice(0, 10),
    };
  },

  /**
   * Record a new Debit or Credit entry.
   * Atomically updates branch book balance and computes running balance.
   */
  async createTransaction(input: BranchTransactionInput, userId?: string) {
    const branch = await prisma.branch.findUnique({
      where: { id: input.branchId },
    });
    if (!branch) throw new Error(`Branch with ID "${input.branchId}" does not exist.`);

    const amount = Number(input.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Transaction amount must be a positive number.');
    }

    return await prisma.$transaction(async (tx) => {
      // Calculate new running balance for branch
      const currentBranchBalance = Number(branch.currentBalance || 0);
      const balanceDelta = input.type === 'CREDIT' ? amount : -amount;
      const newRunningBalance = currentBranchBalance + balanceDelta;

      const created = await tx.branchTransaction.create({
        data: {
          branchId: input.branchId,
          entryDate: new Date(input.entryDate),
          type: input.type,
          amount,
          runningBalance: newRunningBalance,
          category: input.category.trim(),
          partyName: input.partyName.trim(),
          partyType: input.partyType || null,
          referenceNo: input.referenceNo?.trim() || null,
          paymentMode: input.paymentMode || 'BANK_TRANSFER',
          paymentStatus: input.paymentStatus || 'CLEARED',
          description: input.description?.trim() || null,
          voucherUrl: input.voucherUrl || null,
          companyProfileId: input.companyProfileId || branch.companyProfileId || null,
          createdBy: userId || null,
        },
        include: {
          branch: {
            select: { id: true, code: true, name: true, city: true },
          },
        },
      });

      // Update current balance in branch
      await tx.branch.update({
        where: { id: input.branchId },
        data: { currentBalance: newRunningBalance },
      });

      return {
        ...created,
        amount: Number(created.amount),
        runningBalance: Number(created.runningBalance),
        entryDate: created.entryDate.toISOString().slice(0, 10),
      };
    });
  },

  /**
   * Update an existing transaction and adjust branch balance difference.
   */
  async updateTransaction(id: string, input: Partial<BranchTransactionInput>) {
    const existing = await prisma.branchTransaction.findUnique({
      where: { id },
      include: { branch: true },
    });
    if (!existing || existing.deletedAt) {
      throw new Error(`Transaction "${id}" not found.`);
    }

    return await prisma.$transaction(async (tx) => {
      const oldAmount = Number(existing.amount);
      const oldDelta = existing.type === 'CREDIT' ? oldAmount : -oldAmount;

      const newType = input.type || existing.type;
      const newAmount = input.amount !== undefined ? Number(input.amount) : oldAmount;
      const newDelta = newType === 'CREDIT' ? newAmount : -newAmount;

      const netAdjustment = newDelta - oldDelta;

      const updated = await tx.branchTransaction.update({
        where: { id },
        data: {
          entryDate: input.entryDate ? new Date(input.entryDate) : undefined,
          type: input.type,
          amount: input.amount !== undefined ? newAmount : undefined,
          category: input.category?.trim(),
          partyName: input.partyName?.trim(),
          partyType: input.partyType,
          referenceNo: input.referenceNo !== undefined ? input.referenceNo?.trim() || null : undefined,
          paymentMode: input.paymentMode,
          paymentStatus: input.paymentStatus,
          description: input.description !== undefined ? input.description?.trim() || null : undefined,
          voucherUrl: input.voucherUrl !== undefined ? input.voucherUrl || null : undefined,
        },
        include: {
          branch: {
            select: { id: true, code: true, name: true, city: true },
          },
        },
      });

      if (netAdjustment !== 0) {
        await tx.branch.update({
          where: { id: existing.branchId },
          data: {
            currentBalance: {
              increment: netAdjustment,
            },
          },
        });
      }

      return {
        ...updated,
        amount: Number(updated.amount),
        runningBalance: Number(updated.runningBalance),
        entryDate: updated.entryDate.toISOString().slice(0, 10),
      };
    });
  },

  /**
   * Soft delete a transaction and revert branch balance.
   */
  async deleteTransaction(id: string) {
    const existing = await prisma.branchTransaction.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt) {
      throw new Error(`Transaction "${id}" not found.`);
    }

    return await prisma.$transaction(async (tx) => {
      const amount = Number(existing.amount);
      const revertDelta = existing.type === 'CREDIT' ? -amount : amount;

      await tx.branchTransaction.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.branch.update({
        where: { id: existing.branchId },
        data: {
          currentBalance: {
            increment: revertDelta,
          },
        },
      });

      return { success: true };
    });
  },

  /**
   * Financial summary calculation for a selected branch/period.
   * Computes Opening Balance, Credits, Debits, Net Cashflow, Closing Balance,
   * Cash vs Bank distribution, and category breakdown.
   */
  async getSummary(query: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
    companyProfileId?: string;
  }) {
    const isSingleBranch = query.branchId && query.branchId !== 'ALL';
    const whereBranch = isSingleBranch ? { id: query.branchId } : {};

    // 1. Fetch branches
    const branches = await prisma.branch.findMany({
      where: { ...whereBranch, isActive: true },
      orderBy: { name: 'asc' },
    });

    const branchIds = branches.map((b) => b.id);

    // 2. Determine date bounds
    let startD: Date | undefined;
    let endD: Date | undefined;

    if (query.date) {
      startD = new Date(query.date);
      endD = new Date(query.date);
    } else if (query.startDate && query.endDate) {
      startD = new Date(query.startDate);
      endD = new Date(query.endDate);
    }

    // 3. Opening balance calculation (Branch base opening balance + all transactions before startD)
    let totalOpeningBalance = branches.reduce((sum, b) => sum + Number(b.openingBalance || 0), 0);

    if (startD) {
      const priorTxs = await prisma.branchTransaction.groupBy({
        by: ['type'],
        where: {
          branchId: { in: branchIds },
          entryDate: { lt: startD },
          deletedAt: null,
        },
        _sum: { amount: true },
      });

      let priorCredits = 0;
      let priorDebits = 0;
      priorTxs.forEach((p) => {
        const amt = Number(p._sum.amount || 0);
        if (p.type === 'CREDIT') priorCredits += amt;
        if (p.type === 'DEBIT') priorDebits += amt;
      });

      totalOpeningBalance += priorCredits - priorDebits;
    }

    // 4. In-period transactions
    const periodWhere: any = {
      branchId: { in: branchIds },
      deletedAt: null,
    };

    if (startD && endD) {
      periodWhere.entryDate = { gte: startD, lte: endD };
    }

    const [inPeriodAggregates, allInPeriodTxs] = await Promise.all([
      prisma.branchTransaction.groupBy({
        by: ['type'],
        where: periodWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.branchTransaction.findMany({
        where: periodWhere,
        select: {
          entryDate: true,
          type: true,
          amount: true,
          category: true,
          paymentMode: true,
          branchId: true,
        },
        orderBy: { entryDate: 'asc' },
      }),
    ]);

    let totalCredits = 0;
    let totalDebits = 0;
    let totalTransactions = 0;

    inPeriodAggregates.forEach((agg) => {
      const amt = Number(agg._sum.amount || 0);
      totalTransactions += agg._count.id;
      if (agg.type === 'CREDIT') totalCredits += amt;
      if (agg.type === 'DEBIT') totalDebits += amt;
    });

    const netCashFlow = totalCredits - totalDebits;
    const closingBalance = totalOpeningBalance + netCashFlow;

    // 5. Payment mode distribution (Cash vs Bank/Digital)
    let cashCredits = 0;
    let cashDebits = 0;
    let bankCredits = 0;
    let bankDebits = 0;

    allInPeriodTxs.forEach((t) => {
      const amt = Number(t.amount);
      const isCash = t.paymentMode === 'CASH';
      if (t.type === 'CREDIT') {
        if (isCash) cashCredits += amt;
        else bankCredits += amt;
      } else {
        if (isCash) cashDebits += amt;
        else bankDebits += amt;
      }
    });

    // 6. Category breakdown for Credits and Debits
    const creditCatMap = new Map<string, number>();
    const debitCatMap = new Map<string, number>();

    allInPeriodTxs.forEach((t) => {
      const amt = Number(t.amount);
      if (t.type === 'CREDIT') {
        creditCatMap.set(t.category, (creditCatMap.get(t.category) || 0) + amt);
      } else {
        debitCatMap.set(t.category, (debitCatMap.get(t.category) || 0) + amt);
      }
    });

    const creditCategories = Array.from(creditCatMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalCredits > 0 ? Math.round((amount / totalCredits) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const debitCategories = Array.from(debitCatMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalDebits > 0 ? Math.round((amount / totalDebits) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 7. Day-by-day timeline for visual bar chart
    const dailyMap = new Map<string, { date: string; credit: number; debit: number }>();
    allInPeriodTxs.forEach((t) => {
      const dStr = t.entryDate.toISOString().slice(0, 10);
      const cur = dailyMap.get(dStr) || { date: dStr, credit: 0, debit: 0 };
      const amt = Number(t.amount);
      if (t.type === 'CREDIT') cur.credit += amt;
      else cur.debit += amt;
      dailyMap.set(dStr, cur);
    });

    const dailyTimeline = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 8. Individual branch breakdowns
    const branchBreakdown = branches.map((b) => {
      const branchTxs = allInPeriodTxs.filter((t) => t.branchId === b.id);
      const bCredits = branchTxs.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + Number(t.amount), 0);
      const bDebits = branchTxs.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + Number(t.amount), 0);
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        city: b.city,
        credits: bCredits,
        debits: bDebits,
        netFlow: bCredits - bDebits,
        currentBalance: Number(b.currentBalance || 0),
      };
    });

    return {
      branchId: isSingleBranch ? query.branchId : 'ALL',
      branchName: isSingleBranch ? branches[0]?.name : 'All Consolidated Branches',
      openingBalance: totalOpeningBalance,
      totalCredits,
      totalDebits,
      netCashFlow,
      closingBalance,
      totalTransactions,
      cashPosition: {
        credits: cashCredits,
        debits: cashDebits,
        net: cashCredits - cashDebits,
      },
      bankPosition: {
        credits: bankCredits,
        debits: bankDebits,
        net: bankCredits - bankDebits,
      },
      creditCategories,
      debitCategories,
      dailyTimeline,
      branchesOverview: branchBreakdown,
    };
  },
};
