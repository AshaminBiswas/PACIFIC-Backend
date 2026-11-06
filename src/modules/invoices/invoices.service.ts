import { prisma } from '../../config/database';
import { pdfService } from '../pdf/pdf.service';
import { sequenceService } from '../sequences/sequence.service';
import { financeService } from '../finance/finance.service';

async function resolveDefaultCompanyProfileId(): Promise<string> {
  const profile = await prisma.companyProfile.findFirst({
    select: { id: true },
  });
  return profile?.id || '1fc1cc60-1673-4366-a97a-4dae9ef7832c';
}

function tryParseMetadata(notes?: string | null): any {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  return null;
}

export const invoicesService = {
  async list(query: { page?: number; limit?: number; status?: string; orderId?: string; search?: string; branch?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;
    const andClauses: any[] = [];
    if (query.status && query.status !== 'ALL') andClauses.push({ status: query.status });
    if (query.orderId) andClauses.push({ orderId: query.orderId });

    if (query.branch) {
      const b = query.branch.toUpperCase();
      if (b === 'KOLKATA' || b === 'KOL') {
        andClauses.push({
          OR: [
            { invoiceNumber: { startsWith: 'PPSK/' } },
            { invoiceNumber: { contains: 'KOL' } },
            { notes: { contains: 'a25090ef-f6c0-407f-8b1e-1da8d506308c' } },
            { notes: { contains: 'Kolkata', mode: 'insensitive' } },
            { notes: { contains: 'Bengal', mode: 'insensitive' } },
            { order: { orderNumber: { startsWith: 'PPSK/' } } },
            { order: { companyProfileId: 'a25090ef-f6c0-407f-8b1e-1da8d506308c' } },
          ],
        });
      } else if (b === 'MAIN' || b === 'DELHI') {
        andClauses.push({
          NOT: [
            { invoiceNumber: { startsWith: 'PPSK/' } },
            { invoiceNumber: { contains: 'KOL' } },
            { notes: { contains: 'a25090ef-f6c0-407f-8b1e-1da8d506308c' } },
          ],
        });
      }
    }

    if (query.search) {
      andClauses.push({
        OR: [
          { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
          { notes: { contains: query.search, mode: 'insensitive' } },
          { order: { orderNumber: { contains: query.search, mode: 'insensitive' } } },
          { order: { customer: { legalName: { contains: query.search, mode: 'insensitive' } } } },
        ],
      });
    }

    const where: any = andClauses.length > 0 ? { AND: andClauses } : {};

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          quotation: { include: { lead: true } },
          project: true,
          order: { include: { customer: true, companyProfile: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Enhance items with customer name and advance info if metadata is present
    const enhancedItems = await Promise.all(
      items.map(async (inv) => {
        const meta = tryParseMetadata(inv.notes);
        let customerName = (inv.order as any)?.customer?.legalName;
        let companyProfileId = (inv.order as any)?.companyProfileId || meta?.companyProfileId;
        let branchName = (inv.order as any)?.companyProfile?.companyName;

        if (!customerName && meta?.billTo?.partyName) {
          customerName = meta.billTo.partyName;
        }

        if (inv.proformaInvoiceId) {
          const pi = await prisma.proformaInvoice.findUnique({
            where: { id: inv.proformaInvoiceId },
            include: { customer: true, companyProfile: true },
          });
          if (pi) {
            if (!customerName) customerName = pi.customer?.legalName;
            if (!branchName) branchName = pi.companyProfile?.companyName;
            if (!companyProfileId) companyProfileId = pi.companyProfileId;
          }
        }

        if (!customerName && meta?.customerId) {
          const cust = await prisma.businessParty.findUnique({
            where: { id: meta.customerId },
            select: { legalName: true },
          });
          if (cust?.legalName) customerName = cust.legalName;
        }

        if (!branchName && companyProfileId) {
          const comp = await prisma.companyProfile.findUnique({
            where: { id: companyProfileId },
            select: { companyName: true, state: true, entityCode: true },
          });
          if (comp) {
            branchName = comp.companyName;
          }
        }

        return {
          ...inv,
          companyProfileId,
          customer: customerName ? { legalName: customerName } : (inv.order as any)?.customer,
          companyProfile: branchName
            ? { id: companyProfileId, companyName: branchName }
            : (inv.order as any)?.companyProfile,
          metadata: meta,
        };
      })
    );

    return { items: enhancedItems, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        quotation: { include: { items: true, lead: true } },
        project: true,
        order: {
          include: {
            customer: { include: { addresses: true, contacts: true } },
            companyProfile: { include: { bankAccounts: true, addresses: true, signatories: true } },
            items: true,
          },
        },
      },
    });
    if (!invoice) throw Object.assign(new Error('Invoice not found'), { status: 404 });

    const metadata = tryParseMetadata(invoice.notes);

    // Fetch linked Proforma Invoice if available
    let linkedPi: any = null;
    if (invoice.proformaInvoiceId) {
      linkedPi = await prisma.proformaInvoice.findUnique({
        where: { id: invoice.proformaInvoiceId },
        include: {
          customer: { include: { addresses: true, contacts: true } },
          companyProfile: { include: { bankAccounts: true, addresses: true, signatories: true } },
          parties: true,
          items: { orderBy: { serialNumber: 'asc' } },
          taxSummary: true,
          terms: true,
          paymentAllocations: {
            include: { payment: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    // Fetch payment allocations allocated directly to this invoice
    const invoiceAllocations = await prisma.paymentAllocation.findMany({
      where: {
        OR: [
          { documentType: 'INVOICE', documentId: invoice.id },
          ...(invoice.proformaInvoiceId ? [{ proformaInvoiceId: invoice.proformaInvoiceId }] : []),
        ],
      },
      include: { payment: true },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate allocations by allocation ID
    const allocationMap = new Map<string, any>();
    for (const alloc of invoiceAllocations) {
      allocationMap.set(alloc.id, alloc);
    }
    if (linkedPi?.paymentAllocations) {
      for (const alloc of linkedPi.paymentAllocations) {
        allocationMap.set(alloc.id, alloc);
      }
    }
    const combinedAllocations = Array.from(allocationMap.values());

    // Calculate advance received
    const allocationsSum = combinedAllocations.reduce(
      (sum, a) => sum + Number(a.allocatedAmount || (a.payment?.amount && a.documentType === 'PI' ? a.payment.amount : 0) || 0),
      0
    );
    const piAdvanceAmount = linkedPi ? Number(linkedPi.advanceReceivedAmount || 0) : 0;
    const totalAdvanceReceived = Math.max(allocationsSum, piAdvanceAmount);

    const totalInvoiceAmount = Number(invoice.totalAmount || 0);
    const balanceDue = Math.max(0, Math.round((totalInvoiceAmount - totalAdvanceReceived) * 100) / 100);

    let effectiveStatus: string = invoice.status;
    if (balanceDue <= 0 && totalInvoiceAmount > 0) {
      effectiveStatus = 'PAID';
    } else if (totalAdvanceReceived > 0) {
      effectiveStatus = 'PARTIALLY_PAID';
    }

    // Resolve parties (Bill To / Ship To)
    const billToParty =
      metadata?.billTo ||
      linkedPi?.parties?.find((p: any) => p.partyRole === 'BILL_TO') || {
        partyName: (invoice.order as any)?.customer?.legalName || 'Valued Customer',
        address: (invoice.order as any)?.customer?.addresses?.[0]?.addressLine1 || '',
        gstin: (invoice.order as any)?.customer?.gstin || '',
        state: (invoice.order as any)?.customer?.addresses?.[0]?.state || 'West Bengal',
        stateCode: (invoice.order as any)?.customer?.addresses?.[0]?.stateCode || '19',
      };

    const shipToParty =
      metadata?.shipTo ||
      linkedPi?.parties?.find((p: any) => p.partyRole === 'SHIP_TO') ||
      billToParty;

    // Resolve transport
    const rawTransport = metadata?.transport || {};
    const transport = {
      modeOfTransport: rawTransport.modeOfTransport || metadata?.modeOfTransport || linkedPi?.modeOfTransport || 'By Road',
      vehicleNumber:
        rawTransport.vehicleNumber ||
        rawTransport.vehicleNo ||
        metadata?.vehicleNumber ||
        metadata?.vehicleNo ||
        linkedPi?.vehicleNumber ||
        (invoice.order as any)?.vehicleNumber ||
        '',
      grLrNumber: rawTransport.grLrNumber || metadata?.grLrNumber || linkedPi?.grLrNumber || '',
      placeOfSupply: rawTransport.placeOfSupply || metadata?.placeOfSupply || linkedPi?.placeOfSupply || billToParty?.state || 'West Bengal',
      placeOfSupplyStateCode: rawTransport.placeOfSupplyStateCode || metadata?.placeOfSupplyStateCode || linkedPi?.placeOfSupplyStateCode || billToParty?.stateCode || '19',
      reverseCharge:
        rawTransport.reverseCharge !== undefined
          ? rawTransport.reverseCharge
          : (metadata?.reverseCharge !== undefined ? metadata?.reverseCharge : (linkedPi?.reverseCharge || false)),
    };

    // Resolve line items
    let resolvedItems: any[] = [];
    if (metadata?.items && Array.isArray(metadata.items) && metadata.items.length > 0) {
      resolvedItems = metadata.items;
    } else if (linkedPi?.items && linkedPi.items.length > 0) {
      resolvedItems = linkedPi.items.map((it: any, idx: number) => ({
        serialNumber: it.serialNumber || idx + 1,
        description: it.description,
        hsnSac: it.hsnSac || '48239019',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || "No's",
        rate: Number(it.rate) || 0,
        amount: Number(it.amount) || (Number(it.quantity) * Number(it.rate)),
        gstRate: Number(it.gstRate) || 18,
      }));
    } else if ((invoice.order as any)?.items && (invoice.order as any).items.length > 0) {
      resolvedItems = (invoice.order as any).items.map((it: any, idx: number) => ({
        serialNumber: it.serialNumber || idx + 1,
        description: it.description,
        hsnSac: '9403',
        quantity: Number(it.quantity) || 1,
        unit: "No's",
        rate: Number(it.rate) || 0,
        amount: Number(it.amount) || (Number(it.quantity) * Number(it.rate)),
        gstRate: 18,
      }));
    } else {
      resolvedItems = [
        {
          serialNumber: 1,
          description: metadata?.userNotes || invoice.notes || 'Restroom Cubicle Supply & Installation',
          hsnSac: '48239019',
          quantity: 1,
          unit: "No's",
          rate: Number(invoice.subtotal),
          amount: Number(invoice.subtotal),
          gstRate: 18,
        },
      ];
    }

    // Resolve Customer & CompanyProfile
    let customer = (invoice.order as any)?.customer || linkedPi?.customer;
    if (!customer && metadata?.customerId) {
      customer = await prisma.businessParty.findUnique({
        where: { id: metadata.customerId },
        include: { addresses: true, contacts: true },
      });
    }

    let companyProfile = (invoice.order as any)?.companyProfile || linkedPi?.companyProfile;
    if (!companyProfile && metadata?.companyProfileId) {
      companyProfile = await prisma.companyProfile.findUnique({
        where: { id: metadata.companyProfileId },
        include: { bankAccounts: true, addresses: true, signatories: true },
      });
    }

    return {
      ...invoice,
      metadata,
      items: resolvedItems,
      billTo: billToParty,
      shipTo: shipToParty,
      transport,
      freightAmount: metadata?.freightAmount !== undefined ? Number(metadata.freightAmount) : (linkedPi ? Number(linkedPi.freightAmount) : 0),
      freightTerms:
        metadata?.freightTerms ||
        (linkedPi as any)?.freightTerms ||
        (Number(metadata?.freightAmount || (linkedPi ? Number(linkedPi.freightAmount) : 0)) > 0 ? 'Fixed' : 'Extra as Actual / To pay'),
      roundingAdjustment: metadata?.roundingAdjustment !== undefined ? Number(metadata.roundingAdjustment) : (linkedPi ? Number(linkedPi.roundingAdjustment) : 0),
      advanceReceived: totalAdvanceReceived,
      balanceDue,
      effectiveStatus,
      paymentAllocations: combinedAllocations,
      linkedPi: linkedPi
        ? {
            id: linkedPi.id,
            piNumber: linkedPi.piNumber,
            piDate: linkedPi.piDate,
            grandTotal: Number(linkedPi.grandTotal),
            advanceReceivedAmount: Number(linkedPi.advanceReceivedAmount),
            status: linkedPi.status,
          }
        : null,
      customer,
      companyProfile,
    };
  },

  async create(data: any) {
    const {
      customerId,
      companyProfileId,
      isKolkata,
      branch,
      items,
      billTo,
      shipTo,
      transport,
      freightAmount,
      freightTerms,
      roundingAdjustment,
      notes: userNotes,
      ...rest
    } = data;

    const targetCompanyProfileId = companyProfileId || await resolveDefaultCompanyProfileId();
    const isKolkataCompany = targetCompanyProfileId === 'a25090ef-f6c0-407f-8b1e-1da8d506308c';
    const kolkataFlag = Boolean(isKolkata || branch?.toUpperCase() === 'KOLKATA' || isKolkataCompany);

    let invoiceNumber = rest.invoiceNumber;
    if (!invoiceNumber) {
      const seq = await sequenceService.getNextDocumentNumber(targetCompanyProfileId, 'INV', {
        isKolkata: kolkataFlag,
        branch,
      });
      invoiceNumber = seq.number;
    }

    const rawTr = transport || {};
    const mergedTransport = {
      modeOfTransport: data.modeOfTransport || rawTr.modeOfTransport || 'By Road',
      vehicleNumber: data.vehicleNumber || rawTr.vehicleNumber || data.vehicleNo || rawTr.vehicleNo || '',
      grLrNumber: data.grLrNumber || rawTr.grLrNumber || '',
      placeOfSupply: data.placeOfSupply || rawTr.placeOfSupply || billTo?.state || 'West Bengal',
      placeOfSupplyStateCode: data.placeOfSupplyStateCode || rawTr.placeOfSupplyStateCode || billTo?.stateCode || '19',
      reverseCharge: data.reverseCharge !== undefined ? data.reverseCharge : (rawTr.reverseCharge || false),
    };

    const metadata = {
      version: 2,
      userNotes: userNotes || '',
      customerId,
      companyProfileId: targetCompanyProfileId,
      billTo,
      shipTo,
      transport: mergedTransport,
      items: items || [],
      freightAmount: Number(freightAmount || 0),
      freightTerms: freightTerms || (Number(freightAmount || 0) > 0 ? 'Fixed' : 'Extra as Actual / To pay'),
      roundingAdjustment: Number(roundingAdjustment || 0),
    };

    return prisma.invoice.create({
      data: {
        ...rest,
        notes: JSON.stringify(metadata),
        invoiceNumber,
        status: rest.status || 'DRAFT',
      },
    });
  },

  /**
   * Directly converts a Proforma Invoice (PI) into a formal GST Tax Invoice / Bill.
   * If a Tax Invoice already exists for this PI, returns it.
   */
  async createFromPi(piId: string, userId?: string) {
    const pi = await prisma.proformaInvoice.findUnique({
      where: { id: piId },
      include: {
        customer: { include: { addresses: true } },
        companyProfile: { include: { addresses: true, bankAccounts: true } },
        items: { orderBy: { serialNumber: 'asc' } },
        parties: true,
        taxSummary: true,
        paymentAllocations: { include: { payment: true } },
      },
    });
    if (!pi) throw Object.assign(new Error('Proforma Invoice not found'), { status: 404 });

    // Check if an invoice already exists for this PI
    const existing = await prisma.invoice.findFirst({ where: { proformaInvoiceId: pi.id } });
    if (existing) return existing;

    const isKolkata = Boolean(
      pi.piNumber?.startsWith('PPSK/') ||
      pi.companyProfile?.entityCode === 'PPS-KOL' ||
      pi.companyProfile?.stateCode === '19' ||
      pi.companyProfile?.companyName?.toLowerCase().includes('kolkata') ||
      pi.placeOfSupplyStateCode === '19'
    );

    const seq = await sequenceService.getNextDocumentNumber(pi.companyProfileId, 'INV', { isKolkata });
    const invoiceNumber = seq.number;

    const billToParty = pi.parties?.find((p) => p.partyRole === 'BILL_TO');
    const shipToParty = pi.parties?.find((p) => p.partyRole === 'SHIP_TO') || billToParty;

    const items = (pi.items || []).map((it, idx) => ({
      serialNumber: it.serialNumber || idx + 1,
      description: it.description,
      hsnSac: it.hsnSac || '48239019',
      quantity: Number(it.quantity) || 1,
      unit: it.unit || "No's",
      rate: Number(it.rate) || 0,
      amount: Number(it.amount) || 0,
      gstRate: Number(it.gstRate) || 18,
    }));

    const metadata = {
      version: 2,
      userNotes: `Tax Invoice generated from Proforma Invoice ${pi.piNumber}`,
      customerId: pi.customerId,
      companyProfileId: pi.companyProfileId,
      billTo: billToParty
        ? {
            partyName: billToParty.partyName,
            address: billToParty.addressLine || billToParty.state || '',
            gstin: billToParty.gstin || '',
            state: billToParty.state || '',
            stateCode: billToParty.stateCode || '',
          }
        : {
            partyName: pi.customer?.legalName || '',
            address: pi.customer?.addresses?.[0]?.addressLine1 || '',
            gstin: pi.customer?.gstin || '',
            state: pi.customer?.addresses?.[0]?.state || '',
            stateCode: pi.customer?.addresses?.[0]?.stateCode || '',
          },
      shipTo: shipToParty
        ? {
            partyName: shipToParty.partyName,
            address: shipToParty.addressLine || shipToParty.state || '',
            gstin: shipToParty.gstin || '',
            state: shipToParty.state || '',
            stateCode: shipToParty.stateCode || '',
          }
        : undefined,
      transport: {
        modeOfTransport: pi.modeOfTransport || 'By Road',
        vehicleNumber: pi.vehicleNumber || '',
        grLrNumber: pi.grLrNumber || '',
        placeOfSupply: pi.placeOfSupply || 'West Bengal',
        placeOfSupplyStateCode: pi.placeOfSupplyStateCode || '19',
        reverseCharge: pi.reverseCharge || false,
      },
      items,
      freightAmount: Number(pi.freightAmount || 0),
      freightTerms: (pi as any).freightTerms || (Number(pi.freightAmount || 0) > 0 ? 'Fixed' : 'Extra as Actual / To pay'),
      roundingAdjustment: Number(pi.roundingAdjustment || 0),
    };

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        proformaInvoiceId: pi.id,
        orderId: pi.convertedOrderId || pi.orderId || null,
        subtotal: pi.subtotal,
        taxAmount: pi.totalTaxAmount,
        totalAmount: pi.grandTotal,
        currency: pi.currency || 'INR',
        status: 'DRAFT',
        notes: JSON.stringify(metadata),
      },
    });

    // Mark Proforma Invoice as CONVERTED
    await prisma.proformaInvoice.update({
      where: { id: pi.id },
      data: { status: 'CONVERTED' },
    }).catch(() => {});

    return invoice;
  },

  /**
   * Records a payment directly on a Tax Invoice / Bill.
   */
  async recordPayment(invoiceId: string, data: any, userId?: string) {
    const invoice = await this.getById(invoiceId);
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      throw new Error('Valid payment amount is required');
    }

    const partyId = invoice.customer?.id || (invoice.order as any)?.customerId || (invoice as any).metadata?.customerId;
    const companyProfileId = invoice.companyProfile?.id || (invoice.order as any)?.companyProfileId || (invoice as any).metadata?.companyProfileId;

    if (!partyId) {
      throw new Error('Unable to record payment: No customer associated with this invoice');
    }

    // Call financeService to create payment and allocation
    const payment = await financeService.recordPayment(
      {
        companyProfileId,
        partyId,
        paymentType: 'CUSTOMER_PAYMENT',
        paymentMethod: data.paymentMethod || 'NEFT_RTGS',
        referenceNumber: data.referenceNumber,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        notes: data.notes || `Payment recorded for Bill ${invoice.invoiceNumber}`,
        allocations: [
          {
            documentType: 'INVOICE',
            documentId: invoice.id,
            allocatedAmount: amount,
          },
        ],
      },
      userId
    );

    // Refresh invoice balances and update status
    const refreshed = await this.getById(invoiceId);
    const newStatus = refreshed.balanceDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: newStatus as any,
        paidAt: refreshed.balanceDue <= 0 ? new Date() : undefined,
      },
    });

    return {
      payment,
      invoice: await this.getById(invoiceId),
    };
  },

  /**
   * Generates a formal GST Tax Invoice / Bill from an approved Sales Order.
   */
  async createFromOrder(orderId: string, userId?: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: { customer: true, items: true, companyProfile: true },
    });
    if (!order) throw Object.assign(new Error('Sales Order not found'), { status: 404 });

    const existing = await prisma.invoice.findFirst({ where: { orderId: order.id } });
    if (existing) return existing;

    const isKolkata = Boolean(
      order.orderNumber?.startsWith('PPSK/') ||
      order.companyProfile?.entityCode === 'PPS-KOL' ||
      order.companyProfile?.stateCode === '19' ||
      order.companyProfile?.companyName?.toLowerCase().includes('kolkata')
    );

    const seq = await sequenceService.getNextDocumentNumber(order.companyProfileId, 'INV', { isKolkata });
    const invoiceNumber = seq.number;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: order.id,
        proformaInvoiceId: order.proformaInvoiceId || null,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        totalAmount: order.grandTotal,
        currency: order.currency || 'INR',
        status: 'DRAFT',
        notes: `Tax invoice generated from Sales Order ${order.orderNumber}`,
      },
      include: {
        order: {
          include: { customer: true, companyProfile: true, items: true },
        },
      },
    });

    return invoice;
  },

  /**
   * Generates vector A4 GST Tax Invoice PDF HTML with statutory compliance.
   * NOTE: QR code is strictly omitted per user requirement.
   */
  async getPdfHtml(id: string): Promise<string> {
    const invoice = await this.getById(id);
    const company = invoice.companyProfile as any;
    const customer = invoice.customer as any;
    const billTo = (invoice as any).billTo;
    const shipTo = (invoice as any).shipTo;
    const transport = (invoice as any).transport;
    const items = (invoice as any).items || [];

    const primaryBank = company?.bankAccounts?.find((b: any) => b.isDefault) || company?.bankAccounts?.[0];
    const signatories = company?.signatories || [];
    const authSignatory = signatories.find((s: any) => s.isDefault && s.signatureUrl) || signatories[0];

    const isKolkataInv =
      company?.id === 'a25090ef-f6c0-407f-8b1e-1da8d506308c' ||
      company?.stateCode === '19' ||
      company?.entityCode === 'PPS-KOL' ||
      (company?.companyName || '').toLowerCase().includes('kolkata') ||
      (invoice.invoiceNumber || '').startsWith('PPSK/');

    let companyAddress = '';
    const compAddr = company?.addresses?.find((a: any) => a.isDefault) || company?.addresses?.[0];
    if (compAddr) {
      const parts = [
        compAddr.addressLine1,
        compAddr.addressLine2,
        compAddr.city,
        compAddr.state ? `${compAddr.state}${compAddr.postalCode ? ` - ${compAddr.postalCode}` : ''}` : (compAddr.postalCode ? `PIN: ${compAddr.postalCode}` : '')
      ].filter(Boolean);
      companyAddress = parts.join(', ');
    }
    if (!companyAddress) {
      companyAddress = isKolkataInv
        ? 'Village Burirhat Bazar, P.O-Chowrashi, P.S-Deganga, Distt-North 24 Paragana, West Bengal - 743424'
        : 'H-3, JR Complex, Gate No. 4, Melaram farm, Sewa Dham Rd, Mandoli, Delhi - 110093';
    }

    return pdfService.generateTaxInvoicePdfHtml({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : undefined,
      companyName: company?.companyName || 'PACIFIC PRODUCTS AND SOLUTIONS',
      companyAddress,
      companyPhone: company?.phone || '9818592113/ 9882056529',
      companyEmail: company?.email || 'info.pacificproduct@gmail.com',
      companyGstin: company?.gstin || (isKolkataInv ? '19CIJPS1392A1Z5' : '07CIJPS1392A2Z9'),
      companyPan: company?.pan || 'CIJPS1392A',
      companyState: isKolkataInv ? 'West Bengal' : 'Delhi',
      companyStateCode: isKolkataInv ? '19' : '07',
      logoUrl: company?.logoUrl || undefined,
      // QR code intentionally omitted
      customerName: billTo?.partyName || customer?.legalName || 'Valued Customer',
      customerGstin: billTo?.gstin || customer?.gstin || '',
      customerAddress: billTo?.address || customer?.addresses?.[0]?.addressLine1 || '',
      customerState: billTo?.state || customer?.addresses?.[0]?.state || (isKolkataInv ? 'West Bengal' : 'Delhi'),
      customerStateCode: billTo?.stateCode || customer?.addresses?.[0]?.stateCode || (isKolkataInv ? '19' : '07'),
      consigneeName: shipTo?.partyName || billTo?.partyName || customer?.legalName,
      deliveryAddress: shipTo?.address || billTo?.address || '',
      consigneeGstin: shipTo?.gstin || billTo?.gstin || '',
      consigneeState: shipTo?.state || billTo?.state || '',
      consigneeStateCode: shipTo?.stateCode || billTo?.stateCode || '',
      placeOfSupply: transport?.placeOfSupply || billTo?.state || (isKolkataInv ? 'West Bengal' : 'Delhi'),
      reverseCharge: transport?.reverseCharge || false,
      modeOfTransport: transport?.modeOfTransport || 'By Road',
      vehicleNumber: transport?.vehicleNumber || '',
      grLrNumber: transport?.grLrNumber || '',
      orderNumber: (invoice.order as any)?.orderNumber || undefined,
      piNumber: invoice.linkedPi?.piNumber || undefined,
      items,
      subtotal: Number(invoice.subtotal),
      freightAmount: Number((invoice as any).freightAmount || 0),
      freightTerms: (invoice as any).freightTerms,
      roundingAdjustment: Number((invoice as any).roundingAdjustment || 0),
      taxAmount: Number(invoice.taxAmount),
      grandTotal: Number(invoice.totalAmount),
      currency: invoice.currency || 'INR',
      status: invoice.status,
      bankDetails: primaryBank
        ? {
            bankName: primaryBank.bankName,
            accountNumber: primaryBank.accountNumber,
            ifscCode: primaryBank.ifscCode,
            branchName: primaryBank.branchName || undefined,
          }
        : {
            bankName: 'HDFC BANK',
            accountNumber: '50200123651435',
            ifscCode: 'HDFC0000395',
            branchName: 'YAMUNA VIHAR BRANCH, DELHI-110053',
          },
      signatureUrl: authSignatory?.signatureUrl || company?.signatureUrl || undefined,
      signatoryName: authSignatory?.name || undefined,
      jurisdiction: isKolkataInv ? 'SUBJECT TO WEST BENGAL JURISDICTION ONLY' : 'SUBJECT TO DELHI JURISDICTION ONLY',
    });
  },

  async update(id: string, data: any) {
    const existing = await this.getById(id);
    const existingMeta = existing.metadata || {};

    const existingTransport = existingMeta.transport || (existing as any).transport || {};
    const inputTransport = data.transport || {};
    const updatedTransport = {
      ...existingTransport,
      ...inputTransport,
      ...(data.vehicleNumber !== undefined ? { vehicleNumber: data.vehicleNumber } : {}),
      ...(data.vehicleNo !== undefined ? { vehicleNumber: data.vehicleNo } : {}),
      ...(data.modeOfTransport !== undefined ? { modeOfTransport: data.modeOfTransport } : {}),
      ...(data.grLrNumber !== undefined ? { grLrNumber: data.grLrNumber } : {}),
      ...(data.placeOfSupply !== undefined ? { placeOfSupply: data.placeOfSupply } : {}),
      ...(data.placeOfSupplyStateCode !== undefined ? { placeOfSupplyStateCode: data.placeOfSupplyStateCode } : {}),
      ...(data.reverseCharge !== undefined ? { reverseCharge: data.reverseCharge } : {}),
    };

    const updatedMeta = {
      ...existingMeta,
      ...(data.items ? { items: data.items } : {}),
      ...(data.billTo ? { billTo: data.billTo } : {}),
      ...(data.shipTo ? { shipTo: data.shipTo } : {}),
      transport: updatedTransport,
      ...(data.freightAmount !== undefined ? { freightAmount: Number(data.freightAmount) } : {}),
      ...(data.freightTerms !== undefined ? { freightTerms: data.freightTerms } : {}),
      ...(data.roundingAdjustment !== undefined ? { roundingAdjustment: Number(data.roundingAdjustment) } : {}),
      ...(data.userNotes !== undefined ? { userNotes: data.userNotes } : {}),
      ...(data.customerId ? { customerId: data.customerId } : {}),
      ...(data.companyProfileId ? { companyProfileId: data.companyProfileId } : {}),
      ...(data.branch ? { branch: data.branch } : {}),
      ...(data.isKolkata !== undefined ? { isKolkata: data.isKolkata } : {}),
      ...(data.gstRate !== undefined ? { gstRate: Number(data.gstRate) } : {}),
    };

    const updatePayload: any = {};
    if (data.invoiceNumber && data.invoiceNumber.trim() && data.invoiceNumber.trim() !== existing.invoiceNumber) {
      updatePayload.invoiceNumber = data.invoiceNumber.trim();
    }
    if (data.subtotal !== undefined) updatePayload.subtotal = data.subtotal;
    if (data.taxAmount !== undefined) updatePayload.taxAmount = data.taxAmount;
    if (data.totalAmount !== undefined) updatePayload.totalAmount = data.totalAmount;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.issueDate !== undefined) updatePayload.issueDate = new Date(data.issueDate);
    if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.paidAt !== undefined) updatePayload.paidAt = data.paidAt ? new Date(data.paidAt) : null;
    updatePayload.notes = JSON.stringify(updatedMeta);

    return prisma.invoice.update({
      where: { id },
      data: updatePayload,
    });
  },

  async delete(id: string) {
    return prisma.invoice.delete({ where: { id } });
  },
};
