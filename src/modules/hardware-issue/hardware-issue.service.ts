import { prisma } from '../../config/database';
import { sequenceService } from '../sequences/sequence.service';
import { pdfService } from '../pdf/pdf.service';
import { auditService } from '../audit/audit.service';
import { memoryCache } from '../../utils/cache';
import { qrService } from '../qr/qr.service';

export const hardwareIssueService = {
  // ─── Master Hardware Catalog ────────────────────────────────────────────────
  async listCatalog(category?: string) {
    const cacheKey = `catalog:hardware:${category || 'all'}`;
    const cached = memoryCache.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = { isActive: true };
    if (category) where.category = category;
    const items = await prisma.hardwareCatalogItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    memoryCache.set(cacheKey, items, 600);
    return items;
  },

  async createCatalogItem(data: {
    name: string;
    category: string;
    defaultSize?: string;
    defaultColor?: string;
    sortOrder?: number;
  }) {
    const existing = await prisma.hardwareCatalogItem.findUnique({ where: { name: data.name.trim() } });
    if (existing) {
      if (!existing.isActive) {
        // Reactivate
        return prisma.hardwareCatalogItem.update({
          where: { id: existing.id },
          data: { isActive: true, category: data.category, defaultSize: data.defaultSize, defaultColor: data.defaultColor },
        });
      }
      throw new Error(`Hardware item "${data.name}" already exists in the catalog.`);
    }

    memoryCache.invalidate('catalog:hardware');
    return prisma.hardwareCatalogItem.create({
      data: {
        name: data.name.trim(),
        category: data.category || 'Cubicle Hardware',
        defaultSize: data.defaultSize || null,
        defaultColor: data.defaultColor || null,
        sortOrder: data.sortOrder || 0,
        isActive: true,
      },
    });
  },

  async updateCatalogItem(id: string, data: Partial<{ name: string; category: string; defaultSize: string; defaultColor: string; sortOrder: number; isActive: boolean }>) {
    memoryCache.invalidate('catalog:hardware');
    return prisma.hardwareCatalogItem.update({
      where: { id },
      data,
    });
  },

  // ─── Hardware Issue Lists ───────────────────────────────────────────────────
  async listIssues(params?: {
    search?: string;
    orderId?: string;
    customerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.orderId) where.orderId = params.orderId;
    if (params?.customerId) where.customerId = params.customerId;
    if (params?.status) where.status = params.status;
    if (params?.search) {
      where.OR = [
        { issueNumber: { contains: params.search, mode: 'insensitive' } },
        { buyerName: { contains: params.search, mode: 'insensitive' } },
        { projectName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.hardwareIssueList.count({ where }),
      prisma.hardwareIssueList.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          customer: true,
          order: { select: { id: true, orderNumber: true } },
          proformaInvoice: { select: { id: true, piNumber: true } },
          items: true,
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getIssueById(id: string) {
    const issue = await prisma.hardwareIssueList.findUnique({
      where: { id },
      include: {
        customer: true,
        order: { include: { items: true } },
        proformaInvoice: true,
        items: {
          include: { catalogItem: true },
          orderBy: { serialNumber: 'asc' },
        },
      },
    });
    if (!issue) throw new Error('Hardware Issue List not found');
    return issue;
  },

  async createIssue(data: any, userId?: string) {
    if (!data.customerId) throw new Error('Customer ID is required');
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('At least one hardware piece item is required');
    }

    // Default company profile
    let companyId = data.companyProfileId;
    if (!companyId) {
      const defaultCompany =
        (await prisma.companyProfile.findFirst({ where: { status: 'ACTIVE' } })) ||
        (await prisma.companyProfile.findFirst());
      if (defaultCompany) {
        companyId = defaultCompany.id;
      } else {
        const created = await prisma.companyProfile.create({
          data: {
            companyName: 'Pacific Products & Solutions',
            legalName: 'Pacific Products & Solutions Pvt Ltd',
            entityCode: 'PPS_IN',
            country: 'India',
            currency: 'INR',
            taxRegime: 'GST',
            state: 'Maharashtra',
            stateCode: '27',
            status: 'ACTIVE',
          },
        });
        companyId = created.id;
      }
    }
    if (!companyId) throw new Error('Company Profile ID is required');

    const customer = await prisma.businessParty.findUnique({
      where: { id: data.customerId },
      include: { addresses: true },
    });
    if (!customer) throw new Error('Customer not found');

    const seq = await sequenceService.getNextDocumentNumber(companyId, 'HARDWARE_ISSUE');
    const issueNumber = seq.number;

    // Process line items & handle custom items
    const itemsData = [];
    let sNo = 1;
    for (const it of data.items) {
      let catalogItemId = it.hardwareCatalogItemId || null;

      // Check if custom item needs promoting to catalog
      if (it.isCustomItem && it.promoteToCatalog && it.description) {
        try {
          const created = await this.createCatalogItem({
            name: it.description,
            category: it.category || 'Accessories',
            defaultSize: it.size,
            defaultColor: it.color,
          });
          catalogItemId = created.id;
        } catch {
          // Ignore if exists
        }
      }

      itemsData.push({
        serialNumber: sNo++,
        hardwareCatalogItemId: catalogItemId,
        description: it.description,
        category: it.category || 'Cubicle Hardware',
        color: it.color || null,
        size: it.size || null,
        quantity: Number(it.quantity) || 1,
        remarks: it.remarks || null,
        isCustomItem: Boolean(it.isCustomItem),
      });
    }

    const issueList = await prisma.hardwareIssueList.create({
      data: {
        issueNumber,
        date: data.date ? new Date(data.date) : new Date(),
        customerId: customer.id,
        orderId: data.orderId || null,
        proformaInvoiceId: data.proformaInvoiceId || null,
        buyerName: data.buyerName || customer.legalName,
        buyerAddress: data.buyerAddress || customer.addresses?.[0]?.addressLine1 || '',
        projectName: data.projectName || 'Site Installation Project',
        status: 'ISSUED',
        storeKeeperName: data.storeKeeperName || 'Store Keeper',
        storeKeeperSignedAt: new Date(),
        createdById: userId || null,
        items: {
          create: itemsData,
        },
      },
      include: { items: true, customer: true, order: true },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'CREATE',
        module: 'Warehouse',
        entityType: 'HardwareIssueList',
        entityId: issueList.id,
        newData: { issueNumber, itemCount: itemsData.length },
      });
    }

    return issueList;
  },

  async signStep(id: string, role: 'storeKeeper' | 'packedBy' | 'checkedBy' | 'incharge', name: string) {
    const updateData: any = {};
    const now = new Date();

    if (role === 'storeKeeper') {
      updateData.storeKeeperName = name;
      updateData.storeKeeperSignedAt = now;
    } else if (role === 'packedBy') {
      updateData.packedByName = name;
      updateData.packedBySignedAt = now;
    } else if (role === 'checkedBy') {
      updateData.checkedByName = name;
      updateData.checkedBySignedAt = now;
    } else if (role === 'incharge') {
      updateData.inchargeName = name;
      updateData.inchargeSignedAt = now;
      updateData.status = 'VERIFIED';
    }

    const updated = await prisma.hardwareIssueList.update({
      where: { id },
      data: updateData,
    });

    return updated;
  },

  async updateIssue(id: string, data: any, userId?: string) {
    const existing = await prisma.hardwareIssueList.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new Error('Hardware Issue List not found');

    const updatePayload: any = {};
    if (data.buyerName !== undefined) updatePayload.buyerName = data.buyerName;
    if (data.buyerAddress !== undefined) updatePayload.buyerAddress = data.buyerAddress;
    if (data.projectName !== undefined) updatePayload.projectName = data.projectName;
    if (data.storeKeeperName !== undefined) updatePayload.storeKeeperName = data.storeKeeperName;
    if (data.packedByName !== undefined) updatePayload.packedByName = data.packedByName;
    if (data.checkedByName !== undefined) updatePayload.checkedByName = data.checkedByName;
    if (data.inchargeName !== undefined) updatePayload.inchargeName = data.inchargeName;
    if (data.status !== undefined) updatePayload.status = data.status;

    if (data.items && Array.isArray(data.items)) {
      await prisma.hardwareIssueListItem.deleteMany({ where: { issueListId: id } });
      const itemsToCreate = data.items.map((it: any, idx: number) => ({
        issueListId: id,
        serialNumber: idx + 1,
        description: it.description || '',
        category: it.category || 'Cubicle Hardware',
        color: it.color || null,
        size: it.size || null,
        quantity: Number(it.quantity) || 1,
        remarks: it.remarks || null,
        isCustomItem: Boolean(it.isCustomItem),
      }));
      await prisma.hardwareIssueListItem.createMany({ data: itemsToCreate });
    }

    const updated = await prisma.hardwareIssueList.update({
      where: { id },
      data: updatePayload,
      include: { items: true, customer: true, order: true },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'UPDATE',
        module: 'Warehouse',
        entityType: 'HardwareIssueList',
        entityId: id,
        newData: data,
      });
    }

    return updated;
  },

  async deleteIssue(id: string, userId?: string) {
    const existing = await prisma.hardwareIssueList.findUnique({ where: { id } });
    if (!existing) throw new Error('Hardware Issue List not found');

    await prisma.hardwareIssueListItem.deleteMany({ where: { issueListId: id } });
    await prisma.hardwareIssueList.delete({ where: { id } });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'DELETE',
        module: 'Warehouse',
        entityType: 'HardwareIssueList',
        entityId: id,
        oldData: { issueNumber: existing.issueNumber },
      });
    }

    return { success: true, message: 'Hardware Issue List deleted successfully' };
  },

  async getPdfHtml(id: string): Promise<string> {
    const issue = await this.getIssueById(id);
    const totalQuantity = issue.items.reduce((sum, it) => sum + Number(it.quantity), 0);

    const qrResult = await qrService.getOrCreateDocumentQr({
      documentType: 'HARDWARE_ISSUE',
      documentId: issue.id,
      documentNumber: issue.issueNumber,
      companyName: 'Pacific Products & Solutions',
      partyName: issue.buyerName || 'Buyer',
      date: issue.date.toISOString(),
      totalAmount: totalQuantity,
      status: issue.status,
    });

    return pdfService.generateHardwareIssuePdfHtml({
      issueNumber: issue.issueNumber,
      date: issue.date.toISOString(),
      buyerName: issue.buyerName,
      buyerAddress: issue.buyerAddress,
      projectName: issue.projectName || undefined,
      linkedOrderNumber: issue.order?.orderNumber,
      items: issue.items.map((it) => ({
        serialNumber: it.serialNumber,
        description: it.description,
        category: it.category,
        color: it.color || undefined,
        size: it.size || undefined,
        quantity: Number(it.quantity),
        remarks: it.remarks || undefined,
      })),
      totalQuantity,
      storeKeeperName: issue.storeKeeperName || undefined,
      storeKeeperSignedAt: issue.storeKeeperSignedAt?.toISOString(),
      packedByName: issue.packedByName || undefined,
      packedBySignedAt: issue.packedBySignedAt?.toISOString(),
      checkedByName: issue.checkedByName || undefined,
      checkedBySignedAt: issue.checkedBySignedAt?.toISOString(),
      inchargeName: issue.inchargeName || undefined,
      inchargeSignedAt: issue.inchargeSignedAt?.toISOString(),
      qrDataUrl: qrResult.qrDataUrl,
    });
  },
};
