import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../config/database';
import { htmlToPdfBuffer } from '../../utils/htmlToPdf';
import { pdfService, QuotationPdfData, PiPdfData } from '../pdf/pdf.service';

/**
 * Storage root for permanent, immutable document revisions and archived PDFs.
 */
const DOCUMENTS_STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'documents');

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Sanitizes a document number for safe OS filenames across Windows and Linux.
 * e.g. "PPS/QT/2026-27/001" -> "PPS_QT_2026-27_001"
 */
export function sanitizeDocNumberForFilename(docNum: string): string {
  return (docNum || 'DOC')
    .replace(/[\/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * Standard revision code formatter.
 * e.g. 1 -> "REV-01", 2 -> "REV-02", 12 -> "REV-12"
 */
export function formatRevisionCode(revNum: number): string {
  return `REV-${String(revNum || 1).padStart(2, '0')}`;
}

export const documentRevisionService = {
  // ─────────────────────────────────────────────────────────────────────────────
  // SALES QUOTATION REVISIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Captures an immutable snapshot of a Sales Quotation, generates its archived PDF,
   * and creates a SalesQuotationRevision record.
   */
  async createQuotationRevision(
    quotationId: string,
    revisionNumber: number,
    reason?: string,
    userId?: string,
    snapshotOverride?: any
  ) {
    const quote = await prisma.salesQuotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: { include: { addresses: true, contacts: true } },
        companyProfile: { include: { addresses: true, signatories: true } },
        issuingStaff: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: { orderBy: { serialNumber: 'asc' } },
      },
    });

    if (!quote) {
      throw Object.assign(new Error(`Sales Quotation ${quotationId} not found`), { status: 404 });
    }

    const snapshot = snapshotOverride || {
      id: quote.id,
      referenceNumber: quote.referenceNumber,
      revisionNumber,
      date: quote.date,
      validUntil: quote.validUntil,
      validityDays: quote.validityDays,
      status: quote.status,
      projectName: quote.projectName,
      subject: quote.subject,
      title: quote.title,
      currency: quote.currency,
      basicPrice: Number(quote.basicPrice),
      installationCharge: Number(quote.installationCharge || 0),
      installationRatePerCubicle: (quote as any).installationRatePerCubicle ? Number((quote as any).installationRatePerCubicle) : null,
      installationCubicleCount: (quote as any).installationCubicleCount || null,
      installationOption: (quote as any).installationOption || null,
      installationCustomNote: (quote as any).installationCustomNote || null,
      freightAmount: Number(quote.freightAmount || 0),
      freightTerms: quote.freightTerms,
      freightCustomNote: (quote as any).freightCustomNote || null,
      gstRate: Number(quote.gstRate || 18),
      gstAmount: Number(quote.gstAmount || 0),
      grandTotal: Number(quote.grandTotal || 0),
      isSezExempt: quote.isSezExempt,
      sezCertificateRef: quote.sezCertificateRef,
      amountInWords: quote.amountInWords,
      accessoriesText: quote.accessoriesText,
      warrantyText: quote.warrantyText,
      generalTerms: quote.generalTerms,
      otherTerms: quote.otherTerms,
      paymentTerms: quote.paymentTerms,
      deliveryTerms: quote.deliveryTerms,
      statutoryComplianceTerms: quote.statutoryComplianceTerms,
      customer: quote.customer,
      companyProfile: quote.companyProfile,
      issuingStaff: quote.issuingStaff,
      recipientSalutation: quote.recipientSalutation,
      recipientName: quote.recipientName,
      recipientCompany: quote.recipientCompany,
      recipientAddress: quote.recipientAddress,
      recipientEmail: quote.recipientEmail,
      recipientPhone: quote.recipientPhone,
      items: quote.items.map((it) => ({
        serialNumber: it.serialNumber,
        productId: it.productId,
        description: it.description,
        unit: it.unit,
        quantity: Number(it.quantity),
        rate: Number(it.rate),
        amount: Number(it.amount),
        cubicleSize: it.cubicleSize,
        boardColor: it.boardColor,
        boardThickness: it.boardThickness,
        doorSize: it.doorSize,
        overallHeight: it.overallHeight,
        hardwarePackage: it.hardwarePackage,
        customSpecsJson: it.customSpecsJson,
      })),
      snapshotCreatedAt: new Date().toISOString(),
    };

    const revCode = formatRevisionCode(revisionNumber);
    const safeDocNum = sanitizeDocNumberForFilename(quote.referenceNumber);
    const fileName = `${safeDocNum}_${revCode}.pdf`;

    const targetDir = path.join(DOCUMENTS_STORAGE_DIR, 'quotations', quote.id);
    ensureDirExists(targetDir);
    const pdfPath = path.join(targetDir, fileName);

    // Generate PDF buffer from snapshot
    let pdfGenerated = false;
    try {
      const { quotationsService } = await import('../quotations/quotations.service');
      const html = await quotationsService.getPdfHtml(quote.id);
      const pdfBuffer = await htmlToPdfBuffer(html);
      await fs.promises.writeFile(pdfPath, pdfBuffer);
      pdfGenerated = true;
    } catch (pdfErr) {
      console.warn(`[DocumentRevision] Warning: Failed to generate pre-rendered PDF for quote ${quote.id} Rev ${revisionNumber}:`, pdfErr);
    }

    const grandTotal = Number(quote.grandTotal || 0);
    const taxAmount = Number(quote.gstAmount || 0);
    const subtotal = Number(quote.basicPrice || 0) + Number(quote.installationCharge || 0) + Number(quote.freightAmount || 0);
    const itemCount = quote.items?.length || 0;
    const pdfUrl = `/api/v1/sales/quotations/${quote.id}/revisions/${revisionNumber}/pdf`;

    // Database transaction:
    // Mark prior revisions as SUPERSEDED (or ORIGINAL for rev 1)
    return prisma.$transaction(async (tx) => {
      await tx.salesQuotationRevision.updateMany({
        where: { quotationId: quote.id },
        data: {
          status: 'SUPERSEDED',
        },
      });

      // Upsert current revision record
      const revisionRecord = await tx.salesQuotationRevision.upsert({
        where: {
          quotationId_revisionNumber: {
            quotationId: quote.id,
            revisionNumber,
          },
        },
        create: {
          quotationId: quote.id,
          revisionNumber,
          status: 'CURRENT',
          snapshotJson: snapshot as any,
          grandTotal,
          taxAmount,
          subtotal,
          itemCount,
          pdfPath: pdfGenerated ? pdfPath : null,
          pdfFileName: fileName,
          pdfUrl,
          reason: reason || (revisionNumber === 1 ? 'Initial issuance (Rev 01)' : `Revision ${revisionNumber}`),
          createdById: userId || quote.createdById || null,
        },
        update: {
          status: 'CURRENT',
          snapshotJson: snapshot as any,
          grandTotal,
          taxAmount,
          subtotal,
          itemCount,
          pdfPath: pdfGenerated ? pdfPath : undefined,
          pdfFileName: fileName,
          pdfUrl,
          reason: reason || undefined,
        },
      });

      return revisionRecord;
    });
  },

  /**
   * Retrieves all revisions for a Sales Quotation, sorted with the latest first.
   */
  async getQuotationRevisions(quotationId: string) {
    // Check if initial revision exists; if not, backfill automatically
    await this.ensureInitialQuotationRevision(quotationId);

    const revisions = await prisma.salesQuotationRevision.findMany({
      where: { quotationId },
      orderBy: { revisionNumber: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const quote = await prisma.salesQuotation.findUnique({
      where: { id: quotationId },
      select: { revisionNumber: true, referenceNumber: true, customer: { select: { legalName: true } } },
    });

    return revisions.map((r) => {
      const isLatest = r.revisionNumber === (quote?.revisionNumber || 1);
      const isOriginal = r.revisionNumber === 1;
      const statusLabel = isLatest ? 'CURRENT' : isOriginal ? 'ORIGINAL' : 'SUPERSEDED';

      return {
        id: r.id,
        documentId: r.quotationId,
        documentType: 'QUOTATION' as const,
        documentNumber: quote?.referenceNumber,
        customerName: quote?.customer?.legalName,
        revisionNumber: r.revisionNumber,
        revisionCode: formatRevisionCode(r.revisionNumber),
        status: statusLabel,
        grandTotal: Number(r.grandTotal || 0),
        subtotal: Number(r.subtotal || 0),
        taxAmount: Number(r.taxAmount || 0),
        itemCount: r.itemCount || 0,
        pdfFileName: r.pdfFileName || `${sanitizeDocNumberForFilename(quote?.referenceNumber || 'QT')}_${formatRevisionCode(r.revisionNumber)}.pdf`,
        pdfUrl: `/api/v1/sales/quotations/${r.quotationId}/revisions/${r.revisionNumber}/pdf`,
        reason: r.reason || (isOriginal ? 'Original Version' : `Revision ${r.revisionNumber}`),
        createdAt: r.createdAt.toISOString(),
        createdBy: r.createdBy,
        snapshotJson: r.snapshotJson,
      };
    });
  },

  /**
   * Retrieves a specific revision by number for a Sales Quotation.
   */
  async getQuotationRevision(quotationId: string, revisionNumber: number) {
    await this.ensureInitialQuotationRevision(quotationId);

    const revision = await prisma.salesQuotationRevision.findUnique({
      where: {
        quotationId_revisionNumber: {
          quotationId,
          revisionNumber,
        },
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!revision) {
      throw Object.assign(new Error(`Revision ${revisionNumber} not found for quotation ${quotationId}`), { status: 404 });
    }

    return revision;
  },

  /**
   * Returns the archived PDF buffer for a specific Quotation revision.
   * If not already cached on disk, dynamically regenerates from the immutable snapshot.
   */
  async getQuotationRevisionPdfBuffer(quotationId: string, revisionNumber: number): Promise<{ buffer: Buffer; fileName: string }> {
    const revision = await this.getQuotationRevision(quotationId, revisionNumber);
    const quote = await prisma.salesQuotation.findUnique({
      where: { id: quotationId },
      select: { referenceNumber: true },
    });

    const safeDocNum = sanitizeDocNumberForFilename(quote?.referenceNumber || 'QUOTATION');
    const fileName = revision.pdfFileName || `${safeDocNum}_${formatRevisionCode(revisionNumber)}.pdf`;

    // 1. Check if PDF already exists on disk
    if (revision.pdfPath && fs.existsSync(revision.pdfPath)) {
      try {
        const buffer = await fs.promises.readFile(revision.pdfPath);
        if (buffer && buffer.length > 100) {
          return { buffer, fileName };
        }
      } catch (err) {
        console.warn(`[DocumentRevision] Failed to read cached PDF from disk ${revision.pdfPath}, regenerating...`, err);
      }
    }

    // 2. Generate on the fly from snapshot or service
    const { quotationsService } = await import('../quotations/quotations.service');
    let html: string;
    if (revision.snapshotJson && typeof revision.snapshotJson === 'object') {
      html = await this.renderQuotationSnapshotHtml(revision.snapshotJson);
    } else {
      html = await quotationsService.getPdfHtml(quotationId);
    }

    const buffer = await htmlToPdfBuffer(html);

    // Save to disk for future downloads
    try {
      const targetDir = path.join(DOCUMENTS_STORAGE_DIR, 'quotations', quotationId);
      ensureDirExists(targetDir);
      const pdfPath = path.join(targetDir, fileName);
      await fs.promises.writeFile(pdfPath, buffer);

      await prisma.salesQuotationRevision.update({
        where: { id: revision.id },
        data: { pdfPath, pdfFileName: fileName },
      });
    } catch (saveErr) {
      console.warn(`[DocumentRevision] Failed to cache generated PDF to disk:`, saveErr);
    }

    return { buffer, fileName };
  },

  /**
   * Helper to ensure existing legacy quotations have at least Revision 1 archived.
   */
  async ensureInitialQuotationRevision(quotationId: string, userId?: string) {
    const count = await prisma.salesQuotationRevision.count({
      where: { quotationId },
    });

    if (count === 0) {
      try {
        await this.createQuotationRevision(quotationId, 1, 'Initial issuance (Rev 01)', userId);
      } catch (err) {
        console.warn(`[DocumentRevision] Note: Could not backfill initial revision for quote ${quotationId}:`, err);
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PROFORMA INVOICE (PI) REVISIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Captures an immutable snapshot of a Proforma Invoice, generates its archived PDF,
   * and creates a ProformaInvoiceRevision record.
   */
  async createPiRevision(
    piId: string,
    revisionNumber: number,
    reason?: string,
    userId?: string,
    snapshotOverride?: any
  ) {
    const pi = await prisma.proformaInvoice.findUnique({
      where: { id: piId },
      include: {
        customer: { include: { addresses: true, contacts: true } },
        companyProfile: { include: { addresses: true, signatories: true, bankAccounts: true } },
        parties: true,
        items: { orderBy: { serialNumber: 'asc' } },
        taxSummary: { orderBy: { gstRate: 'asc' } },
        terms: { orderBy: { clauseNumber: 'asc' } },
      },
    });

    if (!pi) {
      throw Object.assign(new Error(`Proforma Invoice ${piId} not found`), { status: 404 });
    }

    const snapshot = snapshotOverride || {
      id: pi.id,
      piNumber: pi.piNumber,
      revisionNumber,
      piDate: pi.piDate,
      status: pi.status,
      placeOfSupply: pi.placeOfSupply,
      placeOfSupplyStateCode: pi.placeOfSupplyStateCode,
      reverseCharge: pi.reverseCharge,
      modeOfTransport: pi.modeOfTransport,
      vehicleNumber: pi.vehicleNumber,
      grLrNumber: pi.grLrNumber,
      linkedPoNumber: pi.linkedPoNumber,
      linkedPoDate: pi.linkedPoDate,
      subtotal: Number(pi.subtotal),
      freightAmount: Number(pi.freightAmount || 0),
      freightTerms: pi.freightTerms,
      freightCustomNote: pi.freightCustomNote,
      installationCharge: pi.installationCharge != null ? Number(pi.installationCharge) : 0,
      installationRatePerCubicle: pi.installationRatePerCubicle != null ? Number(pi.installationRatePerCubicle) : null,
      installationCubicleCount: pi.installationCubicleCount,
      installationOption: pi.installationOption,
      installationCustomNote: pi.installationCustomNote,
      taxableAmount: Number(pi.taxableAmount || 0),
      cgstAmount: Number(pi.cgstAmount || 0),
      sgstAmount: Number(pi.sgstAmount || 0),
      igstAmount: Number(pi.igstAmount || 0),
      totalTaxAmount: Number(pi.totalTaxAmount || 0),
      roundingAdjustment: Number(pi.roundingAdjustment || 0),
      grandTotal: Number(pi.grandTotal || 0),
      amountInWords: pi.amountInWords,
      currency: pi.currency,
      advancePercentage: Number(pi.advancePercentage || 50),
      advanceRequiredAmount: Number(pi.advanceRequiredAmount || 0),
      advanceReceivedAmount: Number(pi.advanceReceivedAmount || 0),
      advancePaymentStatus: pi.advancePaymentStatus,
      advancePaymentDate: pi.advancePaymentDate,
      advancePaymentReference: pi.advancePaymentReference,
      advancePaymentMode: pi.advancePaymentMode,
      customer: pi.customer,
      companyProfile: pi.companyProfile,
      parties: pi.parties,
      items: pi.items.map((it) => ({
        serialNumber: it.serialNumber,
        productId: it.productId,
        description: it.description,
        hsnSac: it.hsnSac,
        quantity: Number(it.quantity),
        unit: it.unit,
        rate: Number(it.rate),
        amount: Number(it.amount),
        gstRate: Number(it.gstRate),
        taxableAmount: Number(it.taxableAmount),
        cgst: Number(it.cgst),
        sgst: Number(it.sgst),
        igst: Number(it.igst),
        totalAmount: Number(it.totalAmount),
        boardType: it.boardType,
        boardThickness: it.boardThickness,
        boardColor: it.boardColor,
        cubicleSize: it.cubicleSize,
        doorSize: it.doorSize,
        overallHeight: it.overallHeight,
        hardwarePackage: it.hardwarePackage,
      })),
      taxSummary: pi.taxSummary.map((ts) => ({
        gstRate: Number(ts.gstRate),
        taxableAmount: Number(ts.taxableAmount),
        cgst: Number(ts.cgst),
        sgst: Number(ts.sgst),
        igst: Number(ts.igst),
        totalTax: Number(ts.totalTax),
      })),
      terms: pi.terms.map((t) => ({
        clauseNumber: t.clauseNumber,
        text: t.text,
      })),
      snapshotCreatedAt: new Date().toISOString(),
    };

    const revCode = formatRevisionCode(revisionNumber);
    const safeDocNum = sanitizeDocNumberForFilename(pi.piNumber);
    const fileName = `${safeDocNum}_${revCode}.pdf`;

    const targetDir = path.join(DOCUMENTS_STORAGE_DIR, 'proforma-invoices', pi.id);
    ensureDirExists(targetDir);
    const pdfPath = path.join(targetDir, fileName);

    // Generate PDF buffer from snapshot
    let pdfGenerated = false;
    try {
      const { piService } = await import('../sales/pi.service');
      const html = await piService.getPdfHtml(pi.id);
      const pdfBuffer = await htmlToPdfBuffer(html);
      await fs.promises.writeFile(pdfPath, pdfBuffer);
      pdfGenerated = true;
    } catch (pdfErr) {
      console.warn(`[DocumentRevision] Warning: Failed to generate pre-rendered PDF for PI ${pi.id} Rev ${revisionNumber}:`, pdfErr);
    }

    const grandTotal = Number(pi.grandTotal || 0);
    const taxAmount = Number(pi.totalTaxAmount || 0);
    const subtotal = Number(pi.subtotal || 0);
    const itemCount = pi.items?.length || 0;
    const pdfUrl = `/api/v1/sales/pi/${pi.id}/revisions/${revisionNumber}/pdf`;

    return prisma.$transaction(async (tx) => {
      // Mark prior revisions as SUPERSEDED
      await tx.proformaInvoiceRevision.updateMany({
        where: { piId: pi.id },
        data: {
          status: 'SUPERSEDED',
        },
      });

      // Upsert current revision record
      const revisionRecord = await tx.proformaInvoiceRevision.upsert({
        where: {
          piId_revisionNumber: {
            piId: pi.id,
            revisionNumber,
          },
        },
        create: {
          piId: pi.id,
          revisionNumber,
          status: 'CURRENT',
          snapshotJson: snapshot as any,
          grandTotal,
          taxAmount,
          subtotal,
          itemCount,
          pdfPath: pdfGenerated ? pdfPath : null,
          pdfFileName: fileName,
          pdfUrl,
          reason: reason || (revisionNumber === 1 ? 'Initial issuance (Rev 01)' : `Revision ${revisionNumber}`),
          createdById: userId || pi.createdById || null,
        },
        update: {
          status: 'CURRENT',
          snapshotJson: snapshot as any,
          grandTotal,
          taxAmount,
          subtotal,
          itemCount,
          pdfPath: pdfGenerated ? pdfPath : undefined,
          pdfFileName: fileName,
          pdfUrl,
          reason: reason || undefined,
        },
      });

      return revisionRecord;
    });
  },

  /**
   * Retrieves all revisions for a Proforma Invoice, sorted with the latest first.
   */
  async getPiRevisions(piId: string) {
    await this.ensureInitialPiRevision(piId);

    const revisions = await prisma.proformaInvoiceRevision.findMany({
      where: { piId },
      orderBy: { revisionNumber: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const pi = await prisma.proformaInvoice.findUnique({
      where: { id: piId },
      select: { revisionNumber: true, piNumber: true, customer: { select: { legalName: true } } },
    });

    return revisions.map((r) => {
      const isLatest = r.revisionNumber === (pi?.revisionNumber || 1);
      const isOriginal = r.revisionNumber === 1;
      const statusLabel = isLatest ? 'CURRENT' : isOriginal ? 'ORIGINAL' : 'SUPERSEDED';

      return {
        id: r.id,
        documentId: r.piId,
        documentType: 'PI' as const,
        documentNumber: pi?.piNumber,
        customerName: pi?.customer?.legalName,
        revisionNumber: r.revisionNumber,
        revisionCode: formatRevisionCode(r.revisionNumber),
        status: statusLabel,
        grandTotal: Number(r.grandTotal || 0),
        subtotal: Number(r.subtotal || 0),
        taxAmount: Number(r.taxAmount || 0),
        itemCount: r.itemCount || 0,
        pdfFileName: r.pdfFileName || `${sanitizeDocNumberForFilename(pi?.piNumber || 'PI')}_${formatRevisionCode(r.revisionNumber)}.pdf`,
        pdfUrl: `/api/v1/sales/pi/${r.piId}/revisions/${r.revisionNumber}/pdf`,
        reason: r.reason || (isOriginal ? 'Original Version' : `Revision ${r.revisionNumber}`),
        createdAt: r.createdAt.toISOString(),
        createdBy: r.createdBy,
        snapshotJson: r.snapshotJson,
      };
    });
  },

  /**
   * Retrieves a specific revision by number for a Proforma Invoice.
   */
  async getPiRevision(piId: string, revisionNumber: number) {
    await this.ensureInitialPiRevision(piId);

    const revision = await prisma.proformaInvoiceRevision.findUnique({
      where: {
        piId_revisionNumber: {
          piId,
          revisionNumber,
        },
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!revision) {
      throw Object.assign(new Error(`Revision ${revisionNumber} not found for Proforma Invoice ${piId}`), { status: 404 });
    }

    return revision;
  },

  /**
   * Returns the archived PDF buffer for a specific Proforma Invoice revision.
   */
  async getPiRevisionPdfBuffer(piId: string, revisionNumber: number): Promise<{ buffer: Buffer; fileName: string }> {
    const revision = await this.getPiRevision(piId, revisionNumber);
    const pi = await prisma.proformaInvoice.findUnique({
      where: { id: piId },
      select: { piNumber: true },
    });

    const safeDocNum = sanitizeDocNumberForFilename(pi?.piNumber || 'PI');
    const fileName = revision.pdfFileName || `${safeDocNum}_${formatRevisionCode(revisionNumber)}.pdf`;

    // 1. Check if PDF already exists on disk
    if (revision.pdfPath && fs.existsSync(revision.pdfPath)) {
      try {
        const buffer = await fs.promises.readFile(revision.pdfPath);
        if (buffer && buffer.length > 100) {
          return { buffer, fileName };
        }
      } catch (err) {
        console.warn(`[DocumentRevision] Failed to read cached PDF from disk ${revision.pdfPath}, regenerating...`, err);
      }
    }

    // 2. Generate on the fly from snapshot or service
    const { piService } = await import('../sales/pi.service');
    let html: string;
    if (revision.snapshotJson && typeof revision.snapshotJson === 'object') {
      html = await this.renderPiSnapshotHtml(revision.snapshotJson);
    } else {
      html = await piService.getPdfHtml(piId);
    }

    const buffer = await htmlToPdfBuffer(html);

    // Save to disk for future downloads
    try {
      const targetDir = path.join(DOCUMENTS_STORAGE_DIR, 'proforma-invoices', piId);
      ensureDirExists(targetDir);
      const pdfPath = path.join(targetDir, fileName);
      await fs.promises.writeFile(pdfPath, buffer);

      await prisma.proformaInvoiceRevision.update({
        where: { id: revision.id },
        data: { pdfPath, pdfFileName: fileName },
      });
    } catch (saveErr) {
      console.warn(`[DocumentRevision] Failed to cache generated PDF to disk:`, saveErr);
    }

    return { buffer, fileName };
  },

  /**
   * Helper to ensure existing legacy Proforma Invoices have at least Revision 1 archived.
   */
  async ensureInitialPiRevision(piId: string, userId?: string) {
    const count = await prisma.proformaInvoiceRevision.count({
      where: { piId },
    });

    if (count === 0) {
      try {
        await this.createPiRevision(piId, 1, 'Initial issuance (Rev 01)', userId);
      } catch (err) {
        console.warn(`[DocumentRevision] Note: Could not backfill initial revision for PI ${piId}:`, err);
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SNAPSHOT HTML RENDERERS (Guarantees exact historical visual fidelity)
  // ─────────────────────────────────────────────────────────────────────────────

  async renderQuotationSnapshotHtml(snapshot: any): Promise<string> {
    const fullCompanyAddress = [
      snapshot.companyProfile?.addresses?.[0]?.addressLine1,
      snapshot.companyProfile?.addresses?.[0]?.city,
      snapshot.companyProfile?.addresses?.[0]?.state,
    ].filter(Boolean).join(', ') || 'Delhi, India';

    const pdfData: QuotationPdfData = {
      referenceNumber: snapshot.referenceNumber,
      revisionNumber: snapshot.revisionNumber || 1,
      date: snapshot.date ? new Date(snapshot.date).toISOString() : new Date().toISOString(),
      projectName: snapshot.projectName || 'Commercial Restroom Project',
      subject: snapshot.subject || '',
      title: snapshot.title || '',
      companyName: snapshot.companyProfile?.companyName || 'Pacific Products & Solutions',
      companyAddress: fullCompanyAddress,
      companyPhone: snapshot.companyProfile?.phone || '',
      companyEmail: snapshot.companyProfile?.email || '',
      companyGstin: snapshot.companyProfile?.gstin || '',
      logoUrl: snapshot.companyProfile?.logoUrl || undefined,
      recipientSalutation: snapshot.recipientSalutation || 'M/s',
      recipientName: snapshot.recipientName || 'Client',
      recipientCompany: snapshot.recipientCompany || undefined,
      recipientAddress: snapshot.recipientAddress || undefined,
      recipientGstin: snapshot.recipientGstin || undefined,
      issuingStaffName: snapshot.issuingStaff ? `${snapshot.issuingStaff.firstName} ${snapshot.issuingStaff.lastName}`.trim() : 'Company Head',
      currency: snapshot.currency || 'INR',
      items: (snapshot.items || []).map((it: any) => ({
        serialNumber: it.serialNumber,
        description: it.description,
        unit: it.unit || 'NOS',
        quantity: Number(it.quantity) || 1,
        rate: Number(it.rate) || 0,
        amount: Number(it.amount) || 0,
        cubicleSize: it.cubicleSize || undefined,
        boardColor: it.boardColor || undefined,
        boardThickness: it.boardThickness || undefined,
        doorSize: it.doorSize || undefined,
        overallHeight: it.overallHeight || undefined,
        boardType: it.boardType || undefined,
        hardwarePackage: it.hardwarePackage || undefined,
        make: it.make || undefined,
        modelName: it.modelName || undefined,
        customModelName: it.customModelName || undefined,
      })),
      basicPrice: Number(snapshot.basicPrice || 0),
      installationCharge: Number(snapshot.installationCharge || 0),
      installationRatePerCubicle: snapshot.installationRatePerCubicle ? Number(snapshot.installationRatePerCubicle) : undefined,
      installationCubicleCount: snapshot.installationCubicleCount || undefined,
      installationOption: snapshot.installationOption || 'Included',
      installationCustomNote: snapshot.installationCustomNote || undefined,
      freightTerms: snapshot.freightTerms || 'Extra as Actual / To pay',
      freightAmount: Number(snapshot.freightAmount || 0),
      gstRate: Number(snapshot.gstRate || 18),
      isSezExempt: Boolean(snapshot.isSezExempt),
      sezCertificateRef: snapshot.sezCertificateRef || undefined,
      gstAmount: Number(snapshot.gstAmount || 0),
      grandTotal: Number(snapshot.grandTotal || 0),
      amountInWords: snapshot.amountInWords || undefined,
      accessoriesText: snapshot.accessoriesText || undefined,
      warrantyText: snapshot.warrantyText || undefined,
      generalTerms: snapshot.generalTerms || undefined,
      otherTerms: snapshot.otherTerms || undefined,
      paymentTerms: snapshot.paymentTerms || undefined,
      deliveryTerms: snapshot.deliveryTerms || undefined,
      statutoryComplianceTerms: snapshot.statutoryComplianceTerms || undefined,
      validityDays: snapshot.validityDays || 30,
    };

    return pdfService.generateQuotationPdfHtml(pdfData);
  },

  async renderPiSnapshotHtml(snapshot: any): Promise<string> {
    const companyAddress = [
      snapshot.companyProfile?.addresses?.[0]?.addressLine1,
      snapshot.companyProfile?.addresses?.[0]?.city,
      snapshot.companyProfile?.addresses?.[0]?.state,
    ].filter(Boolean).join(', ') || 'Delhi, India';

    const billToParty = (snapshot.parties && Array.isArray(snapshot.parties))
      ? snapshot.parties.find((p: any) => p.partyRole === 'BILL_TO')
      : null;

    const shipToParty = (snapshot.parties && Array.isArray(snapshot.parties))
      ? snapshot.parties.find((p: any) => p.partyRole === 'SHIP_TO')
      : null;

    const termsArray = (snapshot.terms && Array.isArray(snapshot.terms))
      ? snapshot.terms.map((t: any) => (typeof t === 'string' ? t : t.text)).filter(Boolean)
      : [];

    const piData: PiPdfData = {
      piNumber: snapshot.piNumber,
      piDate: snapshot.piDate ? new Date(snapshot.piDate).toISOString() : new Date().toISOString(),
      companyName: snapshot.companyProfile?.companyName || 'Pacific Products & Solutions',
      companyAddress,
      companyGstin: snapshot.companyProfile?.gstin || '07CIJPS1392A2Z9',
      companyPan: snapshot.companyProfile?.pan || 'CIJPS1392A',
      companyPhone: snapshot.companyProfile?.phone || undefined,
      companyEmail: snapshot.companyProfile?.email || undefined,
      logoUrl: snapshot.companyProfile?.logoUrl || undefined,
      placeOfSupply: snapshot.placeOfSupply || 'Delhi',
      placeOfSupplyStateCode: snapshot.placeOfSupplyStateCode || '07',
      reverseCharge: Boolean(snapshot.reverseCharge),
      modeOfTransport: snapshot.modeOfTransport || undefined,
      vehicleNumber: snapshot.vehicleNumber || undefined,
      grLrNumber: snapshot.grLrNumber || undefined,
      linkedPoNumber: snapshot.linkedPoNumber || undefined,
      linkedPoDate: snapshot.linkedPoDate ? new Date(snapshot.linkedPoDate).toISOString() : undefined,
      billTo: {
        name: billToParty?.partyName || snapshot.customer?.legalName || 'Valued Customer',
        address: billToParty?.addressLine || 'Registered Address',
        gstin: billToParty?.gstin || snapshot.customer?.gstin || undefined,
        pan: billToParty?.pan || snapshot.customer?.pan || undefined,
        state: billToParty?.state || snapshot.placeOfSupply || 'Delhi',
        stateCode: billToParty?.stateCode || snapshot.placeOfSupplyStateCode || '07',
        phone: billToParty?.phone || snapshot.customer?.phone || undefined,
        email: billToParty?.email || snapshot.customer?.email || undefined,
      },
      shipTo: {
        name: shipToParty?.partyName || billToParty?.partyName || snapshot.customer?.legalName || 'Valued Customer',
        address: shipToParty?.addressLine || billToParty?.addressLine || 'Site Address',
        gstin: shipToParty?.gstin || undefined,
        state: shipToParty?.state || billToParty?.state || snapshot.placeOfSupply || 'Delhi',
        stateCode: shipToParty?.stateCode || billToParty?.stateCode || snapshot.placeOfSupplyStateCode || '07',
        phone: shipToParty?.phone || undefined,
      },
      items: (snapshot.items || []).map((it: any) => ({
        serialNumber: it.serialNumber,
        description: it.description,
        hsnSac: it.hsnSac || undefined,
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'NOS',
        rate: Number(it.rate) || 0,
        amount: Number(it.amount) || 0,
        gstRate: Number(it.gstRate || 18),
        taxableAmount: Number(it.taxableAmount || it.amount || 0),
        boardType: it.boardType || undefined,
        boardThickness: it.boardThickness || undefined,
        boardColor: it.boardColor || undefined,
        cubicleSize: it.cubicleSize || undefined,
        doorSize: it.doorSize || undefined,
        overallHeight: it.overallHeight || undefined,
        hardwarePackage: it.hardwarePackage || undefined,
        customModelName: it.customModelName || undefined,
        modelName: it.modelName || undefined,
        isCustom: Boolean(it.isCustom),
      })),
      taxSummary: (snapshot.taxSummary || []).map((ts: any) => ({
        gstRate: Number(ts.gstRate),
        taxableAmount: Number(ts.taxableAmount),
        cgst: Number(ts.cgst),
        sgst: Number(ts.sgst),
        igst: Number(ts.igst),
        totalTax: Number(ts.totalTax),
      })),
      subtotal: Number(snapshot.subtotal || 0),
      freightAmount: Number(snapshot.freightAmount || 0),
      freightTerms: snapshot.freightTerms || 'Extra as Actual / To pay',
      freightCustomNote: snapshot.freightCustomNote || undefined,
      installationCharge: Number(snapshot.installationCharge || 0),
      installationRatePerCubicle: snapshot.installationRatePerCubicle ? Number(snapshot.installationRatePerCubicle) : undefined,
      installationCubicleCount: snapshot.installationCubicleCount || undefined,
      installationOption: snapshot.installationOption || 'Included',
      installationCustomNote: snapshot.installationCustomNote || undefined,
      cgstAmount: Number(snapshot.cgstAmount || 0),
      sgstAmount: Number(snapshot.sgstAmount || 0),
      igstAmount: Number(snapshot.igstAmount || 0),
      totalTaxAmount: Number(snapshot.totalTaxAmount || 0),
      roundingAdjustment: Number(snapshot.roundingAdjustment || 0),
      grandTotal: Number(snapshot.grandTotal || 0),
      amountInWords: snapshot.amountInWords || undefined,
      currency: snapshot.currency || 'INR',
      advancePercentage: Number(snapshot.advancePercentage || 50),
      advanceRequiredAmount: Number(snapshot.advanceRequiredAmount || 0),
      terms: termsArray,
    };

    return pdfService.generatePiHtml(piData);
  },
};
