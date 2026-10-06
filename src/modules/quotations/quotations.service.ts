import https from 'https';
import http from 'http';
import { prisma } from '../../config/database';
import { sequenceService } from '../sequences/sequence.service';
import { numberToWords } from '../utils/numberToWords';
import { pdfService } from '../pdf/pdf.service';
import { auditService } from '../audit/audit.service';
import { ordersService } from '../orders/orders.service';
import { piService } from '../sales/pi.service';
import { memoryCache } from '../../utils/cache';
import { qrService } from '../qr/qr.service';
import { emailService } from '../../utils/email.service';
import { htmlToPdfBuffer } from '../../utils/htmlToPdf';
import { v4 as uuidv4 } from 'uuid';

/** Fetches a remote image URL and converts it to a base64 data URI for offline embedding. */
async function fetchImageAsDataUri(url: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https://') ? https : http;
      const req = client.get(url, { timeout: 5000 }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const contentType = res.headers['content-type'] || 'image/png';
          const b64 = Buffer.concat(chunks).toString('base64');
          resolve(`data:${contentType};base64,${b64}`);
        });
        res.on('error', () => resolve(url));
      });
      req.on('error', () => resolve(url));
      req.on('timeout', () => { req.destroy(); resolve(url); });
    } catch {
      resolve(url);
    }
  });
}


function formatQuotationOutput(q: any) {
  if (!q) return q;
  return {
    ...q,
    quotationNumber: q.referenceNumber,
    basicPrice: Number(q.basicPrice || 0),
    installationCharge: Number(q.installationCharge || 0),
    freightAmount: Number(q.freightAmount || 0),
    gstRate: Number(q.gstRate || 0),
    gstAmount: Number(q.gstAmount || 0),
    grandTotal: Number(q.grandTotal || 0),
    items: Array.isArray(q.items)
      ? q.items.map((it: any) => ({
          ...it,
          quantity: Number(it.quantity || 0),
          rate: Number(it.rate || 0),
          unitPrice: Number(it.rate || 0),
          amount: Number(it.amount || 0),
          totalAmount: Number(it.amount || 0),
          itemDescription: it.description,
          boardType: it.boardType || (it.customSpecsJson as any)?.boardType || undefined,
          hardwarePackage: it.hardwarePackage || (it.customSpecsJson as any)?.hardwarePackage || undefined,
          make: it.make || (it.customSpecsJson as any)?.make || undefined,
          customModelName: (it.customSpecsJson as any)?.customModelName || (it.customSpecsJson as any)?.modelName || it.customModelName || undefined,
          modelName: (it.customSpecsJson as any)?.customModelName || (it.customSpecsJson as any)?.modelName || it.modelName || undefined,
          modelImageUrl: (it.customSpecsJson as any)?.modelImageUrl || (it.customSpecsJson as any)?.imageUrl || it.modelImageUrl || undefined,
          systemCategory: (it.customSpecsJson as any)?.systemCategory || (it.customSpecsJson as any)?.category || it.systemCategory || undefined,
        }))
      : q.items,
    drawingUrl: q.drawingUrl || undefined,
    drawingFileName: q.drawingFileName || undefined,
    drawingFileId: q.drawingFileId || undefined,
    nextFollowupDate: q.nextFollowupDate || undefined,
    followupStatus: q.followupStatus || 'PENDING',
    lastFollowupDate: q.lastFollowupDate || undefined,
    followupCount: Number(q.followupCount || 0),
    followups: q.followups || undefined,
  };
}

