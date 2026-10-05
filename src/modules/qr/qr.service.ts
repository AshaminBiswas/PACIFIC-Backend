import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '../../config/database';
import { env } from '../../config/env';

export interface PublicVerificationResult {
  valid: boolean;
  message: string;
  document?: {
    documentType: string;
    documentNumber: string;
    companyName: string;
    partyName: string;
    date: string;
    currency: string;
    maskedAmount: string;
    status: string;
    verifiedAt: string;
  };
}

export const qrService = {
  /**
   * Generates a cryptographically secure token for document verification or tracking.
   */
  generateToken(entityType: string, entityId: string): string {
    const timestamp = Date.now().toString();
    const entropy = crypto.randomBytes(16).toString('hex');
    const secret = env.jwt.secret || 'pacific-secret-qr-key';
    const hash = crypto
      .createHmac('sha256', secret)
      .update(`${entityType}:${entityId}:${timestamp}:${entropy}`)
      .digest('hex');
    return `${entityType.toLowerCase()}_${hash.slice(0, 32)}`;
  },

  /**
   * Creates a public verification token and QR code for an issued document.
   */
  async registerDocumentQr(params: {
    documentType: string;
    documentId: string;
    documentNumber: string;
    companyName: string;
    partyName: string;
    date: string;
    totalAmount: number;
    currency: string;
    status: string;
  }) {
    const token = this.generateToken(params.documentType, params.documentId);
    const baseUrl = 'https://www.pacificproduct.in';
    const qrData = `${baseUrl}/verify/${token}`;

    const safePayload = {
      documentType: params.documentType,
      documentNumber: params.documentNumber,
      companyName: params.companyName,
      partyName: params.partyName,
      date: params.date,
      currency: params.currency,
      totalAmount: params.totalAmount,
      status: params.status,
    };

    // Store in document_verification_tokens
    await prisma.documentVerificationToken.create({
      data: {
        token,
        documentType: params.documentType,
        documentId: params.documentId,
        proformaInvoiceId: params.documentType === 'PI' ? params.documentId : undefined,
        verificationPayloadJson: safePayload,
        isValid: true,
      },
    });

    // Store in qr_codes
    const qrCode = await prisma.qrCode.create({
      data: {
        entityType: params.documentType,
        entityId: params.documentId,
        token,
        qrData,
        status: 'ACTIVE',
        proformaInvoiceId: params.documentType === 'PI' ? params.documentId : undefined,
        purchaseOrderId: params.documentType === 'PO' ? params.documentId : undefined,
      },
    });

    return { token, qrData, qrCodeId: qrCode.id };
  },

  /**
   * Retrieves or registers a QR code for any document to embed in PDFs by default.
   */
  async getOrCreateDocumentQr(params: {
    documentType: string;
    documentId: string;
    documentNumber: string;
    companyName: string;
    partyName: string;
    date: string;
    totalAmount?: number;
    currency?: string;
    status?: string;
  }): Promise<{ qrDataUrl: string; qrData: string; token: string }> {
    const existing = await prisma.documentVerificationToken.findFirst({
      where: { documentType: params.documentType, documentId: params.documentId, isValid: true },
    });

    const baseUrl = 'https://www.pacificproduct.in';
    let token = existing?.token;
    let qrData = token ? `${baseUrl}/verify/${token}` : '';

    if (!existing) {
      const reg = await this.registerDocumentQr({
        documentType: params.documentType,
        documentId: params.documentId,
        documentNumber: params.documentNumber,
        companyName: params.companyName,
        partyName: params.partyName,
        date: params.date,
        totalAmount: Number(params.totalAmount) || 0,
        currency: params.currency || 'INR',
        status: params.status || 'VERIFIED',
      });
      token = reg.token;
      qrData = reg.qrData;
    }

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrData, {
        margin: 1,
        width: 150,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch {
      qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
    }
    return { qrDataUrl, qrData, token: token! };
  },

  /**
   * Public verification check — safe, sanitised, never reveals internal IDs or passwords.
   */
  async verifyPublicToken(rawToken: string): Promise<PublicVerificationResult> {
    let token = decodeURIComponent(rawToken).trim();
    if (token.includes('/verify/')) {
      const parts = token.split('/verify/');
      token = parts[parts.length - 1].split('?')[0].split('#')[0];
    }

    // 1. Direct lookup in documentVerificationToken
    const record = await prisma.documentVerificationToken.findUnique({
      where: { token },
    });

    if (record && record.isValid) {
      const payload = record.verificationPayloadJson as any;
      const total = Number(payload.totalAmount) || 0;
      return {
        valid: true,
        message: '✓ Verified Genuine Document issued by Pacific Products & Solutions',
        document: {
          documentType: payload.documentType,
          documentNumber: payload.documentNumber,
          companyName: payload.companyName,
          partyName: payload.partyName,
          date: payload.date,
          currency: payload.currency || 'INR',
          maskedAmount: `${payload.currency === 'AED' ? 'AED' : '₹'} ${total.toLocaleString()}`,
          status: payload.status,
          verifiedAt: new Date().toISOString(),
        },
      };
    }

    // 2. Fallback check across documents by document number or ID
    // 2a. Sales Quotation
    const quote = await prisma.salesQuotation.findFirst({
      where: {
        OR: [
          { referenceNumber: token },
          { id: token },
        ],
      },
      include: { customer: true },
    });
    if (quote) {
      const total = Number(quote.grandTotal) || 0;
      return {
        valid: true,
        message: '✓ Verified Genuine Document issued by Pacific Products & Solutions',
        document: {
          documentType: 'QUOTATION',
          documentNumber: quote.referenceNumber,
          companyName: 'Pacific Products & Solutions',
          partyName: quote.recipientCompany || quote.recipientName || quote.customer?.legalName || 'Valued Customer',
          date: quote.date.toISOString(),
          currency: 'INR',
          maskedAmount: `₹ ${total.toLocaleString()}`,
          status: quote.status,
          verifiedAt: new Date().toISOString(),
        },
      };
    }

    // 2b. Proforma Invoice
    const pi = await prisma.proformaInvoice.findFirst({
      where: {
        OR: [
          { piNumber: token },
          { id: token },
        ],
      },
      include: { customer: true, companyProfile: true },
    });
    if (pi) {
      const total = Number(pi.grandTotal) || 0;
      return {
        valid: true,
        message: '✓ Verified Genuine Document issued by Pacific Products & Solutions',
        document: {
          documentType: 'PI',
          documentNumber: pi.piNumber,
          companyName: pi.companyProfile?.companyName || 'Pacific Products & Solutions',
          partyName: pi.customer?.legalName || 'Valued Customer',
          date: pi.piDate.toISOString(),
          currency: pi.currency || 'INR',
          maskedAmount: `${pi.currency === 'AED' ? 'AED' : '₹'} ${total.toLocaleString()}`,
          status: pi.status,
          verifiedAt: new Date().toISOString(),
        },
      };
    }

    // 2c. Sales Order
    const order = await prisma.salesOrder.findFirst({
      where: {
        OR: [
          { orderNumber: token },
          { id: token },
        ],
      },
      include: { customer: true, companyProfile: true },
    });
    if (order) {
      const total = Number(order.grandTotal) || 0;
      return {
        valid: true,
        message: '✓ Verified Genuine Document issued by Pacific Products & Solutions',
        document: {
          documentType: 'ORDER',
          documentNumber: order.orderNumber,
          companyName: order.companyProfile?.companyName || 'Pacific Products & Solutions',
          partyName: order.customer?.legalName || 'Valued Customer',
          date: order.orderDate.toISOString(),
          currency: order.currency || 'INR',
          maskedAmount: `${order.currency === 'AED' ? 'AED' : '₹'} ${total.toLocaleString()}`,
          status: order.status,
          verifiedAt: new Date().toISOString(),
        },
      };
    }

    // 2d. Tax Invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { invoiceNumber: token },
          { id: token },
        ],
      },
      include: { order: { include: { customer: true, companyProfile: true } } },
    });
    if (invoice) {
      const total = Number(invoice.totalAmount) || 0;
      return {
        valid: true,
        message: '✓ Verified Genuine Document issued by Pacific Products & Solutions',
        document: {
          documentType: 'INVOICE',
          documentNumber: invoice.invoiceNumber,
          companyName: invoice.order?.companyProfile?.companyName || 'Pacific Products & Solutions',
          partyName: invoice.order?.customer?.legalName || 'Valued Customer',
          date: invoice.issueDate.toISOString(),
          currency: invoice.currency || 'INR',
          maskedAmount: `${invoice.currency === 'AED' ? 'AED' : '₹'} ${total.toLocaleString()}`,
          status: invoice.status,
          verifiedAt: new Date().toISOString(),
        },
      };
    }

    // 2e. Packing List
    const packingList = await prisma.packingList.findFirst({
      where: {
        OR: [
          { packingListNumber: token },
          { id: token },
        ],
      },
      include: { customer: true },
    });
    if (packingList) {
      return {
        valid: true,
        message: '✓ Verified Genuine Document issued by Pacific Products & Solutions',
        document: {
          documentType: 'PACKING_LIST',
          documentNumber: packingList.packingListNumber,
          companyName: packingList.consignorName || 'Pacific Products & Solutions',
          partyName: packingList.shipToName || packingList.customer?.legalName || 'Valued Customer',
          date: packingList.date.toISOString(),
          currency: 'INR',
          maskedAmount: 'N/A (Dispatch Voucher)',
          status: packingList.receiptStatus || 'DISPATCHED',
          verifiedAt: new Date().toISOString(),
        },
      };
    }

    return {
      valid: false,
      message: 'Invalid or revoked verification token. Document cannot be authenticated.',
    };
  },

  /**
   * Admin Scanner Handler: decodes scanned data, logs scan, and resolves to admin navigation route.
   */
  async handleAdminScan(scannedPayload: string, userId?: string, ip?: string, userAgent?: string) {
    // Extract token if a full URL was scanned
    let token = scannedPayload.trim();
    if (token.includes('/verify/')) {
      const parts = token.split('/verify/');
      token = parts[parts.length - 1].split('?')[0].split('#')[0];
    }

    // Lookup token in qr_codes or document_verification_tokens
    const qrRecord = await prisma.qrCode.findUnique({
      where: { token },
      include: {
        proformaInvoice: {
          include: { customer: true },
        },
        purchaseOrder: {
          include: { vendor: true },
        },
        product: true,
      },
    });

    // Log the scan
    await prisma.qrScanLog.create({
      data: {
        qrCodeId: qrRecord?.id,
        token,
        scannedByUserId: userId,
        ipAddress: ip,
        userAgent,
      },
    });

    if (qrRecord) {
      return {
        success: true,
        type: qrRecord.entityType, // PI, PO, PRODUCT, INVENTORY
        entityId: qrRecord.entityId,
        token: qrRecord.token,
        targetRoute:
          qrRecord.entityType === 'PI'
            ? `/admin/dashboard/proforma-invoices?id=${qrRecord.entityId}`
            : qrRecord.entityType === 'PO'
            ? `/admin/dashboard/purchase-orders?id=${qrRecord.entityId}`
            : `/admin/dashboard/products?id=${qrRecord.entityId}`,
        data: qrRecord.proformaInvoice || qrRecord.purchaseOrder || qrRecord.product,
      };
    }

    // Fallback: check document verification tokens
    const docToken = await prisma.documentVerificationToken.findUnique({ where: { token } });
    if (docToken) {
      return {
        success: true,
        type: docToken.documentType,
        entityId: docToken.documentId,
        token: docToken.token,
        targetRoute:
          docToken.documentType === 'PI'
            ? `/admin/dashboard/proforma-invoices?id=${docToken.documentId}`
            : `/admin/dashboard/purchase-orders?id=${docToken.documentId}`,
        data: docToken.verificationPayloadJson,
      };
    }

    return {
      success: false,
      message: 'Unrecognized QR code or token. No corresponding entity found in Pacific Restroom Cubicle database.',
      token,
    };
  },
};
