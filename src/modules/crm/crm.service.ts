import { prisma } from '../../config/database';
import { auditService } from '../audit/audit.service';

export const crmService = {
  async listCustomers(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      partyType: { in: ['CUSTOMER', 'BOTH'] },
      exportCustomerProfile: null, // Strictly domestic B2B customers
      status: { not: 'DELETED' },
    };

    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (query.search) {
      where.OR = [
        { legalName: { contains: query.search, mode: 'insensitive' } },
        { tradeName: { contains: query.search, mode: 'insensitive' } },
        { gstin: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    try {
      const [items, total] = await Promise.all([
        prisma.businessParty.findMany({
          where,
          include: {
            customerProfile: true,
            contacts: true,
            addresses: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.businessParty.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (err: any) {
      console.warn(`[crmService.listCustomers] Query failed, retrying once: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      const [items, total] = await Promise.all([
        prisma.businessParty.findMany({
          where,
          include: {
            customerProfile: true,
            contacts: true,
            addresses: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.businessParty.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  },

  async getCustomerById(id: string) {
    const customer = await prisma.businessParty.findUnique({
      where: { id },
      include: {
        customerProfile: true,
        contacts: true,
        addresses: true,
        proformaInvoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 10,
        },
        followups: {
          orderBy: { nextFollowupDate: 'asc' },
        },
      },
    });

    if (!customer) throw Object.assign(new Error('Customer not found'), { status: 404 });
    return customer;
  },

  /**
   * Customer 360: Aggregates real-time financial balances, orders, quotations,
   * packing lists, and builds a unified chronological timeline across all 5 modules.
   */
  async getCustomer360(id: string) {
    const customer = await this.getCustomerById(id);

    // 1. Proforma Invoices
    const pis = await prisma.proformaInvoice.findMany({
      where: { customerId: id },
      include: { paymentAllocations: true },
      orderBy: { piDate: 'desc' },
    });

    // 2. Sales Quotations
    const quotations = await prisma.salesQuotation.findMany({
      where: { customerId: id },
      orderBy: { date: 'desc' },
    });

    // 3. Central Sales Orders
    const orders = await prisma.salesOrder.findMany({
      where: { customerId: id },
      include: { items: true },
      orderBy: { orderDate: 'desc' },
    });

    // 4. Packing Lists
    const packingLists = await prisma.packingList.findMany({
      where: { customerId: id },
      orderBy: { date: 'desc' },
    });

    // 5. Hardware Issue Lists
    const hardwareIssues = await prisma.hardwareIssueList.findMany({
      where: { customerId: id },
      orderBy: { date: 'desc' },
    });

    // 6. Payments
    const payments = await prisma.payment.findMany({
      where: { partyId: id, paymentType: { in: ['CUSTOMER_PAYMENT', 'ADVANCE'] } },
      orderBy: { paymentDate: 'desc' },
    });

    // 7. Active Followups
    const followups = await prisma.paymentFollowup.findMany({
      where: { customerId: id },
      include: { logs: true, reminders: true },
      orderBy: { nextFollowupDate: 'asc' },
    });

    // Compute aggregate KPIs synchronized with Ledger Service
    const linkedOrderIds = new Set<string>();
    pis.forEach((pi) => {
      if (pi.orderId) linkedOrderIds.add(pi.orderId);
    });

    let totalInvoiced = 0;
    let openInvoicesCount = 0;
    pis.forEach((pi) => {
      if (pi.status !== 'CANCELLED') {
        const grandTotal = Number(pi.grandTotal) || 0;
        totalInvoiced += grandTotal;
        if (['ISSUED', 'DRAFT'].includes(pi.status)) {
          openInvoicesCount++;
        }
      }
    });

    // Also include direct sales orders that do not have a preceding PI
    orders.forEach((so) => {
      if (so.status !== 'CANCELLED' && !linkedOrderIds.has(so.id) && !so.proformaInvoiceId) {
        totalInvoiced += Number(so.grandTotal) || 0;
      }
    });

    let totalPaid = 0;
    payments.forEach((p) => {
      totalPaid += Number(p.amount) || 0;
    });

    const totalQuotedValue = quotations.reduce((sum, q) => sum + Number(q.grandTotal), 0);
    const totalOrderedValue = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
    const totalDispatchedValue = packingLists.reduce((sum, pl) => sum + Number(pl.totalQuantity), 0);

    const convertedQuotes = quotations.filter((q) => q.status === 'CONVERTED').length;
    const conversionRatePercent = quotations.length > 0
      ? Math.round((convertedQuotes / quotations.length) * 100)
      : 0;

    const outstandingBalance = Math.max(0, totalInvoiced - totalPaid);
    const advanceBalance = Math.max(0, totalPaid - totalInvoiced);
    const netBalance = Math.round((totalInvoiced - totalPaid) * 100) / 100;

    // Build Unified Cross-Module Chronological Timeline
    const timeline: Array<{
      type: 'QUOTATION' | 'ORDER' | 'PI' | 'PACKING_LIST' | 'HARDWARE_ISSUE' | 'PAYMENT';
      id: string;
      referenceNumber: string;
      title: string;
      date: string;
      status: string;
      amount?: number;
    }> = [];

    quotations.forEach((q) => {
      timeline.push({
        type: 'QUOTATION',
        id: q.id,
        referenceNumber: q.referenceNumber,
        title: `Quotation: ${q.projectName}`,
        date: q.date.toISOString(),
        status: q.status,
        amount: Number(q.grandTotal),
      });
    });

    orders.forEach((o) => {
      timeline.push({
        type: 'ORDER',
        id: o.id,
        referenceNumber: o.orderNumber,
        title: `Sales Order (${o.source})`,
        date: o.orderDate.toISOString(),
        status: o.status,
        amount: Number(o.grandTotal),
      });
    });

    pis.forEach((pi) => {
      timeline.push({
        type: 'PI',
        id: pi.id,
        referenceNumber: pi.piNumber,
        title: `Proforma Invoice`,
        date: pi.piDate.toISOString(),
        status: pi.status,
        amount: Number(pi.grandTotal),
      });
    });

    packingLists.forEach((pl) => {
      timeline.push({
        type: 'PACKING_LIST',
        id: pl.id,
        referenceNumber: pl.packingListNumber,
        title: `Dispatch Packing List`,
        date: pl.date.toISOString(),
        status: pl.receiptStatus,
      });
    });

    hardwareIssues.forEach((hi) => {
      timeline.push({
        type: 'HARDWARE_ISSUE',
        id: hi.id,
        referenceNumber: hi.issueNumber,
        title: `Hardware Store Issue`,
        date: hi.date.toISOString(),
        status: hi.status,
      });
    });

    payments.forEach((p) => {
      timeline.push({
        type: 'PAYMENT',
        id: p.id,
        referenceNumber: p.referenceNumber || 'PAYMENT',
        title: `Payment Receipt (${p.paymentMethod})`,
        date: p.paymentDate.toISOString(),
        status: p.status,
        amount: Number(p.amount),
      });
    });

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      customer,
      kpis: {
        totalQuotedValue,
        totalOrderedValue,
        totalDispatchedValue,
        totalInvoiced,
        totalPaid,
        outstandingBalance,
        advanceBalance,
        netBalance,
        overdueBalance: outstandingBalance,
        openInvoicesCount,
        conversionRatePercent,
        lastPurchaseDate: pis[0]?.piDate || orders[0]?.orderDate || null,
        lastPaymentDate: payments[0]?.paymentDate || null,
      },
      recentProformaInvoices: pis.slice(0, 5),
      recentOrders: orders.slice(0, 5),
      recentQuotations: quotations.slice(0, 5),
      recentPackingLists: packingLists.slice(0, 5),
      recentPayments: payments.slice(0, 5),
      activeFollowups: followups,
      timeline,
    };
  },

  /**
   * Deduplication check on customer creation/edit
   */
  async checkDuplicates(data: { legalName?: string; tradeName?: string; gstin?: string; phone?: string; excludeId?: string }) {
    const conditions: any[] = [];

    if (data.gstin && data.gstin.trim()) {
      conditions.push({ gstin: { equals: data.gstin.trim(), mode: 'insensitive' } });
    }
    if (data.phone && data.phone.trim()) {
      conditions.push({ phone: { contains: data.phone.trim() } });
    }
    if (data.legalName && data.legalName.trim().length >= 4) {
      conditions.push({ legalName: { contains: data.legalName.trim(), mode: 'insensitive' } });
    }

    if (conditions.length === 0) return [];

    const where: any = {
      partyType: { in: ['CUSTOMER', 'BOTH'] },
      exportCustomerProfile: null,
      OR: conditions,
    };

    if (data.excludeId) {
      where.id = { not: data.excludeId };
    }

    const matches = await prisma.businessParty.findMany({
      where,
      include: { addresses: true, contacts: true },
      take: 5,
    });

    return matches;
  },

  /**
   * Merge tool: Consolidates duplicate customer records into a canonical record,
   * re-pointing all Quotations, Orders, PIs, Packing Lists, Hardware Issues, Payments,
   * and Contacts.
   */
  async mergeCustomers(canonicalCustomerId: string, mergedCustomerId: string, reason?: string, userId?: string) {
    if (canonicalCustomerId === mergedCustomerId) {
      throw new Error('Canonical customer and duplicate customer cannot be the same record.');
    }

    const canonical = await prisma.businessParty.findUnique({ where: { id: canonicalCustomerId } });
    const duplicate = await prisma.businessParty.findUnique({
      where: { id: mergedCustomerId },
      include: { contacts: true, addresses: true },
    });

    if (!canonical || !duplicate) {
      throw new Error('Both canonical and duplicate customer records must exist.');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Re-link Sales Quotations
      await tx.salesQuotation.updateMany({
        where: { customerId: mergedCustomerId },
        data: { customerId: canonicalCustomerId },
      });

      // 2. Re-link Sales Orders
      await tx.salesOrder.updateMany({
        where: { customerId: mergedCustomerId },
        data: { customerId: canonicalCustomerId },
      });

      // 3. Re-link Proforma Invoices
      await tx.proformaInvoice.updateMany({
        where: { customerId: mergedCustomerId },
        data: { customerId: canonicalCustomerId },
      });

      // 4. Re-link Packing Lists
      await tx.packingList.updateMany({
        where: { customerId: mergedCustomerId },
        data: { customerId: canonicalCustomerId },
      });

      // 5. Re-link Hardware Issues
      await tx.hardwareIssueList.updateMany({
        where: { customerId: mergedCustomerId },
        data: { customerId: canonicalCustomerId },
      });

      // 6. Re-link Payments & Followups
      await tx.payment.updateMany({
        where: { partyId: mergedCustomerId },
        data: { partyId: canonicalCustomerId },
      });
      await tx.paymentFollowup.updateMany({
        where: { customerId: mergedCustomerId },
        data: { customerId: canonicalCustomerId },
      });

      // 7. Re-link Contacts and Addresses
      await tx.partyContact.updateMany({
        where: { partyId: mergedCustomerId },
        data: { partyId: canonicalCustomerId },
      });
      await tx.partyAddress.updateMany({
        where: { partyId: mergedCustomerId },
        data: { partyId: canonicalCustomerId },
      });

      // 8. Log the merge in customer_merge_logs
      await tx.customerMergeLog.create({
        data: {
          canonicalCustomerId,
          mergedCustomerId,
          mergedCustomerData: duplicate as any,
          performedByUserId: userId || null,
          reason: reason || 'Consolidated duplicate customer profile',
        },
      });

      // 9. Mark merged party as INACTIVE / MERGED
      await tx.businessParty.update({
        where: { id: mergedCustomerId },
        data: {
          status: 'MERGED',
          notes: `Merged into canonical customer ${canonical.legalName} (${canonicalCustomerId}) on ${new Date().toISOString()}`,
        },
      });

      if (userId) {
        await auditService.logMutation({
          userId,
          action: 'UPDATE',
          module: 'CRM',
          entityType: 'Customer',
          entityId: canonicalCustomerId,
          newData: { mergedCustomerId, canonicalCustomerId, reason },
        });
      }

      return {
        success: true,
        canonicalId: canonicalCustomerId,
        mergedId: mergedCustomerId,
      };
    });
  },

  async createCustomer(data: any, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const party = await tx.businessParty.create({
        data: {
          companyProfileId: data.companyProfileId,
          partyType: data.partyType || 'CUSTOMER',
          legalName: data.legalName,
          tradeName: data.tradeName,
          gstin: data.gstin ? data.gstin.toUpperCase().trim() : undefined,
          pan: data.pan ? data.pan.toUpperCase().trim() : undefined,
          email: data.email,
          phone: data.phone,
          status: data.status || 'ACTIVE',
          notes: data.notes,
        },
      });

      // Create linked customer profile
      const profile = await tx.customerProfile.create({
        data: {
          partyId: party.id,
          customerType: data.customerType || 'CONTRACTOR',
          creditLimit: data.creditLimit,
          paymentTermsDays: Number(data.paymentTermsDays) || 30,
          status: 'ACTIVE',
        },
      });

      // Add contacts if provided
      if (Array.isArray(data.contacts)) {
        for (const c of data.contacts) {
          await tx.partyContact.create({
            data: { ...c, partyId: party.id },
          });
        }
      }

      // Add addresses if provided
      if (Array.isArray(data.addresses)) {
        for (const a of data.addresses) {
          await tx.partyAddress.create({
            data: { ...a, partyId: party.id },
          });
        }
      }

      if (userId) {
        await auditService.logMutation({
          userId,
          action: 'CREATE',
          module: 'CRM',
          entityType: 'Customer',
          entityId: party.id,
          newData: { party, profile },
        });
      }

      return tx.businessParty.findUnique({
        where: { id: party.id },
        include: { customerProfile: true, contacts: true, addresses: true },
      });
    });
  },

  async updateCustomer(id: string, data: any, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const old = await tx.businessParty.findUnique({
        where: { id },
        include: { customerProfile: true, contacts: true, addresses: true },
      });

      if (!old) {
        throw Object.assign(new Error('Customer not found'), { status: 404 });
      }

      const party = await tx.businessParty.update({
        where: { id },
        data: {
          legalName: data.legalName !== undefined ? data.legalName : old.legalName,
          tradeName: data.tradeName !== undefined ? data.tradeName : old.tradeName,
          gstin: data.gstin !== undefined ? (data.gstin ? data.gstin.toUpperCase().trim() : null) : old.gstin,
          pan: data.pan !== undefined ? (data.pan ? data.pan.toUpperCase().trim() : null) : old.pan,
          email: data.email !== undefined ? data.email : old.email,
          phone: data.phone !== undefined ? data.phone : old.phone,
          status: data.status !== undefined ? data.status : old.status,
          notes: data.notes !== undefined ? data.notes : old.notes,
        },
      });

      // Update customer profile
      const profileData: any = {};
      if (data.customerType !== undefined) profileData.customerType = data.customerType;
      if (data.creditLimit !== undefined) profileData.creditLimit = data.creditLimit ? Number(data.creditLimit) : null;
      if (data.paymentTermsDays !== undefined) profileData.paymentTermsDays = Number(data.paymentTermsDays) || 30;
      if (data.customerProfile) Object.assign(profileData, data.customerProfile);

      if (Object.keys(profileData).length > 0) {
        await tx.customerProfile.upsert({
          where: { partyId: id },
          create: {
            partyId: id,
            customerType: profileData.customerType || 'CONTRACTOR',
            creditLimit: profileData.creditLimit,
            paymentTermsDays: profileData.paymentTermsDays || 30,
            status: 'ACTIVE',
          },
          update: profileData,
        });
      }

      // Update contacts if provided
      if (Array.isArray(data.contacts)) {
        await tx.partyContact.deleteMany({ where: { partyId: id } });
        for (const c of data.contacts) {
          if (c.name) {
            await tx.partyContact.create({
              data: {
                partyId: id,
                name: c.name,
                designation: c.designation || null,
                phone: c.phone || null,
                email: c.email || null,
                isPrimary: Boolean(c.isPrimary),
              },
            });
          }
        }
      }

      // Update addresses if provided
      if (Array.isArray(data.addresses)) {
        await tx.partyAddress.deleteMany({ where: { partyId: id } });
        for (const a of data.addresses) {
          if (a.addressLine1) {
            await tx.partyAddress.create({
              data: {
                partyId: id,
                addressType: a.addressType || 'BILLING',
                addressLine1: a.addressLine1,
                addressLine2: a.addressLine2 || null,
                city: a.city || 'Delhi',
                state: a.state || 'Delhi',
                stateCode: a.stateCode || '07',
                postalCode: a.postalCode || a.pincode || null,
                gstin: a.gstin ? a.gstin.toUpperCase().trim() : null,
                isDefaultBilling: Boolean(a.isDefaultBilling),
                isDefaultShipping: Boolean(a.isDefaultShipping),
              },
            });
          }
        }
      }

      if (userId) {
        await auditService.logMutation({
          userId,
          action: 'UPDATE',
          module: 'CRM',
          entityType: 'Customer',
          entityId: id,
          oldData: old,
          newData: party,
        });
      }

      return tx.businessParty.findUnique({
        where: { id },
        include: { customerProfile: true, contacts: true, addresses: true },
      });
    });
  },

  async deleteCustomer(id: string, userId?: string) {
    const customer = await prisma.businessParty.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            salesQuotations: true,
            salesOrders: true,
            proformaInvoices: true,
            packingLists: true,
            hardwareIssues: true,
            payments: true,
            followups: true,
            exportOrders: true,
            exportQuotations: true,
          },
        },
      },
    });

    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { status: 404 });
    }

    const counts = customer._count;
    const hasTransactions =
      (counts?.salesQuotations || 0) > 0 ||
      (counts?.salesOrders || 0) > 0 ||
      (counts?.proformaInvoices || 0) > 0 ||
      (counts?.packingLists || 0) > 0 ||
      (counts?.hardwareIssues || 0) > 0 ||
      (counts?.payments || 0) > 0 ||
      (counts?.followups || 0) > 0 ||
      (counts?.exportOrders || 0) > 0 ||
      (counts?.exportQuotations || 0) > 0;

    if (hasTransactions) {
      // Soft-delete to preserve audit logs and avoid relational RESTRICT errors
      const updated = await prisma.businessParty.update({
        where: { id },
        data: {
          status: 'DELETED',
          notes: `${customer.notes ? customer.notes + ' | ' : ''}Deleted on ${new Date().toISOString()}`,
        },
      });

      if (userId) {
        await auditService.logMutation({
          userId,
          action: 'DELETE',
          module: 'CRM',
          entityType: 'Customer',
          entityId: id,
          oldData: customer,
          newData: updated,
        });
      }

      return { success: true, message: 'Customer archived and removed from active list' };
    }

    // Clean delete all child records then parent
    return prisma.$transaction(async (tx) => {
      await tx.customerMergeLog.deleteMany({
        where: { OR: [{ canonicalCustomerId: id }, { mergedCustomerId: id }] },
      });
      await tx.exportCustomerBankAccount.deleteMany({
        where: { partyId: id },
      });
      await tx.exportCustomerProfile.deleteMany({
        where: { partyId: id },
      });
      await tx.partyContact.deleteMany({
        where: { partyId: id },
      });
      await tx.partyAddress.deleteMany({
        where: { partyId: id },
      });
      await tx.customerProfile.deleteMany({
        where: { partyId: id },
      });

      const deleted = await tx.businessParty.delete({ where: { id } });

      if (userId) {
        await auditService.logMutation({
          userId,
          action: 'DELETE',
          module: 'CRM',
          entityType: 'Customer',
          entityId: id,
          oldData: customer,
        });
      }

      return deleted;
    });
  },

  async addContact(partyId: string, contactData: any) {
    return prisma.partyContact.create({
      data: { ...contactData, partyId },
    });
  },

  async addAddress(partyId: string, addressData: any) {
    return prisma.partyAddress.create({
      data: { ...addressData, partyId },
    });
  },
};
