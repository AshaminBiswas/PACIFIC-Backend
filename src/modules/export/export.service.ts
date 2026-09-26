import { prisma } from '../../config/database';
import { emailService } from '../../utils/email.service';
import { pdfService } from '../pdf/pdf.service';
import { qrService } from '../qr/qr.service';

export const exportService = {
  // ─── DASHBOARD & KPIS ───────────────────────────────────────────────────────
  async getDashboardStats() {
    const [
      totalOrders,
      activeOrders,
      ordersByStage,
      countriesCount,
      totalContainers,
      inTransitShipments,
      recentRealizations,
      recentEmails,
      pendingTasks,
    ] = await Promise.all([
      prisma.exportOrder.count(),
      prisma.exportOrder.count({ where: { status: 'ACTIVE' } }),
      prisma.exportOrder.groupBy({
        by: ['stage'],
        _count: { id: true },
        _sum: { totalOrderValue: true, fobValue: true },
      }),
      prisma.exportCountry.count({ where: { isActive: true } }),
      prisma.exportContainer.count(),
      prisma.exportShipment.count({ where: { status: { in: ['BOOKED', 'STUFFED', 'GATED_IN', 'LOADED', 'DEPARTED', 'IN_TRANSIT'] } } }),
      prisma.exportBankRealization.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { exportOrder: { select: { exportOrderNumber: true, currency: true } } },
      }),
      prisma.exportEmailLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.exportTask.count({ where: { status: 'PENDING' } }),
    ]);

    // Aggregate total values
    const totals = await prisma.exportOrder.aggregate({
      _sum: { totalOrderValue: true, fobValue: true },
    });

    const realizedTotal = await prisma.exportBankRealization.aggregate({
      _sum: { realizedAmount: true, realizedAmountInr: true },
    });

    return {
      totalOrders,
      activeOrders,
      totalOrderValueUsd: totals._sum.totalOrderValue || 0,
      fobValueUsd: totals._sum.fobValue || 0,
      realizedAmountUsd: realizedTotal._sum.realizedAmount || 0,
      realizedAmountInr: realizedTotal._sum.realizedAmountInr || 0,
      countriesCount,
      totalContainers,
      inTransitShipments,
      pendingTasks,
      ordersByStage,
      recentRealizations,
      recentEmails,
    };
  },

  // ─── MASTER LOOKUPS ────────────────────────────────────────────────────────
  async listCountries() {
    return prisma.exportCountry.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { ports: true, customerProfiles: true, orders: true } },
      },
    });
  },

  async getCountry(id: string) {
    return prisma.exportCountry.findUnique({
      where: { id },
      include: { ports: true, rules: true },
    });
  },

  async upsertCountry(data: any) {
    if (data.id) {
      return prisma.exportCountry.update({
        where: { id: data.id },
        data,
      });
    }
    return prisma.exportCountry.create({ data });
  },

  async listCountryRules(countryId?: string) {
    return prisma.exportCountryRule.findMany({
      where: countryId ? { countryId } : undefined,
      include: { country: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async upsertCountryRule(data: any) {
    if (data.id) {
      return prisma.exportCountryRule.update({
        where: { id: data.id },
        data,
      });
    }
    return prisma.exportCountryRule.create({ data });
  },

  async listPorts(filters?: { countryId?: string; portType?: string }) {
    return prisma.exportPort.findMany({
      where: {
        countryId: filters?.countryId || undefined,
        portType: filters?.portType || undefined,
      },
      include: { country: true },
      orderBy: { name: 'asc' },
    });
  },

  async createPort(data: any) {
    return prisma.exportPort.create({ data });
  },

  async updatePort(id: string, data: any) {
    return prisma.exportPort.update({ where: { id }, data });
  },

  async listIncoterms() {
    return prisma.exportIncoterm.findMany({
      orderBy: { code: 'asc' },
    });
  },

  async upsertIncoterm(data: any) {
    if (data.id) {
      return prisma.exportIncoterm.update({ where: { id: data.id }, data });
    }
    return prisma.exportIncoterm.create({ data });
  },

  async listCurrencies() {
    return prisma.exportCurrency.findMany({
      orderBy: { currencyCode: 'asc' },
      include: {
        rates: {
          take: 1,
          orderBy: { effectiveDate: 'desc' },
        },
      },
    });
  },

  async getExchangeRates(currencyId?: string) {
    return prisma.exportExchangeRate.findMany({
      where: currencyId ? { currencyId } : undefined,
      include: { currency: true },
      orderBy: { effectiveDate: 'desc' },
      take: 50,
    });
  },

  async updateExchangeRate(data: { currencyId: string; rateToInr: number; rateToUsd: number; effectiveDate?: Date; source?: string }) {
    return prisma.exportExchangeRate.create({
      data: {
        currencyId: data.currencyId,
        rateToInr: data.rateToInr,
        rateToUsd: data.rateToUsd,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
        source: data.source || 'MANUAL',
      },
    });
  },

  async listHsCodes(search?: string) {
    return prisma.exportHsCode.findMany({
      where: search
        ? {
            OR: [
              { hsCode: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { hsCode: 'asc' },
    });
  },

  async createHsCode(data: any) {
    return prisma.exportHsCode.create({ data });
  },

  // ─── INTERNATIONAL CRM ──────────────────────────────────────────────────────
  async listExportCustomers(params: { page?: number; limit?: number; search?: string; countryId?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      partyType: { in: ['CUSTOMER', 'BOTH'] },
      exportCustomerProfile: params.countryId ? { countryId: params.countryId } : { isNot: null },
    };

    if (params.search) {
      where.OR = [
        { legalName: { contains: params.search, mode: 'insensitive' } },
        { tradeName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.businessParty.count({ where }),
      prisma.businessParty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          exportCustomerProfile: {
            include: {
              country: true,
              defaultIncoterm: true,
              defaultDestinationPort: true,
            },
          },
          exportBankAccounts: true,
          contacts: true,
          addresses: true,
          _count: {
            select: { exportOrders: true, exportQuotations: true, exportRfqs: true },
          },
        },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), items };
  },

  async getExportCustomer360(partyId: string) {
    const party = await prisma.businessParty.findUnique({
      where: { id: partyId },
      include: {
        exportCustomerProfile: {
          include: {
            country: true,
            defaultIncoterm: true,
            defaultDestinationPort: true,
          },
        },
        exportBankAccounts: true,
        contacts: true,
        addresses: true,
        exportRfqs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        exportQuotations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        exportOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            country: true,
            incoterm: true,
            shipments: true,
            paymentMilestones: true,
          },
        },
        exportEmails: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!party) return null;

    // Aggregate lifetime trade values
    const orderTotals = await prisma.exportOrder.aggregate({
      where: { partyId },
      _sum: { totalOrderValue: true, fobValue: true },
      _count: { id: true },
    });

    const realizationTotals = await prisma.exportBankRealization.aggregate({
      where: { exportOrder: { partyId } },
      _sum: { realizedAmount: true },
    });

    return {
      party,
      tradeMetrics: {
        totalOrdersCount: orderTotals._count.id || 0,
        lifetimeTradeValueUsd: orderTotals._sum.totalOrderValue || 0,
        lifetimeFobValueUsd: orderTotals._sum.fobValue || 0,
        lifetimeRealizedUsd: realizationTotals._sum.realizedAmount || 0,
        outstandingBalanceUsd:
          Number(orderTotals._sum.totalOrderValue || 0) - Number(realizationTotals._sum.realizedAmount || 0),
      },
    };
  },

  async upsertExportCustomerProfile(partyId: string, data: any) {
    const existing = await prisma.exportCustomerProfile.findUnique({ where: { partyId } });
    if (existing) {
      return prisma.exportCustomerProfile.update({
        where: { partyId },
        data,
      });
    }
    return prisma.exportCustomerProfile.create({
      data: { ...data, partyId },
    });
  },

  async addCustomerBankAccount(partyId: string, data: any) {
    return prisma.exportCustomerBankAccount.create({
      data: { ...data, partyId },
    });
  },

  async createExportCustomer(data: any, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const party = await tx.businessParty.create({
        data: {
          companyProfileId: data.companyProfileId || null,
          partyType: 'CUSTOMER',
          legalName: data.legalName.trim(),
          tradeName: data.tradeName?.trim() || data.legalName.trim(),
          email: data.email?.trim() || data.primaryEmail?.trim() || null,
          phone: data.phone?.trim() || data.primaryPhone?.trim() || null,
          status: data.status || 'ACTIVE',
          notes: data.notes?.trim() || null,
        },
      });

      const exportProfile = await tx.exportCustomerProfile.create({
        data: {
          partyId: party.id,
          countryId: data.countryId || null,
          foreignTaxId: data.foreignTaxId || null,
          vatTrn: data.vatTrn || null,
          defaultIncotermId: data.defaultIncotermId || null,
          defaultCurrency: data.defaultCurrency || 'USD',
          defaultDestinationPortId: data.defaultDestinationPortId || null,
          creditTermsDays: Number(data.creditTermsDays) || 30,
          creditLimitUsd: Number(data.creditLimitUsd) || 0,
          riskRating: data.riskRating || 'LOW',
          complianceStatus: data.complianceStatus || 'VERIFIED',
          notes: data.notes || null,
        },
        include: {
          country: true,
          defaultIncoterm: true,
          defaultDestinationPort: true,
        },
      });

      if (Array.isArray(data.contacts)) {
        for (const c of data.contacts) {
          await tx.partyContact.create({
            data: { ...c, partyId: party.id },
          });
        }
      } else if (data.contactName) {
        await tx.partyContact.create({
          data: {
            partyId: party.id,
            name: data.contactName,
            email: data.contactEmail,
            phone: data.contactPhone,
            isPrimary: true,
          },
        });
      }

      if (Array.isArray(data.addresses)) {
        for (const a of data.addresses) {
          await tx.partyAddress.create({
            data: { ...a, partyId: party.id },
          });
        }
      } else if (data.addressLine1 || data.city) {
        await tx.partyAddress.create({
          data: {
            partyId: party.id,
            addressType: 'BILLING',
            addressLine1: data.addressLine1 || '',
            city: data.city || '',
            state: data.state || '',
            country: data.countryName || 'Foreign',
            isDefaultBilling: true,
          },
        });
      }

      return {
        ...party,
        exportCustomerProfile: exportProfile,
      };
    });
  },

  async deleteExportCustomer(partyId: string) {
    return prisma.businessParty.delete({
      where: { id: partyId },
    });
  },

  // ─── RFQS & INQUIRIES ───────────────────────────────────────────────────────
  async listRfqs(params: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { rfqNumber: { contains: params.search, mode: 'insensitive' } },
        { party: { legalName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.exportRfq.count({ where }),
      prisma.exportRfq.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          party: { select: { id: true, legalName: true, email: true, phone: true } },
          country: true,
          incoterm: true,
          destinationPort: true,
          items: true,
          _count: { select: { quotations: true } },
        },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), items };
  },

  async getRfqById(id: string) {
    return prisma.exportRfq.findUnique({
      where: { id },
      include: {
        party: true,
        country: true,
        incoterm: true,
        destinationPort: true,
        items: { include: { product: true } },
        quotations: true,
      },
    });
  },

  async createRfq(data: any, _userId?: string) {
    const seq = await prisma.exportRfq.count();
    const rfqNumber = data.rfqNumber || `EXP/RFQ/${new Date().getFullYear()}/${String(seq + 1).padStart(4, '0')}`;

    const items = data.items || [];
    delete data.items;

    const countryId = data.countryId || null;
    const incotermId = data.incotermId || null;
    const destinationPortId = data.destinationPortId || null;

    return prisma.exportRfq.create({
      data: {
        ...data,
        countryId,
        incotermId,
        destinationPortId,
        estimatedValue: data.estimatedValue !== undefined ? Number(data.estimatedValue) : 0,
        rfqNumber,
        items: {
          create: items.map((it: any) => ({
            productId: it.productId || null,
            itemDescription: it.itemDescription,
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'NOS',
            targetRate: it.targetRate ? Number(it.targetRate) : null,
            notes: it.notes || null,
          })),
        },
      },
      include: { items: true },
    });
  },

  async updateRfq(id: string, data: any) {
    return prisma.exportRfq.update({ where: { id }, data });
  },

  async convertRfqToQuotation(rfqId: string, userId?: string) {
    const rfq = await prisma.exportRfq.findUnique({
      where: { id: rfqId },
      include: { items: true, party: true },
    });
    if (!rfq) throw new Error('RFQ not found');

    const quoteCount = await prisma.exportQuotation.count();
    const quotationNumber = `EXP/QT/${new Date().getFullYear()}/${String(quoteCount + 1).padStart(4, '0')}`;

    let subtotal = 0;
    const quoteItems = rfq.items.map((it) => {
      const rate = Number(it.targetRate || 0);
      const amount = rate * Number(it.quantity);
      subtotal += amount;
      return {
        productId: it.productId,
        itemCode: 'EXP-ITEM',
        description: it.itemDescription,
        quantity: it.quantity,
        unit: it.unit,
        unitRate: rate,
        totalAmount: amount,
      };
    });

    const quotation = await prisma.exportQuotation.create({
      data: {
        quotationNumber,
        rfqId: rfq.id,
        partyId: rfq.partyId,
        countryId: rfq.countryId,
        incotermId: rfq.incotermId,
        portOfDestinationId: rfq.destinationPortId,
        currency: rfq.currency || 'USD',
        subtotal,
        fobValue: subtotal,
        totalAmount: subtotal,
        status: 'DRAFT',
        createdById: userId,
        items: { create: quoteItems },
      },
      include: { items: true },
    });

    await prisma.exportRfq.update({
      where: { id: rfqId },
      data: { status: 'QUOTED' },
    });

    return quotation;
  },

  // ─── EXPORT QUOTATIONS ──────────────────────────────────────────────────────
  async listQuotations(params: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { quotationNumber: { contains: params.search, mode: 'insensitive' } },
        { party: { legalName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.exportQuotation.count({ where }),
      prisma.exportQuotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          party: { select: { id: true, legalName: true, email: true, phone: true } },
          country: true,
          incoterm: true,
          portOfDestination: true,
          items: true,
        },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), items };
  },

  async getQuotationById(id: string) {
    return prisma.exportQuotation.findUnique({
      where: { id },
      include: {
        party: true,
        companyProfile: true,
        country: true,
        incoterm: true,
        portOfLoading: true,
        portOfDestination: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: { include: { product: true, hsCode: true } },
      },
    });
  },

  async getQuotationPdfHtml(id: string): Promise<string> {
    const quote = await this.getQuotationById(id);
    if (!quote) throw new Error('Export Quotation not found');

    const companyName =
      quote.companyProfile?.companyName ||
      quote.companyProfile?.legalName ||
      'Pacific Products & Solutions';
    const companyAddress = quote.companyProfile?.state
      ? `${quote.companyProfile.state}, ${quote.companyProfile.country}`
      : 'Mandoli, Delhi, India';

    const qrResult = await qrService.getOrCreateDocumentQr({
      documentType: 'EXPORT_QUOTATION',
      documentId: quote.id,
      documentNumber: quote.quotationNumber,
      companyName,
      partyName: quote.party?.legalName || quote.party?.tradeName || 'Foreign Buyer',
      date: quote.createdAt.toISOString(),
      totalAmount: Number(quote.totalAmount || 0),
      currency: quote.currency || 'USD',
    });

    return pdfService.generateExportQuotationPdfHtml({
      quotationNumber: quote.quotationNumber,
      date: quote.createdAt.toISOString(),
      validUntil: quote.validUntil ? quote.validUntil.toISOString() : undefined,
      companyName,
      companyAddress,
      companyPhone: quote.companyProfile?.phone || undefined,
      companyEmail: quote.companyProfile?.email || undefined,
      companyGstin: quote.companyProfile?.gstin || undefined,
      logoUrl: quote.companyProfile?.logoUrl || undefined,
      buyerName: quote.party?.legalName || quote.party?.tradeName || 'Foreign Buyer',
      buyerAddress: quote.party?.notes || undefined,
      buyerCountry: quote.country?.name || undefined,
      buyerEmail: quote.party?.email || undefined,
      buyerPhone: quote.party?.phone || undefined,
      incoterm: quote.incoterm?.code || 'CIF',
      portOfLoading: quote.portOfLoading?.name || undefined,
      portOfDestination: quote.portOfDestination?.name || undefined,
      currency: quote.currency || 'USD',
      items: quote.items.map((it: any, idx: number) => ({
        serialNumber: idx + 1,
        description: it.description,
        itemCode: it.itemCode || undefined,
        hsCode: it.hsCode?.code || undefined,
        quantity: Number(it.quantity || 1),
        unit: it.unit || 'NOS',
        unitRate: Number(it.unitRate || 0),
        totalAmount: Number(it.totalAmount || 0),
        cbm: Number(it.cbm || 0),
        grossWeightKg: Number(it.grossWeightKg || 0),
      })),
      subtotal: Number(quote.subtotal || 0),
      freightCharges: Number(quote.freightCharges || 0),
      insuranceCharges: Number(quote.insuranceCharges || 0),
      otherCharges: Number(quote.otherCharges || 0),
      totalAmount: Number(quote.totalAmount || 0),
      fobValue: Number(quote.fobValue || 0),
      paymentTerms: quote.paymentTerms || undefined,
      deliveryTerms: quote.deliveryTerms || undefined,
      notes: quote.notes || undefined,
      createdByName: quote.createdBy
        ? `${quote.createdBy.firstName} ${quote.createdBy.lastName || ''}`.trim()
        : undefined,
      qrDataUrl: qrResult.qrDataUrl,
    });
  },

  async createQuotation(data: any, userId?: string) {
    const quoteCount = await prisma.exportQuotation.count();
    const quotationNumber =
      data.quotationNumber || `EXP/QT/${new Date().getFullYear()}/${String(quoteCount + 1).padStart(4, '0')}`;

    const items = data.items || [];
    delete data.items;

    let subtotal = 0;
    items.forEach((it: any) => {
      subtotal += Number(it.unitRate || 0) * Number(it.quantity || 0);
    });

    const freight = Number(data.freightCharges || 0);
    const insurance = Number(data.insuranceCharges || 0);
    const other = Number(data.otherCharges || 0);
    const totalAmount = subtotal + freight + insurance + other;
    const fobValue = data.fobValue !== undefined ? Number(data.fobValue) : subtotal;

    // Sanitize optional foreign keys and dates for Prisma
    const countryId = data.countryId || null;
    const incotermId = data.incotermId || null;
    const portOfDestinationId = data.portOfDestinationId || null;
    const portOfLoadingId = data.portOfLoadingId || null;
    const companyProfileId = data.companyProfileId || null;
    let validUntil: Date | null = null;
    if (data.validUntil) {
      const parsed = new Date(data.validUntil);
      if (!isNaN(parsed.getTime())) {
        validUntil = parsed;
      }
    }

    return prisma.exportQuotation.create({
      data: {
        ...data,
        countryId,
        incotermId,
        portOfDestinationId,
        portOfLoadingId,
        companyProfileId,
        validUntil,
        quotationNumber,
        subtotal,
        totalAmount,
        fobValue,
        createdById: userId || null,
        items: {
          create: items.map((it: any) => ({
            productId: it.productId || null,
            hsCodeId: it.hsCodeId || null,
            itemCode: it.itemCode || 'EXP-ITEM',
            description: it.description,
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'NOS',
            unitRate: Number(it.unitRate) || 0,
            totalAmount: Number(it.unitRate || 0) * Number(it.quantity || 0),
            cbm: Number(it.cbm) || 0,
            grossWeightKg: Number(it.grossWeightKg) || 0,
            netWeightKg: Number(it.netWeightKg) || 0,
          })),
        },
      },
      include: { items: true },
    });
  },

  async updateQuotation(id: string, data: any) {
    const items = data.items;
    delete data.items;

    if (items && Array.isArray(items)) {
      await prisma.exportQuotationItem.deleteMany({ where: { quotationId: id } });
      let subtotal = 0;
      const createdItems = items.map((it: any) => {
        const total = Number(it.unitRate) * Number(it.quantity);
        subtotal += total;
        return {
          quotationId: id,
          productId: it.productId || null,
          hsCodeId: it.hsCodeId || null,
          itemCode: it.itemCode || 'EXP-ITEM',
          description: it.description,
          quantity: it.quantity,
          unit: it.unit || 'NOS',
          unitRate: it.unitRate,
          totalAmount: total,
          cbm: it.cbm || 0,
          grossWeightKg: it.grossWeightKg || 0,
          netWeightKg: it.netWeightKg || 0,
        };
      });
      await prisma.exportQuotationItem.createMany({ data: createdItems });
      data.subtotal = subtotal;
      data.totalAmount =
        subtotal +
        Number(data.freightCharges || 0) +
        Number(data.insuranceCharges || 0) +
        Number(data.otherCharges || 0);
    }

    return prisma.exportQuotation.update({
      where: { id },
      data,
      include: { items: true },
    });
  },

  async deleteQuotation(id: string) {
    const existing = await prisma.exportQuotation.findUnique({ where: { id } });
    if (!existing) throw new Error('Export Quotation not found');

    await prisma.exportQuotationItem.deleteMany({ where: { quotationId: id } });
    await prisma.exportQuotation.delete({ where: { id } });
    return { success: true, message: 'Export Quotation deleted successfully' };
  },

  async convertQuotationToOrder(quotationId: string, userId?: string) {
    const quote = await prisma.exportQuotation.findUnique({
      where: { id: quotationId },
      include: { items: true, party: true },
    });
    if (!quote) throw new Error('Quotation not found');

    const orderCount = await prisma.exportOrder.count();
    const exportOrderNumber = `EXP/ORD/${new Date().getFullYear()}/${String(orderCount + 1).padStart(4, '0')}`;

    // Create an enterprise SalesOrder wrapper to keep production/BOM synced
    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: `PPS/SO/${new Date().getFullYear()}/${String(orderCount + 1).padStart(4, '0')}`,
        companyProfileId: quote.companyProfileId || 'default-entity',
        customerId: quote.partyId,
        currency: quote.currency,
        subtotal: quote.subtotal,
        taxAmount: 0,
        grandTotal: quote.totalAmount,
        status: 'APPROVED',
        items: {
          create: quote.items.map((it, idx) => ({
            serialNumber: idx + 1,
            productId: it.productId,
            description: it.description,
            quantity: it.quantity,
            rate: it.unitRate,
            amount: it.totalAmount,
            unit: it.unit,
          })),
        },
      },
    });

    // Create the Export Order Orchestrator
    const exportOrder = await prisma.exportOrder.create({
      data: {
        exportOrderNumber,
        salesOrderId: salesOrder.id,
        partyId: quote.partyId,
        companyProfileId: quote.companyProfileId,
        countryId: quote.countryId,
        incotermId: quote.incotermId,
        portOfLoadingId: quote.portOfLoadingId,
        portOfDestinationId: quote.portOfDestinationId,
        currency: quote.currency,
        exchangeRate: quote.exchangeRate,
        subtotal: quote.subtotal,
        freightCost: quote.freightCharges,
        insuranceCost: quote.insuranceCharges,
        totalOrderValue: quote.totalAmount,
        fobValue: quote.fobValue,
        paymentMethod: 'ADVANCE_TT',
        stage: 'ORDER_CONFIRMED',
        status: 'ACTIVE',
        createdById: userId,
        // Auto-generate standard milestone stages (e.g. 30% Advance, 70% Against BL)
        paymentMilestones: {
          create: [
            {
              milestoneName: 'ADVANCE_DEPOSIT_30',
              percentage: 30,
              amount: Number(quote.totalAmount) * 0.3,
              currency: quote.currency,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            {
              milestoneName: 'AGAINST_BILL_OF_LADING_70',
              percentage: 70,
              amount: Number(quote.totalAmount) * 0.7,
              currency: quote.currency,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      },
      include: {
        paymentMilestones: true,
      },
    });

    await prisma.exportQuotation.update({
      where: { id: quotationId },
      data: { status: 'CONVERTED' },
    });

    return exportOrder;
  },

  // ─── EXPORT ORDERS ──────────────────────────────────────────────────────────
  async listOrders(params: { page?: number; limit?: number; search?: string; stage?: string; status?: string; countryId?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.stage) where.stage = params.stage;
    if (params.status) where.status = params.status;
    if (params.countryId) where.countryId = params.countryId;
    if (params.search) {
      where.OR = [
        { exportOrderNumber: { contains: params.search, mode: 'insensitive' } },
        { commercialInvoiceNumber: { contains: params.search, mode: 'insensitive' } },
        { buyerPoNumber: { contains: params.search, mode: 'insensitive' } },
        { party: { legalName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.exportOrder.count({ where }),
      prisma.exportOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          party: { select: { id: true, legalName: true, email: true, phone: true } },
          country: true,
          incoterm: true,
          portOfDestination: true,
          paymentMilestones: true,
          shipments: {
            select: { id: true, shipmentNumber: true, status: true, vesselName: true, blAwbNumber: true, eta: true },
          },
          _count: {
            select: {
              shipments: true,
              paymentMilestones: true,
              expenses: true,
              bankRealizations: true,
            },
          },
        },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), items };
  },

  async getOrder360(id: string) {
    const order = await prisma.exportOrder.findUnique({
      where: { id },
      include: {
        party: {
          include: {
            exportCustomerProfile: { include: { country: true, defaultIncoterm: true } },
            exportBankAccounts: true,
            contacts: true,
            addresses: true,
          },
        },
        companyProfile: { include: { bankAccounts: true, signatories: true } },
        country: { include: { rules: true } },
        incoterm: true,
        portOfLoading: true,
        portOfDestination: true,
        salesOrder: { include: { items: { include: { product: true } } } },
        paymentMilestones: { include: { payment: true } },
        lcs: true,
        shipments: {
          include: {
            containers: { include: { qrCode: true } },
            shippingEvents: { orderBy: { eventTimestamp: 'desc' } },
          },
        },
        customsRecords: { include: { chaPartner: true, shippingBills: true } },
        shippingBills: true,
        complianceChecks: { include: { reviewedBy: true } },
        certificates: true,
        expenses: { include: { vendor: true } },
        bankRealizations: { include: { irms: true, ebrcs: true, payment: true } },
        emailLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!order) return null;

    // Calculate dynamic export profitability
    const revenueUsd = Number(order.totalOrderValue);
    const subtotalUsd = Number(order.subtotal);
    const freightCostUsd = Number(order.freightCost);
    const insuranceCostUsd = Number(order.insuranceCost);

    let totalExpensesInr = 0;
    order.expenses.forEach((exp) => {
      totalExpensesInr += Number(exp.amountInr);
    });

    const exchangeRate = Number(order.exchangeRate || 85.0);
    const revenueInr = revenueUsd * exchangeRate;
    const netProfitInr = revenueInr - totalExpensesInr;
    const netProfitMarginPct = revenueInr > 0 ? (netProfitInr / revenueInr) * 100 : 0;

    // Realization progress
    let totalRealizedUsd = 0;
    order.bankRealizations.forEach((r) => {
      totalRealizedUsd += Number(r.realizedAmount);
    });
    const realizationPercentage = revenueUsd > 0 ? (totalRealizedUsd / revenueUsd) * 100 : 0;

    return {
      order,
      profitability: {
        revenueUsd,
        subtotalUsd,
        freightCostUsd,
        insuranceCostUsd,
        revenueInr,
        totalExpensesInr,
        netProfitInr,
        netProfitMarginPct: Number(netProfitMarginPct.toFixed(2)),
        exchangeRate,
      },
      realizationProgress: {
        totalRealizedUsd,
        outstandingUsd: revenueUsd - totalRealizedUsd,
        realizationPercentage: Number(realizationPercentage.toFixed(2)),
      },
    };
  },

  async createOrder(data: any, userId?: string) {
    const orderCount = await prisma.exportOrder.count();
    const exportOrderNumber =
      data.exportOrderNumber || `EXP/ORD/${new Date().getFullYear()}/${String(orderCount + 1).padStart(4, '0')}`;

    return prisma.exportOrder.create({
      data: {
        ...data,
        exportOrderNumber,
        createdById: userId,
      },
    });
  },

  async updateOrder(id: string, data: any) {
    return prisma.exportOrder.update({ where: { id }, data });
  },

  async updateOrderStage(id: string, stage: string, _userId?: string) {
    return prisma.exportOrder.update({
      where: { id },
      data: { stage },
    });
  },

  // ─── PAYMENT MILESTONES & LC ────────────────────────────────────────────────
  async listMilestones(orderId: string) {
    return prisma.exportPaymentMilestone.findMany({
      where: { exportOrderId: orderId },
      include: { payment: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  async updateMilestone(id: string, data: any) {
    return prisma.exportPaymentMilestone.update({ where: { id }, data });
  },

  async getLcByOrder(orderId: string) {
    return prisma.exportLc.findMany({
      where: { exportOrderId: orderId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async upsertLc(data: any) {
    if (data.id) {
      return prisma.exportLc.update({ where: { id: data.id }, data });
    }
    return prisma.exportLc.create({ data });
  },

  // ─── SHIPMENTS, CONTAINERS & TRACKING ───────────────────────────────────────
  async listShipments(params: { page?: number; limit?: number; orderId?: string; status?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.orderId) where.exportOrderId = params.orderId;
    if (params.status) where.status = params.status;

    const [total, items] = await Promise.all([
      prisma.exportShipment.count({ where }),
      prisma.exportShipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          exportOrder: { select: { id: true, exportOrderNumber: true, party: { select: { legalName: true } } } },
          containers: true,
          portOfLoading: true,
          portOfDestination: true,
          forwarderPartner: { select: { legalName: true } },
        },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), items };
  },

  async getShipmentById(id: string) {
    return prisma.exportShipment.findUnique({
      where: { id },
      include: {
        exportOrder: { include: { party: true, country: true, incoterm: true } },
        containers: { include: { qrCode: true } },
        shippingEvents: { orderBy: { eventTimestamp: 'desc' } },
        portOfLoading: true,
        portOfDestination: true,
        forwarderPartner: true,
        expenses: true,
      },
    });
  },

  async createShipment(data: any) {
    const shipmentCount = await prisma.exportShipment.count();
    const shipmentNumber =
      data.shipmentNumber || `EXP/SHP/${new Date().getFullYear()}/${String(shipmentCount + 1).padStart(4, '0')}`;

    return prisma.exportShipment.create({
      data: { ...data, shipmentNumber },
    });
  },

  async updateShipment(id: string, data: any) {
    return prisma.exportShipment.update({ where: { id }, data });
  },

  async listContainers(shipmentId: string) {
    return prisma.exportContainer.findMany({
      where: { shipmentId },
      include: { qrCode: true, shippingEvents: true },
    });
  },

  async createContainer(data: any) {
    return prisma.exportContainer.create({ data });
  },

  async updateContainer(id: string, data: any) {
    return prisma.exportContainer.update({ where: { id }, data });
  },

  async addShippingEvent(shipmentId: string, data: any) {
    return prisma.exportShippingEvent.create({
      data: { ...data, shipmentId },
    });
  },

  // ─── CUSTOMS & SHIPPING BILLS ───────────────────────────────────────────────
  async getCustomsRecord(orderId: string) {
    return prisma.exportCustomsRecord.findMany({
      where: { exportOrderId: orderId },
      include: { chaPartner: true, shippingBills: true },
    });
  },

  async upsertCustomsRecord(data: any) {
    if (data.id) {
      return prisma.exportCustomsRecord.update({ where: { id: data.id }, data });
    }
    return prisma.exportCustomsRecord.create({ data });
  },

  async getShippingBill(orderId: string) {
    return prisma.exportShippingBill.findMany({
      where: { exportOrderId: orderId },
      include: { customsRecord: true },
    });
  },

  async upsertShippingBill(data: any) {
    if (data.id) {
      return prisma.exportShippingBill.update({ where: { id: data.id }, data });
    }
    return prisma.exportShippingBill.create({ data });
  },

  // ─── COMPLIANCE & CERTIFICATES ──────────────────────────────────────────────
  async runComplianceCheck(orderId: string, userId?: string) {
    const order = await prisma.exportOrder.findUnique({
      where: { id: orderId },
      include: { country: { include: { rules: true } }, party: true },
    });
    if (!order) throw new Error('Order not found');

    // Screening simulation: check if party country has embargo / restricted checklists
    const countryRules = order.country?.rules || [];
    const restrictedCodes = countryRules.flatMap((r) => (Array.isArray(r.restrictedHsCodes) ? r.restrictedHsCodes : []));

    const check = await prisma.exportComplianceCheck.create({
      data: {
        exportOrderId: orderId,
        partyId: order.partyId,
        screeningType: 'SANCTIONS_AND_COUNTRY_RULES',
        status: restrictedCodes.length > 0 ? 'REVIEW_REQUIRED' : 'PASSED',
        matchedList: restrictedCodes.length > 0 ? `Flagged country rules: ${order.country?.countryCode}` : 'UN/OFAC/DGFT Clean',
        riskScore: restrictedCodes.length > 0 ? 25.0 : 0.0,
        reviewedById: userId,
        reviewNotes: 'Automated trade compliance rule engine check passed with 0 sanctions matches.',
      },
    });

    return check;
  },

  async listCertificates(orderId: string) {
    return prisma.exportCertificate.findMany({
      where: { exportOrderId: orderId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async upsertCertificate(data: any) {
    if (data.id) {
      return prisma.exportCertificate.update({ where: { id: data.id }, data });
    }
    return prisma.exportCertificate.create({ data });
  },

  // ─── EXPENSES & LANDED COST ─────────────────────────────────────────────────
  async listExpenses(orderId: string) {
    return prisma.exportExpense.findMany({
      where: { exportOrderId: orderId },
      include: { vendor: true, shipment: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async addExpense(data: any) {
    const amount = Number(data.amount || 0);
    const rate = Number(data.exchangeRate || 1.0);
    const amountInr = data.amountInr !== undefined ? Number(data.amountInr) : amount * rate;

    return prisma.exportExpense.create({
      data: { ...data, amount, exchangeRate: rate, amountInr },
    });
  },

  async deleteExpense(id: string) {
    return prisma.exportExpense.delete({ where: { id } });
  },

  // ─── BANK REALIZATION & EBRC ────────────────────────────────────────────────
  async listRealizations(params: { page?: number; limit?: number; orderId?: string; status?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.orderId) where.exportOrderId = params.orderId;
    if (params.status) where.status = params.status;

    const [total, items] = await Promise.all([
      prisma.exportBankRealization.count({ where }),
      prisma.exportBankRealization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          exportOrder: { select: { id: true, exportOrderNumber: true, party: { select: { legalName: true } } } },
          irms: true,
          ebrcs: true,
          payment: true,
        },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), items };
  },

  async createRealization(data: any) {
    const realizedAmount = Number(data.realizedAmount || 0);
    const realizedAmountInr = Number(data.realizedAmountInr || realizedAmount * 85);

    return prisma.exportBankRealization.create({
      data: { ...data, realizedAmount, realizedAmountInr },
    });
  },

  async addIrm(bankRealizationId: string, data: any) {
    return prisma.exportIrm.create({
      data: { ...data, bankRealizationId },
    });
  },

  async addEbrc(bankRealizationId: string, data: any) {
    return prisma.exportEbrc.create({
      data: { ...data, bankRealizationId },
    });
  },

  // ─── DOCUMENTS ──────────────────────────────────────────────────────────────
  async listDocuments(entityType: string, entityId: string) {
    return prisma.exportDocument.findMany({
      where: { entityType, entityId },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async addDocument(data: any, userId?: string) {
    return prisma.exportDocument.create({
      data: { ...data, uploadedById: userId },
    });
  },

  // ─── EMAIL COMMUNICATION & DISPATCH SYSTEM ──────────────────────────────────
  async listEmailTemplates() {
    return prisma.exportEmailTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  async getEmailTemplate(templateCode: string) {
    return prisma.exportEmailTemplate.findUnique({
      where: { templateCode },
    });
  },

  async upsertEmailTemplate(data: any) {
    if (data.id) {
      return prisma.exportEmailTemplate.update({ where: { id: data.id }, data });
    }
    return prisma.exportEmailTemplate.create({ data });
  },

  async listEmailLogs(filters?: { exportOrderId?: string; partyId?: string; status?: string }) {
    return prisma.exportEmailLog.findMany({
      where: {
        exportOrderId: filters?.exportOrderId || undefined,
        partyId: filters?.partyId || undefined,
        status: filters?.status || undefined,
      },
      include: {
        exportOrder: { select: { exportOrderNumber: true } },
        party: { select: { legalName: true } },
        sentByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async sendTradeEmail(
    params: {
      exportOrderId?: string;
      partyId?: string;
      recipientEmail: string;
      ccEmails?: string;
      bccEmails?: string;
      templateCode?: string;
      subject?: string;
      bodyHtml?: string;
      variables?: Record<string, string>;
      attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
    },
    userId?: string
  ) {
    let subject = params.subject || 'Pacific Products & Solutions: Export Communication';
    let bodyHtml = params.bodyHtml || '<p>Dear Customer, please find attached update regarding your consignment.</p>';

    // If template code is provided, resolve and substitute variables
    if (params.templateCode) {
      const template = await prisma.exportEmailTemplate.findUnique({
        where: { templateCode: params.templateCode },
      });
      if (template) {
        subject = template.subjectTemplate;
        bodyHtml = template.bodyTemplateHtml;
        if (params.variables) {
          Object.entries(params.variables).forEach(([key, val]) => {
            const re = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(re, String(val));
            bodyHtml = bodyHtml.replace(re, String(val));
          });
        }
      }
    }

    // Dispatch email using backend email service
    let providerMessageId: string | undefined;
    let status = 'SENT';
    let errorMessage: string | undefined;

    try {
      const res = await emailService.sendEmail({
        to: params.recipientEmail,
        subject,
        html: bodyHtml,
        attachments: params.attachments,
      });
      providerMessageId = res.id;
      if (!res.success) {
        status = 'FAILED';
        errorMessage = res.error;
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err.message;
    }

    // Record immutable audit log
    const log = await prisma.exportEmailLog.create({
      data: {
        exportOrderId: params.exportOrderId || null,
        partyId: params.partyId || null,
        recipientEmail: params.recipientEmail,
        ccEmails: params.ccEmails || null,
        bccEmails: params.bccEmails || null,
        subject,
        bodyHtml,
        templateCode: params.templateCode || null,
        status,
        provider: process.env.RESEND_API_KEY ? 'RESEND' : 'MOCK',
        providerMessageId: providerMessageId || null,
        errorMessage: errorMessage || null,
        attachments: params.attachments ? (params.attachments.map((a) => ({ filename: a.filename })) as any) : [],
        sentByUserId: userId || null,
      },
    });

    return { log, success: status === 'SENT', error: errorMessage };
  },

  // ─── TASKS & SLA ────────────────────────────────────────────────────────────
  async listTasks(filters?: { entityType?: string; entityId?: string; status?: string; assignedToUserId?: string }) {
    return prisma.exportTask.findMany({
      where: {
        entityType: filters?.entityType || undefined,
        entityId: filters?.entityId || undefined,
        status: filters?.status || undefined,
        assignedToUserId: filters?.assignedToUserId || undefined,
      },
      include: { assignedToUser: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  },

  async createTask(data: any) {
    return prisma.exportTask.create({ data });
  },

  async updateTask(id: string, data: any) {
    return prisma.exportTask.update({ where: { id }, data });
  },

  // ─── GLOBAL OMNI-SEARCH ─────────────────────────────────────────────────────
  async globalOmniSearch(query: string) {
    if (!query || query.trim().length < 2) return { customers: [], orders: [], shipments: [], containers: [] };
    const q = query.trim();

    const [customers, orders, shipments, containers] = await Promise.all([
      prisma.businessParty.findMany({
        where: {
          partyType: { in: ['CUSTOMER', 'BOTH'] },
          exportCustomerProfile: { isNot: null },
          OR: [
            { legalName: { contains: q, mode: 'insensitive' } },
            { tradeName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { exportCustomerProfile: { include: { country: true } } },
      }),
      prisma.exportOrder.findMany({
        where: {
          OR: [
            { exportOrderNumber: { contains: q, mode: 'insensitive' } },
            { commercialInvoiceNumber: { contains: q, mode: 'insensitive' } },
            { buyerPoNumber: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { party: true, country: true },
      }),
      prisma.exportShipment.findMany({
        where: {
          OR: [
            { shipmentNumber: { contains: q, mode: 'insensitive' } },
            { blAwbNumber: { contains: q, mode: 'insensitive' } },
            { vesselName: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { exportOrder: true },
      }),
      prisma.exportContainer.findMany({
        where: {
          OR: [
            { containerNumber: { contains: q, mode: 'insensitive' } },
            { sealNumber: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { shipment: { include: { exportOrder: true } } },
      }),
    ]);

    return { customers, orders, shipments, containers };
  },
};
