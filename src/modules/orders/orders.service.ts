import { prisma } from '../../config/database';
import { sequenceService } from '../sequences/sequence.service';
import { auditService } from '../audit/audit.service';
import { emailService } from '../../utils/email.service';
import { pdfService } from '../pdf/pdf.service';
import { qrService } from '../qr/qr.service';
import { GST_STATE_CODE_MAP, isDelhiGst } from '../tax/tax.engine';

function parseItemSpecs(desc: string) {
  const match = desc.match(/\((Board:.*?)\)/i) || desc.match(/\((.*?Hardware:.*?)\)/i);
  if (!match) return {};
  const parts = match[1].split('|').map((s) => s.trim());
  const res: Record<string, string> = {};
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx !== -1) {
      const k = part.substring(0, colonIdx).trim().toLowerCase();
      const v = part.substring(colonIdx + 1).trim();
      if (k.includes('board') && !k.includes('color') && !k.includes('thick')) res.boardType = v;
      if (k.includes('thick')) res.boardThickness = v;
      if (k.includes('color')) res.boardColor = v;
      if (k.includes('size') && !k.includes('door')) res.cubicleSize = v;
      if (k.includes('door')) res.doorSize = v;
      if (k.includes('height')) res.overallHeight = v;
      if (k.includes('hardware')) res.hardwarePackage = v;
    }
  }
  return res;
}

