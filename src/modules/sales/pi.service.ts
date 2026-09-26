import { prisma } from '../../config/database';
import { sequenceService } from '../sequences/sequence.service';
import { calculateGstTax } from '../tax/tax.engine';
import { qrService } from '../qr/qr.service';
import { pdfService } from '../pdf/pdf.service';
import { numberToWords } from '../utils/numberToWords';
import { auditService } from '../audit/audit.service';
import { ordersService } from '../orders/orders.service';

async function fetchImageAsDataUri(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return url;
  }
}

export const piService = {
  async list(query: { page?: number; limit?: number; status?: string; customerId?: string; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.search) {
      where.OR = [
        { piNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { legalName: { contains: query.search, mode: 'insensitive' } } },
        { placeOfSupply: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.proformaInvoice.findMany({
        where,
        include: {
          customer: true,
          companyProfile: true,
          parties: true,
          items: true,
          taxSummary: true,
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          issuedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { piDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.proformaInvoice.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string) {
    const pi = await prisma.proformaInvoice.findUnique({
      where: { id },
      include: {
        customer: {
          include: { contacts: true, addresses: true },
        },
        companyProfile: {
          include: { addresses: true, bankAccounts: true, signatories: true, terms: true },
        },
        parties: true,
        items: {
          include: { product: true },
          orderBy: { serialNumber: 'asc' },
        },
        taxSummary: {
          orderBy: { gstRate: 'asc' },
        },
        terms: {
          orderBy: { clauseNumber: 'asc' },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        verificationTokens: true,
        qrCodes: true,
        paymentAllocations: {
          include: { payment: true },
        },
        followups: {
          include: { logs: true },
          orderBy: { createdAt: 'desc' },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        issuedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!pi) throw Object.assign(new Error('Proforma Invoice not found'), { status: 404 });
    return pi;
  },

  async create(data: any, userId?: string) {
    // 1. Resolve Company Profile & State Code outside transaction
    let companyProfileId = data.companyProfileId;
    let company = companyProfileId
      ? await prisma.companyProfile.findUnique({ where: { id: companyProfileId } })
      : await prisma.companyProfile.findFirst({ where: { status: 'ACTIVE' } });

    if (!company) {
      company = await prisma.companyProfile.findFirst();
    }
    if (!company) {
      throw new Error('No active company profile found. Please configure company profile.');
    }
    companyProfileId = company.id;

    // 2. Generate official sequential number starting with PPS (e.g. PPS/PI/2026-27/0001)
    let officialPiNumber = data.piNumber;
    if (!officialPiNumber || officialPiNumber.startsWith('DRAFT-')) {
      const seq = await sequenceService.getNextDocumentNumber(companyProfileId, 'PI');
      officialPiNumber = seq.number;
    }

    return prisma.$transaction(async (tx) => {
      const sellerStateCode = (company.stateCode || '07').trim();
      const posStateCode = (data.placeOfSupplyStateCode || sellerStateCode).trim();

      // 3. Compute Tax Engine Totals on the server
      const taxResult = calculateGstTax({
        sellerStateCode,
        placeOfSupplyStateCode: posStateCode,
        items: (data.items || []).map((it: any) => ({
          productId: it.productId,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0,
          gstRate: Number(it.gstRate ?? 18),
        })),
        freightAmount: Number(data.freightAmount) || 0,
        isReverseCharge: Boolean(data.reverseCharge),
      });

      // 4. Amount in words
      const words = numberToWords(taxResult.grandTotal, company.currency || 'INR');

      // 5. Default Terms
      const defaultTerms = [
        'Goods once sold will not be taken back or exchanged.',
        'If the bill is not paid by the due date, interest will be charged at 18% per annum.',
        'The seller is not responsible for any loss or damage to goods in transit.',
        'The buyer undertakes to submit prescribed statutory declarations to seller on demand.',
        'Subject to Delhi jurisdiction only.',
      ];

      const termsList = Array.isArray(data.terms) && data.terms.length > 0 ? data.terms : defaultTerms;

      // 6. Create Proforma Invoice with official PPS number
      const pi = await tx.proformaInvoice.create({
        data: {
          piNumber: officialPiNumber,
          piDate: data.piDate ? new Date(data.piDate) : new Date(),
          companyProfileId,
          customerId: data.customerId,
          placeOfSupply: data.placeOfSupply || 'Delhi',
          placeOfSupplyStateCode: posStateCode,
          reverseCharge: Boolean(data.reverseCharge),
          modeOfTransport: data.modeOfTransport,
          vehicleNumber: data.vehicleNumber,
          grLrNumber: data.grLrNumber,
          linkedPoNumber: data.linkedPoNumber,
          linkedPoDate: data.linkedPoDate ? new Date(data.linkedPoDate) : undefined,
          subtotal: taxResult.subtotal,
          freightAmount: taxResult.freightAmount,
          taxableAmount: taxResult.totalTaxableAmount,
          cgstAmount: taxResult.cgstAmount,
          sgstAmount: taxResult.sgstAmount,
          igstAmount: taxResult.igstAmount,
          totalTaxAmount: taxResult.totalTaxAmount,
          roundingAdjustment: taxResult.roundingAdjustment,
          grandTotal: taxResult.grandTotal,
          amountInWords: words,
          currency: company.currency || 'INR',
          status: 'DRAFT',
          advancePercentage: data.advancePercentage !== undefined ? Number(data.advancePercentage) : 50,
          advanceRequiredAmount: data.advanceRequiredAmount !== undefined ? Number(data.advanceRequiredAmount) : Math.round(taxResult.grandTotal * 0.5),
          advanceReceivedAmount: Number(data.advanceReceivedAmount) || 0,
          advancePaymentStatus: data.advancePaymentStatus || (Number(data.advanceReceivedAmount) >= (data.advanceRequiredAmount || taxResult.grandTotal * 0.5) ? 'FULLY_RECEIVED' : Number(data.advanceReceivedAmount) > 0 ? 'PARTIAL' : 'PENDING'),
          advancePaymentDate: data.advancePaymentDate ? new Date(data.advancePaymentDate) : undefined,
          advancePaymentReference: data.advancePaymentReference || null,
          advancePaymentMode: data.advancePaymentMode || null,
          quotationId: data.quotationId || null,
          quotationRef: data.quotationRef || null,
          createdById: userId,
          items: {
            create: taxResult.items.map((it, idx) => ({
              serialNumber: idx + 1,
              productId: it.productId,
              description: it.description,
              hsnSac: data.items?.[idx]?.hsnSac || '9403',
              quantity: it.quantity,
              unit: data.items?.[idx]?.unit || 'NOS',
              rate: it.rate,
              amount: it.amount,
              gstRate: it.gstRate,
              taxableAmount: it.taxableAmount,
              cgst: it.cgst,
              sgst: it.sgst,
              igst: it.igst,
              totalAmount: it.totalAmount,
              boardType: data.items?.[idx]?.boardType || null,
              boardThickness: data.items?.[idx]?.boardThickness || null,
              boardColor: data.items?.[idx]?.boardColor || null,
              cubicleSize: data.items?.[idx]?.cubicleSize || null,
              doorSize: data.items?.[idx]?.doorSize || null,
              overallHeight: data.items?.[idx]?.overallHeight || null,
              hardwarePackage: data.items?.[idx]?.hardwarePackage || null,
            })),
          },
          taxSummary: {
            create: taxResult.taxSummary.map((ts) => ({
              gstRate: ts.gstRate,
              taxableAmount: ts.taxableAmount,
              cgst: ts.cgst,
              sgst: ts.sgst,
              igst: ts.igst,
              totalTax: ts.totalTax,
            })),
          },
          terms: {
            create: termsList.map((t: string, idx: number) => ({
              clauseNumber: idx + 1,
              text: t,
            })),
          },
          parties: {
            create: [
              {
                partyRole: 'BILL_TO',
                partyName: data.billTo?.partyName || 'Customer Billing Party',
                gstin: data.billTo?.gstin ? data.billTo.gstin.toUpperCase().trim() : undefined,
                addressLine: data.billTo?.addressLine || 'Registered Address',
                state: data.billTo?.state || 'Delhi',
                stateCode: data.billTo?.stateCode || '07',
                phone: data.billTo?.phone,
                email: data.billTo?.email,
              },
              {
                partyRole: 'SHIP_TO',
                partyName: data.shipTo?.partyName || data.billTo?.partyName || 'Customer Delivery Site',
                gstin: data.shipTo?.gstin ? data.shipTo.gstin.toUpperCase().trim() : undefined,
                addressLine: data.shipTo?.addressLine || data.billTo?.addressLine || 'Delivery Address',
                state: data.shipTo?.state || data.billTo?.state || 'Delhi',
                stateCode: data.shipTo?.stateCode || data.billTo?.stateCode || '07',
                phone: data.shipTo?.phone || data.billTo?.phone,
              },
            ],
          },
          statusHistory: {
            create: {
              toStatus: 'DRAFT',
              changedById: userId,
              comment: 'Proforma Invoice draft created',
            },
          },
        },
        include: {
          items: true,
          taxSummary: true,
          parties: true,
          terms: true,
        },
      });

      await auditService.log({
        userId,
        action: 'CREATE',
        module: 'Sales',
        entityType: 'ProformaInvoice',
        entityId: pi.id,
        newData: pi,
      });

      return pi;
    });
  },

  /**
   * Official PI Issuance: Permanently assigns an atomic sequence number (e.g. PPS/PI/2026-27/0815)
   * and creates a cryptographically signed QR verification token.
   */
  async issue(id: string, userId: string) {
    // Fetch PI first (outside transaction) to get companyProfileId for sequence generation
    const piCheck = await prisma.proformaInvoice.findUnique({
      where: { id },
      include: { companyProfile: true, customer: true, parties: true },
    });
    if (!piCheck) throw Object.assign(new Error('Proforma Invoice not found'), { status: 404 });
    if (piCheck.status === 'ISSUED') {
      throw new Error('Proforma Invoice is already issued and immutable');
    }

    // Generate atomic sequence number OUTSIDE the main transaction to avoid nested $transaction conflict
    const seq = await sequenceService.getNextDocumentNumber(piCheck.companyProfileId, 'PI');
    const officialPiNumber = seq.number;

    return prisma.$transaction(async (tx) => {
      // Re-fetch PI inside transaction for consistent state
      const pi = await tx.proformaInvoice.findUnique({
        where: { id },
        include: { companyProfile: true, customer: true, parties: true },
      });
      if (!pi) throw Object.assign(new Error('Proforma Invoice not found'), { status: 404 });
      if (pi.status === 'ISSUED') throw new Error('Proforma Invoice is already issued and immutable');

      // Update PI
      const updated = await tx.proformaInvoice.update({
        where: { id },
        data: {
          piNumber: officialPiNumber,
          status: 'ISSUED',
          issuedById: userId,
          statusHistory: {
            create: {
              fromStatus: pi.status,
              toStatus: 'ISSUED',
              changedById: userId,
              comment: `Officially issued with number ${officialPiNumber}`,
            },
          },
        },
        include: {
          companyProfile: true,
          customer: true,
        },
      });

      // Register public QR verification token
      await qrService.registerDocumentQr({
        documentType: 'PI',
        documentId: id,
        documentNumber: officialPiNumber,
        companyName: pi.companyProfile.companyName,
        partyName: pi.customer.legalName,
        date: pi.piDate.toISOString(),
        totalAmount: Number(pi.grandTotal),
        currency: pi.currency,
        status: 'ISSUED',
      });

      // Create initial receivable entry
      const customerProfile = await tx.customerProfile.findUnique({
        where: { partyId: pi.customerId },
      });

      if (customerProfile) {
        await tx.receivableEntry.create({
          data: {
            customerId: customerProfile.id,
            proformaInvoiceId: pi.id,
            totalAmount: pi.grandTotal,
            paidAmount: 0,
            balanceAmount: pi.grandTotal,
            status: 'OPEN',
          },
        });
      }

      await auditService.log({
        userId,
        action: 'ISSUE',
        module: 'Sales',
        entityType: 'ProformaInvoice',
        entityId: id,
        newData: { piNumber: officialPiNumber, status: 'ISSUED' },
      });

      return updated;
    });
  },

  async duplicate(id: string, userId: string) {
    const original = await this.getById(id);

    return this.create(
      {
        companyProfileId: original.companyProfileId,
        customerId: original.customerId,
        placeOfSupply: original.placeOfSupply,
        placeOfSupplyStateCode: original.placeOfSupplyStateCode,
        reverseCharge: original.reverseCharge,
        modeOfTransport: original.modeOfTransport,
        vehicleNumber: original.vehicleNumber,
        freightAmount: Number(original.freightAmount),
        billTo: original.parties.find((p) => p.partyRole === 'BILL_TO'),
        shipTo: original.parties.find((p) => p.partyRole === 'SHIP_TO'),
        items: original.items.map((it) => ({
          productId: it.productId,
          description: it.description,
          hsnSac: it.hsnSac,
          quantity: Number(it.quantity),
          unit: it.unit,
          rate: Number(it.rate),
          gstRate: Number(it.gstRate),
        })),
        terms: original.terms.map((t) => t.text),
      },
      userId
    );
  },

  async cancel(id: string, reason: string, userId: string) {
    const pi = await this.getById(id);
    if (pi.status === 'CANCELLED') {
      throw new Error('Proforma Invoice is already cancelled');
    }

    const updated = await prisma.proformaInvoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        statusHistory: {
          create: {
            fromStatus: pi.status,
            toStatus: 'CANCELLED',
            changedById: userId,
            comment: reason || 'Cancelled by Admin',
          },
        },
      },
    });

    await auditService.log({
      userId,
      action: 'CANCEL',
      module: 'Sales',
      entityType: 'ProformaInvoice',
      entityId: id,
      newData: { status: 'CANCELLED', reason },
    });

    return updated;
  },

  async getPdfHtml(id: string) {
    const pi = await this.getById(id);

    const billToParty = pi.parties.find((p) => p.partyRole === 'BILL_TO') || {
      partyName: pi.customer.legalName,
      addressLine: 'Registered Address',
      gstin: pi.customer.gstin,
      state: pi.placeOfSupply,
      stateCode: pi.placeOfSupplyStateCode,
      phone: pi.customer.phone,
      email: pi.customer.email,
    };

    const shipToParty = pi.parties.find((p) => p.partyRole === 'SHIP_TO') || billToParty;

    const qr = await qrService.getOrCreateDocumentQr({
      documentType: 'PI',
      documentId: id,
      documentNumber: pi.piNumber,
      companyName: pi.companyProfile.companyName,
      partyName: billToParty?.partyName || pi.customer.legalName,
      date: pi.piDate.toISOString(),
      totalAmount: Number(pi.grandTotal),
      currency: pi.currency || 'INR',
      status: pi.status,
    });
    const qrDataUrl = qr.qrDataUrl ? await fetchImageAsDataUri(qr.qrDataUrl) : undefined;

    const signatories = (pi.companyProfile as any)?.signatories || [];
    const authSignatory =
      signatories.find((s: any) => s.isDefault && s.signatureUrl) ||
      signatories.find((s: any) => s.signatureUrl) ||
      signatories[0];
    const rawSignatureUrl = authSignatory?.signatureUrl || (pi.companyProfile as any)?.signatureUrl || undefined;
    const signatureUrl = rawSignatureUrl ? await fetchImageAsDataUri(rawSignatureUrl) : undefined;
    const issuingStaffName =
      authSignatory?.name ||
      (pi.issuedBy
        ? `${pi.issuedBy.firstName} ${pi.issuedBy.lastName}`
        : pi.createdBy
        ? `${pi.createdBy.firstName} ${pi.createdBy.lastName}`
        : 'Authorized Signatory');
    const issuingStaffDesignation = authSignatory?.designation || undefined;
    const issuingStaffPhone = authSignatory?.phone || pi.companyProfile.phone || undefined;

    const primaryBank = pi.companyProfile.bankAccounts.find((b) => b.isDefault) || pi.companyProfile.bankAccounts[0];

    const companyAddress =
      pi.companyProfile.addresses?.[0]?.addressLine1 ||
      [pi.companyProfile.state, pi.companyProfile.country].filter(Boolean).join(', ') ||
      'H-3, JR Complex, Mandoli, New Delhi - 110093';

    const customerPan =
      (billToParty as any)?.pan ||
      (billToParty?.gstin && billToParty.gstin.length === 15
        ? billToParty.gstin.substring(2, 12)
        : pi.customer.pan || undefined);

    return pdfService.generatePiHtml({
      piNumber: pi.piNumber,
      piDate: pi.piDate.toISOString(),
      companyName: pi.companyProfile.companyName,
      companyAddress,
      companyGstin: pi.companyProfile.gstin || '07CIJPS1392A2Z9',
      companyPan: pi.companyProfile.pan || 'CIJPS1392A',
      companyPhone: pi.companyProfile.phone || undefined,
      companyEmail: pi.companyProfile.email || undefined,
      logoUrl: pi.companyProfile.logoUrl || undefined,
      placeOfSupply: pi.placeOfSupply,
      placeOfSupplyStateCode: pi.placeOfSupplyStateCode,
      reverseCharge: pi.reverseCharge,
      modeOfTransport: pi.modeOfTransport || undefined,
      vehicleNumber: pi.vehicleNumber || undefined,
      grLrNumber: pi.grLrNumber || undefined,
      linkedPoNumber: pi.linkedPoNumber || undefined,
      linkedPoDate: pi.linkedPoDate ? pi.linkedPoDate.toISOString() : undefined,
      billTo: {
        name: billToParty?.partyName || pi.customer.legalName,
        address: billToParty?.addressLine || 'Registered Address',
        gstin: billToParty?.gstin || undefined,
        pan: customerPan,
        state: billToParty?.state || 'Delhi',
        stateCode: billToParty?.stateCode || '07',
        phone: billToParty?.phone || undefined,
        email: billToParty?.email || undefined,
      },
      shipTo: {
        name: shipToParty?.partyName || billToParty?.partyName || pi.customer.legalName,
        address: shipToParty?.addressLine || billToParty?.addressLine || 'Delivery Address',
        gstin: shipToParty?.gstin || undefined,
        state: shipToParty?.state || 'Delhi',
        stateCode: shipToParty?.stateCode || '07',
        phone: shipToParty?.phone || undefined,
      },
      items: pi.items.map((it: any) => ({
        serialNumber: it.serialNumber,
        description: it.description,
        hsnSac: it.hsnSac || undefined,
        quantity: Number(it.quantity),
        unit: it.unit,
        rate: Number(it.rate),
        amount: Number(it.amount),
        gstRate: Number(it.gstRate),
        taxableAmount: Number(it.taxableAmount),
        boardType: it.boardType || undefined,
        boardThickness: it.boardThickness || undefined,
        boardColor: it.boardColor || undefined,
        cubicleSize: it.cubicleSize || undefined,
        doorSize: it.doorSize || undefined,
        overallHeight: it.overallHeight || undefined,
        hardwarePackage: it.hardwarePackage || undefined,
      })),
      taxSummary: pi.taxSummary.map((ts) => ({
        gstRate: Number(ts.gstRate),
        taxableAmount: Number(ts.taxableAmount),
        cgst: Number(ts.cgst),
        sgst: Number(ts.sgst),
        igst: Number(ts.igst),
        totalTax: Number(ts.totalTax),
      })),
      subtotal: Number(pi.subtotal),
      freightAmount: Number(pi.freightAmount),
      cgstAmount: Number(pi.cgstAmount),
      sgstAmount: Number(pi.sgstAmount),
      igstAmount: Number(pi.igstAmount),
      totalTaxAmount: Number(pi.totalTaxAmount),
      roundingAdjustment: Number(pi.roundingAdjustment),
      grandTotal: Number(pi.grandTotal),
      currency: pi.currency,
      terms: pi.terms.map((t) => t.text),
      qrDataUrl,
      signatureUrl,
      issuingStaffName,
      issuingStaffDesignation,
      issuingStaffPhone,
      amountInWords: pi.amountInWords || numberToWords(Number(pi.grandTotal), pi.currency || 'INR'),
      accessoriesText: (pi as any).accessoriesText || (pi as any).notes || undefined,
      advanceRequiredAmount: Number(pi.advanceRequiredAmount) || Math.round(Number(pi.grandTotal) * 0.5),
      advancePercentage: Number(pi.advancePercentage) || 50,
      bankDetails: primaryBank
        ? {
            bankName: primaryBank.bankName,
            accountNumber: primaryBank.accountNumber,
            ifscCode: primaryBank.ifscCode || undefined,
            branch: primaryBank.branch || undefined,
            accountName: pi.companyProfile.companyName,
          }
        : undefined,
    });
  },

  async update(id: string, data: any, userId?: string) {
    const existing = await this.getById(id);

    return prisma.$transaction(async (tx) => {
      let itemsUpdate: any = undefined;
      let taxSummaryUpdate: any = undefined;
      let subtotal = Number(existing.subtotal);
      let totalTaxAmount = Number(existing.totalTaxAmount);
      let grandTotal = Number(existing.grandTotal);
      let amountInWords = existing.amountInWords;
      let cgstAmount = Number(existing.cgstAmount);
      let sgstAmount = Number(existing.sgstAmount);
      let igstAmount = Number(existing.igstAmount);
      let roundingAdjustment = Number(existing.roundingAdjustment);

      if (data.items && Array.isArray(data.items)) {
        await tx.proformaInvoiceItem.deleteMany({ where: { piId: id } });
        await tx.proformaInvoiceTaxSummary.deleteMany({ where: { piId: id } });

        const originStateCode = (existing.companyProfile?.stateCode || '07').trim();
        const destinationStateCode = (data.placeOfSupplyStateCode || existing.placeOfSupplyStateCode || '07').trim();

        const taxCalc = calculateGstTax({
          sellerStateCode: originStateCode,
          placeOfSupplyStateCode: destinationStateCode,
          items: data.items.map((it: any) => ({
            productId: it.productId,
            description: it.description,
            quantity: Number(it.quantity) || 1,
            rate: Number(it.rate) || 0,
            gstRate: Number(it.gstRate ?? 18),
          })),
          freightAmount: Number(data.freightAmount ?? existing.freightAmount) || 0,
          isReverseCharge: Boolean(data.reverseCharge ?? existing.reverseCharge),
        });

        itemsUpdate = {
          create: taxCalc.items.map((it: any, idx: number) => ({
            serialNumber: idx + 1,
            productId: it.productId,
            description: it.description,
            hsnSac: data.items[idx]?.hsnSac || '94032090',
            quantity: it.quantity,
            unit: data.items[idx]?.unit || 'NOS',
            rate: it.rate,
            taxableAmount: it.taxableAmount,
            gstRate: it.gstRate,
            cgst: it.cgst,
            sgst: it.sgst,
            igst: it.igst,
            totalAmount: it.totalAmount,
            amount: it.amount,
            boardType: data.items[idx]?.boardType || null,
            boardThickness: data.items[idx]?.boardThickness || null,
            boardColor: data.items[idx]?.boardColor || null,
            cubicleSize: data.items[idx]?.cubicleSize || null,
            doorSize: data.items[idx]?.doorSize || null,
            overallHeight: data.items[idx]?.overallHeight || null,
            hardwarePackage: data.items[idx]?.hardwarePackage || null,
          })),
        };

        taxSummaryUpdate = {
          create: taxCalc.taxSummary.map((ts: any) => ({
            gstRate: ts.gstRate,
            taxableAmount: ts.taxableAmount,
            cgst: ts.cgst,
            sgst: ts.sgst,
            igst: ts.igst,
            totalTax: ts.totalTax,
          })),
        };

        subtotal = taxCalc.subtotal;
        cgstAmount = taxCalc.cgstAmount;
        sgstAmount = taxCalc.sgstAmount;
        igstAmount = taxCalc.igstAmount;
        totalTaxAmount = taxCalc.totalTaxAmount;
        roundingAdjustment = taxCalc.roundingAdjustment;
        grandTotal = taxCalc.grandTotal;
        amountInWords = numberToWords(grandTotal, existing.currency || 'INR');
      }

      const updated = await tx.proformaInvoice.update({
        where: { id },
        data: {
          placeOfSupply: data.placeOfSupply ?? existing.placeOfSupply,
          placeOfSupplyStateCode: data.placeOfSupplyStateCode ?? existing.placeOfSupplyStateCode,
          modeOfTransport: data.modeOfTransport ?? existing.modeOfTransport,
          vehicleNumber: data.vehicleNumber ?? existing.vehicleNumber,
          grLrNumber: data.grLrNumber ?? existing.grLrNumber,
          linkedPoNumber: data.linkedPoNumber ?? existing.linkedPoNumber,
          linkedPoDate: data.linkedPoDate ? new Date(data.linkedPoDate) : existing.linkedPoDate,
          status: data.status ?? existing.status,
          subtotal,
          cgstAmount,
          sgstAmount,
          igstAmount,
          totalTaxAmount,
          roundingAdjustment,
          grandTotal,
          amountInWords,
          advancePercentage: data.advancePercentage !== undefined ? Number(data.advancePercentage) : existing.advancePercentage,
          advanceRequiredAmount: data.advanceRequiredAmount !== undefined ? Number(data.advanceRequiredAmount) : existing.advanceRequiredAmount,
          ...(data.status && data.status !== existing.status ? {
            statusHistory: {
              create: {
                fromStatus: existing.status,
                toStatus: data.status,
                changedById: userId,
                comment: data.notes || `Status updated to ${data.status}`,
              },
            },
          } : {}),
          ...(itemsUpdate ? { items: itemsUpdate } : {}),
          ...(taxSummaryUpdate ? { taxSummary: taxSummaryUpdate } : {}),
        },
        include: { items: true, taxSummary: true, customer: true, terms: true, parties: true },
      });

      // Update terms if provided
      if (data.terms && Array.isArray(data.terms)) {
        await tx.proformaInvoiceTerm.deleteMany({ where: { piId: id } });
        await tx.proformaInvoiceTerm.createMany({
          data: data.terms.map((t: string, idx: number) => ({
            piId: id,
            clauseNumber: idx + 1,
            text: t,
          })),
        });
      }

      // Update parties if provided
      if (data.billTo || data.shipTo) {
        await tx.proformaInvoiceParty.deleteMany({ where: { piId: id } });
        const partiesToCreate = [];
        if (data.billTo) {
          partiesToCreate.push({
            piId: id,
            partyRole: 'BILL_TO',
            partyName: data.billTo.partyName || existing.customer?.legalName || 'Customer Billing Party',
            gstin: data.billTo.gstin ? data.billTo.gstin.toUpperCase().trim() : undefined,
            addressLine: data.billTo.addressLine || 'Registered Address',
            state: data.billTo.state || 'Delhi',
            stateCode: data.billTo.stateCode || '07',
            phone: data.billTo.phone,
            email: data.billTo.email,
          });
        }
        if (data.shipTo) {
          partiesToCreate.push({
            piId: id,
            partyRole: 'SHIP_TO',
            partyName: data.shipTo.partyName || data.billTo?.partyName || existing.customer?.legalName || 'Delivery Site',
            gstin: data.shipTo.gstin ? data.shipTo.gstin.toUpperCase().trim() : undefined,
            addressLine: data.shipTo.addressLine || data.billTo?.addressLine || 'Delivery Address',
            state: data.shipTo.state || data.billTo?.state || 'Delhi',
            stateCode: data.shipTo.stateCode || data.billTo?.stateCode || '07',
            phone: data.shipTo.phone || data.billTo?.phone,
          });
        }
        if (partiesToCreate.length > 0) {
          await tx.proformaInvoiceParty.createMany({ data: partiesToCreate });
        }
      }

      if (userId) {
        await auditService.logMutation({
          userId,
          action: 'UPDATE',
          module: 'Sales',
          entityType: 'ProformaInvoice',
          entityId: id,
          newData: { grandTotal, piNumber: updated.piNumber },
        });
      }

      return updated;
    });
  },

  async delete(id: string, userId?: string) {
    const existing = await prisma.proformaInvoice.findUnique({
      where: { id },
      include: { paymentAllocations: true },
    });

    if (!existing) {
      return { success: true };
    }

    // 1. Clean up payment allocations & receivables
    await prisma.paymentAllocation.deleteMany({ where: { proformaInvoiceId: id } }).catch(() => {});
    await prisma.receivableEntry.deleteMany({ where: { proformaInvoiceId: id } }).catch(() => {});

    // 2. Clean up payment followups & their logs
    const followups = await prisma.paymentFollowup.findMany({
      where: { proformaInvoiceId: id },
      select: { id: true },
    }).catch(() => []);
    if (followups && followups.length > 0) {
      const followupIds = followups.map((f) => f.id);
      await prisma.paymentFollowupLog.deleteMany({ where: { followupId: { in: followupIds } } }).catch(() => {});
      await prisma.paymentFollowupReminder.deleteMany({ where: { followupId: { in: followupIds } } }).catch(() => {});
      await prisma.paymentFollowup.deleteMany({ where: { id: { in: followupIds } } }).catch(() => {});
    }

    // 3. Clean up QR Codes and Scan Logs
    const qrCodes = await prisma.qrCode.findMany({
      where: { OR: [{ proformaInvoiceId: id }, { entityType: 'PI', entityId: id }] },
      select: { id: true },
    }).catch(() => []);
    if (qrCodes && qrCodes.length > 0) {
      const qrCodeIds = qrCodes.map((q) => q.id);
      await prisma.qrScanLog.deleteMany({ where: { qrCodeId: { in: qrCodeIds } } }).catch(() => {});
      await prisma.qrCode.deleteMany({ where: { id: { in: qrCodeIds } } }).catch(() => {});
    }

    // 4. Clean up Document Verification Tokens
    await prisma.documentVerificationToken.deleteMany({
      where: { OR: [{ proformaInvoiceId: id }, { documentType: 'PI', documentId: id }] },
    }).catch(() => {});

    // 5. Clean up PI child items using the schema foreign key: piId
    await prisma.proformaInvoiceTaxSummary.deleteMany({ where: { piId: id } });
    await prisma.proformaInvoiceItem.deleteMany({ where: { piId: id } });
    await prisma.proformaInvoiceParty.deleteMany({ where: { piId: id } });
    await prisma.proformaInvoiceTerm.deleteMany({ where: { piId: id } });
    await prisma.proformaInvoiceStatusHistory.deleteMany({ where: { piId: id } });

    // 6. Delete the Proforma Invoice
    await prisma.proformaInvoice.delete({ where: { id } });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'DELETE',
        module: 'Sales',
        entityType: 'ProformaInvoice',
        entityId: id,
        oldData: { piNumber: existing.piNumber },
      }).catch(() => {});
    }

    return { success: true };
  },

  /**
   * Generates a Proforma Invoice from an accepted Sales Quotation.
   * Delinks direct Quote->Order flow by enforcing the Quote -> PI step.
   */
  async createFromQuotation(quotation: any, userId?: string) {
    const customer = quotation.customer;
    const billingAddress = customer?.addresses?.find((a: any) => a.isDefaultBilling || a.addressType === 'BILLING') || customer?.addresses?.[0];
    const shippingAddress = customer?.addresses?.find((a: any) => a.isDefaultShipping || a.addressType === 'SHIPPING');

    const rawPosState = quotation.recipientAddress?.split(',').pop()?.trim() || billingAddress?.state || shippingAddress?.state || 'Delhi';
    const isDelhi = /delhi\b/i.test(rawPosState) || (customer?.gstin && customer.gstin.startsWith('07')) || billingAddress?.stateCode === '07';
    const placeOfSupplyStateCode = isDelhi ? '07' : (billingAddress?.stateCode || shippingAddress?.stateCode || '07');
    const placeOfSupply = isDelhi ? 'Delhi' : rawPosState;

    const grandTotal = Number(quotation.grandTotal) || 0;
    const advancePercentage = 50;
    const advanceRequiredAmount = Math.round(grandTotal * 0.5);

    // Build Billing Address string including PAN & Pincode
    const billAddressParts = [
      quotation.recipientAddress || billingAddress?.addressLine1,
      billingAddress?.addressLine2,
      billingAddress?.city,
      billingAddress?.state,
      billingAddress?.postalCode ? `PIN: ${billingAddress.postalCode}` : '',
      customer?.pan ? `PAN: ${customer.pan}` : '',
    ].filter(Boolean);
    const billAddressLine = billAddressParts.join(', ') || 'Registered Billing Address';

    // Build Delivery Address string
    const shipAddressParts = shippingAddress
      ? [
          shippingAddress.addressLine1,
          shippingAddress.addressLine2,
          shippingAddress.city,
          shippingAddress.state,
          shippingAddress.postalCode ? `PIN: ${shippingAddress.postalCode}` : '',
        ].filter(Boolean)
      : [quotation.recipientAddress || billingAddress?.addressLine1, billingAddress?.city, billingAddress?.state].filter(Boolean);
    const shipAddressLine = shipAddressParts.join(', ') || 'Delivery Site Address';

    // Map items with full cubicle specifications and hardware package!
    const piItems = (quotation.items || []).map((it: any) => {
      let desc = it.description || it.productName || 'Pacific Restroom Cubicle System';
      const specs: string[] = [];
      if (it.boardType) specs.push(`Board: ${it.boardType}`);
      if (it.boardThickness) specs.push(`Thickness: ${it.boardThickness}`);
      if (it.boardColor) specs.push(`Color: ${it.boardColor}`);
      if (it.cubicleSize) specs.push(`Size: ${it.cubicleSize}`);
      if (it.doorSize) specs.push(`Door: ${it.doorSize}`);
      if (it.overallHeight) specs.push(`Height: ${it.overallHeight}`);
      if (it.hardwarePackage) specs.push(`Hardware: ${it.hardwarePackage}`);
      if (specs.length > 0) {
        desc += `\n(${specs.join(' | ')})`;
      }
      return {
        productId: it.productId || null,
        description: desc,
        hsnSac: it.hsnSac || '9403',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'NOS',
        rate: Number(it.rate) || 0,
        gstRate: Number(it.gstRate) || 18,
        boardType: it.boardType || null,
        boardThickness: it.boardThickness || null,
        boardColor: it.boardColor || null,
        cubicleSize: it.cubicleSize || null,
        doorSize: it.doorSize || null,
        overallHeight: it.overallHeight || null,
        hardwarePackage: it.hardwarePackage || null,
      };
    });

    // Terms with Hardware Inclusions list
    const terms = [
      ...(quotation.accessoriesText ? [`Standard Inclusions & Hardware Accessories:\n${quotation.accessoriesText}`] : []),
      ...(quotation.paymentTerms ? [`Payment Terms: ${quotation.paymentTerms}`] : ['Payment: 50% advance along with formal order confirmation, balance against inspection / prior to dispatch.']),
      ...(quotation.deliveryTerms ? [`Delivery Terms: ${quotation.deliveryTerms}`] : ['Production lead time begins upon receipt of advance payment and approval of final drawings.']),
      ...(quotation.warrantyText ? [`Warranty: ${quotation.warrantyText}`] : ['We provide ten (10) years of warranty for partitions against any moisture-related defects and one (1) year warranty for workmanship and hardware against manufacturing defects.']),
      'Goods once fabricated to custom restroom sizes cannot be cancelled or exchanged.',
      'GST and transport charges applicable as per statutory rates.',
      'Subject to Delhi/NCR jurisdiction.',
    ];

    const piData = {
      companyProfileId: quotation.companyProfileId,
      customerId: quotation.customerId,
      quotationId: quotation.id,
      quotationRef: quotation.referenceNumber,
      placeOfSupply,
      placeOfSupplyStateCode,
      reverseCharge: false,
      advancePercentage,
      advanceRequiredAmount,
      advanceReceivedAmount: 0,
      advancePaymentStatus: 'PENDING',
      billTo: {
        partyName: quotation.recipientName || customer?.legalName || 'Valued Customer',
        addressLine: billAddressLine,
        state: isDelhi ? 'Delhi' : (billingAddress?.state || 'Delhi'),
        stateCode: placeOfSupplyStateCode,
        gstin: quotation.customerGstin || customer?.gstin,
        phone: quotation.recipientPhone || customer?.phone,
        email: quotation.recipientEmail || customer?.email,
      },
      shipTo: {
        partyName: quotation.recipientName || customer?.legalName || 'Valued Customer',
        addressLine: shipAddressLine,
        state: isDelhi ? 'Delhi' : (shippingAddress?.state || billingAddress?.state || 'Delhi'),
        stateCode: shippingAddress?.stateCode || placeOfSupplyStateCode,
        gstin: quotation.customerGstin || customer?.gstin,
        phone: quotation.recipientPhone || customer?.phone,
      },
      items: piItems,
      terms,
    };

    const pi = await this.create(piData, userId);

    // Update quotation status to CONVERTED and link convertedPiId
    await prisma.salesQuotation.update({
      where: { id: quotation.id },
      data: {
        status: 'CONVERTED',
        convertedPiId: pi.id,
      },
    });

    return pi;
  },

  /**
   * Advance Payment Tracking System for Proforma Invoices.
   * Records receipt of advance funds, updates payment status, logs transaction & allocation.
   */
  async recordAdvancePayment(
    id: string,
    paymentData: {
      amount: number;
      paymentDate?: string;
      paymentMode?: string;
      referenceNumber?: string;
      notes?: string;
    },
    userId?: string
  ) {
    const pi = await this.getById(id);
    const amount = Number(paymentData.amount);
    if (!amount || amount <= 0) {
      throw new Error('Valid advance payment amount is required');
    }

    const currentReceived = Number(pi.advanceReceivedAmount) || 0;
    const newReceived = currentReceived + amount;
    const required = Number(pi.advanceRequiredAmount) || (Number(pi.grandTotal) * 0.5);

    let advancePaymentStatus = 'PENDING';
    if (newReceived >= required) {
      advancePaymentStatus = 'FULLY_RECEIVED';
    } else if (newReceived > 0) {
      advancePaymentStatus = 'PARTIAL';
    }

    const paymentDate = paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date();
    const referenceNumber = paymentData.referenceNumber || `ADV-${Date.now().toString().slice(-6)}`;
    const paymentMode = paymentData.paymentMode || 'NEFT_RTGS';

    // Update PI advance fields
    const updatedPi = await prisma.proformaInvoice.update({
      where: { id },
      data: {
        advanceReceivedAmount: newReceived,
        advancePaymentStatus,
        advancePaymentDate: paymentDate,
        advancePaymentReference: referenceNumber,
        advancePaymentMode: paymentMode,
        statusHistory: {
          create: {
            fromStatus: pi.status,
            toStatus: pi.status,
            changedById: userId,
            comment: `Advance payment of ₹${amount.toLocaleString('en-IN')} recorded (${advancePaymentStatus}). Ref: ${referenceNumber}, Mode: ${paymentMode}. Notes: ${paymentData.notes || 'None'}`,
          },
        },
      },
      include: {
        customer: true,
        parties: true,
        items: true,
      },
    });

    // Also create formal Payment and PaymentAllocation records
    try {
      const pMethod = (['NEFT_RTGS', 'IMPS', 'UPI', 'CHEQUE', 'CASH', 'CARD'].includes(paymentMode)
        ? paymentMode
        : 'NEFT_RTGS') as any;

      await prisma.payment.create({
        data: {
          companyProfileId: pi.companyProfileId,
          partyId: pi.customerId,
          paymentType: 'ADVANCE',
          paymentMethod: pMethod,
          referenceNumber,
          paymentDate,
          amount,
          unallocatedAmount: 0,
          currency: pi.currency || 'INR',
          notes: paymentData.notes || `Advance payment for Proforma Invoice ${pi.piNumber}`,
          status: 'CONFIRMED',
          allocations: {
            create: {
              documentType: 'PI',
              documentId: pi.id,
              proformaInvoiceId: pi.id,
              allocatedAmount: amount,
            },
          },
        },
      });

      // Update receivable balance if exists
      const receivable = await prisma.receivableEntry.findFirst({
        where: { proformaInvoiceId: pi.id },
      });
      if (receivable) {
        const newPaid = Number(receivable.paidAmount) + amount;
        const total = Number(receivable.totalAmount);
        await prisma.receivableEntry.update({
          where: { id: receivable.id },
          data: {
            paidAmount: newPaid,
            balanceAmount: Math.max(0, total - newPaid),
            status: newPaid >= total ? 'PAID' : 'PARTIALLY_PAID',
          },
        });
      }
    } catch (payErr) {
      console.warn('Could not record linked payment entry (non-fatal):', payErr);
    }

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'UPDATE',
        module: 'Sales',
        entityType: 'ProformaInvoice',
        entityId: id,
        newData: { advanceReceivedAmount: newReceived, advancePaymentStatus, referenceNumber },
      }).catch(() => {});
    }

    return updatedPi;
  },

  /**
   * Converts a Proforma Invoice to a formal Sales Order once advance terms are met.
   */
  async convertToOrder(id: string, userId?: string) {
    const pi = await this.getById(id);

    if (pi.convertedOrderId) {
      const existingOrder = await prisma.salesOrder.findUnique({
        where: { id: pi.convertedOrderId },
      });
      if (existingOrder) {
        return existingOrder;
      }
    }

    // Call order service to create Order from this Proforma Invoice
    const order = await ordersService.createFromProforma(pi, userId);

    // Update PI with convertedOrderId
    await prisma.proformaInvoice.update({
      where: { id },
      data: {
        convertedOrderId: order.id,
        statusHistory: {
          create: {
            fromStatus: pi.status,
            toStatus: pi.status,
            changedById: userId,
            comment: `Converted to Sales Order ${order.orderNumber}. Originating PI: ${pi.piNumber}`,
          },
        },
      },
    });

    return order;
  },

  async getFollowups(id: string) {
    return prisma.paymentFollowup.findMany({
      where: { proformaInvoiceId: id },
      include: {
        logs: { orderBy: { createdAt: 'desc' } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async addFollowup(id: string, data: any, userId?: string) {
    const pi = await this.getById(id);
    const balance = Math.max(0, Number(pi.grandTotal) - Number(pi.advanceReceivedAmount));

    const followup = await prisma.paymentFollowup.create({
      data: {
        customerId: pi.customerId,
        proformaInvoiceId: id,
        outstandingAmount: balance,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        followupStatus: data.followupStatus || 'PENDING',
        priority: data.priority || 'MEDIUM',
        assignedUserId: userId || null,
        nextFollowupDate: data.nextFollowupDate ? new Date(data.nextFollowupDate) : undefined,
        promisedPaymentDate: data.promisedPaymentDate ? new Date(data.promisedPaymentDate) : undefined,
        promisedAmount: data.promisedAmount ? Number(data.promisedAmount) : undefined,
        notes: data.discussionNotes || data.notes || '',
        communicationChannel: data.communicationChannel || 'PHONE',
        logs: {
          create: {
            notes: data.discussionNotes || data.notes || 'Follow-up touchpoint recorded',
            response: data.response || `Channel: ${data.communicationChannel || 'PHONE'}, Status: ${data.followupStatus || 'PENDING'}`,
            userId: userId || null,
          },
        },
      },
      include: {
        logs: true,
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'CREATE',
        module: 'Sales',
        entityType: 'ProformaInvoiceFollowup',
        entityId: followup.id,
        newData: { channel: data.communicationChannel, notes: data.notes },
      }).catch(() => {});
    }

    return followup;
  },
};
