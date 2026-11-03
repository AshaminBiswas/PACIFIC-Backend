import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export interface CreateDailySalesPurchaseDto {
  entryDate: string; // YYYY-MM-DD
  type: 'SALES' | 'PURCHASE';
  amount: number;
  taxAmount?: number;
  totalAmount?: number;
  referenceNo?: string;
  partyName?: string;
  customerId?: string;
  vendorId?: string;
  category?: string;
  description?: string;
  paymentMode?: string;
  paymentStatus?: string;
  companyProfileId?: string;
}

export interface UpdateDailySalesPurchaseDto {
  entryDate?: string;
  type?: 'SALES' | 'PURCHASE';
  amount?: number;
  taxAmount?: number;
  totalAmount?: number;
  referenceNo?: string;
  partyName?: string;
  customerId?: string;
  vendorId?: string;
  category?: string;
  description?: string;
  paymentMode?: string;
  paymentStatus?: string;
}

export interface DailySalesPurchaseQueryDto {
  startDate?: string;
  endDate?: string;
  date?: string;
  type?: 'ALL' | 'SALES' | 'PURCHASE';
  customerId?: string;
  vendorId?: string;
  category?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
  companyProfileId?: string;
}

export const dailySalesPurchasesService = {
  /**
   * Helper to safely resolve a valid CustomerProfile.id from either CustomerProfile.id or BusinessParty.id.
   * Auto-provisions CustomerProfile if the BusinessParty exists, preventing foreign key violations.
   */
  async resolveCustomerProfile(idOrPartyId?: string): Promise<{ profileId: string | null; displayName?: string }> {
    if (!idOrPartyId) return { profileId: null };

    // 1. Try finding by CustomerProfile.id
    let profile = await prisma.customerProfile.findUnique({
      where: { id: idOrPartyId },
      include: { party: true },
    });

    // 2. If not found, try finding by partyId
    if (!profile) {
      profile = await prisma.customerProfile.findUnique({
        where: { partyId: idOrPartyId },
        include: { party: true },
      });
    }

    // 3. If still not found, check if BusinessParty exists; if so, upsert CustomerProfile
    if (!profile) {
      const party = await prisma.businessParty.findUnique({
        where: { id: idOrPartyId },
      });
      if (party) {
        try {
          profile = await prisma.customerProfile.upsert({
            where: { partyId: party.id },
            create: {
              partyId: party.id,
              customerType: 'CONTRACTOR',
              status: 'ACTIVE',
            },
            update: {},
            include: { party: true },
          });
        } catch (upsertErr: any) {
          console.warn('[DailySales] Could not upsert CustomerProfile:', upsertErr?.message);
        }
      }
    }

    if (profile) {
      const displayName = profile.party?.tradeName || profile.party?.legalName || undefined;
      return { profileId: profile.id, displayName };
    }

    return { profileId: null };
  },

  /**
   * Helper to safely resolve a valid VendorProfile.id from either VendorProfile.id or BusinessParty.id.
   */
  async resolveVendorProfile(idOrPartyId?: string): Promise<{ profileId: string | null; displayName?: string }> {
    if (!idOrPartyId) return { profileId: null };

    // 1. Try finding by VendorProfile.id
    let profile = await prisma.vendorProfile.findUnique({
      where: { id: idOrPartyId },
      include: { party: true },
    });

    // 2. If not found, try finding by partyId
    if (!profile) {
      profile = await prisma.vendorProfile.findUnique({
        where: { partyId: idOrPartyId },
        include: { party: true },
      });
    }

    // 3. If still not found, check if BusinessParty exists; if so, upsert VendorProfile
    if (!profile) {
      const party = await prisma.businessParty.findUnique({
        where: { id: idOrPartyId },
      });
      if (party) {
        try {
          profile = await prisma.vendorProfile.upsert({
            where: { partyId: party.id },
            create: {
              partyId: party.id,
              vendorType: 'MANUFACTURER',
              status: 'ACTIVE',
            },
            update: {},
            include: { party: true },
          });
        } catch (upsertErr: any) {
          console.warn('[DailyPurchase] Could not upsert VendorProfile:', upsertErr?.message);
        }
      }
    }

    if (profile) {
      const displayName = profile.party?.tradeName || profile.party?.legalName || undefined;
      return { profileId: profile.id, displayName };
    }

    return { profileId: null };
  },

  /**
   * Helper to ensure companyProfileId references a valid record or returns null.
   */
  async resolveCompanyProfile(companyProfileId?: string): Promise<string | null> {
    if (!companyProfileId) return null;
    const comp = await prisma.companyProfile.findUnique({
      where: { id: companyProfileId },
      select: { id: true },
    });
    return comp ? comp.id : null;
  },

  /**
   * Create a manual daily sales or purchase entry.
   * Delinked from PI — binds directly to CustomerProfile (Sales) or VendorProfile (Purchase).
   */
  async createEntry(dto: CreateDailySalesPurchaseDto, userId?: string) {
    if (!dto.entryDate) {
      throw new AppError('ENTRY_DATE_REQUIRED', 'Entry date is required', 400);
    }
    if (!['SALES', 'PURCHASE'].includes(dto.type)) {
      throw new AppError('INVALID_ENTRY_TYPE', "Entry type must be either 'SALES' or 'PURCHASE'", 400);
    }

    const amount = Math.max(0, Number(dto.amount) || 0);
    const taxAmount = Math.max(0, Number(dto.taxAmount) || 0);
    const totalAmount = dto.totalAmount ? Number(dto.totalAmount) : Math.round((amount + taxAmount) * 100) / 100;

    if (totalAmount <= 0 && amount <= 0) {
      throw new AppError('INVALID_AMOUNT', 'Total amount must be greater than zero', 400);
    }

    // Resolve party display name and safe relation IDs
    let resolvedPartyName = dto.partyName?.trim() || '';
    let resolvedCustomerId: string | null = null;
    let resolvedVendorId: string | null = null;

    if (dto.type === 'SALES' && dto.customerId) {
      const custRes = await this.resolveCustomerProfile(dto.customerId);
      resolvedCustomerId = custRes.profileId;
      if (!resolvedPartyName && custRes.displayName) {
        resolvedPartyName = custRes.displayName;
      }
    } else if (dto.type === 'PURCHASE' && dto.vendorId) {
      const vendRes = await this.resolveVendorProfile(dto.vendorId);
      resolvedVendorId = vendRes.profileId;
      if (!resolvedPartyName && vendRes.displayName) {
        resolvedPartyName = vendRes.displayName;
      }
    }

    if (!resolvedPartyName) {
      resolvedPartyName = dto.type === 'SALES' ? 'Direct Customer' : 'Direct Supplier';
    }

    const resolvedCompanyProfileId = await this.resolveCompanyProfile(dto.companyProfileId);

    const entry = await prisma.dailySalesPurchase.create({
      data: {
        entryDate: new Date(dto.entryDate),
        type: dto.type,
        amount,
        taxAmount,
        totalAmount,
        referenceNo: dto.referenceNo?.trim() || null,
        partyName: resolvedPartyName,
        customerId: dto.type === 'SALES' ? resolvedCustomerId : null,
        vendorId: dto.type === 'PURCHASE' ? resolvedVendorId : null,
        category: dto.category || 'General',
        description: dto.description || null,
        paymentMode: dto.paymentMode || 'CASH',
        paymentStatus: dto.paymentStatus || 'PAID',
        companyProfileId: resolvedCompanyProfileId,
        createdBy: userId || null,
      },
      include: {
        customer: { include: { party: true } },
        vendor: { include: { party: true } },
      },
    });

    return entry;
  },

  /**
   * List daily entries with flexible filtering, pagination, and multi-tenant security.
   */
  async getEntries(query: DailySalesPurchaseQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.type && query.type !== 'ALL') {
      where.type = query.type;
    }

    // Date filtering: single date OR start/end range
    if (query.date) {
      where.entryDate = new Date(query.date);
    } else if (query.startDate && query.endDate) {
      where.entryDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    } else if (query.startDate) {
      where.entryDate = { gte: new Date(query.startDate) };
    } else if (query.endDate) {
      where.entryDate = { lte: new Date(query.endDate) };
    }

    if (query.customerId) {
      const custRes = await this.resolveCustomerProfile(query.customerId);
      where.customerId = custRes.profileId || query.customerId;
    }
    if (query.vendorId) {
      const vendRes = await this.resolveVendorProfile(query.vendorId);
      where.vendorId = vendRes.profileId || query.vendorId;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.companyProfileId) {
      where.companyProfileId = query.companyProfileId;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { partyName: { contains: term, mode: 'insensitive' } },
        { referenceNo: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.dailySalesPurchase.count({ where }),
      prisma.dailySalesPurchase.findMany({
        where,
        include: {
          customer: { include: { party: true } },
          vendor: { include: { party: true } },
        },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Aggregate Daily Sales & Purchase metrics for any reporting period.
   */
  async getSummary(query: {
    startDate?: string;
    endDate?: string;
    date?: string;
    companyProfileId?: string;
  }) {
    const where: any = {
      deletedAt: null,
    };

    if (query.date) {
      where.entryDate = new Date(query.date);
    } else if (query.startDate && query.endDate) {
      where.entryDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }
    if (query.companyProfileId) {
      where.companyProfileId = query.companyProfileId;
    }

    const [salesAgg, purchaseAgg, allEntries] = await Promise.all([
      prisma.dailySalesPurchase.aggregate({
        where: { ...where, type: 'SALES' },
        _sum: { totalAmount: true, amount: true, taxAmount: true },
        _count: { id: true },
      }),
      prisma.dailySalesPurchase.aggregate({
        where: { ...where, type: 'PURCHASE' },
        _sum: { totalAmount: true, amount: true, taxAmount: true },
        _count: { id: true },
      }),
      prisma.dailySalesPurchase.findMany({
        where,
        select: {
          id: true,
          entryDate: true,
          type: true,
          totalAmount: true,
          category: true,
          partyName: true,
          customerId: true,
          vendorId: true,
          paymentStatus: true,
        },
        take: 2000,
      }),
    ]);

    const totalSales = Number(salesAgg._sum?.totalAmount || 0);
    const totalPurchases = Number(purchaseAgg._sum?.totalAmount || 0);
    const grossProfit = totalSales - totalPurchases;
    const marginPct = totalSales > 0 ? Math.round((grossProfit / totalSales) * 1000) / 10 : 0;

    // Daily breakdown map
    const dailyMap = new Map<string, { date: string; sales: number; purchases: number; netProfit: number }>();

    allEntries.forEach((e) => {
      const dStr = new Date(e.entryDate).toISOString().slice(0, 10);
      const cur = dailyMap.get(dStr) || { date: dStr, sales: 0, purchases: 0, netProfit: 0 };
      const amt = Number(e.totalAmount || 0);
      if (e.type === 'SALES') {
        cur.sales += amt;
      } else {
        cur.purchases += amt;
      }
      cur.netProfit = cur.sales - cur.purchases;
      dailyMap.set(dStr, cur);
    });

    const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Category breakdown for sales
    const catMap = new Map<string, number>();
    allEntries
      .filter((e) => e.type === 'SALES')
      .forEach((e) => {
        const cat = e.category || 'General';
        catMap.set(cat, (catMap.get(cat) || 0) + Number(e.totalAmount || 0));
      });

    const categoryBreakdown = Array.from(catMap.entries()).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalSales > 0 ? Math.round((amount / totalSales) * 100) : 0,
    }));

    return {
      totalSales,
      salesCount: salesAgg._count.id || 0,
      totalPurchases,
      purchaseCount: purchaseAgg._count.id || 0,
      grossProfit,
      marginPct,
      dailyBreakdown,
      categoryBreakdown,
    };
  },

  /**
   * Get single entry by ID.
   */
  async getEntryById(id: string) {
    const entry = await prisma.dailySalesPurchase.findUnique({
      where: { id },
      include: {
        customer: { include: { party: true } },
        vendor: { include: { party: true } },
      },
    });
    if (!entry || entry.deletedAt) {
      throw new Error('Daily sales/purchase entry not found');
    }
    return entry;
  },

  /**
   * Update an entry.
   */
  async updateEntry(id: string, dto: UpdateDailySalesPurchaseDto) {
    const existing = await prisma.dailySalesPurchase.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt) {
      throw new Error('Entry not found');
    }

    const updateData: any = {};
    if (dto.entryDate) updateData.entryDate = new Date(dto.entryDate);
    if (dto.type) updateData.type = dto.type;
    if (dto.amount !== undefined) updateData.amount = Number(dto.amount);
    if (dto.taxAmount !== undefined) updateData.taxAmount = Number(dto.taxAmount);
    if (dto.totalAmount !== undefined) {
      updateData.totalAmount = Number(dto.totalAmount);
    } else if (dto.amount !== undefined || dto.taxAmount !== undefined) {
      const a = dto.amount !== undefined ? Number(dto.amount) : Number(existing.amount);
      const t = dto.taxAmount !== undefined ? Number(dto.taxAmount) : Number(existing.taxAmount);
      updateData.totalAmount = a + t;
    }

    if (dto.referenceNo !== undefined) updateData.referenceNo = dto.referenceNo || null;
    if (dto.category !== undefined) updateData.category = dto.category || null;
    if (dto.description !== undefined) updateData.description = dto.description || null;
    if (dto.paymentMode !== undefined) updateData.paymentMode = dto.paymentMode;
    if (dto.paymentStatus !== undefined) updateData.paymentStatus = dto.paymentStatus;

    if (dto.partyName !== undefined) updateData.partyName = dto.partyName;
    if (dto.customerId !== undefined) {
      if (dto.customerId) {
        const custRes = await this.resolveCustomerProfile(dto.customerId);
        updateData.customerId = custRes.profileId;
        if (custRes.displayName && !dto.partyName) {
          updateData.partyName = custRes.displayName;
        }
      } else {
        updateData.customerId = null;
      }
    }
    if (dto.vendorId !== undefined) {
      if (dto.vendorId) {
        const vendRes = await this.resolveVendorProfile(dto.vendorId);
        updateData.vendorId = vendRes.profileId;
        if (vendRes.displayName && !dto.partyName) {
          updateData.partyName = vendRes.displayName;
        }
      } else {
        updateData.vendorId = null;
      }
    }

    const updated = await prisma.dailySalesPurchase.update({
      where: { id },
      data: updateData,
      include: {
        customer: { include: { party: true } },
        vendor: { include: { party: true } },
      },
    });

    return updated;
  },

  /**
   * Soft-delete an entry.
   */
  async deleteEntry(id: string) {
    const entry = await prisma.dailySalesPurchase.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return entry;
  },
};