export const ordersService = {
  async list(params?: {
    search?: string;
    status?: string;
    customerId?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.status) {
      if (params.status === 'PENDING') {
        where.status = { in: ['PENDING_APPROVAL', 'DRAFT'] };
      } else {
        where.status = params.status;
      }
    }
    if (params?.customerId) where.customerId = params.customerId;
    if (params?.source) where.source = params.source;
    if (params?.startDate || params?.endDate) {
      where.orderDate = {};
      if (params.startDate) where.orderDate.gte = new Date(params.startDate);
      if (params.endDate) where.orderDate.lte = new Date(params.endDate);
    }
    if (params?.search) {
      where.OR = [
        { orderNumber: { contains: params.search, mode: 'insensitive' } },
        { quotationRef: { contains: params.search, mode: 'insensitive' } },
        { customerPoNumber: { contains: params.search, mode: 'insensitive' } },
        { customer: { legalName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.salesOrder.count({ where }),
      prisma.salesOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { orderDate: 'desc' },
        include: {
          customer: true,
          companyProfile: { select: { id: true, companyName: true, currency: true } },
          quotation: { select: { id: true, referenceNumber: true } },
          items: true,
          proformaInvoices: { select: { id: true, piNumber: true, status: true, grandTotal: true } },
          packingLists: { select: { id: true, packingListNumber: true, totalQuantity: true, receiptStatus: true } },
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

  async getById(id: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: { include: { addresses: true, contacts: true } },
        companyProfile: {
          include: {
            addresses: true,
            bankAccounts: true,
            signatories: true,
          },
        },
        quotation: true,
        items: {
          include: { product: true },
          orderBy: { serialNumber: 'asc' },
        },
        proformaInvoices: {
          include: { items: true },
          orderBy: { piDate: 'desc' },
        },
        packingLists: {
          include: { items: true },
          orderBy: { date: 'desc' },
        },
        hardwareIssues: {
          include: { items: true },
          orderBy: { date: 'desc' },
        },
        dispatchRecords: {
          orderBy: { dispatchDate: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!order) throw new Error('Sales Order not found');
    return order;
  },

  async createFromQuotation(quotation: any, userId?: string) {
    const seq = await sequenceService.getNextDocumentNumber(quotation.companyProfileId, 'ORDER');
    const orderNumber = seq.number;

    const itemsData = quotation.items.map((it: any, idx: number) => {
      const fallbackSpecs = parseItemSpecs(it.description || '');
      const boardType = it.boardType || fallbackSpecs.boardType || (it.customSpecsJson as any)?.boardType || null;
      const boardThickness = it.boardThickness || fallbackSpecs.boardThickness || (it.customSpecsJson as any)?.boardThickness || null;
      const boardColor = it.boardColor || fallbackSpecs.boardColor || (it.customSpecsJson as any)?.boardColor || null;
      const cubicleSize = it.cubicleSize || fallbackSpecs.cubicleSize || (it.customSpecsJson as any)?.cubicleSize || null;
      const doorSize = it.doorSize || fallbackSpecs.doorSize || (it.customSpecsJson as any)?.doorSize || null;
      const overallHeight = it.overallHeight || fallbackSpecs.overallHeight || (it.customSpecsJson as any)?.overallHeight || null;
      const hardwarePackage = it.hardwarePackage || fallbackSpecs.hardwarePackage || (it.customSpecsJson as any)?.hardwarePackage || null;

      const specsJson = {
        boardType,
        boardThickness,
        boardColor,
        cubicleSize,
        doorSize,
        overallHeight,
        hardwarePackage,
      };

      return {
        serialNumber: idx + 1,
        productId: it.productId || null,
        description: it.description || 'Restroom Cubicle Item',
        quantity: Number(it.quantity) || 1,
        dispatchedQuantity: 0,
        unit: it.unit || 'NOS',
        rate: Number(it.rate) || 0,
        amount: Number(it.amount) || (Number(it.quantity) * Number(it.rate)),
        specsJson,
        boardType,
        boardThickness,
        boardColor,
        cubicleSize,
        doorSize,
        overallHeight,
        hardwarePackage,
      };
    });

    const activeGstin = (quotation.customerGstin || quotation.customer?.gstin || '').trim().toUpperCase();
    const rawPos = quotation.recipientAddress?.split(',').pop()?.trim() || '';
    const isDelhi = isDelhiGst(activeGstin, undefined, rawPos || quotation.recipientAddress);

    const posStateCode = isDelhi ? '07' : (activeGstin.length >= 2 ? activeGstin.slice(0, 2) : '07');
    const posStateName = isDelhi ? 'Delhi' : (GST_STATE_CODE_MAP[posStateCode] || rawPos || 'Interstate');

    const totalTaxAmount = Number(quotation.gstAmount) || 0;
    const cgstAmount = isDelhi ? totalTaxAmount / 2 : 0;
    const sgstAmount = isDelhi ? totalTaxAmount / 2 : 0;
    const igstAmount = isDelhi ? 0 : totalTaxAmount;

    const termsList = [quotation.generalTerms, quotation.paymentTerms, quotation.deliveryTerms, quotation.otherTerms].filter(Boolean);

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        orderDate: new Date(),
        companyProfileId: quotation.companyProfileId,
        customerId: quotation.customerId,
        source: 'CONVERTED_QUOTATION',
        quotationId: quotation.id,
        quotationRef: quotation.referenceNumber,
        currency: quotation.currency || 'INR',
        subtotal: Number(quotation.basicPrice) || 0,
        freightAmount: Number(quotation.freightAmount) || 0,
        cgstAmount,
        sgstAmount,
        igstAmount,
        taxAmount: totalTaxAmount,
        grandTotal: Number(quotation.grandTotal) || 0,
        placeOfSupply: posStateName,
        placeOfSupplyStateCode: posStateCode,
        accessoriesText: quotation.accessoriesText || null,
        termsJson: termsList,
        status: 'PENDING_APPROVAL',
        statusReason: `Auto-converted from accepted quotation ${quotation.referenceNumber}; pending order confirmation`,
        createdById: userId || null,
        approvedById: null,
        billingAddressSnapshot: {
          partyName: quotation.recipientCompany || quotation.recipientName || quotation.customer?.legalName,
          address: quotation.recipientAddress || quotation.customer?.addresses?.[0]?.addressLine1 || 'Registered Billing Address',
          gstin: activeGstin || undefined,
          pan: quotation.customer?.pan || undefined,
          phone: quotation.recipientPhone || quotation.customer?.phone || undefined,
          email: quotation.recipientEmail || quotation.customer?.email || undefined,
          state: posStateName,
          stateCode: posStateCode,
        },
        shippingAddressSnapshot: {
          partyName: quotation.recipientName || quotation.recipientCompany || quotation.customer?.legalName,
          recipient: quotation.recipientName || quotation.recipientCompany || quotation.customer?.legalName,
          address: quotation.recipientAddress || quotation.customer?.addresses?.[0]?.addressLine1 || 'Delivery Address',
          phone: quotation.recipientPhone || quotation.customer?.phone || undefined,
          state: posStateName,
          stateCode: posStateCode,
        },
        items: {
          create: itemsData,
        },
        nextFollowupDate: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
        followupStatus: 'PENDING',
        followupCount: 1,
        followups: {
          create: {
            channel: 'CALL',
            status: 'PENDING',
            discussionNotes: `Initial follow-up auto-scheduled within 2.5 hours of order conversion from accepted quotation ${quotation.referenceNumber}. Verify site measurement & advance billing.`,
            nextFollowupDate: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
            performedByName: 'System Scheduler',
          },
        },
        statusHistory: {
          create: {
            fromStatus: 'DRAFT',
            toStatus: 'APPROVED',
            changedById: userId || null,
            comment: `Created and approved from accepted quotation ${quotation.referenceNumber}`,
          },
        },
      },
      include: { items: true, customer: true },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'CREATE',
        module: 'Sales',
        entityType: 'SalesOrder',
        entityId: order.id,
        newData: { orderNumber, quotationRef: quotation.referenceNumber, grandTotal: order.grandTotal },
      });
    }

    return order;
  },

  /**
   * Creates a formal Sales Order from a Proforma Invoice with advance tracking sync.
   */
  async createFromProforma(pi: any, userId?: string) {
    const seq = await sequenceService.getNextDocumentNumber(pi.companyProfileId, 'ORDER');
    const orderNumber = seq.number;

    const itemsData = (pi.items || []).map((it: any, idx: number) => {
      const fallbackSpecs = parseItemSpecs(it.description || '');
      const boardType = it.boardType || fallbackSpecs.boardType || null;
      const boardThickness = it.boardThickness || fallbackSpecs.boardThickness || null;
      const boardColor = it.boardColor || fallbackSpecs.boardColor || null;
      const cubicleSize = it.cubicleSize || fallbackSpecs.cubicleSize || null;
      const doorSize = it.doorSize || fallbackSpecs.doorSize || null;
      const overallHeight = it.overallHeight || fallbackSpecs.overallHeight || null;
      const hardwarePackage = it.hardwarePackage || fallbackSpecs.hardwarePackage || null;

      const specsJson = {
        boardType,
        boardThickness,
        boardColor,
        cubicleSize,
        doorSize,
        overallHeight,
        hardwarePackage,
      };

      return {
        serialNumber: idx + 1,
        productId: it.productId || null,
        description: it.description || 'Restroom Cubicle Item',
        quantity: Number(it.quantity) || 1,
        dispatchedQuantity: 0,
        unit: it.unit || 'NOS',
        rate: Number(it.rate) || 0,
        amount: Number(it.amount) || (Number(it.quantity) * Number(it.rate)),
        specsJson,
        boardType,
        boardThickness,
        boardColor,
        cubicleSize,
        doorSize,
        overallHeight,
        hardwarePackage,
      };
    });

    const billToParty = pi.parties?.find((p: any) => p.partyRole === 'BILL_TO');
    const shipToParty = pi.parties?.find((p: any) => p.partyRole === 'SHIP_TO') || billToParty;
    const customerPan =
      (billToParty as any)?.pan ||
      (billToParty?.gstin && billToParty.gstin.length === 15
        ? billToParty.gstin.substring(2, 12)
        : pi.customer?.pan || undefined);

    const initialStatus = pi.advancePaymentStatus === 'FULLY_RECEIVED' ? 'APPROVED' : 'PENDING_APPROVAL';
    const termsList = Array.isArray(pi.terms) ? pi.terms.map((t: any) => t.text || t) : [];

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        orderDate: new Date(),
        companyProfileId: pi.companyProfileId,
        customerId: pi.customerId,
        source: 'CONVERTED_PROFORMA',
        proformaInvoiceId: pi.id,
        piNumber: pi.piNumber,
        quotationId: pi.quotationId || null,
        quotationRef: pi.quotationRef || null,
        currency: pi.currency || 'INR',
        subtotal: pi.taxableSubtotal ? Number(pi.taxableSubtotal) : (Number(pi.grandTotal) - Number(pi.totalTaxAmount)),
        freightAmount: Number(pi.freightAmount) || 0,
        cgstAmount: Number(pi.cgstAmount) || 0,
        sgstAmount: Number(pi.sgstAmount) || 0,
        igstAmount: Number(pi.igstAmount) || 0,
        taxAmount: Number(pi.totalTaxAmount) || 0,
        grandTotal: Number(pi.grandTotal) || 0,
        placeOfSupply: pi.placeOfSupply || 'Delhi',
        placeOfSupplyStateCode: pi.placeOfSupplyStateCode || '07',
        accessoriesText: (pi as any).accessoriesText || (pi as any).notes || null,
        termsJson: termsList,
        status: initialStatus,
        statusReason: `Auto-converted from Proforma Invoice ${pi.piNumber}. Advance Status: ${pi.advancePaymentStatus || 'PENDING'}`,
        createdById: userId || null,
        approvedById: pi.advancePaymentStatus === 'FULLY_RECEIVED' ? (userId || null) : null,
        shippingAddressSnapshot: shipToParty ? {
          partyName: shipToParty.partyName || billToParty?.partyName || pi.customer?.legalName,
          recipient: shipToParty.partyName || billToParty?.partyName || pi.customer?.legalName,
          address: shipToParty.addressLine,
          state: shipToParty.state,
          stateCode: shipToParty.stateCode,
          phone: shipToParty.phone,
          gstin: shipToParty.gstin,
        } : undefined,
        billingAddressSnapshot: billToParty ? {
          partyName: billToParty.partyName || pi.customer?.legalName,
          address: billToParty.addressLine,
          state: billToParty.state,
          stateCode: billToParty.stateCode,
          phone: billToParty.phone || pi.customer?.phone,
          email: billToParty.email || pi.customer?.email,
          gstin: billToParty.gstin || pi.customer?.gstin,
          pan: customerPan,
        } : undefined,
        items: {
          create: itemsData,
        },
        nextFollowupDate: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
        followupStatus: 'PENDING',
        followupCount: 1,
        followups: {
          create: {
            channel: 'CALL',
            status: 'PENDING',
            discussionNotes: `Initial follow-up scheduled after conversion from Proforma Invoice ${pi.piNumber}. Advance payment ${pi.advancePaymentStatus === 'FULLY_RECEIVED' ? 'fully cleared' : 'partial/pending'}. Confirm site dimensions and production drawings.`,
            nextFollowupDate: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
            performedByName: 'System Scheduler',
          },
        },
        statusHistory: {
          create: {
            fromStatus: 'DRAFT',
            toStatus: initialStatus,
            changedById: userId || null,
            comment: `Created from Proforma Invoice ${pi.piNumber} (Advance: ${pi.advancePaymentStatus || 'PENDING'})`,
          },
        },
      },
      include: { items: true, customer: true },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'CREATE',
        module: 'Sales',
        entityType: 'SalesOrder',
        entityId: order.id,
        newData: { orderNumber, piNumber: pi.piNumber, quotationRef: pi.quotationRef, grandTotal: order.grandTotal },
      });
    }

    return order;
  },

  async createDirect(data: any, userId?: string) {
    if (!data.customerId) throw new Error('Customer is required');
    if (!data.companyProfileId) throw new Error('Company Profile is required');
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('At least one order line item is required');
    }

    const seq = await sequenceService.getNextDocumentNumber(data.companyProfileId, 'ORDER');
    const orderNumber = seq.number;

    const itemsData = data.items.map((it: any, idx: number) => {
      const qty = Number(it.quantity) || 1;
      const rate = Number(it.rate) || 0;
      const fallbackSpecs = parseItemSpecs(it.description || '');
      const boardType = it.boardType || fallbackSpecs.boardType || it.specsJson?.boardType || null;
      const boardThickness = it.boardThickness || fallbackSpecs.boardThickness || it.specsJson?.boardThickness || null;
      const boardColor = it.boardColor || fallbackSpecs.boardColor || it.specsJson?.boardColor || null;
      const cubicleSize = it.cubicleSize || fallbackSpecs.cubicleSize || it.specsJson?.cubicleSize || null;
      const doorSize = it.doorSize || fallbackSpecs.doorSize || it.specsJson?.doorSize || null;
      const overallHeight = it.overallHeight || fallbackSpecs.overallHeight || it.specsJson?.overallHeight || null;
      const hardwarePackage = it.hardwarePackage || fallbackSpecs.hardwarePackage || it.specsJson?.hardwarePackage || null;

      const specsJson = {
        boardType,
        boardThickness,
        boardColor,
        cubicleSize,
        doorSize,
        overallHeight,
        hardwarePackage,
      };

      return {
        serialNumber: idx + 1,
        productId: it.productId || null,
        description: it.description || 'Cubicle Line Item',
        quantity: qty,
        dispatchedQuantity: 0,
        unit: it.unit || 'NOS',
        rate,
        amount: qty * rate,
        specsJson,
        boardType,
        boardThickness,
        boardColor,
        cubicleSize,
        doorSize,
        overallHeight,
        hardwarePackage,
      };
    });

    const subtotal = itemsData.reduce((sum: number, it: any) => sum + it.amount, 0);
    const freightAmount = Number(data.freightAmount) || 0;
    const taxableTotal = subtotal + freightAmount;
    const taxRate = Number(data.taxRate) || 18;
    const totalTaxAmount = Math.round((taxableTotal * (taxRate / 100)) * 100) / 100;
    const grandTotal = Math.round(taxableTotal + totalTaxAmount);

    const activeGstin = (
      data.billingAddress?.gstin ||
      data.billingAddressSnapshot?.gstin ||
      ''
    ).trim().toUpperCase();

    const isDelhi = isDelhiGst(activeGstin, data.placeOfSupplyStateCode, data.placeOfSupply || data.billingAddress?.address);

    const posStateCode = isDelhi
      ? '07'
      : (activeGstin.length >= 2 ? activeGstin.slice(0, 2) : (data.placeOfSupplyStateCode || '07'));
    const posStateName = isDelhi
      ? 'Delhi'
      : (data.placeOfSupply || GST_STATE_CODE_MAP[posStateCode] || 'Interstate');

    const cgstAmount = isDelhi ? totalTaxAmount / 2 : 0;
    const sgstAmount = isDelhi ? totalTaxAmount / 2 : 0;
    const igstAmount = isDelhi ? 0 : totalTaxAmount;

    const billingAddress = data.billingAddress || data.billingAddressSnapshot || null;
    const shippingAddress = data.shippingAddress || data.shippingAddressSnapshot || billingAddress;

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        companyProfileId: data.companyProfileId,
        customerId: data.customerId,
        source: data.source || 'DIRECT_ENTRY',
        quotationId: data.quotationId || null,
        quotationRef: data.quotationRef || null,
        proformaInvoiceId: data.proformaInvoiceId || null,
        piNumber: data.piNumber || null,
        customerPoNumber: data.customerPoNumber || data.clientPoNumber || null,
        customerPoDate: data.customerPoDate ? new Date(data.customerPoDate) : (data.clientPoDate ? new Date(data.clientPoDate) : null),
        customerPoFileUrl: data.customerPoFileUrl || null,
        currency: data.currency || 'INR',
        subtotal,
        freightAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        taxAmount: totalTaxAmount,
        grandTotal,
        placeOfSupply: posStateName,
        placeOfSupplyStateCode: posStateCode,
        accessoriesText: data.accessoriesText || null,
        termsJson: Array.isArray(data.terms) ? data.terms : (data.termsJson || []),
        status: data.requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED',
        statusReason: data.notes || null,
        createdById: userId || null,
        approvedById: data.requiresApproval ? null : userId || null,
        shippingAddressSnapshot: shippingAddress,
        billingAddressSnapshot: billingAddress,
        siteContactSnapshot: data.siteContact || data.siteContactSnapshot || null,
        items: {
          create: itemsData,
        },
        nextFollowupDate: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
        followupStatus: 'PENDING',
        followupCount: 1,
        followups: {
          create: {
            channel: 'CALL',
            status: 'PENDING',
            discussionNotes: 'Initial order follow-up auto-scheduled within 2.5 hours of order entry. Verify site measurement, fabrication specs & advance payment.',
            nextFollowupDate: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
            performedByName: 'System Scheduler',
          },
        },
        statusHistory: {
          create: {
            fromStatus: 'DRAFT',
            toStatus: data.requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED',
            changedById: userId || null,
            comment: data.requiresApproval ? 'Submitted for approval' : 'Direct order approved',
          },
        },
      },
      include: { items: true, customer: true },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'CREATE',
        module: 'Sales',
        entityType: 'SalesOrder',
        entityId: order.id,
        newData: { orderNumber, grandTotal: order.grandTotal },
      });
    }

    return order;
  },

  async approve(id: string, userId?: string) {
    const order = await this.getById(id);
    if (order.status !== 'PENDING_APPROVAL' && order.status !== 'DRAFT') {
      throw new Error(`Order ${order.orderNumber} is already in status ${order.status}`);
    }

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId || null,
      },
    });

    await prisma.salesOrderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: 'APPROVED',
        changedById: userId || null,
        comment: 'Order approved by administrator.',
      },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'APPROVE',
        module: 'Sales',
        entityType: 'SalesOrder',
        entityId: id,
        newData: { status: 'APPROVED' },
      });
    }

    return updated;
  },

  async updateStatus(id: string, newStatus: string, reason?: string, userId?: string) {
    const order = await this.getById(id);
    const validStatuses = [
      'DRAFT',
      'PENDING_APPROVAL',
      'WAITING_FOR_ADVANCE',
      'APPROVED',
      'PI_ISSUED',
      'IN_PRODUCTION',
      'PARTIALLY_DISPATCHED',
      'FULLY_DISPATCHED',
      'COMPLETED',
      'CANCELLED',
    ];

    const normalizedStatus = newStatus === 'PENDING' ? 'PENDING_APPROVAL' : newStatus;

    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error(`Invalid status "${newStatus}". Valid options: ${validStatuses.join(', ')}`);
    }

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: normalizedStatus as any,
        statusReason: reason || undefined,
        ...(normalizedStatus === 'APPROVED' && !order.approvedById ? { approvedById: userId || null } : {}),
      },
      include: {
        customer: true,
        companyProfile: true,
        quotation: true,
        items: true,
        statusHistory: {
          include: { changedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    await prisma.salesOrderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: normalizedStatus as any,
        changedById: userId || null,
        comment: reason || `Status updated to ${normalizedStatus}`,
      },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'UPDATE_STATUS',
        module: 'Sales',
        entityType: 'SalesOrder',
        entityId: id,
        newData: { fromStatus: order.status, toStatus: normalizedStatus, reason },
      });
    }

    return updated;
  },

  async cancel(id: string, reason: string, userId?: string) {
    const order = await this.getById(id);
    if (order.packingLists.length > 0) {
      throw new Error(`Cannot cancel Order ${order.orderNumber} because ${order.packingLists.length} packing list(s) have already been dispatched.`);
    }

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        statusReason: reason,
      },
    });

    await prisma.salesOrderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        changedById: userId || null,
        comment: reason,
      },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'CANCEL',
        module: 'Sales',
        entityType: 'SalesOrder',
        entityId: id,
        newData: { status: 'CANCELLED', reason },
      });
    }

    return updated;
  },

  /**
   * Recalculates order dispatched quantities & derived status upon packing list mutations.
   */
  async reconcileDispatch(orderId: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        packingLists: { include: { items: true } },
      },
    });
    if (!order) return;

    // Sum dispatched qty across all packing lists
    const totalOrdered = order.items.reduce((sum, it) => sum + Number(it.quantity), 0);
    let totalDispatched = 0;

    for (const pl of order.packingLists) {
      totalDispatched += Number(pl.totalQuantity);
    }

    let derivedStatus = order.status;
    if (totalDispatched === 0) {
      // Leave as APPROVED or PI_ISSUED
    } else if (totalDispatched >= totalOrdered) {
      derivedStatus = 'FULLY_DISPATCHED';
    } else {
      derivedStatus = 'PARTIALLY_DISPATCHED';
    }

    if (derivedStatus !== order.status) {
      await prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: derivedStatus },
      });
      await prisma.salesOrderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: derivedStatus,
          comment: `Status automatically derived from packing lists (${totalDispatched}/${totalOrdered} units dispatched).`,
        },
      });
    }
  },

  /**
   * Complete 7-Stage Document Timeline:
   * 1. Quotation -> 2. Proforma Invoice (with Advance Payment Tracker) -> 3. Sales Order ->
   * 4. Bill & Invoice -> 5. Packing List -> 6. Dispatch -> 7. Issue List
   */
  async getDocumentTimeline(orderId: string) {
    const order = await this.getById(orderId);

    const timeline: Array<{
      type: 'QUOTATION' | 'PI' | 'ORDER' | 'INVOICE' | 'PACKING_LIST' | 'DISPATCH' | 'HARDWARE_ISSUE';
      stageNumber: number;
      id: string;
      referenceNumber: string;
      title: string;
      date: string;
      status: string;
      amount?: number;
      pdfUrl?: string;
      metadata?: any;
    }> = [];

    // Stage 1: Originating Quotation (if linked directly or via quotationId)
    if (order.quotation) {
      timeline.push({
        type: 'QUOTATION',
        stageNumber: 1,
        id: order.quotation.id,
        referenceNumber: order.quotation.referenceNumber,
        title: `Sales Quotation (${order.quotation.projectName || 'Restroom Cubicle'})`,
        date: order.quotation.date.toISOString(),
        status: order.quotation.status,
        amount: Number(order.quotation.grandTotal),
        pdfUrl: `/api/v1/sales/quotations/${order.quotation.id}/pdf`,
        metadata: {
          recipientName: order.quotation.recipientName,
          convertedPiId: (order.quotation as any).convertedPiId,
        },
      });
    }

    // Stage 2: Proforma Invoices (with Advance Payment Tracking)
    for (const pi of order.proformaInvoices) {
      timeline.push({
        type: 'PI',
        stageNumber: 2,
        id: pi.id,
        referenceNumber: pi.piNumber,
        title: `Proforma Invoice (Advance Tracking & GST Engine)`,
        date: pi.piDate.toISOString(),
        status: pi.status,
        amount: Number(pi.grandTotal),
        pdfUrl: `/api/v1/sales/pi/${pi.id}/pdf`,
        metadata: {
          advancePercentage: (pi as any).advancePercentage || 50,
          advanceRequiredAmount: Number((pi as any).advanceRequiredAmount) || (Number(pi.grandTotal) * 0.5),
          advanceReceivedAmount: Number((pi as any).advanceReceivedAmount) || 0,
          advancePaymentStatus: (pi as any).advancePaymentStatus || 'PENDING',
          advancePaymentDate: (pi as any).advancePaymentDate ? new Date((pi as any).advancePaymentDate).toISOString() : null,
          advancePaymentReference: (pi as any).advancePaymentReference || null,
          advancePaymentMode: (pi as any).advancePaymentMode || null,
          convertedOrderId: (pi as any).convertedOrderId || order.id,
        },
      });
    }

    // Stage 3: The Sales Order itself
    timeline.push({
      type: 'ORDER',
      stageNumber: 3,
      id: order.id,
      referenceNumber: order.orderNumber,
      title: `Sales Order Hub (Approved Spec & PO)`,
      date: order.orderDate.toISOString(),
      status: order.status,
      amount: Number(order.grandTotal),
      pdfUrl: `/api/v1/sales/orders/${order.id}/pdf`,
      metadata: {
        source: order.source,
        poNumber: order.customerPoNumber,
        piNumber: (order as any).piNumber,
        quotationRef: order.quotationRef,
      },
    });

    // Stage 4: Tax Invoices & Final Bills
    for (const inv of (order.invoices || [])) {
      timeline.push({
        type: 'INVOICE',
        stageNumber: 4,
        id: inv.id,
        referenceNumber: inv.invoiceNumber,
        title: `GST Tax Invoice & Bill`,
        date: inv.issueDate ? inv.issueDate.toISOString() : inv.createdAt.toISOString(),
        status: inv.status,
        amount: Number(inv.totalAmount),
        pdfUrl: `/api/v1/invoices/${inv.id}/pdf`,
        metadata: {
          subtotal: Number(inv.subtotal),
          taxAmount: Number(inv.taxAmount),
        },
      });
    }

    // Stage 5: Packing Lists
    for (const pl of order.packingLists) {
      timeline.push({
        type: 'PACKING_LIST',
        stageNumber: 5,
        id: pl.id,
        referenceNumber: pl.packingListNumber,
        title: `Packing List (${pl.isPartialDispatch ? 'Partial' : 'Full'} Dispatch)`,
        date: pl.date.toISOString(),
        status: pl.receiptStatus,
        pdfUrl: `/api/v1/sales/packing-lists/${pl.id}/pdf`,
        metadata: { totalPackages: pl.totalPackages, totalQuantity: Number(pl.totalQuantity) },
      });
    }

    // Stage 6: Dispatch Records & Gate Pass
    for (const disp of (order.dispatchRecords || [])) {
      timeline.push({
        type: 'DISPATCH',
        stageNumber: 6,
        id: disp.id,
        referenceNumber: disp.dispatchNumber,
        title: `Dispatch Challan & Gate Pass`,
        date: disp.dispatchDate ? disp.dispatchDate.toISOString() : disp.createdAt.toISOString(),
        status: disp.status,
        pdfUrl: `/api/v1/sales/orders/${order.id}/dispatch/${disp.id}/pdf`,
        metadata: {
          transporterName: disp.transporterName,
          vehicleNumber: disp.vehicleNumber,
          driverName: disp.driverName,
          driverPhone: disp.driverPhone,
          lrNumber: disp.lrNumber,
          ewayBillNumber: disp.ewayBillNumber,
          totalPackages: disp.totalPackages,
        },
      });
    }

    // Stage 7: Hardware Issue Lists (Store Issue)
    for (const hil of order.hardwareIssues) {
      timeline.push({
        type: 'HARDWARE_ISSUE',
        stageNumber: 7,
        id: hil.id,
        referenceNumber: hil.issueNumber,
        title: `Hardware Store Issue Checklist`,
        date: hil.date.toISOString(),
        status: hil.status,
        pdfUrl: `/api/v1/sales/hardware-issues/${hil.id}/pdf`,
      });
    }

    // Sort by stageNumber ascending, then chronologically
    timeline.sort((a, b) => a.stageNumber - b.stageNumber || new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      order,
      timeline,
    };
  },

  /**
   * Generates vector A4 Sales Order Confirmation PDF HTML matching Quotation & PI layout
   */
  async getPdfHtml(orderId: string): Promise<string> {
    const order = await this.getById(orderId);

    const qr = await qrService.getOrCreateDocumentQr({
      documentType: 'ORDER',
      documentId: order.id,
      documentNumber: order.orderNumber,
      companyName: order.companyProfile?.companyName || 'Pacific Restroom Cubicle',
      partyName: order.customer?.legalName || 'Valued Customer',
      date: order.orderDate.toISOString(),
      totalAmount: Number(order.grandTotal),
      currency: order.currency || 'INR',
      status: order.status,
    });

    const company = order.companyProfile as any;
    const signatories = company?.signatories || [];
    const authSignatory = signatories.find((s: any) => s.isDefault && s.signatureUrl) ||
      signatories.find((s: any) => s.signatureUrl) ||
      signatories[0];

    const primaryBank = company?.bankAccounts?.find((b: any) => b.isPrimary) || company?.bankAccounts?.[0];

    const customer = order.customer as any;
    const shippingSnapshot = (order.shippingAddressSnapshot as any) || {};
    const billingSnapshot = (order.billingAddressSnapshot as any) || {};

    const activeOrderGstin = (billingSnapshot?.gstin || customer?.gstin || '').trim().toUpperCase();
    const isDelhiOrder = isDelhiGst(activeOrderGstin, order.placeOfSupplyStateCode || billingSnapshot?.stateCode, order.placeOfSupply || billingSnapshot?.state);
    const placeOfSupplyStateCode = isDelhiOrder
      ? '07'
      : (activeOrderGstin.length >= 2 ? activeOrderGstin.slice(0, 2) : (order.placeOfSupplyStateCode || billingSnapshot?.stateCode || '07'));
    const placeOfSupply = isDelhiOrder
      ? 'Delhi'
      : (order.placeOfSupply || billingSnapshot?.state || GST_STATE_CODE_MAP[placeOfSupplyStateCode] || 'Interstate');

    const customerPan =
      billingSnapshot?.pan ||
      customer?.pan ||
      (billingSnapshot?.gstin && billingSnapshot.gstin.length === 15 ? billingSnapshot.gstin.substring(2, 12) : undefined) ||
      (customer?.gstin && customer.gstin.length === 15 ? customer.gstin.substring(2, 12) : undefined);

    let termsList: string[] = [];
    if (order.termsJson) {
      if (Array.isArray(order.termsJson)) {
        termsList = (order.termsJson as any[]).map((t) => String(t));
      } else if (typeof order.termsJson === 'string') {
        try {
          const parsed = JSON.parse(order.termsJson);
          if (Array.isArray(parsed)) termsList = parsed.map((t) => String(t));
        } catch {}
      }
    }

    return pdfService.generateSalesOrderPdfHtml({
      orderNumber: order.orderNumber,
      orderDate: order.orderDate.toISOString(),
      companyName: company?.companyName || 'Pacific Panels Systems Pvt. Ltd.',
      companyAddress: company?.addresses?.[0]?.addressLine1 || 'H-3, JR Complex, Mandoli, New Delhi - 110093',
      companyPhone: company?.phone || '+91-98100-XXXXX',
      companyEmail: company?.email || 'orders@pacificcubicles.com',
      companyGstin: company?.gstin || '07CIJPS1392A2Z9',
      companyPan: company?.pan || 'CIJPS1392A',
      logoUrl: company?.logoUrl || undefined,
      qrDataUrl: qr?.qrDataUrl || undefined,
      placeOfSupply,
      placeOfSupplyStateCode,
      clientPoNumber: order.customerPoNumber || undefined,
      clientPoDate: order.customerPoDate ? order.customerPoDate.toISOString() : undefined,
      piNumber: (order as any).piNumber || (order.proformaInvoices?.[0]?.piNumber) || undefined,
      quotationRef: order.quotationRef || (order.quotation?.referenceNumber) || undefined,
      status: order.status,
      billTo: {
        name: billingSnapshot?.partyName || customer?.legalName || customer?.tradeName || 'Valued Customer',
        address: [billingSnapshot?.address, billingSnapshot?.city, billingSnapshot?.pincode].filter(Boolean).join(', ') || customer?.addresses?.[0]?.addressLine1 || 'Registered Office Address',
        gstin: billingSnapshot?.gstin || customer?.gstin || undefined,
        pan: customerPan,
        state: billingSnapshot?.state || placeOfSupply,
        stateCode: billingSnapshot?.stateCode || placeOfSupplyStateCode,
        phone: billingSnapshot?.phone || customer?.phone || undefined,
        email: billingSnapshot?.email || customer?.email || undefined,
      },
      shipTo: {
        name: shippingSnapshot?.recipient || shippingSnapshot?.partyName || customer?.tradeName || customer?.legalName || 'Delivery Site',
        address: [shippingSnapshot?.address, shippingSnapshot?.city, shippingSnapshot?.pincode].filter(Boolean).join(', ') || billingSnapshot?.address || 'Site Address as per delivery schedule',
        gstin: shippingSnapshot?.gstin || customer?.gstin || undefined,
        state: shippingSnapshot?.state || placeOfSupply,
        stateCode: shippingSnapshot?.stateCode || placeOfSupplyStateCode,
        phone: shippingSnapshot?.phone || customer?.phone || undefined,
      },
      items: (order.items || []).map((it: any, idx: number) => ({
        serialNumber: it.serialNumber || idx + 1,
        description: it.description,
        hsnSac: '940320',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'NOS',
        rate: Number(it.rate) || 0,
        amount: Number(it.amount) || (Number(it.quantity) * Number(it.rate)),
        boardType: it.boardType || undefined,
        boardThickness: it.boardThickness || undefined,
        boardColor: it.boardColor || undefined,
        cubicleSize: it.cubicleSize || undefined,
        doorSize: it.doorSize || undefined,
        overallHeight: it.overallHeight || undefined,
        hardwarePackage: it.hardwarePackage || undefined,
      })),
      subtotal: Number(order.subtotal) || 0,
      freightAmount: Number(order.freightAmount) || 0,
      cgstAmount: Number(order.cgstAmount) || 0,
      sgstAmount: Number(order.sgstAmount) || 0,
      igstAmount: Number(order.igstAmount) || 0,
      totalTaxAmount: Number(order.taxAmount) || 0,
      grandTotal: Number(order.grandTotal) || 0,
      currency: order.currency || 'INR',
      terms: termsList,
      accessoriesText: order.accessoriesText || undefined,
      signatureUrl: authSignatory?.signatureUrl || company?.signatureUrl || undefined,
      signatoryName: authSignatory?.name || undefined,
      signatoryDesignation: authSignatory?.designation || 'Authorized Signatory',
      signatoryPhone: authSignatory?.phone || company?.phone || undefined,
      bankDetails: primaryBank
        ? {
            bankName: primaryBank.bankName,
            accountNumber: primaryBank.accountNumber,
            ifscCode: primaryBank.ifscCode || undefined,
            branch: primaryBank.branch || undefined,
            accountName: company?.companyName || 'Pacific Panels Systems Pvt. Ltd.',
          }
        : undefined,
    });
  },

  /**
   * Records a physical dispatch challan and gate pass linked to this Sales Order.
   */
  async createDispatchRecord(orderId: string, data: any, userId?: string) {
    const order = await this.getById(orderId);

    const yr = new Date().getFullYear();
    const count = await prisma.dispatchRecord.count();
    const dispatchNumber = `PPS/DISP/${yr}-${(yr + 1).toString().slice(-2)}/${String(count + 1).padStart(4, '0')}`;
    const dispatchDate = data.dispatchDate ? new Date(data.dispatchDate) : new Date();

    const dispatch = await prisma.dispatchRecord.create({
      data: {
        dispatchNumber,
        orderId: order.id,
        packingListId: data.packingListId || null,
        customerId: order.customerId,
        transporterName: data.transporterName || null,
        vehicleNumber: data.vehicleNumber || null,
        driverName: data.driverName || null,
        driverPhone: data.driverPhone || null,
        lrNumber: data.lrNumber || null,
        lrDate: data.lrDate ? new Date(data.lrDate) : null,
        ewayBillNumber: data.ewayBillNumber || null,
        dispatchDate,
        totalPackages: data.totalPackages ? Number(data.totalPackages) : null,
        status: data.status || 'DISPATCHED',
        termsAndConditions: data.termsAndConditions || null,
        notes: data.notes || null,
        createdById: userId || null,
      },
      include: {
        order: true,
        packingList: true,
      },
    });

    // Update order status: full vs partial dispatch
    const newOrderStatus = data.isPartial ? 'PARTIALLY_DISPATCHED' : 'FULLY_DISPATCHED';
    await prisma.salesOrder.update({
      where: { id: orderId },
      data: {
        status: newOrderStatus,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: newOrderStatus,
            changedById: userId || null,
            comment: `Dispatch challan ${dispatchNumber} issued. Transporter: ${data.transporterName || 'N/A'}, Vehicle: ${data.vehicleNumber || 'N/A'}`,
          },
        },
      },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'CREATE',
        module: 'Sales',
        entityType: 'DispatchRecord',
        entityId: dispatch.id,
        newData: { dispatchNumber, orderNumber: order.orderNumber, vehicleNumber: data.vehicleNumber },
      });
    }

    return dispatch;
  },

  /**
   * Generates vector A4 Dispatch Challan & Gate Pass PDF HTML with distinct Dispatch & Transit T&Cs
   */
  async getDispatchPdfHtml(dispatchId: string): Promise<string> {
    const dispatch = await prisma.dispatchRecord.findUnique({
      where: { id: dispatchId },
      include: {
        order: {
          include: {
            customer: true,
            companyProfile: true,
            items: true,
          },
        },
        packingList: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!dispatch) throw new Error('Dispatch record not found');

    const order = dispatch.order as any;
    const company = order?.companyProfile as any;
    const customer = (dispatch as any).customer || order?.customer;
    const shippingSnapshot = (order?.shippingAddressSnapshot as any) || {};

    const items = dispatch.packingList?.items?.length
      ? dispatch.packingList.items.map((it: any, idx: number) => ({
          serialNumber: idx + 1,
          description: it.description,
          noOfPackets: it.noOfPackets || 1,
          natureOfPacket: it.natureOfPacket || 'Carton / Bundle',
          quantity: Number(it.quantity) || 1,
        }))
      : (order?.items || []).map((it: any, idx: number) => ({
          serialNumber: it.serialNumber || idx + 1,
          description: it.description,
          noOfPackets: 1,
          natureOfPacket: 'Cubicle Component Bundle',
          quantity: Number(it.quantity) || 1,
        }));

    return pdfService.generateDispatchChallanPdfHtml({
      dispatchNumber: dispatch.dispatchNumber,
      dispatchDate: dispatch.dispatchDate.toISOString(),
      orderNumber: order?.orderNumber || undefined,
      packingListNumber: dispatch.packingList?.packingListNumber || undefined,
      companyName: company?.companyName || 'Pacific Panels Systems Pvt. Ltd.',
      companyAddress: company?.addresses?.[0]?.addressLine1 || 'H-3, JR Complex, Mandoli, New Delhi - 110093',
      companyGstin: company?.gstin || '07CIJPS1392A2Z9',
      logoUrl: company?.logoUrl || undefined,
      customerName: customer?.legalName || shippingSnapshot?.recipient || 'Customer Consignee',
      destinationSite: shippingSnapshot?.address || 'Site Delivery Address',
      siteContactName: shippingSnapshot?.recipient || undefined,
      siteContactPhone: shippingSnapshot?.phone || undefined,
      transporterName: dispatch.transporterName || undefined,
      vehicleNumber: dispatch.vehicleNumber || undefined,
      driverName: dispatch.driverName || undefined,
      driverPhone: dispatch.driverPhone || undefined,
      lrNumber: dispatch.lrNumber || undefined,
      lrDate: dispatch.lrDate ? dispatch.lrDate.toISOString() : undefined,
      ewayBillNumber: dispatch.ewayBillNumber || undefined,
      totalPackages: dispatch.totalPackages || items.length,
      items,
      status: dispatch.status,
      notes: dispatch.notes || undefined,
    });
  },

  async deleteDispatchRecord(orderId: string, dispatchId: string, userId?: string) {
    const dispatch = await prisma.dispatchRecord.findUnique({
      where: { id: dispatchId },
    });
    if (!dispatch) throw new Error('Dispatch record not found');
    await prisma.dispatchRecord.delete({
      where: { id: dispatchId },
    });
    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'DELETE',
        module: 'Logistics',
        entityType: 'DispatchRecord',
        entityId: dispatchId,
        newData: { dispatchNumber: dispatch.dispatchNumber },
      });
    }
    return { success: true };
  },

  /**
   * Cross-Document Global Search: Resolves by Order No, PI No, Packing List No, or Quotation Ref
   */
  async globalSearch(query: string) {
    const q = query.trim();
    if (!q) return [];

    // Search orders
    const orders = await prisma.salesOrder.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { quotationRef: { contains: q, mode: 'insensitive' } },
          { customerPoNumber: { contains: q, mode: 'insensitive' } },
          { customer: { legalName: { contains: q, mode: 'insensitive' } } },
          { proformaInvoices: { some: { piNumber: { contains: q, mode: 'insensitive' } } } },
          { packingLists: { some: { packingListNumber: { contains: q, mode: 'insensitive' } } } },
        ],
      },
      include: {
        customer: true,
        proformaInvoices: { select: { piNumber: true } },
        packingLists: { select: { packingListNumber: true } },
      },
      take: 10,
    });

    return orders;
  },

  async update(id: string, data: any, userId?: string) {
    const existing = await this.getById(id);

    let itemsUpdate: any = undefined;
    let subtotal = Number(existing.subtotal);

    if (data.items && Array.isArray(data.items)) {
      await prisma.salesOrderItem.deleteMany({ where: { orderId: id } });
      const itemsList = data.items.map((it: any, idx: number) => {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.rate) || 0;
        const fallbackSpecs = parseItemSpecs(it.description || '');
        const boardType = it.boardType || fallbackSpecs.boardType || it.specsJson?.boardType || null;
        const boardThickness = it.boardThickness || fallbackSpecs.boardThickness || it.specsJson?.boardThickness || null;
        const boardColor = it.boardColor || fallbackSpecs.boardColor || it.specsJson?.boardColor || null;
        const cubicleSize = it.cubicleSize || fallbackSpecs.cubicleSize || it.specsJson?.cubicleSize || null;
        const doorSize = it.doorSize || fallbackSpecs.doorSize || it.specsJson?.doorSize || null;
        const overallHeight = it.overallHeight || fallbackSpecs.overallHeight || it.specsJson?.overallHeight || null;
        const hardwarePackage = it.hardwarePackage || fallbackSpecs.hardwarePackage || it.specsJson?.hardwarePackage || null;

        const specsJson = {
          boardType,
          boardThickness,
          boardColor,
          cubicleSize,
          doorSize,
          overallHeight,
          hardwarePackage,
        };

        return {
          serialNumber: idx + 1,
          productId: it.productId || null,
          description: it.description || 'Cubicle Line Item',
          quantity: qty,
          dispatchedQuantity: Number(it.dispatchedQuantity) || 0,
          unit: it.unit || 'NOS',
          rate,
          amount: qty * rate,
          specsJson,
          boardType,
          boardThickness,
          boardColor,
          cubicleSize,
          doorSize,
          overallHeight,
          hardwarePackage,
        };
      });

      itemsUpdate = { create: itemsList };
      subtotal = itemsList.reduce((sum: number, it: any) => sum + it.amount, 0);
    }

    const freightAmount = data.freightAmount !== undefined ? Number(data.freightAmount) : Number(existing.freightAmount || 0);
    const taxableTotal = subtotal + freightAmount;
    const taxRate = data.taxRate !== undefined ? Number(data.taxRate) : 18;
    const totalTaxAmount = Math.round((taxableTotal * (taxRate / 100)) * 100) / 100;
    const grandTotal = Math.round(taxableTotal + totalTaxAmount);

    const billingAddress = data.billingAddress || data.billingAddressSnapshot || existing.billingAddressSnapshot;
    const shippingAddress = data.shippingAddress || data.shippingAddressSnapshot || (
      (data.siteName || data.siteAddress)
        ? {
            ...(typeof existing.shippingAddressSnapshot === 'object' && existing.shippingAddressSnapshot
              ? (existing.shippingAddressSnapshot as any)
              : {}),
            siteName: data.siteName,
            siteAddress: data.siteAddress,
          }
        : existing.shippingAddressSnapshot
    );

    const activeGstin = (billingAddress?.gstin || '').trim().toUpperCase();
    let sellerCode = (existing.companyProfile?.stateCode || '07').trim();
    if (data.companyProfileId && data.companyProfileId !== existing.companyProfileId) {
      const newComp = await prisma.companyProfile.findUnique({ where: { id: data.companyProfileId } });
      if (newComp?.stateCode) sellerCode = newComp.stateCode.trim();
    }

    const cleanGstin = activeGstin.replace(/[^A-Z0-9]/gi, '');
    const isDelhi = isDelhiGst(activeGstin, data.placeOfSupplyStateCode ?? existing.placeOfSupplyStateCode, data.placeOfSupply ?? existing.placeOfSupply ?? billingAddress?.address);

    const placeOfSupplyStateCode = cleanGstin.length >= 2
      ? cleanGstin.slice(0, 2)
      : (data.placeOfSupplyStateCode ?? existing.placeOfSupplyStateCode ?? (isDelhi ? '07' : sellerCode));
    const placeOfSupply = (cleanGstin.startsWith('07') || isDelhi)
      ? 'Delhi'
      : (data.placeOfSupply ?? existing.placeOfSupply ?? GST_STATE_CODE_MAP[placeOfSupplyStateCode] ?? 'Interstate');

    const isIntraState = placeOfSupplyStateCode === sellerCode || (sellerCode === '07' && isDelhi);
    const cgstAmount = isIntraState ? totalTaxAmount / 2 : 0;
    const sgstAmount = isIntraState ? totalTaxAmount / 2 : 0;
    const igstAmount = isIntraState ? 0 : totalTaxAmount;

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        companyProfileId: data.companyProfileId ?? existing.companyProfileId,
        customerPoNumber: data.customerPoNumber ?? existing.customerPoNumber,
        customerPoDate: data.customerPoDate ? new Date(data.customerPoDate) : existing.customerPoDate,
        customerPoFileUrl: data.customerPoFileUrl ?? existing.customerPoFileUrl,
        orderDate: data.orderDate ? new Date(data.orderDate) : existing.orderDate,
        status: data.status ?? existing.status,
        statusReason: data.notes ?? data.statusReason ?? existing.statusReason,
        shippingAddressSnapshot: shippingAddress,
        billingAddressSnapshot: billingAddress,
        siteContactSnapshot: (data.contactPerson || data.contactPhone)
          ? {
              ...(typeof existing.siteContactSnapshot === 'object' && existing.siteContactSnapshot
                ? (existing.siteContactSnapshot as any)
                : {}),
              contactPerson: data.contactPerson,
              contactPhone: data.contactPhone,
            }
          : (data.siteContact || data.siteContactSnapshot || existing.siteContactSnapshot),
        placeOfSupply,
        placeOfSupplyStateCode,
        freightAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        taxAmount: totalTaxAmount,
        subtotal,
        grandTotal,
        accessoriesText: data.accessoriesText !== undefined ? data.accessoriesText : existing.accessoriesText,
        termsJson: Array.isArray(data.terms) ? data.terms : (data.termsJson !== undefined ? data.termsJson : existing.termsJson),
        ...(itemsUpdate ? { items: itemsUpdate } : {}),
      },
      include: { items: true, customer: true },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'UPDATE',
        module: 'Sales',
        entityType: 'SalesOrder',
        entityId: id,
        newData: { grandTotal, customerPoNumber: updated.customerPoNumber },
      });
    }

    return updated;
  },

  async delete(id: string, userId?: string) {
    const existing = await this.getById(id);
    if (existing.packingLists.length > 0 || existing.proformaInvoices.length > 0) {
      throw new Error(`Cannot delete Order ${existing.orderNumber} because linked Proforma Invoices or Packing Lists exist. Please remove or decouple linked documents first.`);
    }

    await prisma.salesOrderStatusHistory.deleteMany({ where: { orderId: id } });
    await prisma.salesOrderItem.deleteMany({ where: { orderId: id } });
    await prisma.salesOrder.delete({ where: { id } });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'DELETE',
        module: 'Sales',
        entityType: 'SalesOrder',
        entityId: id,
        oldData: { orderNumber: existing.orderNumber },
      });
    }

    return { success: true };
  },

  async getFollowups(orderId: string) {
    const followups = await (prisma as any).salesOrderFollowup.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return { followups };
  },

  async createFollowup(orderId: string, data: any, userId?: string) {
    const order = await this.getById(orderId);

    let performedByName = 'Staff';
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) performedByName = `${user.firstName} ${user.lastName}`.trim();
    }

    const followup = await (prisma as any).salesOrderFollowup.create({
      data: {
        orderId,
        channel: data.channel || 'CALL',
        status: data.status || 'COMPLETED',
        discussionNotes: data.discussionNotes,
        nextFollowupDate: data.nextFollowupDate ? new Date(data.nextFollowupDate) : null,
        contactPerson: data.contactPerson || null,
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        performedById: userId || null,
        performedByName,
      },
    });

    const nextFollowupDate = data.nextFollowupDate ? new Date(data.nextFollowupDate) : null;
    const updatedOrder = await prisma.salesOrder.update({
      where: { id: orderId },
      data: {
        nextFollowupDate,
        followupStatus: data.status || order.followupStatus,
        lastFollowupDate: new Date(),
        followupCount: { increment: 1 },
      },
      include: { customer: true, companyProfile: true },
    });

    return { followup, order: updatedOrder };
  },

  async sendFollowupEmail(orderId: string, options: any, userId?: string) {
    const order = await this.getById(orderId);
    const to = options.recipientEmail || order.customer?.email;
    if (!to) {
      throw new Error('Recipient email is required for sending follow-up email');
    }

    const subject =
      options.subject ||
      `Order Status Update: Pacific Sales Order ${order.orderNumber} — ${order.customer?.legalName || 'Client'}`;
    const customMessage =
      options.message ||
      `We are following up regarding your active Sales Order ${order.orderNumber}. Our production & dispatch scheduling team is preparing your cubicle partitions.`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background: #030213; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #B5F823; margin: 0; font-size: 20px; letter-spacing: 0.5px;">PACIFIC PRODUCTS & SOLUTIONS</h2>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase;">Sales Order Follow-Up & Dispatch Hub</p>
        </div>
        <div style="padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 14px; margin-top: 0;">Dear <strong>${(order.customer as any)?.contacts?.[0]?.name || (order.customer as any)?.contactName || order.customer?.legalName || 'Customer'}</strong>,</p>
          <p style="font-size: 14px; color: #334155;">${customMessage}</p>
          <div style="background: #f8fafc; border-left: 4px solid #7FB706; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px;"><strong>Sales Order Ref:</strong> ${order.orderNumber}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString('en-IN')}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Current Status:</strong> ${order.status}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Total Value:</strong> ${order.currency} ${Number(order.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <p style="font-size: 13px; color: #475569;">
            Please inform our project execution manager if there are any site readiness constraints or specific delivery time windows.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">
            ${order.companyProfile?.companyName || 'Pacific Products & Solutions'} • Restroom Cubicles & Lockers Manufacturer
          </p>
        </div>
      </div>
    `;

    const sendRes = await emailService.sendEmail({
      to,
      subject,
      html: htmlBody,
    });

    if (!sendRes.success) {
      throw new Error(`Failed to send follow-up email: ${sendRes.error || 'Unknown error'}`);
    }

    const nextDate = options.nextFollowupDate ? new Date(options.nextFollowupDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const followupResult = await this.createFollowup(
      orderId,
      {
        channel: 'EMAIL',
        status: 'COMPLETED',
        discussionNotes: options.notes || `Follow-up email dispatched to ${to} with message: "${customMessage.substring(0, 120)}..."`,
        nextFollowupDate: nextDate,
        contactEmail: to,
        contactPerson: (order.customer as any)?.contacts?.[0]?.name || (order.customer as any)?.contactName || order.customer?.legalName || 'Customer',
        performedByName: userId ? 'Staff' : 'Order Dispatcher',
      },
      userId
    );

    return {
      success: true,
      message: `Follow-up email successfully sent to ${to}`,
      followup: followupResult.followup,
      order: followupResult.order,
    };
  },
};