export const quotationsService = {
  async list(params?: {
    search?: string;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    branch?: string;
  }) {
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const andClauses: any[] = [];
    if (params?.status) andClauses.push({ status: params.status });
    if (params?.customerId) andClauses.push({ customerId: params.customerId });
    if (params?.branch) {
      const b = params.branch.toUpperCase();
      if (b === 'KOLKATA' || b === 'KOL') {
        andClauses.push({
          OR: [
            { referenceNumber: { startsWith: 'PPSK/' } },
            { referenceNumber: { contains: 'KOL' } },
            { companyProfileId: 'a25090ef-f6c0-407f-8b1e-1da8d506308c' },
            { companyProfile: { stateCode: '19' } },
            { companyProfile: { entityCode: 'PPS-KOL' } },
            { companyProfile: { companyName: { contains: 'Kolkata' } } },
            { companyProfile: { state: { contains: 'Bengal' } } },
          ],
        });
      } else if (b === 'MAIN' || b === 'DELHI') {
        andClauses.push({
          NOT: [
            { referenceNumber: { startsWith: 'PPSK/' } },
            { referenceNumber: { contains: 'KOL' } },
            { companyProfileId: 'a25090ef-f6c0-407f-8b1e-1da8d506308c' },
            { companyProfile: { stateCode: '19' } },
            { companyProfile: { entityCode: 'PPS-KOL' } },
            { companyProfile: { companyName: { contains: 'Kolkata' } } },
            { companyProfile: { state: { contains: 'Bengal' } } },
          ],
        });
      }
    }
    if (params?.startDate || params?.endDate) {
      const dateCond: any = {};
      if (params.startDate) dateCond.gte = new Date(params.startDate);
      if (params.endDate) dateCond.lte = new Date(params.endDate);
      andClauses.push({ date: dateCond });
    }
    if (params?.search) {
      andClauses.push({
        OR: [
          { referenceNumber: { contains: params.search, mode: 'insensitive' } },
          { projectName: { contains: params.search, mode: 'insensitive' } },
          { recipientName: { contains: params.search, mode: 'insensitive' } },
          { recipientCompany: { contains: params.search, mode: 'insensitive' } },
        ],
      });
    }

    const where: any = andClauses.length > 0 ? { AND: andClauses } : {};

    const [total, items] = await Promise.all([
      prisma.salesQuotation.count({ where }),
      prisma.salesQuotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          customer: true,
          companyProfile: true,
          issuingStaff: { select: { id: true, firstName: true, lastName: true, email: true } },
          items: true,
          followups: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      }),
    ]);

    return {
      items: items.map(formatQuotationOutput),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const quote = await prisma.salesQuotation.findUnique({
      where: { id },
      include: {
        customer: { include: { addresses: true, contacts: true } },
        companyProfile: { include: { addresses: true, signatories: true } },
        issuingStaff: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: { orderBy: { serialNumber: 'asc' } },
        revisions: { orderBy: { revisionNumber: 'desc' } },
        followups: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!quote) throw new Error('Sales Quotation not found');
    return formatQuotationOutput(quote);
  },

  async getByCodeOrId(code: string) {
    const cleanCode = (code || '').trim();
    if (!cleanCode) throw new Error('Quotation ID or reference code is required');

    const quotationInclude = {
      customer: { include: { addresses: true, contacts: true } },
      companyProfile: { include: { addresses: true, signatories: true } },
      issuingStaff: { select: { id: true, firstName: true, lastName: true, email: true } },
      items: { orderBy: { serialNumber: 'asc' } },
      revisions: { orderBy: { revisionNumber: 'desc' } },
      followups: { orderBy: { createdAt: 'desc' } },
    } as const;

    // 1. Try exact UUID match
    let quote = await prisma.salesQuotation.findUnique({
      where: { id: cleanCode },
      include: quotationInclude,
    });

    // 2. Try prefix UUID match (e.g. 8-char short code like d074c655)
    if (!quote && cleanCode.length >= 6) {
      quote = await prisma.salesQuotation.findFirst({
        where: { id: { startsWith: cleanCode, mode: 'insensitive' } },
        include: quotationInclude,
      });
    }

    // 3. Try exact reference number match
    if (!quote) {
      quote = await prisma.salesQuotation.findFirst({
        where: { referenceNumber: { equals: cleanCode, mode: 'insensitive' } },
        include: quotationInclude,
      });
    }

    // 4. Try reference number with converted separators (dashes to slashes or vice versa)
    if (!quote && (cleanCode.includes('-') || cleanCode.includes('_'))) {
      const slashVariant = cleanCode.replace(/[-_]/g, '/');
      quote = await prisma.salesQuotation.findFirst({
        where: { referenceNumber: { equals: slashVariant, mode: 'insensitive' } },
        include: quotationInclude,
      });
    }

    // 5. Try reference number contains
    if (!quote) {
      quote = await prisma.salesQuotation.findFirst({
        where: { referenceNumber: { contains: cleanCode, mode: 'insensitive' } },
        include: quotationInclude,
      });
    }

    if (!quote) {
      throw new Error(`Sales Quotation not found for code: "${cleanCode}"`);
    }

    return formatQuotationOutput(quote);
  },

  async create(data: any, userId?: string) {
    if (!data.customerId) throw new Error('Customer is required');
    if (!data.companyProfileId) throw new Error('Company Profile is required');
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('At least one quotation line item is required');
    }

    // Auto-resolve company profile or fallback
    const company = await prisma.companyProfile.findUnique({ where: { id: data.companyProfileId } });
    if (!company) throw new Error('Valid Company Profile is required');

    // Customer validation & default address
    const customer = await prisma.businessParty.findUnique({
      where: { id: data.customerId },
      include: { addresses: true, contacts: true },
    });
    if (!customer) throw new Error('Customer record not found');

    // Sequence generation
    const seq = await sequenceService.getNextDocumentNumber(company.id, 'QUOTATION');
    const referenceNumber = seq.number;

    // Calculations
    const itemsData = (data.items || []).map((it: any, idx: number) => {
      const qty = Number(it.quantity) || 1;
      const rate = Number(it.rate ?? it.unitPrice ?? 0);
      const amount = Number(it.amount ?? (qty * rate));
      const description = it.description || it.itemDescription || 'Pacific Restroom Cubicle Partition';
      return {
        serialNumber: idx + 1,
        productId: it.productId || null,
        description,
        unit: it.unit || 'NOS',
        quantity: qty,
        rate,
        amount,
        cubicleSize: it.cubicleSize || it.specifications || null,
        boardColor: it.boardColor || null,
        boardThickness: it.boardThickness || null,
        doorSize: it.doorSize || null,
        overallHeight: it.overallHeight || null,
        customSpecsJson: (it.hardwarePackage || it.boardType || it.make || it.customModelName || it.modelName || it.modelImageUrl || it.customSpecsJson)
          ? {
              hardwarePackage: it.hardwarePackage || null,
              boardType: it.boardType || null,
              make: it.make || null,
              customModelName: it.customModelName || it.modelName || (typeof it.customSpecsJson === 'object' ? it.customSpecsJson?.customModelName : null) || null,
              modelName: it.customModelName || it.modelName || (typeof it.customSpecsJson === 'object' ? it.customSpecsJson?.modelName : null) || null,
              modelImageUrl: it.modelImageUrl || (typeof it.customSpecsJson === 'object' ? it.customSpecsJson?.modelImageUrl : null) || null,
              systemCategory: it.systemCategory || (typeof it.customSpecsJson === 'object' ? it.customSpecsJson?.systemCategory : null) || null,
              ...(typeof it.customSpecsJson === 'object' ? it.customSpecsJson : {}),
            }
          : null,
      };
    });

    const basicPrice = itemsData.reduce((sum: number, it: any) => sum + it.amount, 0);
    const installationCharge = Number(data.installationCharge) || 0;
    const freightAmount = Number(data.freightAmount) || 0;
    const discountAmount = Number(data.discountAmount) || 0;
    const isSezExempt = Boolean(data.isSezExempt ?? data.isSez);
    const gstRate = isSezExempt ? 0 : Number(data.gstRate ?? 18);

    const taxable = Math.max(0, basicPrice - discountAmount) + installationCharge + (data.freightTerms === 'Fixed' || (data.freightTerms === 'Extra as Actual / To pay' && freightAmount > 0) ? freightAmount : 0);
    const gstAmount = isSezExempt ? 0 : Math.round((taxable * (gstRate / 100)) * 100) / 100;
    const grandTotal = Math.round(taxable + gstAmount);
    const currency = data.currency || company.currency || 'INR';
    const amountInWords = numberToWords(grandTotal, currency);

    const validityDays = Number(data.validityDays) || 30;
    const date = data.date ? new Date(data.date) : new Date();
    const validUntil = new Date(date.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const quotation = await prisma.salesQuotation.create({
      data: {
        referenceNumber,
        revisionNumber: 1,
        date,
        companyProfileId: company.id,
        customerId: customer.id,
        issuingStaffId: data.issuingStaffId || userId || null,
        createdById: userId || null,
        recipientSalutation: data.recipientSalutation || 'Mr.',
        recipientName: data.recipientName || customer.contacts?.[0]?.name || customer.legalName,
        recipientCompany: data.recipientCompany || customer.tradeName || customer.legalName,
        recipientAddress: data.recipientAddress || data.siteAddress || customer.addresses?.[0]?.addressLine1 || '',
        recipientEmail: data.recipientEmail || customer.email || '',
        recipientPhone: data.recipientPhone || customer.phone || '',
        projectName: data.projectName || data.siteName || 'Restroom Cubicles Project',
        subject: data.subject || 'Submission of Commercial Offer for Supply of Toilet Cubicles',
        title: data.title || 'Quotation for Supply of Toilet Cubicles',
        currency,
        basicPrice,
        installationCharge,
        freightTerms: data.freightTerms || 'Extra as Actual / To pay',
        freightAmount,
        gstRate,
        isSezExempt,
        sezCertificateRef: data.sezCertificateRef || null,
        gstAmount,
        grandTotal,
        amountInWords,
        accessoriesText: data.accessoriesText || null,
        warrantyText: data.warrantyText || 'We provide ten (10) years of warranty for partitions against any moisture-related defects and one (1) year warranty for workmanship and hardware against manufacturing defects.',
        generalTerms: data.generalTerms || null,
        otherTerms: data.otherTerms || null,
        paymentTerms: data.paymentTerms || '50% Advance along with confirmed Purchase Order. Balance 50% prior to dispatch.',
        deliveryTerms: data.deliveryTerms || '2-3 weeks from receipt of advance, approved shop drawings, and color confirmation.',
        statutoryComplianceTerms: data.statutoryComplianceTerms || null,
        drawingUrl: data.drawingUrl || null,
        drawingFileName: data.drawingFileName || null,
        drawingFileId: data.drawingFileId || null,
        validityDays,
        validUntil,
        status: 'DRAFT',
        nextFollowupDate: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
        followupStatus: 'PENDING',
        followupCount: 0,
        items: {
          create: itemsData,
        },
        followups: {
          create: [
            {
              channel: 'CALL',
              status: 'SCHEDULED',
              discussionNotes: 'Initial follow-up auto-scheduled within 2.5 hours of quotation creation.',
              nextFollowupDate: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
              contactPerson: data.recipientName || customer.contacts?.[0]?.name || customer.legalName,
              contactPhone: data.recipientPhone || customer.phone || null,
              contactEmail: data.recipientEmail || customer.email || null,
              performedByName: 'Auto Scheduler',
            },
          ],
        },
      },
      include: {
        items: true,
        customer: true,
        followups: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'CREATE',
        module: 'Sales',
        entityType: 'SalesQuotation',
        entityId: quotation.id,
        newData: { referenceNumber, grandTotal, recipientName: quotation.recipientName },
      });
    }

    return formatQuotationOutput(quotation);
  },

  async revise(id: string, updateData: any, reason?: string, userId?: string) {
    const existing = await this.getById(id);

    // Save previous snapshot in revisions
    await prisma.salesQuotationRevision.create({
      data: {
        quotationId: existing.id,
        revisionNumber: existing.revisionNumber,
        snapshotJson: existing as any,
        reason: reason || 'Price or site specification revision',
      },
    });

    const newRevNumber = existing.revisionNumber + 1;

    // Recompute items if provided
    let itemsUpdate: any = undefined;
    if (updateData.items && Array.isArray(updateData.items)) {
      await prisma.salesQuotationItem.deleteMany({ where: { quotationId: id } });
      itemsUpdate = {
        create: updateData.items.map((it: any, idx: number) => {
          const qty = Number(it.quantity) || 1;
          const rate = Number(it.rate ?? it.unitPrice ?? 0);
          return {
            serialNumber: idx + 1,
            productId: it.productId || null,
            description: it.description || it.itemDescription || 'Pacific Restroom Cubicle Partition',
            unit: it.unit || 'NOS',
            quantity: qty,
            rate,
            amount: Number(it.amount ?? (qty * rate)),
            cubicleSize: it.cubicleSize || it.specifications || null,
            boardColor: it.boardColor || null,
            boardThickness: it.boardThickness || null,
            doorSize: it.doorSize || null,
            overallHeight: it.overallHeight || null,
            customSpecsJson: (it.hardwarePackage || it.boardType || it.make || it.customModelName || it.modelName || it.modelImageUrl || it.customSpecsJson)
              ? {
                  hardwarePackage: it.hardwarePackage || null,
                  boardType: it.boardType || null,
                  make: it.make || null,
                  customModelName: it.customModelName || it.modelName || (typeof it.customSpecsJson === 'object' ? it.customSpecsJson?.customModelName : null) || null,
                  modelName: it.customModelName || it.modelName || (typeof it.customSpecsJson === 'object' ? it.customSpecsJson?.modelName : null) || null,
                  modelImageUrl: it.modelImageUrl || (typeof it.customSpecsJson === 'object' ? it.customSpecsJson?.modelImageUrl : null) || null,
                  systemCategory: it.systemCategory || (typeof it.customSpecsJson === 'object' ? it.customSpecsJson?.systemCategory : null) || null,
                  ...(typeof it.customSpecsJson === 'object' ? it.customSpecsJson : {}),
                }
              : null,
          };
        }),
      };
    }

    const updated = await prisma.salesQuotation.update({
      where: { id },
      data: {
        revisionNumber: newRevNumber,
        companyProfileId: updateData.companyProfileId || existing.companyProfileId,
        projectName: updateData.projectName ?? existing.projectName,
        subject: updateData.subject ?? existing.subject,
        basicPrice: updateData.basicPrice ?? existing.basicPrice,
        installationCharge: updateData.installationCharge ?? existing.installationCharge,
        freightAmount: updateData.freightAmount ?? existing.freightAmount,
        freightTerms: updateData.freightTerms ?? existing.freightTerms,
        gstRate: updateData.gstRate ?? existing.gstRate,
        isSezExempt: updateData.isSezExempt ?? existing.isSezExempt,
        sezCertificateRef: updateData.sezCertificateRef ?? existing.sezCertificateRef,
        gstAmount: updateData.gstAmount ?? existing.gstAmount,
        grandTotal: updateData.grandTotal ?? existing.grandTotal,
        amountInWords: updateData.amountInWords ?? existing.amountInWords,
        accessoriesText: updateData.accessoriesText ?? existing.accessoriesText,
        warrantyText: updateData.warrantyText ?? existing.warrantyText,
        generalTerms: updateData.generalTerms ?? existing.generalTerms,
        otherTerms: updateData.otherTerms ?? existing.otherTerms,
        paymentTerms: updateData.paymentTerms ?? existing.paymentTerms,
        deliveryTerms: updateData.deliveryTerms ?? existing.deliveryTerms,
        drawingUrl: updateData.drawingUrl !== undefined ? updateData.drawingUrl : existing.drawingUrl,
        drawingFileName: updateData.drawingFileName !== undefined ? updateData.drawingFileName : existing.drawingFileName,
        drawingFileId: updateData.drawingFileId !== undefined ? updateData.drawingFileId : existing.drawingFileId,
        items: itemsUpdate,
      },
      include: { items: true, customer: true },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'UPDATE',
        module: 'Sales',
        entityType: 'SalesQuotation',
        entityId: id,
        newData: { revisionNumber: newRevNumber, reason },
      });
    }

    return formatQuotationOutput(updated);
  },

  async send(id: string, userId?: string) {
    const quote = await this.getById(id);
    if (quote.isSezExempt && !quote.sezCertificateRef) {
      throw new Error('SEZ zero-GST quotation requires a valid SEZ Certificate / Form-I confirmation reference before marking as Sent.');
    }

    const nextDate = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
    const updated = await prisma.salesQuotation.update({
      where: { id },
      data: {
        status: 'SENT',
        nextFollowupDate: nextDate,
        followupStatus: 'PENDING',
      },
    });

    await prisma.quotationFollowup.create({
      data: {
        quotationId: id,
        channel: 'CALL',
        status: 'SCHEDULED',
        discussionNotes: `Quotation issued & marked as SENT. First follow-up scheduled for ${nextDate.toLocaleTimeString('en-IN')}.`,
        nextFollowupDate: nextDate,
        contactPerson: quote.recipientName,
        contactPhone: quote.recipientPhone,
        contactEmail: quote.recipientEmail,
        performedById: userId || null,
        performedByName: userId ? 'Staff' : 'Quotation Dispatcher',
      },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'ISSUE',
        module: 'Sales',
        entityType: 'SalesQuotation',
        entityId: id,
        newData: { status: 'SENT' },
      });
    }

    return formatQuotationOutput(updated);
  },

  async convertToPI(id: string, userId?: string) {
    const quote = await this.getById(id);
    if (quote.status === 'CONVERTED' && quote.convertedPiId) {
      const existingPi = await prisma.proformaInvoice.findUnique({
        where: { id: quote.convertedPiId },
      });
      if (existingPi) return existingPi;
    }

    // Call PI service to create PI from this Quotation
    const pi = await piService.createFromQuotation(quote, userId);

    return pi;
  },

  async convertToOrder(id: string, userId?: string) {
    const quote = await this.getById(id);
    if (quote.status === 'CONVERTED') {
      throw new Error(`Quotation ${quote.referenceNumber} has already been converted to an Order.`);
    }

    // Call order service to create Order from this Quotation
    const order = await ordersService.createFromQuotation(quote, userId);

    // Mark quotation as converted
    await prisma.salesQuotation.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedOrderId: order.id,
      },
    });

    return order;
  },

  async getPdfHtml(idOrCode: string): Promise<string> {
    const quote = await this.getByCodeOrId(idOrCode);

    const qr = await qrService.getOrCreateDocumentQr({
      documentType: 'QUOTATION',
      documentId: quote.id,
      documentNumber: quote.referenceNumber,
      companyName: quote.companyProfile.companyName,
      partyName: quote.recipientName,
      date: quote.date.toISOString(),
      totalAmount: Number(quote.grandTotal),
      currency: quote.currency,
      status: quote.status,
    });

    const signatories = (quote.companyProfile as any)?.signatories || [];
    const authSignatory = signatories.find((s: any) => s.isDefault && s.signatureUrl) ||
      signatories.find((s: any) => s.signatureUrl) ||
      signatories[0];
    const rawSignatureUrl = authSignatory?.signatureUrl || (quote.companyProfile as any)?.signatureUrl || undefined;
    const issuingStaffName = authSignatory?.name || (quote.issuingStaff ? `${quote.issuingStaff.firstName} ${quote.issuingStaff.lastName}` : undefined);
    const issuingStaffDesignation = authSignatory?.designation || undefined;
    const rawStaffPhone = authSignatory?.phone || quote.issuingStaff?.phone;
    const issuingStaffPhone = rawStaffPhone && !rawStaffPhone.includes('8010834316')
      ? rawStaffPhone
      : undefined;

    // Convert QR external URL → inline base64 so it renders in downloaded HTML files
    const qrDataUrl = qr.qrDataUrl
      ? await fetchImageAsDataUri(qr.qrDataUrl)
      : undefined;

    // Convert signature URL → inline base64 for offline embedding if it's a remote URL
    const signatureUrl = rawSignatureUrl && (rawSignatureUrl.startsWith('http://') || rawSignatureUrl.startsWith('https://'))
      ? await fetchImageAsDataUri(rawSignatureUrl)
      : rawSignatureUrl;

    // Collect unique model images from line items (only clean model name, no unnecessary descriptions)
    const rawModelImages = (quote.items || [])
      .map((it: any) => {
        let imgUrl = it.modelImageUrl || (it.customSpecsJson as any)?.modelImageUrl || (it.customSpecsJson as any)?.imageUrl;
        let cleanModelName = (it.customSpecsJson as any)?.customModelName || (it.customSpecsJson as any)?.modelName || it.modelName;
        const desc = String(it.description || '').trim();
        const descLower = desc.toLowerCase();
        const isUrinal = it.systemCategory === 'ump' || descLower.includes('urinal') || descLower.includes('ump') || (it.cubicleSize && it.cubicleSize.includes('450mm'));

        if (!cleanModelName && desc) {
          const match = desc.match(/(?:Model|Series|System)[:\s]+([^,\n\r]+)/i);
          if (match) {
            cleanModelName = match[1].trim();
          } else if (desc.length > 30) {
            cleanModelName = desc.split(/[,\n\r\-]/)[0].trim().slice(0, 30);
          } else {
            cleanModelName = desc;
          }
        }

        cleanModelName = (cleanModelName || (isUrinal ? 'Model A' : 'Model Visual'))
          .replace(/^(?:Model\s*Name|System)\s*:\s*/i, '')
          .replace(/[\(\[\{].*?[\)\]\}]/g, '')
          .trim();

        // Special handling for Urinal Partitions: Ensure image and format title as Model "A"
        if (isUrinal) {
          if (!imgUrl) {
            if (descLower.includes('model b') || descLower.includes('mode b') || cleanModelName.toLowerCase() === 'b') {
              imgUrl = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80';
            } else if (descLower.includes('model c') || descLower.includes('mode c') || cleanModelName.toLowerCase() === 'c') {
              imgUrl = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80';
            } else if (descLower.includes('model d') || descLower.includes('mode d') || cleanModelName.toLowerCase() === 'd') {
              imgUrl = 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80';
            } else {
              imgUrl = 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80';
            }
          }

          const upper = cleanModelName.toUpperCase();
          if (upper === 'A' || upper === 'MODEL A' || upper === 'MODE A' || descLower.includes('model a') || descLower.includes('mode a') || (!descLower.includes('model b') && !descLower.includes('model c') && !descLower.includes('model d'))) {
            cleanModelName = 'Model "A"';
          } else if (upper === 'B' || upper === 'MODEL B' || upper === 'MODE B' || descLower.includes('model b')) {
            cleanModelName = 'Model "B"';
          } else if (upper === 'C' || upper === 'MODEL C' || upper === 'MODE C' || descLower.includes('model c')) {
            cleanModelName = 'Model "C"';
          } else if (upper === 'D' || upper === 'MODEL D' || upper === 'MODE D' || descLower.includes('model d')) {
            cleanModelName = 'Model "D"';
          } else if (!cleanModelName.toLowerCase().startsWith('model')) {
            cleanModelName = `Model "${cleanModelName}"`;
          }
        }

        return imgUrl ? { modelName: cleanModelName, imageUrl: imgUrl } : null;
      })
      .filter((img: any): img is { modelName: string; imageUrl: string } => Boolean(img && img.imageUrl));

    const seenUrls = new Set<string>();
    const uniqueModelImages: Array<{ modelName: string; imageUrl: string }> = [];
    for (const img of rawModelImages) {
      if (!seenUrls.has(img.imageUrl)) {
        seenUrls.add(img.imageUrl);
        uniqueModelImages.push(img);
      }
    }

    const modelImagesWithDataUri = await Promise.all(
      uniqueModelImages.map(async (img) => {
        const dataUri = img.imageUrl.startsWith('data:')
          ? img.imageUrl
          : await fetchImageAsDataUri(img.imageUrl);
        return {
          ...img,
          imageUrl: dataUri || img.imageUrl,
        };
      })
    );

    return pdfService.generateQuotationPdfHtml({
      referenceNumber: quote.referenceNumber,
      revisionNumber: quote.revisionNumber,
      date: quote.date.toISOString(),
      projectName: quote.projectName,
      subject: quote.subject,
      title: quote.title,
      companyName: quote.companyProfile.companyName,
      companyAddress: quote.companyProfile.addresses?.[0]?.addressLine1 || 'H-3, JR Complex, Mandoli, New Delhi - 110093',
      companyPhone: quote.companyProfile.phone || '',
      companyEmail: quote.companyProfile.email || '',
      companyGstin: quote.companyProfile.gstin || '',
      logoUrl: quote.companyProfile.logoUrl || undefined,
      recipientSalutation: quote.recipientSalutation,
      recipientName: quote.recipientName,
      recipientCompany: quote.recipientCompany || undefined,
      recipientAddress: quote.recipientAddress || undefined,
      recipientGstin: (quote.customer?.gstin || (quote as any).recipientGstin || (quote as any).customerGstin || undefined)?.trim().toUpperCase(),
      issuingStaffName,
      issuingStaffDesignation,
      issuingStaffPhone,
      issuingStaffEmail: quote.issuingStaff?.email,
      currency: quote.currency,
      items: (quote.items || []).map((it: any) => ({
        serialNumber: it.serialNumber,
        description: it.description,
        unit: it.unit,
        quantity: Number(it.quantity),
        rate: Number(it.rate),
        amount: Number(it.amount),
        cubicleSize: it.cubicleSize || undefined,
        boardColor: it.boardColor || undefined,
        boardThickness: it.boardThickness || undefined,
        doorSize: it.doorSize || undefined,
        overallHeight: it.overallHeight || undefined,
        boardType: it.boardType || (it.customSpecsJson as any)?.boardType || undefined,
        hardwarePackage: it.hardwarePackage || (it.customSpecsJson as any)?.hardwarePackage || undefined,
        make: it.make || (it.customSpecsJson as any)?.make || undefined,
        modelImageUrl: it.modelImageUrl || (it.customSpecsJson as any)?.modelImageUrl || undefined,
        modelName: (it.customSpecsJson as any)?.customModelName || (it.customSpecsJson as any)?.modelName || it.modelName || undefined,
      })),
      basicPrice: Number(quote.basicPrice),
      installationCharge: Number(quote.installationCharge),
      freightTerms: quote.freightTerms,
      freightAmount: Number(quote.freightAmount),
      gstRate: Number(quote.gstRate),
      isSezExempt: quote.isSezExempt,
      sezCertificateRef: quote.sezCertificateRef || undefined,
      gstAmount: Number(quote.gstAmount),
      grandTotal: Number(quote.grandTotal),
      amountInWords: quote.amountInWords || undefined,
      accessoriesText: quote.accessoriesText || undefined,
      warrantyText: quote.warrantyText || undefined,
      generalTerms: quote.generalTerms || undefined,
      otherTerms: quote.otherTerms || undefined,
      paymentTerms: quote.paymentTerms || undefined,
      deliveryTerms: quote.deliveryTerms || undefined,
      statutoryComplianceTerms: quote.statutoryComplianceTerms || undefined,
      validityDays: quote.validityDays,
      validUntil: quote.validUntil?.toISOString(),
      signatureUrl,
      qrDataUrl,
      modelImages: modelImagesWithDataUri,
    });
  },

  async sendEmail(
    id: string,
    options?: { recipientEmail?: string; subject?: string; message?: string },
    userId?: string
  ) {
    const quote = await this.getById(id);
    const to = options?.recipientEmail || quote.recipientEmail || quote.customer?.email;
    if (!to) {
      throw new Error('No recipient email address found for this quotation. Please provide a valid email.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid email address: "${to}"`);
    }

    const pdfHtml = await this.getPdfHtml(id);
    const subject = options?.subject || `Pacific Quotation Ref: ${quote.referenceNumber} — ${quote.projectName || 'Commercial Offer'}`;
    const customMessage = options?.message
      ? `<div style="margin: 12px 0; padding: 10px; background: #f8fafc; border-left: 3px solid #000; font-size: 13px;">${options.message}</div>`
      : '';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #000; line-height: 1.5;">
        <div style="background: #0f172a; padding: 20px; text-align: center; border-radius: 6px 6px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 18px; letter-spacing: 0.5px;">PACIFIC PRODUCTS & SOLUTIONS</h1>
          <p style="color: #cbd5e1; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase;">Official Commercial Quotation</p>
        </div>
        <div style="padding: 24px; background: #ffffff; border: 1px solid #000; border-top: none; border-radius: 0 0 6px 6px;">
          <p style="font-size: 14px; margin-top: 0;">Dear <strong>${quote.recipientSalutation || 'Mr.'} ${quote.recipientName}</strong>,</p>
          <p style="font-size: 13px;">We take pleasure in submitting our formal commercial proposal and quotation for your project.</p>
          ${customMessage}
          <div style="background: #f8fafc; border: 1px solid #000; padding: 14px 18px; margin: 16px 0; font-size: 12px;">
            <p style="margin: 0;"><strong>Quotation Ref:</strong> ${quote.referenceNumber}</p>
            <p style="margin: 4px 0 0 0;"><strong>Project Name:</strong> ${quote.projectName || 'Restroom Cubicles Project'}</p>
            <p style="margin: 4px 0 0 0;"><strong>Dated:</strong> ${new Date(quote.date).toLocaleDateString('en-IN')}</p>
            ${quote.validUntil ? `<p style="margin: 4px 0 0 0;"><strong>Valid Until:</strong> ${new Date(quote.validUntil).toLocaleDateString('en-IN')}</p>` : ''}
            <p style="margin: 4px 0 0 0;"><strong>Grand Total:</strong> ${quote.currency} ${Number(quote.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <p style="font-size: 12px; color: #334155;">Please find the formal quotation letter attached as a PDF document for your review and records.</p>
          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
          <p style="font-size: 11px; color: #64748b; margin: 0;">
            ${quote.companyProfile?.companyName || 'Pacific Products & Solutions'}<br/>
            Phone: ${quote.companyProfile?.phone || '-'}
          </p>
        </div>
      </div>
    `;

    const cleanFilename = `Quotation_${quote.referenceNumber.replace(/[\/\\]/g, '_')}.pdf`;

    // Convert HTML → real PDF buffer via headless Chrome
    const pdfBuffer = await htmlToPdfBuffer(pdfHtml);

    const sendRes = await emailService.sendEmail({
      to,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: cleanFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (!sendRes.success) {
      throw new Error(`Failed to send email via Resend: ${sendRes.error || 'Unknown error'}`);
    }

    const nextDate = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
    // Mark as SENT if currently DRAFT and schedule follow-up
    await prisma.salesQuotation.update({
      where: { id },
      data: {
        status: quote.status === 'DRAFT' ? 'SENT' : quote.status,
        nextFollowupDate: nextDate,
        followupStatus: 'PENDING',
      },
    });

    await prisma.quotationFollowup.create({
      data: {
        quotationId: id,
        channel: 'EMAIL',
        status: 'COMPLETED',
        discussionNotes: `Quotation PDF emailed to ${to}${options?.subject ? ` (Subject: ${options.subject})` : ''}. First follow-up scheduled for ${nextDate.toLocaleTimeString('en-IN')}.`,
        nextFollowupDate: nextDate,
        contactEmail: to,
        contactPerson: quote.recipientName,
        performedById: userId || null,
        performedByName: userId ? 'Staff' : 'Quotation Dispatcher',
      },
    });

    if (userId) {
      await auditService.log({
        userId,
        action: 'ISSUE',
        module: 'Sales',
        entityType: 'SalesQuotation',
        entityId: id,
        newData: { action: 'EMAIL_SENT', to, subject, emailId: sendRes.id },
      });
    }

    return {
      success: true,
      message: `Quotation letter successfully emailed to ${to}`,
      emailId: sendRes.id,
    };
  },

  async update(id: string, updateData: any, userId?: string) {
    const existing = await this.getById(id);

    let itemsUpdate: any = undefined;
    let basicPrice = updateData.basicPrice !== undefined ? Number(updateData.basicPrice) : Number(existing.basicPrice);

    if (updateData.items && Array.isArray(updateData.items)) {
      await prisma.salesQuotationItem.deleteMany({ where: { quotationId: id } });
      const itemsList = updateData.items.map((it: any, idx: number) => {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.rate ?? it.unitPrice ?? 0);
        return {
          serialNumber: idx + 1,
          productId: it.productId || null,
          description: it.description || it.itemDescription || 'Pacific Restroom Cubicle Partition',
          unit: it.unit || 'NOS',
          quantity: qty,
          rate,
          amount: Number(it.amount ?? (qty * rate)),
          cubicleSize: it.cubicleSize || it.specifications || null,
          boardColor: it.boardColor || null,
          boardThickness: it.boardThickness || null,
          doorSize: it.doorSize || null,
          overallHeight: it.overallHeight || null,
          customSpecsJson: (it.hardwarePackage || it.boardType || it.make)
            ? {
                hardwarePackage: it.hardwarePackage || null,
                boardType: it.boardType || null,
                make: it.make || null,
                ...(typeof it.customSpecsJson === 'object' ? it.customSpecsJson : {}),
              }
            : (it.customSpecsJson || null),
        };
      });

      itemsUpdate = { create: itemsList };
      basicPrice = itemsList.reduce((s: number, it: any) => s + it.amount, 0);
    }

    const installationCharge = updateData.installationCharge !== undefined ? Number(updateData.installationCharge) : Number(existing.installationCharge || 0);
    const freightAmount = updateData.freightAmount !== undefined ? Number(updateData.freightAmount) : Number(existing.freightAmount || 0);
    const gstRate = updateData.gstRate !== undefined ? Number(updateData.gstRate) : Number(existing.gstRate || 18);
    const isSezExempt = updateData.isSezExempt !== undefined ? Boolean(updateData.isSezExempt) : existing.isSezExempt;

    const subtotal = basicPrice + installationCharge + freightAmount;
    const gstAmount = isSezExempt ? 0 : Math.round((subtotal * (gstRate / 100)) * 100) / 100;
    const grandTotal = Math.round(subtotal + gstAmount);
    const amountInWords = numberToWords(grandTotal, existing.currency || 'INR');

    const updated = await prisma.salesQuotation.update({
      where: { id },
      data: {
        recipientSalutation: updateData.recipientSalutation ?? existing.recipientSalutation,
        recipientName: updateData.recipientName ?? existing.recipientName,
        recipientCompany: updateData.recipientCompany ?? existing.recipientCompany,
        recipientAddress: updateData.recipientAddress ?? existing.recipientAddress,
        recipientEmail: updateData.recipientEmail ?? existing.recipientEmail,
        recipientPhone: updateData.recipientPhone ?? existing.recipientPhone,
        projectName: updateData.projectName ?? updateData.siteName ?? existing.projectName,
        subject: updateData.subject ?? existing.subject,
        title: updateData.title ?? existing.title,
        basicPrice,
        installationCharge,
        freightAmount,
        freightTerms: updateData.freightTerms ?? existing.freightTerms,
        gstRate,
        isSezExempt,
        sezCertificateRef: updateData.sezCertificateRef ?? existing.sezCertificateRef,
        gstAmount,
        grandTotal,
        amountInWords,
        accessoriesText: updateData.accessoriesText ?? existing.accessoriesText,
        warrantyText: updateData.warrantyText ?? existing.warrantyText,
        generalTerms: updateData.generalTerms ?? existing.generalTerms,
        otherTerms: updateData.otherTerms ?? existing.otherTerms,
        paymentTerms: updateData.paymentTerms ?? existing.paymentTerms,
        deliveryTerms: updateData.deliveryTerms ?? existing.deliveryTerms,
        statutoryComplianceTerms: updateData.statutoryComplianceTerms ?? existing.statutoryComplianceTerms,
        status: updateData.status ?? existing.status,
        ...(itemsUpdate ? { items: itemsUpdate } : {}),
      },
      include: { items: true, customer: true },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'UPDATE',
        module: 'Sales',
        entityType: 'SalesQuotation',
        entityId: id,
        newData: { grandTotal, recipientName: updated.recipientName },
      });
    }

    return formatQuotationOutput(updated);
  },

  async delete(id: string, userId?: string) {
    const existing = await prisma.salesQuotation.findUnique({ where: { id } });
    if (!existing) {
      return { success: true };
    }

    // 1. Unlink any converted/linked sales orders so database integrity is preserved
    await prisma.salesOrder.updateMany({
      where: { quotationId: id },
      data: { quotationId: null },
    }).catch(() => {});

    // 2. Clean up Document Verification Tokens
    await prisma.documentVerificationToken.deleteMany({
      where: { OR: [{ documentId: id }, { documentType: 'QUOTATION', documentId: id }] },
    }).catch(() => {});

    // 3. Clean up QR Codes and Scan Logs
    const qrCodes = await prisma.qrCode.findMany({
      where: { entityType: 'QUOTATION', entityId: id },
      select: { id: true },
    }).catch(() => []);
    if (qrCodes && qrCodes.length > 0) {
      const qrCodeIds = qrCodes.map((q) => q.id);
      await prisma.qrScanLog.deleteMany({ where: { qrCodeId: { in: qrCodeIds } } }).catch(() => {});
      await prisma.qrCode.deleteMany({ where: { id: { in: qrCodeIds } } }).catch(() => {});
    }

    // 4. Delete revisions and items
    await prisma.salesQuotationRevision.deleteMany({ where: { quotationId: id } });
    await prisma.salesQuotationItem.deleteMany({ where: { quotationId: id } });

    // 5. Delete the sales quotation
    await prisma.salesQuotation.delete({ where: { id } });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'DELETE',
        module: 'Sales',
        entityType: 'SalesQuotation',
        entityId: id,
        oldData: { referenceNumber: existing.referenceNumber },
      }).catch(() => {});
    }

    return { success: true };
  },

  async getFollowups(quotationId: string) {
    const quote = await prisma.salesQuotation.findUnique({
      where: { id: quotationId },
      select: {
        id: true,
        referenceNumber: true,
        customerId: true,
        recipientName: true,
        recipientPhone: true,
        recipientEmail: true,
        grandTotal: true,
        currency: true,
        followupStatus: true,
        nextFollowupDate: true,
        lastFollowupDate: true,
        followupCount: true,
      },
    });
    if (!quote) throw new Error('Quotation not found');

    const followups = await prisma.quotationFollowup.findMany({
      where: { quotationId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      quotation: quote,
      followups,
    };
  },

  async createFollowup(
    quotationId: string,
    data: {
      channel?: string;
      status: string;
      discussionNotes: string;
      nextFollowupDate?: string | Date | null;
      contactPerson?: string;
      contactPhone?: string;
      contactEmail?: string;
      performedByName?: string;
    },
    userId?: string
  ) {
    const quote = await prisma.salesQuotation.findUnique({
      where: { id: quotationId },
      include: { customer: true },
    });
    if (!quote) throw new Error('Quotation not found');

    const nextFollowup = data.nextFollowupDate ? new Date(data.nextFollowupDate) : null;
    const channel = data.channel || 'CALL';
    const status = data.status || 'COMPLETED';

    const followup = await prisma.quotationFollowup.create({
      data: {
        id: uuidv4(),
        quotationId,
        channel,
        status,
        discussionNotes: data.discussionNotes,
        nextFollowupDate: nextFollowup,
        contactPerson: data.contactPerson || quote.recipientName || quote.customer?.legalName || null,
        contactPhone: data.contactPhone || quote.recipientPhone || quote.customer?.phone || null,
        contactEmail: data.contactEmail || quote.recipientEmail || quote.customer?.email || null,
        performedById: userId || null,
        performedByName: data.performedByName || (userId ? 'Staff User' : 'Admin'),
      },
    });

    const isOrderConfirmed = status === 'ORDER_CONFIRMED';
    const quoteUpdateData: any = {
      lastFollowupDate: new Date(),
      followupCount: { increment: 1 },
      followupStatus: status,
      nextFollowupDate: nextFollowup,
    };
    if (isOrderConfirmed && quote.status !== 'ACCEPTED' && quote.status !== 'CONVERTED') {
      quoteUpdateData.status = 'ACCEPTED';
    }

    const updatedQuote = await prisma.salesQuotation.update({
      where: { id: quotationId },
      data: quoteUpdateData,
      include: {
        customer: true,
        items: true,
        followups: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'UPDATE',
        module: 'Sales',
        entityType: 'QuotationFollowup',
        entityId: followup.id,
        newData: { channel, status, discussionNotes: data.discussionNotes, nextFollowupDate: nextFollowup },
      });
    }

    return {
      followup,
      quotation: formatQuotationOutput(updatedQuote),
    };
  },

  async sendFollowupEmail(
    quotationId: string,
    options: {
      recipientEmail?: string;
      subject?: string;
      message?: string;
      nextFollowupDate?: string | Date;
      notes?: string;
    },
    userId?: string
  ) {
    const quote = await this.getById(quotationId);
    const to = options.recipientEmail || quote.recipientEmail || quote.customer?.email;
    if (!to) {
      throw new Error('Recipient email is required for sending follow-up email');
    }

    const subject = options.subject || `Follow-up: Pacific Quotation Ref ${quote.referenceNumber} — ${quote.projectName || 'Commercial Offer'}`;
    const customMessage = options.message || 'We are following up regarding the commercial quotation submitted for your restroom cubicle project. Please let us know if you require any technical clarifications, custom mockups, or revisions.';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background: #030213; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #B5F823; margin: 0; font-size: 20px; letter-spacing: 0.5px;">PACIFIC PRODUCTS & SOLUTIONS</h2>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase;">Quotation Follow-Up & Project Support</p>
        </div>
        <div style="padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 14px; margin-top: 0;">Dear <strong>${quote.recipientSalutation || 'Mr.'} ${quote.recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #334155;">${customMessage}</p>
          <div style="background: #f8fafc; border-left: 4px solid #7FB706; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px;"><strong>Quotation Ref:</strong> ${quote.referenceNumber}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Project Name:</strong> ${quote.projectName || 'Restroom Cubicles'}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Quotation Date:</strong> ${new Date(quote.date).toLocaleDateString('en-IN')}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Grand Total:</strong> ${quote.currency} ${Number(quote.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <p style="font-size: 13px; color: #475569;">
            Our engineering team is at your disposal to schedule a call, answer any questions, or coordinate site measurements.
          </p>
          <p style="font-size: 12px; color: #475569; margin-top: 16px;">
            <strong>Attached Document:</strong> Formal Commercial Quotation (PDF) is attached to this email for your reference.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">
            ${quote.companyProfile?.companyName || 'Pacific Products & Solutions'} • Restroom Cubicles & Lockers Manufacturer
          </p>
        </div>
      </div>
    `;

    // Generate quotation PDF and attach
    let attachments: any[] | undefined = undefined;
    try {
      const pdfHtml = await this.getPdfHtml(quotationId);
      const pdfBuffer = await htmlToPdfBuffer(pdfHtml);
      const cleanFilename = `Quotation_${quote.referenceNumber.replace(/[\/\\]/g, '_')}.pdf`;
      attachments = [
        {
          filename: cleanFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    } catch (pdfErr) {
      console.warn('Could not generate PDF attachment for follow-up email, sending HTML only:', pdfErr);
    }

    const sendRes = await emailService.sendEmail({
      to,
      subject,
      html: htmlBody,
      ...(attachments ? { attachments } : {}),
    });

    if (!sendRes.success) {
      throw new Error(`Failed to send follow-up email: ${sendRes.error || 'Unknown error'}`);
    }

    const nextDate = options.nextFollowupDate ? new Date(options.nextFollowupDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const followupResult = await this.createFollowup(
      quotationId,
      {
        channel: 'EMAIL',
        status: 'COMPLETED',
        discussionNotes: options.notes || `Follow-up email dispatched to ${to} with message: "${customMessage.substring(0, 120)}..."`,
        nextFollowupDate: nextDate,
        contactEmail: to,
        contactPerson: quote.recipientName,
        performedByName: userId ? 'Staff' : 'Quotation Dispatcher',
      },
      userId
    );

    return {
      success: true,
      message: `Follow-up email successfully sent to ${to}`,
      followup: followupResult.followup,
      quotation: followupResult.quotation,
    };
  },

  async listTemplates(category?: string) {
    const cacheKey = `templates:quotation:${category || 'all'}`;
    const cached = memoryCache.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (category) where.category = category;
    const items = await prisma.quotationContentTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    memoryCache.set(cacheKey, items, 600);
    return items;
  },

  async saveTemplate(data: any) {
    memoryCache.invalidate('templates:quotation');
    if (data.id) {
      return prisma.quotationContentTemplate.update({
        where: { id: data.id },
        data: {
          title: data.title,
          content: data.content,
          productCategory: data.productCategory,
          isDefault: Boolean(data.isDefault),
          version: { increment: 1 },
        },
      });
    }
    return prisma.quotationContentTemplate.create({
      data: {
        category: data.category,
        title: data.title,
        content: data.content,
        productCategory: data.productCategory,
        isDefault: Boolean(data.isDefault),
      },
    });
  },
};
