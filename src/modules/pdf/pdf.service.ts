import fs from 'fs';
import path from 'path';
import { numberToWords } from '../utils/numberToWords';

let cachedLogoBase64: string | null = null;
function resolveCompanyLogoDataUri(providedUrl?: string): string {
  if (providedUrl && (providedUrl.startsWith('data:') || providedUrl.startsWith('http://') || providedUrl.startsWith('https://'))) {
    return providedUrl;
  }
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), '../PACIFIC-Admin/public/pacific_logo.png'),
      'd:/PACIFIC-Admin/public/pacific_logo.png',
      path.resolve(__dirname, '../../../../PACIFIC-Admin/public/pacific_logo.png'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const buffer = fs.readFileSync(p);
        cachedLogoBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
        return cachedLogoBase64;
      }
    }
  } catch {
    // fallback
  }
  return providedUrl || '';
}

export interface PoPdfData {
  poNumber: string;
  poDate: string;
  subject?: string;
  description?: string;
  companyName: string;
  companyAddress: string;
  companyPhone?: string;
  companyGstin?: string;
  companyPan?: string;
  logoUrl?: string;
  qrDataUrl?: string;
  vendorName: string;
  vendorAddress: string;
  vendorGstin?: string;
  deliveryAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    mobile: string;
  };
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    gstin: string;
    pan: string;
  };
  paymentTerms: string;
  deliveryTerms: string;
  items: Array<{
    serialNumber: number;
    description: string;
    finish?: string;
    thickness?: string;
    cuttingSize?: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  signatureUrl?: string;
}

export interface QuotationPdfData {
  referenceNumber: string;
  revisionNumber: number;
  date: string;
  projectName: string;
  subject: string;
  title: string;
  companyName: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyGstin?: string;
  logoUrl?: string;
  recipientSalutation: string;
  recipientName: string;
  recipientCompany?: string;
  recipientAddress?: string;
  issuingStaffName?: string;
  issuingStaffDesignation?: string;
  issuingStaffPhone?: string;
  issuingStaffEmail?: string;
  currency: string;
  items: Array<{
    serialNumber: number;
    description: string;
    unit: string;
    quantity: number;
    rate: number;
    amount: number;
    boardType?: string;
    cubicleSize?: string;
    boardColor?: string;
    boardThickness?: string;
    doorSize?: string;
    overallHeight?: string;
    hardwarePackage?: string;
  }>;
  basicPrice: number;
  installationCharge?: number;
  freightTerms: string;
  freightAmount?: number;
  gstRate: number;
  isSezExempt: boolean;
  sezCertificateRef?: string;
  gstAmount: number;
  grandTotal: number;
  amountInWords?: string;
  accessoriesText?: string;
  warrantyText?: string;
  generalTerms?: string;
  otherTerms?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  statutoryComplianceTerms?: string;
  validityDays?: number;
  validUntil?: string;
  signatureUrl?: string;
  qrDataUrl?: string;
}

export interface ExportQuotationPdfData {
  quotationNumber: string;
  date: string;
  validUntil?: string;
  companyName: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyGstin?: string;
  logoUrl?: string;
  buyerName: string;
  buyerAddress?: string;
  buyerCountry?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  incoterm: string;
  portOfLoading?: string;
  portOfDestination?: string;
  currency: string;
  items: Array<{
    serialNumber: number;
    description: string;
    itemCode?: string;
    hsCode?: string;
    quantity: number;
    unit: string;
    unitRate: number;
    totalAmount: number;
    cbm?: number;
    grossWeightKg?: number;
  }>;
  subtotal: number;
  freightCharges: number;
  insuranceCharges: number;
  otherCharges: number;
  totalAmount: number;
  fobValue: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  createdByName?: string;
  qrDataUrl?: string;
}

export interface PackingListPdfData {
  packingListNumber: string;
  date: string;
  linkedOrderNumber?: string;
  linkedPiNumber?: string;
  consignorName: string;
  consignorAddress: string;
  shipToName: string;
  shipToAddress: string;
  siteContactName?: string;
  siteContactPhone?: string;
  items: Array<{
    serialNumber: number;
    description: string;
    size?: string;
    designNo?: string;
    quantity: number;
    noOfPackets?: number;
    natureOfPacket?: string;
  }>;
  totalQuantity: number;
  totalPackages?: number;
  isPartialDispatch?: boolean;
  checkedByName?: string;
  authorisedSignatoryName?: string;
  receivedByName?: string;
  receivedByPhone?: string;
  receivedAt?: string;
  receiptSignatureData?: string;
  qrDataUrl?: string;
}

export interface HardwareIssuePdfData {
  issueNumber: string;
  date: string;
  buyerName: string;
  buyerAddress?: string;
  projectName?: string;
  linkedOrderNumber?: string;
  items: Array<{
    serialNumber: number;
    description: string;
    category: string;
    color?: string;
    size?: string;
    quantity: number;
    remarks?: string;
  }>;
  totalQuantity: number;
  storeKeeperName?: string;
  storeKeeperSignedAt?: string;
  packedByName?: string;
  packedBySignedAt?: string;
  checkedByName?: string;
  checkedBySignedAt?: string;
  inchargeName?: string;
  inchargeSignedAt?: string;
  qrDataUrl?: string;
}

export interface PiPdfData {
  piNumber: string;
  piDate: string;
  companyName: string;
  companyAddress: string;
  companyGstin: string;
  companyPan?: string;
  companyPhone?: string;
  companyEmail?: string;
  logoUrl?: string;
  qrDataUrl?: string;
  placeOfSupply: string;
  placeOfSupplyStateCode: string;
  reverseCharge: boolean;
  modeOfTransport?: string;
  vehicleNumber?: string;
  grLrNumber?: string;
  linkedPoNumber?: string;
  linkedPoDate?: string;
  billTo: {
    name: string;
    address: string;
    gstin?: string;
    pan?: string;
    state: string;
    stateCode?: string;
    phone?: string;
    email?: string;
  };
  shipTo: {
    name: string;
    address: string;
    gstin?: string;
    state: string;
    stateCode?: string;
    phone?: string;
  };
  items: Array<{
    serialNumber: number;
    description: string;
    hsnSac?: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    gstRate: number;
    taxableAmount: number;
    boardType?: string;
    boardThickness?: string;
    boardColor?: string;
    cubicleSize?: string;
    doorSize?: string;
    overallHeight?: string;
    hardwarePackage?: string;
  }>;
  taxSummary: Array<{
    gstRate: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  }>;
  subtotal: number;
  freightAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  roundingAdjustment: number;
  grandTotal: number;
  currency: string;
  terms: string[];
  signatureUrl?: string;
  issuingStaffName?: string;
  issuingStaffDesignation?: string;
  issuingStaffPhone?: string;
  accessoriesText?: string;
  warrantyText?: string;
  amountInWords?: string;
  advanceRequiredAmount?: number;
  advancePercentage?: number;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode?: string;
    branch?: string;
    accountName?: string;
  };
}

export interface SalesOrderPdfData {
  orderNumber: string;
  orderDate: string;
  companyName: string;
  companyAddress: string;
  companyGstin: string;
  companyPan?: string;
  companyPhone?: string;
  companyEmail?: string;
  logoUrl?: string;
  qrDataUrl?: string;
  placeOfSupply: string;
  placeOfSupplyStateCode: string;
  clientPoNumber?: string;
  clientPoDate?: string;
  piNumber?: string;
  quotationRef?: string;
  status: string;
  billTo: {
    name: string;
    address: string;
    gstin?: string;
    pan?: string;
    state: string;
    stateCode?: string;
    phone?: string;
    email?: string;
  };
  shipTo: {
    name: string;
    address: string;
    gstin?: string;
    state: string;
    stateCode?: string;
    phone?: string;
  };
  items: Array<{
    serialNumber: number;
    description: string;
    hsnSac?: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    gstRate?: number;
    boardType?: string;
    boardThickness?: string;
    boardColor?: string;
    cubicleSize?: string;
    doorSize?: string;
    overallHeight?: string;
    hardwarePackage?: string;
  }>;
  subtotal: number;
  freightAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  grandTotal: number;
  currency: string;
  terms: string[];
  signatureUrl?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatoryPhone?: string;
  accessoriesText?: string;
  amountInWords?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode?: string;
    branch?: string;
    accountName?: string;
  };
}

export const pdfService = {
  /**
   * Generates single-page A4 print-ready HTML for Purchase Orders
   */
  generatePoHtml(data: PoPdfData): string {
    const currSym = data.currency === 'AED' ? 'AED' : '₹';
    const itemsRows = data.items
      .map(
        (it) => `
        <tr>
          <td style="text-align: center; border: 1px solid #1e293b; padding: 6px;">${it.serialNumber}</td>
          <td style="border: 1px solid #1e293b; padding: 6px; font-weight: 600;">${it.description}</td>
          <td style="text-align: center; border: 1px solid #1e293b; padding: 6px;">${it.finish || '-'}</td>
          <td style="text-align: center; border: 1px solid #1e293b; padding: 6px;">${it.thickness || '-'}</td>
          <td style="text-align: center; border: 1px solid #1e293b; padding: 6px;">${it.cuttingSize || '-'}</td>
          <td style="text-align: right; border: 1px solid #1e293b; padding: 6px;">${it.quantity}</td>
          <td style="text-align: center; border: 1px solid #1e293b; padding: 6px;">${it.unit}</td>
          <td style="text-align: right; border: 1px solid #1e293b; padding: 6px;">${currSym} ${it.rate.toLocaleString()}</td>
          <td style="text-align: right; border: 1px solid #1e293b; padding: 6px; font-weight: 600;">${currSym} ${it.amount.toLocaleString()}</td>
        </tr>
      `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Purchase Order — ${data.poNumber}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 12px;
      font-size: 11px;
      line-height: 1.4;
      background: #fff;
    }
    .po-container {
      border: 1.5px solid #0f172a;
      padding: 16px;
      box-sizing: border-box;
      min-height: 275mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .header-table td { vertical-align: top; }
    .logo-box { width: 80px; height: 80px; }
    .title-box { text-align: center; }
    .title-box h1 { margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .title-box p { margin: 2px 0; font-size: 10px; color: #334155; }
    .qr-box { width: 80px; text-align: right; }
    .vendor-grid {
      display: flex;
      justify-content: space-between;
      border: 1px solid #cbd5e1;
      padding: 10px;
      background: #f8fafc;
      margin-bottom: 10px;
    }
    .vendor-col { width: 50%; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .items-table th {
      background: #0f172a;
      color: #fff;
      font-size: 10px;
      text-transform: uppercase;
      padding: 6px;
      border: 1px solid #0f172a;
    }
    .totals-table { width: 40%; margin-left: auto; border-collapse: collapse; margin-bottom: 14px; }
    .totals-table td { padding: 4px 8px; border: 1px solid #cbd5e1; }
    .footer-grid {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #cbd5e1;
      padding-top: 12px;
      margin-top: auto;
    }
    .footer-col { width: 48%; }
    .sign-box { text-align: right; margin-top: 20px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="po-container">
    <div>
      <!-- Header Table -->
      <table class="header-table">
        <tr>
          <td class="logo-box">
            <div style="width: 70px; height: 70px; background: #0f172a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 24px;">PRC</div>
          </td>
          <td class="title-box">
            <h1>${data.companyName}</h1>
            <p>${data.companyAddress}</p>
            <p><strong>PURCHASE ORDER</strong></p>
          </td>
          <td class="qr-box">
            ${
              data.qrDataUrl
                ? `<img src="${data.qrDataUrl}" width="70" height="70" alt="QR Verification" />`
                : `<div style="width: 70px; height: 70px; border: 1px dashed #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 9px; text-align: center;">Scan QR</div>`
            }
          </td>
        </tr>
      </table>

      <!-- Vendor & Document Info -->
      <div class="vendor-grid">
        <div class="vendor-col">
          <p style="margin: 0; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700;">To / Supplier:</p>
          <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: 800;">${data.vendorName}</p>
          <p style="margin: 2px 0 0 0; color: #334155;">${data.vendorAddress}</p>
          ${data.vendorGstin ? `<p style="margin: 2px 0 0 0;"><strong>GSTIN:</strong> ${data.vendorGstin}</p>` : ''}
        </div>
        <div class="vendor-col" style="text-align: right;">
          <p style="margin: 0; font-size: 13px; font-weight: 800; color: #0f172a;">PO No: ${data.poNumber}</p>
          <p style="margin: 2px 0 0 0; color: #334155;"><strong>Date:</strong> ${new Date(data.poDate).toLocaleDateString('en-GB')}</p>
        </div>
      </div>

      ${data.subject ? `<p style="margin: 6px 0; font-size: 11px;"><strong>Subject:</strong> ${data.subject}</p>` : ''}
      <p style="margin: 4px 0 8px 0;">Dear Sir/Madam, ${data.description || 'Please process supply of following materials according to specifications agreed:'}</p>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 35px;">Sl No</th>
            <th>Description</th>
            <th style="width: 80px;">Finish</th>
            <th style="width: 65px;">Thickness</th>
            <th style="width: 85px;">Cutting Size</th>
            <th style="width: 50px;">Qty</th>
            <th style="width: 45px;">Unit</th>
            <th style="width: 75px;">Rate</th>
            <th style="width: 85px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Totals Table -->
      <table class="totals-table">
        <tr>
          <td><strong>Basic Amount:</strong></td>
          <td style="text-align: right; font-weight: 600;">${currSym} ${data.subtotal.toLocaleString()}</td>
        </tr>
        <tr>
          <td><strong>GST:</strong></td>
          <td style="text-align: right; font-weight: 600;">${currSym} ${data.gstAmount.toLocaleString()}</td>
        </tr>
        <tr style="background: #f1f5f9; font-size: 12px;">
          <td><strong>Total Amount:</strong></td>
          <td style="text-align: right; font-weight: 800; color: #0f172a;">${currSym} ${data.totalAmount.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <!-- Footer Address & Signature Block -->
    <div>
      <div class="footer-grid">
        <div class="footer-col">
          <p style="margin: 0; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">Delivery Address:</p>
          <p style="margin: 4px 0 0 0; font-weight: 600;">${data.companyName}</p>
          <p style="margin: 1px 0 0 0; color: #475569;">${data.deliveryAddress.line1}, ${data.deliveryAddress.line2 || ''}</p>
          <p style="margin: 1px 0 0 0; color: #475569;">${data.deliveryAddress.city}, ${data.deliveryAddress.state} - ${data.deliveryAddress.postalCode}</p>
          <p style="margin: 2px 0 0 0;"><strong>Mobile:</strong> ${data.deliveryAddress.mobile}</p>

          <div style="margin-top: 8px;">
            <p style="margin: 2px 0;"><strong>Payment Terms:</strong> ${data.paymentTerms}</p>
            <p style="margin: 2px 0;"><strong>Delivery Time:</strong> ${data.deliveryTerms}</p>
          </div>
        </div>

        <div class="footer-col">
          <p style="margin: 0; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">Billing Address:</p>
          <p style="margin: 4px 0 0 0; font-weight: 600;">${data.companyName}</p>
          <p style="margin: 1px 0 0 0; color: #475569;">${data.billingAddress.line1}, ${data.billingAddress.line2 || ''}</p>
          <p style="margin: 1px 0 0 0; color: #475569;">${data.billingAddress.city}, ${data.billingAddress.state} - ${data.billingAddress.postalCode}</p>
          <p style="margin: 2px 0 0 0;"><strong>GSTIN:</strong> ${data.billingAddress.gstin} | <strong>PAN:</strong> ${data.billingAddress.pan}</p>

          <div class="sign-box">
            <p style="margin: 0; font-size: 10px; color: #64748b;">For <strong>${data.companyName}</strong></p>
            <div style="height: 40px; display: flex; align-items: center; justify-content: flex-end;">
              ${
                data.signatureUrl
                  ? `<img src="${data.signatureUrl}" height="35" alt="Signature" />`
                  : `<span style="color: #cbd5e1; font-style: italic;">[Authorized Signature]</span>`
              }
            </div>
            <p style="margin: 0; font-size: 10px; font-weight: 700; border-top: 1px solid #94a3b8; display: inline-block; padding-top: 2px;">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  },

  /**
   * Generates formal Proforma Invoice PDF HTML matching the Quotation letterhead & vector layout,
   * with company logo, dual Bill To / Ship To party cards, technical specifications breakdown,
   * Delhi/Interstate statutory GST breakdown, bank remittance details, and signature sign-off.
   */
  generatePiHtml(data: PiPdfData): string {
    const formattedDate = new Date(data.piDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const logoSrc = resolveCompanyLogoDataUri(data.logoUrl);
    const currSym = data.currency === 'AED' ? 'AED' : '₹';
    const amountInWordsText = data.amountInWords || numberToWords(data.grandTotal, data.currency);

    const isDelhi = Boolean(
      (data.billTo?.gstin && data.billTo.gstin.startsWith('07')) ||
      /delhi\b/i.test(data.placeOfSupply || '') ||
      /07\b/i.test(data.placeOfSupplyStateCode || '') ||
      /delhi\b/i.test(data.billTo?.address || '') ||
      !(data.placeOfSupply || '').trim()
    );

    // Helper to extract specs from description if not provided directly
    const parseItemSpecs = (desc: string) => {
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
    };

    const cleanDescription = (desc: string) =>
      desc.replace(/\s*\((Board:.*?)\)/gi, '').replace(/\s*\((.*?Hardware:.*?)\)/gi, '').trim();

    const itemRows = data.items
      .map((it, idx) => {
        const fallbackSpecs = parseItemSpecs(it.description);
        const boardType = it.boardType || fallbackSpecs.boardType;
        const boardThickness = it.boardThickness || fallbackSpecs.boardThickness;
        const boardColor = it.boardColor || fallbackSpecs.boardColor;
        const cubicleSize = it.cubicleSize || fallbackSpecs.cubicleSize;
        const doorSize = it.doorSize || fallbackSpecs.doorSize;
        const overallHeight = it.overallHeight || fallbackSpecs.overallHeight;
        const hardwarePackage = it.hardwarePackage || fallbackSpecs.hardwarePackage;
        const displayDesc = cleanDescription(it.description);

        const hasSpecs = Boolean(
          boardType || boardThickness || boardColor || cubicleSize || doorSize || overallHeight || hardwarePackage
        );

        return `
          <tr>
            <td style="text-align: center;">${it.serialNumber || idx + 1}</td>
            <td>
              <div style="font-weight: bold; font-size: 11px;">${displayDesc}</div>
              ${hasSpecs ? `
                <div class="spec-box">
                  ${boardType ? `<div>• <strong>Board Type:</strong> ${boardType}</div>` : ''}
                  ${boardThickness ? `<div>• <strong>Board Thickness:</strong> ${boardThickness}</div>` : ''}
                  ${boardColor ? `<div>• <strong>Board Color:</strong> ${boardColor}</div>` : ''}
                  ${cubicleSize ? `<div>• <strong>Cubicle / Depth Size:</strong> ${cubicleSize}</div>` : ''}
                  ${doorSize ? `<div>• <strong>Door Size:</strong> ${doorSize}</div>` : ''}
                  ${overallHeight ? `<div>• <strong>Overall Height:</strong> ${overallHeight}</div>` : ''}
                  ${hardwarePackage ? `<div>• <strong>Hardware Package:</strong> ${hardwarePackage}</div>` : ''}
                </div>
              ` : ''}
            </td>
            <td style="text-align: center;">${it.hsnSac || '9403'}</td>
            <td style="text-align: center;">${it.unit}</td>
            <td style="text-align: right;">${it.quantity}</td>
            <td style="text-align: right;">${it.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: right;">${it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      })
      .join('');

    const defaultTerms = [
      'Goods once sold will not be taken back or exchanged.',
      'If the bill is not paid by the due date, interest will be charged at 18% per annum.',
      'The seller is not responsible for any loss or damage to goods in transit.',
      'Payment Terms: 50% advance along with confirmed order, balance against proforma invoice before dispatch.',
      'Subject to Delhi jurisdiction only.',
    ];

    const termsToDisplay = Array.isArray(data.terms) && data.terms.length > 0 ? data.terms : defaultTerms;
    const termsList = termsToDisplay.map((t) => `<li>${t}</li>`).join('');

    const rawAccessoriesText =
      data.accessoriesText ||
      'Standard SS 304 Grade Hardware Package: Gravity Hinges with Nylon Bushing, Coat Hook with Rubber Buffer, Thumb-turn Indicator Lock (Red/White Vacant/Occupied display), Privacy Latch, SS Support Legs (100mm/150mm ground clearance), Top Rail & Wall U-Channels with SS 304 Fasteners.';
    const accessoriesText = rawAccessoriesText.replace(/\[SS Hardware\]/gi, '').replace(/\s{2,}/g, ' ').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Proforma Invoice - ${data.piNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      color: #000000 !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.4;
      color: #000000;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .container {
      width: 100%;
      max-width: 194mm;
      margin: 0 auto;
      border: 1px solid #000000;
      padding: 0;
      box-sizing: border-box;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1px solid #000000;
    }
    .header-table td {
      padding: 8px 10px;
      vertical-align: top;
    }
    .title-badge {
      display: inline-block;
      border: 1px solid #000000;
      padding: 3px 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: normal;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1px solid #000000;
    }
    .info-table td {
      padding: 8px 10px;
      vertical-align: top;
    }
    .body-wrapper {
      padding: 6px 10px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 10.5px;
      border: 1px solid #000000;
    }
    .items-table th {
      background: #ffffff;
      padding: 5px 6px;
      text-align: left;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #000000;
      font-weight: bold !important;
    }
    .items-table td {
      padding: 4px 6px;
      border: 1px solid #000000;
      vertical-align: top;
      font-weight: normal;
    }
    .spec-box {
      border: none !important;
      padding: 2px 0 2px 0;
      margin: 2px 0 0 0;
      font-size: 10px;
      line-height: 1.35;
      font-weight: normal;
    }
    .section-title {
      font-size: 11px;
      margin: 8px 0 3px 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-weight: bold !important;
    }
    .accessories-box {
      border: 1px solid #000000;
      padding: 6px 8px;
      font-size: 10px;
      line-height: 1.4;
      margin-bottom: 4px;
      font-weight: normal;
      white-space: pre-line;
    }
    .bank-box {
      border: 1px solid #000000;
      padding: 6px 8px;
      font-size: 10px;
      line-height: 1.4;
      margin-bottom: 4px;
      font-weight: normal;
    }
    .terms-box {
      font-size: 10px;
      line-height: 1.35;
      margin-top: 3px;
      font-weight: normal;
    }
    .terms-box ol {
      margin: 2px 0;
      padding-left: 16px;
    }
    .terms-box li {
      margin-bottom: 2px;
    }
    .sign-table {
      width: 100%;
      margin-top: 10px;
      border-top: 1px solid #000000;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    .sign-table td {
      padding: 8px 10px 0 10px;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .container {
        border: 1px solid #000000;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 50%; vertical-align: top;">
          ${logoSrc ? `<img src="${logoSrc}" height="64" alt="Logo" style="margin-bottom: 4px; display: block; object-fit: contain; max-width: 220px;" />` : ''}
          <div style="font-size: 15px; letter-spacing: 0.3px; font-weight: bold;">${data.companyName}</div>
          <div style="font-size: 10px; margin: 2px 0;">${data.companyAddress}${data.companyAddress && !data.companyAddress.includes('110093') ? ', PIN: 110093' : ''}</div>
          <div style="font-size: 10px;">
            ${data.companyPhone ? `Phone: ${data.companyPhone}` : ''}
            ${data.companyGstin ? ` | GSTIN: ${data.companyGstin}` : ''}
            ${data.companyPan ? ` | PAN: ${data.companyPan}` : ''}
          </div>
        </td>
        <td style="width: 34%; vertical-align: top; text-align: right;">
          <div class="title-badge">PROFORMA INVOICE</div>
          <div style="margin: 5px 0 2px 0; font-size: 12px; font-family: monospace; font-weight: bold;">Ref: ${data.piNumber}</div>
          <div style="margin: 2px 0; font-size: 10.5px;">Date: ${formattedDate}</div>
          <div style="margin: 2px 0; font-size: 10px;">Place of Supply: <strong>${data.placeOfSupply} (${data.placeOfSupplyStateCode})</strong></div>
          ${data.reverseCharge ? `<div style="margin: 2px 0; font-size: 10px;">Reverse Charge: <strong>YES</strong></div>` : ''}
          ${data.linkedPoNumber ? `<div style="margin: 2px 0; font-size: 10px;">PO Ref: <strong>${data.linkedPoNumber}</strong> ${data.linkedPoDate ? `(${new Date(data.linkedPoDate).toLocaleDateString('en-IN')})` : ''}</div>` : ''}
          ${data.modeOfTransport ? `<div style="margin: 2px 0; font-size: 9.5px;">Dispatch: ${data.modeOfTransport} ${data.vehicleNumber ? `| Veh: ${data.vehicleNumber}` : ''}</div>` : ''}
        </td>
        <td style="width: 16%; vertical-align: top; text-align: right; padding-left: 6px;">
          ${data.qrDataUrl ? `
            <div style="display: inline-block; text-align: center;">
              <img src="${data.qrDataUrl}" width="75" height="75" alt="Verify QR" style="display: block; margin: 0 auto; border: none !important; outline: none !important;" />
              <div style="font-size: 8px; text-transform: uppercase; margin-top: 2px;">Verify Document</div>
            </div>
          ` : ''}
        </td>
      </tr>
    </table>

    <!-- Parties Grid: Bill To & Ship To -->
    <table class="info-table">
      <tr>
        <td style="vertical-align: top; width: 50%; padding-right: 12px;">
          <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase;">BILL TO (BUYER):</div>
          <div style="font-size: 11px; font-weight: bold; margin: 2px 0;">${data.billTo.name}</div>
          <div style="font-size: 9.5px; margin: 1px 0;">${data.billTo.address}</div>
          <div style="font-size: 9.5px; margin: 1px 0;">State: ${data.billTo.state} ${data.billTo.stateCode ? `(${data.billTo.stateCode})` : ''}</div>
          ${data.billTo.gstin ? `<div style="font-size: 9.5px; margin: 1px 0;"><strong>GSTIN:</strong> ${data.billTo.gstin}</div>` : ''}
          ${data.billTo.pan ? `<div style="font-size: 9.5px; margin: 1px 0;"><strong>PAN:</strong> ${data.billTo.pan}</div>` : ''}
          ${data.billTo.phone ? `<div style="font-size: 9px; margin: 1px 0;">Phone: ${data.billTo.phone}</div>` : ''}
          ${data.billTo.email ? `<div style="font-size: 9px; margin: 1px 0;">Email: ${data.billTo.email}</div>` : ''}
        </td>
        <td style="vertical-align: top; width: 50%; border-left: 1px solid #000000; padding-left: 12px;">
          <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase;">SHIP TO (DELIVERY SITE):</div>
          <div style="font-size: 11px; font-weight: bold; margin: 2px 0;">${data.shipTo.name}</div>
          <div style="font-size: 9.5px; margin: 1px 0;">${data.shipTo.address}</div>
          <div style="font-size: 9.5px; margin: 1px 0;">State: ${data.shipTo.state} ${data.shipTo.stateCode ? `(${data.shipTo.stateCode})` : ''}</div>
          ${data.shipTo.gstin ? `<div style="font-size: 9.5px; margin: 1px 0;"><strong>GSTIN:</strong> ${data.shipTo.gstin}</div>` : ''}
          ${data.shipTo.phone ? `<div style="font-size: 9px; margin: 1px 0;">Contact: ${data.shipTo.phone}</div>` : ''}
        </td>
      </tr>
    </table>

    <div class="body-wrapper">
      <!-- Line Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">S.No</th>
            <th>Description & Technical Specification</th>
            <th style="width: 55px; text-align: center;">HSN/SAC</th>
            <th style="width: 42px; text-align: center;">Unit</th>
            <th style="width: 42px; text-align: right;">Qty</th>
            <th style="width: 75px; text-align: right;">Rate (${currSym})</th>
            <th style="width: 85px; text-align: right;">Amount (${currSym})</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}

          <!-- Pricing Summary Rows -->
          <tr>
            <td colspan="6" style="text-align: right; font-weight: bold;">Basic Price / Subtotal:</td>
            <td style="text-align: right; font-weight: bold;">${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${data.freightAmount > 0 ? `
            <tr>
              <td colspan="6" style="text-align: right;">Freight & Handling:</td>
              <td style="text-align: right;">${data.freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ` : ''}
          ${(() => {
            if (isDelhi) {
              const halfTax = data.totalTaxAmount / 2;
              const cgst = data.cgstAmount > 0 ? data.cgstAmount : halfTax;
              const sgst = data.sgstAmount > 0 ? data.sgstAmount : halfTax;
              return `<tr>
                  <td colspan="6" style="text-align: right;">CGST @ 9%:</td>
                  <td style="text-align: right;">${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td colspan="6" style="text-align: right;">SGST @ 9%:</td>
                  <td style="text-align: right;">${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>`;
            }

            const igst = data.igstAmount > 0 ? data.igstAmount : data.totalTaxAmount;
            return `<tr>
                <td colspan="6" style="text-align: right;">IGST @ 18%:</td>
                <td style="text-align: right;">${igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>`;
          })()}
          ${data.roundingAdjustment !== 0 ? `
            <tr>
              <td colspan="6" style="text-align: right;">Rounding (+/-):</td>
              <td style="text-align: right;">${data.roundingAdjustment > 0 ? '+' : ''}${data.roundingAdjustment.toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr>
            <td colspan="6" style="text-align: right; font-size: 11px; font-weight: bold;">Grand Total (${currSym}):</td>
            <td style="text-align: right; font-size: 11px; font-weight: bold;">${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${data.advanceRequiredAmount ? `
            <tr>
              <td colspan="6" style="text-align: right; font-size: 10px; font-weight: bold; border-top: 1px dashed #000000;">
                Advance Payable (${data.advancePercentage || 50}%):
              </td>
              <td style="text-align: right; font-size: 10px; font-weight: bold; border-top: 1px dashed #000000;">
                ${currSym} ${data.advanceRequiredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ` : ''}
        </tbody>
      </table>

      <!-- Amount in Words -->
      <p style="margin: 3px 0 6px 0; font-size: 9px; font-style: italic;">
        Amount in Words: <strong>${amountInWordsText}</strong>
      </p>

      <!-- Standard Inclusions & Hardware Accessories Box -->
      ${accessoriesText ? `
        <div class="section-title">Standard Inclusions & Hardware Accessories</div>
        <div class="accessories-box">${accessoriesText}</div>
      ` : ''}

      <!-- Bank Remittance Details Box -->
      ${data.bankDetails ? `
        <div class="section-title">Bank Remittance & Payment Details</div>
        <div class="bank-box">
          <strong>Bank Name:</strong> ${data.bankDetails.bankName} &nbsp;|&nbsp; 
          <strong>Account Name:</strong> ${data.bankDetails.accountName || data.companyName} &nbsp;|&nbsp; 
          <strong>A/C No:</strong> ${data.bankDetails.accountNumber} &nbsp;|&nbsp; 
          <strong>IFSC Code:</strong> ${data.bankDetails.ifscCode || '-'} &nbsp;|&nbsp; 
          <strong>Branch:</strong> ${data.bankDetails.branch || '-'}
        </div>
      ` : ''}

      <!-- Commercial Terms & Conditions -->
      <div class="section-title">Commercial Terms & Conditions</div>
      <div class="terms-box">
        <ol>
          ${termsList}
        </ol>
      </div>
    </div>

    <!-- Sign-off Block -->
    <table class="sign-table" style="margin-top: 8px; margin-bottom: 0; padding-bottom: 0;">
      <tr>
        <td style="width: 50%; vertical-align: bottom; padding-bottom: 0;">
          <p style="margin: 0; font-size: 9px;">Client Acceptance Signature &amp; Stamp:</p>
          <div style="height: 30px; border-bottom: 1px solid #000000; width: 170px; margin-top: 14px;"></div>
          <p style="margin: 2px 0 0 0; font-size: 8.5px;">Authorized Signatory / Date</p>
        </td>
        <td style="width: 50%; vertical-align: bottom; text-align: right; padding-bottom: 0; padding-right: 20px;">
          <p style="margin: 0; font-size: 10px; text-align: right;">Best Regards,</p>
          <p style="margin: 0; font-size: 11px; text-align: right; font-weight: bold;">For ${data.companyName}</p>
          <div style="height: 55px; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 0;">
            ${data.signatureUrl ? `<img src="${data.signatureUrl}" height="50" alt="Authorized Signature" style="display: block; max-height: 55px; object-fit: contain; object-position: right bottom; margin-left: auto;" />` : ''}
          </div>
          <p style="margin: 0; font-size: 10.5px; text-align: right; font-weight: bold;">${data.issuingStaffName || 'Authorized Signatory'}</p>
          ${data.issuingStaffDesignation ? `<p style="margin: 0; font-size: 9.5px; text-align: right;">${data.issuingStaffDesignation}</p>` : ''}
          ${data.issuingStaffPhone ? `<p style="margin: 0; font-size: 9px; text-align: right;">Mobile: ${data.issuingStaffPhone}</p>` : ''}
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  },

  /**
   * Generates formal Sales Quotation letter PDF HTML with narrative covering letter,
   * embedded pricing table, specs block, accessories, warranties, T&Cs, and staff sign-off.
   */
  generateQuotationPdfHtml(data: QuotationPdfData): string {
    const formattedDate = new Date(data.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const logoSrc = resolveCompanyLogoDataUri(data.logoUrl);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation - ${data.referenceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      color: #000000 !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.4;
      color: #000000;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .container {
      width: 100%;
      max-width: 194mm;
      margin: 0 auto;
      border: 1px solid #000000;
      padding: 0;
      box-sizing: border-box;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1px solid #000000;
    }
    .header-table td {
      padding: 8px 10px;
      vertical-align: top;
    }
    .title-badge {
      display: inline-block;
      border: 1px solid #000000;
      padding: 3px 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: normal;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1px solid #000000;
    }
    .info-table td {
      padding: 8px 10px;
      vertical-align: top;
    }
    .body-wrapper {
      padding: 6px 10px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 10.5px;
      border: 1px solid #000000;
    }
    .items-table th {
      background: #ffffff;
      padding: 5px 6px;
      text-align: left;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #000000;
      font-weight: bold !important;
    }
    .items-table td {
      padding: 4px 6px;
      border: 1px solid #000000;
      vertical-align: top;
      font-weight: normal;
    }
    .spec-box {
      border: none !important;
      padding: 2px 0 2px 0;
      margin: 2px 0 0 0;
      font-size: 10px;
      line-height: 1.35;
      font-weight: normal;
    }
    .section-title {
      font-size: 11px;
      margin: 8px 0 3px 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-weight: bold !important;
    }
    .accessories-box {
      border: 1px solid #000000;
      padding: 6px 8px;
      font-size: 10.5px;
      line-height: 1.4;
      margin-bottom: 4px;
      font-weight: normal;
      white-space: pre-line;
    }
    .terms-box {
      font-size: 10.5px;
      line-height: 1.35;
      margin-top: 3px;
      font-weight: normal;
    }
    .sign-table {
      width: 100%;
      margin-top: 12px;
      border-top: 1px solid #000000;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    .sign-table td {
      padding: 8px 10px 0 10px;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .container {
        border: 1px solid #000000;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 52%; vertical-align: top;">
          ${logoSrc ? `<img src="${logoSrc}" height="64" alt="Logo" style="margin-bottom: 4px; display: block; object-fit: contain; max-width: 220px;" />` : ''}
          <div style="font-size: 15px; letter-spacing: 0.3px; font-weight: bold;">${data.companyName}</div>
          <div style="font-size: 10px; margin: 2px 0;">${data.companyAddress}${data.companyAddress && !data.companyAddress.includes('110093') ? ', PIN: 110093' : ''}</div>
          <div style="font-size: 10px;">
            ${data.companyPhone ? `Phone: ${data.companyPhone}` : ''}
            ${data.companyGstin ? ` | GSTIN: ${data.companyGstin}` : ''}
          </div>
        </td>
        <td style="width: 32%; vertical-align: top; text-align: right;">
          <div class="title-badge">SALES QUOTATION</div>
          <div style="margin: 5px 0 2px 0; font-size: 12px; font-family: monospace; font-weight: bold;">Ref: ${data.referenceNumber}</div>
          <div style="margin: 2px 0; font-size: 10.5px;">Date: ${formattedDate}</div>
          <div style="margin: 2px 0; font-size: 10.5px;">Project: ${data.projectName}</div>
        </td>
        <td style="width: 16%; vertical-align: top; text-align: right; padding-left: 6px;">
          ${data.qrDataUrl ? `
            <div style="display: inline-block; text-align: center;">
              <img src="${data.qrDataUrl}" width="75" height="75" alt="Verify QR" style="display: block; margin: 0 auto; border: none !important; outline: none !important;" />
              <div style="font-size: 8px; text-transform: uppercase; margin-top: 2px;">Verify Document</div>
            </div>
          ` : ''}
        </td>
      </tr>
    </table>

    <!-- Recipient & Subject -->
    <table class="info-table">
      <tr>
        <td style="vertical-align: top; width: 60%;">
          <div style="font-size: 9px;">To,</div>
          <div style="font-size: 10.5px;">${data.recipientSalutation} ${data.recipientName}</div>
          ${data.recipientCompany ? `<div style="font-size: 9.5px; margin: 1px 0;">${data.recipientCompany}</div>` : ''}
          ${data.recipientAddress ? `<div style="margin: 1px 0; font-size: 9px;">${data.recipientAddress}</div>` : ''}
        </td>
        <td style="vertical-align: top; width: 40%; text-align: right;">
          ${data.validUntil ? `<div style="font-size: 9px; margin-bottom: 2px;">Valid Until: ${new Date(data.validUntil).toLocaleDateString('en-IN')}</div>` : ''}
          <div style="font-size: 9px;">Subject: ${data.subject}</div>
        </td>
      </tr>
    </table>

    <div class="body-wrapper">
      <!-- Narrative Intro -->
      <p style="margin: 3px 0 6px 0; font-size: 9px;">
        Dear Sir / Madam,<br/>
        With reference to our discussion regarding ${data.projectName}, we are pleased to submit our formal commercial proposal and quotation for ${data.title} as detailed below:
      </p>

      <!-- Line Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">S.No</th>
            <th>Description & Technical Specification</th>
            <th style="width: 48px; text-align: center;">Unit</th>
            <th style="width: 48px; text-align: right;">Qty</th>
            <th style="width: 75px; text-align: right;">Rate (${data.currency})</th>
            <th style="width: 85px; text-align: right;">Amount (${data.currency})</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td>
                <div style="font-weight: bold; font-size: 11px;">${item.description}</div>
                ${item.boardType || item.cubicleSize || item.boardColor || item.boardThickness || item.doorSize || item.overallHeight || item.hardwarePackage ? `
                  <div class="spec-box">
                    ${item.boardType ? `<div>• <strong>Board Type:</strong> ${item.boardType}</div>` : ''}
                    ${item.boardThickness ? `<div>• <strong>Board Thickness:</strong> ${item.boardThickness}</div>` : ''}
                    ${item.boardColor ? `<div>• <strong>Board Color:</strong> ${item.boardColor}</div>` : ''}
                    ${item.cubicleSize ? `<div>• <strong>Cubicle / Depth Size:</strong> ${item.cubicleSize}</div>` : ''}
                    ${item.doorSize ? `<div>• <strong>Door Size:</strong> ${item.doorSize}</div>` : ''}
                    ${item.overallHeight ? `<div>• <strong>Overall Height:</strong> ${item.overallHeight}</div>` : ''}
                    ${item.hardwarePackage ? `<div>• <strong>Hardware Package:</strong> ${item.hardwarePackage}</div>` : ''}
                  </div>
                ` : ''}
              </td>
              <td style="text-align: center;">${item.unit}</td>
              <td style="text-align: right;">${item.quantity}</td>
              <td style="text-align: right;">${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}

          <!-- Pricing Summary Rows -->
          <tr>
            <td colspan="5" style="text-align: right;">Basic Price:</td>
            <td style="text-align: right;">${data.basicPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${data.installationCharge ? `
            <tr>
              <td colspan="5" style="text-align: right;">Cubicle Installation Charge:</td>
              <td style="text-align: right;">${data.installationCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ` : ''}
          <tr>
            <td colspan="5" style="text-align: right;">
              Freight: ${data.freightTerms} ${data.freightAmount ? `(${data.currency} ${data.freightAmount.toLocaleString('en-IN')})` : ''}
            </td>
            <td style="text-align: right;">${data.freightAmount ? data.freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
          </tr>
          ${
            data.isSezExempt
              ? `<tr>
                  <td colspan="5" style="text-align: right;">GST @ 0.00% (SEZ Exemption Claimed):</td>
                  <td style="text-align: right;">0.00</td>
                </tr>`
              : (/delhi\b/i.test(data.recipientAddress || '') || /07\b/i.test(data.recipientAddress || '') || !(data.recipientAddress || '').trim() || data.gstRate === 18)
              ? `<tr>
                  <td colspan="5" style="text-align: right;">CGST @ 9%:</td>
                  <td style="text-align: right;">${(data.gstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td colspan="5" style="text-align: right;">SGST @ 9%:</td>
                  <td style="text-align: right;">${(data.gstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>`
              : `<tr>
                  <td colspan="5" style="text-align: right;">IGST @ 18%:</td>
                  <td style="text-align: right;">${data.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>`
          }
          <tr>
            <td colspan="5" style="text-align: right; font-size: 10px;">Grand Total (${data.currency}):</td>
            <td style="text-align: right; font-size: 10px;">${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      ${data.amountInWords ? `<p style="margin: 3px 0; font-size: 8.5px; font-style: italic;">Amount in Words: ${data.amountInWords}</p>` : ''}

      <!-- Accessories Block -->
      ${data.accessoriesText ? `
        <div class="section-title">Standard Inclusions & Hardware Accessories</div>
        <div class="accessories-box">${data.accessoriesText.replace(/\[SS Hardware\]/gi, '').replace(/\s{2,}/g, ' ').trim()}</div>
      ` : ''}

      <!-- Warranty Block -->
      ${data.warrantyText ? `
        <div class="section-title">Warranty Commitment</div>
        <p style="margin: 2px 0; font-size: 8.5px; line-height: 1.35;">${data.warrantyText}</p>
      ` : ''}

      <!-- Terms & Conditions -->
      <div class="section-title">Commercial Terms & Conditions</div>
      <div class="terms-box">
        ${data.generalTerms ? `<p style="margin: 1px 0;">General Terms: ${data.generalTerms}</p>` : ''}
        ${data.paymentTerms ? `<p style="margin: 1px 0;">Payment Terms: ${data.paymentTerms}</p>` : ''}
        ${data.deliveryTerms ? `<p style="margin: 1px 0;">Delivery & Lead Time: ${data.deliveryTerms}</p>` : ''}
        ${data.otherTerms ? `<div style="margin: 1px 0;">${data.otherTerms}</div>` : ''}
        ${data.isSezExempt && data.statutoryComplianceTerms ? `
          <p style="margin: 2px 0;">Statutory Compliance (SEZ): ${data.statutoryComplianceTerms} ${data.sezCertificateRef ? `[Ref: ${data.sezCertificateRef}]` : ''}</p>
        ` : ''}
      </div>
    </div>

    <!-- Sign-off Block -->
    <table class="sign-table" style="margin-top: 8px; margin-bottom: 0; padding-bottom: 0;">
      <tr>
        <td style="width: 50%; vertical-align: bottom; padding-bottom: 0;">
          <p style="margin: 0; font-size: 9px;">Client Acceptance Signature &amp; Stamp:</p>
          <div style="height: 30px; border-bottom: 1px solid #000000; width: 170px; margin-top: 14px;"></div>
          <p style="margin: 2px 0 0 0; font-size: 8.5px;">Authorized Signatory / Date</p>
        </td>
        <td style="width: 50%; vertical-align: bottom; text-align: right; padding-bottom: 0; padding-right: 20px;">
          <p style="margin: 0; font-size: 10px; text-align: right;">Best Regards,</p>
          <p style="margin: 0; font-size: 11px; text-align: right;">For ${data.companyName}</p>
          <div style="height: 62px; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 0;">
            ${data.signatureUrl ? `<img src="${data.signatureUrl}" height="57" alt="Authorized Signature" style="display: block; max-height: 62px; object-fit: contain; object-position: right bottom; margin-left: 40px; margin-top: 40px;" />` : ''}
          </div>
          <p style="margin: 0; font-size: 10.5px; text-align: right;">${data.issuingStaffName || 'Authorized Signatory'}</p>
          ${data.issuingStaffDesignation ? `<p style="margin: 0; font-size: 9.5px; text-align: right;">${data.issuingStaffDesignation}</p>` : ''}
          ${data.issuingStaffPhone ? `<p style="margin: 0; font-size: 9px; text-align: right;">Mobile: ${data.issuingStaffPhone}</p>` : ''}
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  },

  /**
   * Generates formal International Export Quotation / Proforma Offer PDF HTML
   */
  generateExportQuotationPdfHtml(data: ExportQuotationPdfData): string {
    const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const validUntilDate = data.validUntil
      ? new Date(data.validUntil).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '30 Days from issue';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Export Quotation - ${data.quotationNumber}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .container { max-width: 190mm; margin: 0 auto; }
    .header-table { width: 100%; border-bottom: 2px solid #7FB706; padding-bottom: 8px; margin-bottom: 10px; }
    .title-badge { display: inline-block; background: #030213; color: #fff; padding: 4px 12px; border-radius: 4px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
    .info-table td { padding: 4px 6px; vertical-align: top; border: 1px solid #e2e8f0; }
    .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9.5px; }
    .items-table th { background: #030213; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; border: 1px solid #030213; text-transform: uppercase; }
    .items-table td { padding: 6px 8px; border: 1px solid #cbd5e1; vertical-align: top; }
    .summary-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
    .summary-table td { padding: 4px 8px; border: 1px solid #e2e8f0; }
    .section-title { font-size: 10px; font-weight: 800; color: #030213; margin: 10px 0 4px 0; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
    .terms-box { font-size: 9px; line-height: 1.45; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-top: 6px; }
    .sign-table { width: 100%; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 50%; vertical-align: middle;">
          <h1 style="margin: 0; font-size: 18px; font-weight: 900; color: #030213;">${data.companyName}</h1>
          <p style="margin: 2px 0; font-size: 9px; color: #475569;">${data.companyAddress}</p>
          <p style="margin: 0; font-size: 9px; color: #475569;">
            ${data.companyPhone ? `Tel: ${data.companyPhone} | ` : ''}${data.companyEmail ? `Email: ${data.companyEmail}` : ''}
            ${data.companyGstin ? ` | GSTIN: ${data.companyGstin}` : ''}
          </p>
        </td>
        <td style="width: 35%; text-align: right; vertical-align: middle;">
          <div class="title-badge">Formal Export Quotation</div>
          <p style="margin: 6px 0 0 0; font-family: monospace; font-size: 11px; font-weight: 800; color: #030213;">Ref: ${data.quotationNumber}</p>
          <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b;">Date: <strong>${formattedDate}</strong> | Valid Until: <strong>${validUntilDate}</strong></p>
        </td>
        <td style="width: 15%; text-align: right; vertical-align: middle; padding-left: 6px;">
          ${data.qrDataUrl ? `<img src="${data.qrDataUrl}" width="65" height="65" alt="Verify QR" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; background: #fff;" />` : ''}
        </td>
      </tr>
    </table>

    <!-- Buyer & Shipment Terms Grid -->
    <table class="info-table">
      <tr style="background: #f8fafc;">
        <td style="width: 50%; font-weight: 800; color: #030213; text-transform: uppercase;">Consignee / Foreign Buyer</td>
        <td style="width: 50%; font-weight: 800; color: #030213; text-transform: uppercase;">Commercial &amp; Logistics Terms</td>
      </tr>
      <tr>
        <td>
          <div style="font-size: 11px; font-weight: 800; color: #030213;">${data.buyerName}</div>
          ${data.buyerAddress ? `<div style="color: #475569; margin-top: 2px;">${data.buyerAddress}</div>` : ''}
          ${data.buyerCountry ? `<div style="font-weight: 600; color: #0f172a; margin-top: 2px;">Country: ${data.buyerCountry}</div>` : ''}
          ${data.buyerEmail ? `<div style="color: #64748b; font-size: 9px;">Email: ${data.buyerEmail}</div>` : ''}
          ${data.buyerPhone ? `<div style="color: #64748b; font-size: 9px;">Phone: ${data.buyerPhone}</div>` : ''}
        </td>
        <td>
          <div>Incoterm: <strong style="color: #7FB706; font-size: 11px;">${data.incoterm}</strong></div>
          ${data.portOfLoading ? `<div>Port of Loading: <strong>${data.portOfLoading}</strong></div>` : ''}
          ${data.portOfDestination ? `<div>Port of Destination: <strong>${data.portOfDestination}</strong></div>` : ''}
          <div>Currency of Offer: <strong style="color: #030213;">${data.currency}</strong></div>
          ${data.paymentTerms ? `<div>Payment: <strong>${data.paymentTerms}</strong></div>` : ''}
          ${data.deliveryTerms ? `<div>Delivery: <strong>${data.deliveryTerms}</strong></div>` : ''}
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 25px; text-align: center;">#</th>
          <th>Description &amp; Specifications</th>
          <th style="width: 65px; text-align: center;">HS Code</th>
          <th style="width: 45px; text-align: center;">Unit</th>
          <th style="width: 55px; text-align: right;">Qty</th>
          <th style="width: 75px; text-align: right;">Unit Price</th>
          <th style="width: 85px; text-align: right;">Total (${data.currency})</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((item, idx) => `
          <tr>
            <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
            <td>
              <div style="font-weight: 700; color: #0f172a;">${item.description}</div>
              ${item.itemCode ? `<div style="font-size: 8.5px; color: #64748b;">SKU / Code: ${item.itemCode}</div>` : ''}
              ${item.cbm ? `<div style="font-size: 8px; color: #64748b;">CBM: ${item.cbm} | G.W: ${item.grossWeightKg || 0} kg</div>` : ''}
            </td>
            <td style="text-align: center; font-family: monospace; font-weight: 600;">${item.hsCode || '-'}</td>
            <td style="text-align: center;">${item.unit}</td>
            <td style="text-align: right; font-weight: 700;">${item.quantity}</td>
            <td style="text-align: right;">${item.unitRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: right; font-weight: 700;">${item.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}

        <!-- Pricing Summary -->
        <tr>
          <td colspan="6" style="text-align: right; font-weight: 700;">FOB / Product Subtotal:</td>
          <td style="text-align: right; font-weight: 700;">${data.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
        ${data.freightCharges > 0 ? `
          <tr>
            <td colspan="6" style="text-align: right;">Ocean / Air Freight:</td>
            <td style="text-align: right;">${data.freightCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        ` : ''}
        ${data.insuranceCharges > 0 ? `
          <tr>
            <td colspan="6" style="text-align: right;">Marine Cargo Insurance:</td>
            <td style="text-align: right;">${data.insuranceCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        ` : ''}
        ${data.otherCharges > 0 ? `
          <tr>
            <td colspan="6" style="text-align: right;">Handling / Port / Other Charges:</td>
            <td style="text-align: right;">${data.otherCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        ` : ''}
        <tr style="background: #030213; color: #fff;">
          <td colspan="6" style="text-align: right; font-size: 11px; font-weight: 800; text-transform: uppercase;">Total CIF / Export Offer (${data.currency}):</td>
          <td style="text-align: right; font-size: 11px; font-weight: 800; color: #B5F823;">${data.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <!-- Notes & Terms -->
    ${data.notes ? `
      <div class="section-title">Special Instructions &amp; Commercial Notes</div>
      <div class="terms-box">${data.notes}</div>
    ` : ''}

    <div class="section-title">Standard International Trade Terms</div>
    <div class="terms-box">
      <p style="margin: 2px 0;">• All goods are packed in export-standard wooden crates / seaworthy packaging suitable for ocean freight.</p>
      <p style="margin: 2px 0;">• Transshipment and partial shipments as agreed per buyer purchase order.</p>
      <p style="margin: 2px 0;">• Documents provided upon dispatch: Commercial Invoice, Packing List, Certificate of Origin, Bill of Lading / Airway Bill.</p>
    </div>

    <!-- Sign-off Block -->
    <table class="sign-table">
      <tr>
        <td style="width: 50%; vertical-align: bottom;">
          <p style="margin: 0; font-size: 9px; color: #64748b;">Buyer Acceptance &amp; Stamp:</p>
          <div style="height: 35px; border-bottom: 1px solid #cbd5e1; width: 180px; margin-top: 15px;"></div>
          <p style="margin: 4px 0 0 0; font-size: 8.5px; color: #94a3b8;">Authorized Signature / Date</p>
        </td>
        <td style="width: 50%; vertical-align: bottom; text-align: right;">
          <p style="margin: 0; font-size: 9.5px; font-weight: 700;">Sincerely,</p>
          <p style="margin: 0; font-size: 11px; font-weight: 800; color: #030213;">For ${data.companyName}</p>
          <div style="height: 35px; display: flex; align-items: center; justify-content: flex-end;">
            ${data.logoUrl ? `<span style="font-size: 10px; font-style: italic; color: #7FB706;">Global Trade Division</span>` : ''}
          </div>
          <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 700;">${data.createdByName || 'Export Director / Authorized Signatory'}</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  },

  /**
   * Generates standard Packing List PDF HTML matching the SAS Software Noida reference.
   */
  generatePackingListPdfHtml(data: PackingListPdfData): string {
    const formattedDate = new Date(data.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Packing List - ${data.packingListNumber}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10.5px;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .container { max-width: 190mm; margin: 0 auto; }
    .title-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 12px; }
    .two-box-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .two-box-table td { border: 1px solid #0f172a; padding: 8px; vertical-align: top; width: 50%; font-size: 10px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9.5px; }
    .items-table th { background: #f1f5f9; border: 1px solid #0f172a; padding: 6px; text-align: left; font-size: 9px; font-weight: 800; }
    .items-table td { border: 1px solid #0f172a; padding: 5px 6px; vertical-align: middle; }
    .totals-row td { background: #f8fafc; font-weight: 800; font-size: 10px; border-top: 2px solid #0f172a; }
    .sign-table { width: 100%; border-collapse: collapse; margin-top: 25px; page-break-inside: avoid; }
    .sign-table td { border: 1px solid #0f172a; padding: 10px; vertical-align: top; width: 50%; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Title & QR -->
    <table style="width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px;">
      <tr>
        <td style="vertical-align: middle;">
          <h1 style="margin: 0; font-size: 16px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">PACKING LIST</h1>
          <div style="display: flex; gap: 15px; margin-top: 4px; font-size: 10px; font-weight: 700;">
            <span>Packing List No: <strong>${data.packingListNumber}</strong></span>
            ${data.linkedOrderNumber ? `<span>Order Ref: <strong>${data.linkedOrderNumber}</strong></span>` : ''}
            ${data.linkedPiNumber ? `<span>PI Ref: <strong>${data.linkedPiNumber}</strong></span>` : ''}
            <span>Date: <strong>${formattedDate}</strong></span>
          </div>
        </td>
        <td style="width: 70px; text-align: right; vertical-align: middle;">
          ${data.qrDataUrl ? `<img src="${data.qrDataUrl}" width="65" height="65" alt="Verify QR" style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: #fff;" />` : ''}
        </td>
      </tr>
    </table>

    <!-- Consignor & Ship To -->
    <table class="two-box-table">
      <tr>
        <td>
          <p style="margin: 0 0 4px 0; font-weight: 800; font-size: 10.5px; text-transform: uppercase;">Consignor:</p>
          <p style="margin: 0; font-weight: 700;">${data.consignorName}</p>
          <p style="margin: 2px 0; font-size: 9px; color: #334155;">${data.consignorAddress}</p>
        </td>
        <td>
          <p style="margin: 0 0 4px 0; font-weight: 800; font-size: 10.5px; text-transform: uppercase;">Ship To / Consignee:</p>
          <p style="margin: 0; font-weight: 700;">${data.shipToName}</p>
          <p style="margin: 2px 0; font-size: 9px; color: #334155;">${data.shipToAddress}</p>
          ${data.siteContactName ? `
            <p style="margin: 4px 0 0 0; font-size: 9.5px; font-weight: 700; color: #0f172a;">
              Site Contact: ${data.siteContactName} ${data.siteContactPhone ? `(${data.siteContactPhone})` : ''}
            </p>
          ` : ''}
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">Sl no.</th>
          <th>Description</th>
          <th style="width: 100px;">Size</th>
          <th style="width: 75px;">Design no.</th>
          <th style="width: 55px; text-align: right;">Qty</th>
          <th style="width: 65px; text-align: right;">No. of Pkt</th>
          <th style="width: 90px;">Nature of Packet</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((item, idx) => `
          <tr>
            <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
            <td style="font-weight: 600;">${item.description}</td>
            <td>${item.size || '-'}</td>
            <td>${item.designNo || '-'}</td>
            <td style="text-align: right; font-weight: 700;">${item.quantity}</td>
            <td style="text-align: right;">${item.noOfPackets != null ? item.noOfPackets : '-'}</td>
            <td>${item.natureOfPacket || '-'}</td>
          </tr>
        `).join('')}

        <!-- Totals Row -->
        <tr class="totals-row">
          <td colspan="4" style="text-align: right; text-transform: uppercase;">Total:</td>
          <td style="text-align: right;">${data.totalQuantity}</td>
          <td style="text-align: right;">${data.totalPackages != null ? data.totalPackages : '-'}</td>
          <td>${data.isPartialDispatch ? '<span style="color: #ea580c; font-size: 8.5px;">[Partial Dispatch]</span>' : ''}</td>
        </tr>
      </tbody>
    </table>

    <!-- Dual Signature Blocks -->
    <table class="sign-table">
      <tr>
        <td>
          <p style="margin: 0; font-weight: 800; font-size: 10px; text-transform: uppercase;">For ${data.consignorName}</p>
          <div style="height: 45px;"></div>
          <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; border-top: 1px solid #64748b; padding-top: 3px;">
            <span>Checked by: <strong>${data.checkedByName || '_____________'}</strong></span>
            <span>Authorised Signatory</span>
          </div>
        </td>
        <td>
          <p style="margin: 0; font-weight: 800; font-size: 10px; text-transform: uppercase;">Material Received by:</p>
          <div style="height: 35px; font-size: 9px; padding-top: 8px;">
            ${data.receivedByName ? `
              <div>Name: <strong>${data.receivedByName}</strong></div>
              <div>Mobile: <strong>${data.receivedByPhone || '-'}</strong> | Date: ${data.receivedAt ? new Date(data.receivedAt).toLocaleDateString('en-IN') : '-'}</div>
            ` : '<span style="color: #94a3b8; font-style: italic;">[To be signed and stamped upon site receipt]</span>'}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; border-top: 1px solid #64748b; padding-top: 3px;">
            <span>Receiver's Signature</span>
            <span>Mobile No. / Stamp</span>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  },

  /**
   * Generates Hardware Issue List PDF HTML for store room issuance.
   */
  generateHardwareIssuePdfHtml(data: HardwareIssuePdfData): string {
    const formattedDate = new Date(data.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Hardware Issue List - ${data.issueNumber}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10px;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .container { max-width: 190mm; margin: 0 auto; }
    .header-box { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 8px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5px; }
    .meta-table td { border: 1px solid #94a3b8; padding: 4px 6px; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 9px; }
    .items-table th { background: #f1f5f9; border: 1px solid #94a3b8; padding: 4px 6px; text-align: left; font-weight: 800; font-size: 8.5px; }
    .items-table td { border: 1px solid #cbd5e1; padding: 3px 6px; }
    .sign-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9px; page-break-inside: avoid; }
    .sign-table td { border: 1px solid #0f172a; padding: 6px; vertical-align: top; width: 25%; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <table style="width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px;">
      <tr>
        <td style="vertical-align: middle; text-align: left;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase;">PACIFIC PRODUCTS & SOLUTIONS</h2>
          <h3 style="margin: 2px 0 0 0; font-size: 11px; font-weight: 700; color: #475569;">HARDWARE ISSUE LIST / STORE CHECKLIST</h3>
        </td>
        <td style="width: 70px; text-align: right; vertical-align: middle;">
          ${data.qrDataUrl ? `<img src="${data.qrDataUrl}" width="65" height="65" alt="Verify QR" style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: #fff;" />` : ''}
        </td>
      </tr>
    </table>

    <table class="meta-table">
      <tr>
        <td style="width: 60%;">Buyer's Name: <strong>${data.buyerName}</strong></td>
        <td style="width: 40%;">Issue No: <strong>${data.issueNumber}</strong></td>
      </tr>
      <tr>
        <td>Address: ${data.buyerAddress || '-'}</td>
        <td>Date: <strong>${formattedDate}</strong></td>
      </tr>
      <tr>
        <td>Project: <strong>${data.projectName || '-'}</strong></td>
        <td>Order Ref: <strong>${data.linkedOrderNumber || '-'}</strong></td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">Sl No.</th>
          <th>Item Description</th>
          <th style="width: 100px;">Category</th>
          <th style="width: 60px;">Color</th>
          <th style="width: 65px;">Size</th>
          <th style="width: 45px; text-align: right;">Qty</th>
          <th style="width: 110px;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((item, idx) => `
          <tr>
            <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
            <td><strong>${item.description}</strong></td>
            <td style="color: #64748b;">${item.category}</td>
            <td>${item.color || '-'}</td>
            <td>${item.size || '-'}</td>
            <td style="text-align: right; font-weight: 700;">${item.quantity}</td>
            <td style="font-size: 8.5px; color: #475569;">${item.remarks || '-'}</td>
          </tr>
        `).join('')}
        <tr style="font-weight: 800; background: #f8fafc;">
          <td colspan="5" style="text-align: right; text-transform: uppercase;">Total Pieces Issued:</td>
          <td style="text-align: right;">${data.totalQuantity}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <!-- 4-Role Sign-off -->
    <table class="sign-table">
      <tr>
        <td>
          <p style="margin: 0; font-weight: 800;">1. Store Keeper</p>
          <div style="height: 30px; padding-top: 8px; font-size: 8.5px;">${data.storeKeeperName || '_______________'}</div>
          <p style="margin: 0; font-size: 8px; color: #64748b;">Sign / Date</p>
        </td>
        <td>
          <p style="margin: 0; font-weight: 800;">2. Packed by</p>
          <div style="height: 30px; padding-top: 8px; font-size: 8.5px;">${data.packedByName || '_______________'}</div>
          <p style="margin: 0; font-size: 8px; color: #64748b;">Sign / Date</p>
        </td>
        <td>
          <p style="margin: 0; font-weight: 800;">3. Checked by</p>
          <div style="height: 30px; padding-top: 8px; font-size: 8.5px;">${data.checkedByName || '_______________'}</div>
          <p style="margin: 0; font-size: 8px; color: #64748b;">Sign / Date</p>
        </td>
        <td>
          <p style="margin: 0; font-weight: 800;">4. Incharge</p>
          <div style="height: 30px; padding-top: 8px; font-size: 8.5px;">${data.inchargeName || '_______________'}</div>
          <p style="margin: 0; font-size: 8px; color: #64748b;">Sign / Date</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  },

  /**
   * Generates formal Sales Order Confirmation PDF HTML matching the Quotation & PI layout
   * with company logo, dual Bill To / Ship To party cards, technical specifications breakdown,
   * Delhi/Interstate statutory GST breakdown, bank remittance details, and signature sign-off.
   */
  generateSalesOrderPdfHtml(data: SalesOrderPdfData): string {
    const formattedDate = new Date(data.orderDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const logoSrc = resolveCompanyLogoDataUri(data.logoUrl);
    const currSym = data.currency === 'AED' ? 'AED' : '₹';
    const amountInWordsText = data.amountInWords || numberToWords(data.grandTotal, data.currency);

    const isDelhi = Boolean(
      (data.billTo?.gstin && data.billTo.gstin.startsWith('07')) ||
      /delhi\b/i.test(data.placeOfSupply || '') ||
      /07\b/i.test(data.placeOfSupplyStateCode || '') ||
      /delhi\b/i.test(data.billTo?.address || '') ||
      !(data.placeOfSupply || '').trim()
    );

    const parseItemSpecs = (desc: string) => {
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
    };

    const cleanDescription = (desc: string) =>
      desc.replace(/\s*\((Board:.*?)\)/gi, '').replace(/\s*\((.*?Hardware:.*?)\)/gi, '').trim();

    const itemRows = data.items
      .map((it, idx) => {
        const fallbackSpecs = parseItemSpecs(it.description);
        const boardType = it.boardType || fallbackSpecs.boardType;
        const boardThickness = it.boardThickness || fallbackSpecs.boardThickness;
        const boardColor = it.boardColor || fallbackSpecs.boardColor;
        const cubicleSize = it.cubicleSize || fallbackSpecs.cubicleSize;
        const doorSize = it.doorSize || fallbackSpecs.doorSize;
        const overallHeight = it.overallHeight || fallbackSpecs.overallHeight;
        const hardwarePackage = it.hardwarePackage || fallbackSpecs.hardwarePackage;
        const displayDesc = cleanDescription(it.description);

        const hasSpecs = Boolean(
          boardType || boardThickness || boardColor || cubicleSize || doorSize || overallHeight || hardwarePackage
        );

        return `
          <tr>
            <td style="text-align: center;">${it.serialNumber || idx + 1}</td>
            <td>
              <div style="font-weight: bold; font-size: 11px;">${displayDesc}</div>
              ${hasSpecs ? `
                <div class="spec-box">
                  ${boardType ? `<div>• <strong>Board Type:</strong> ${boardType}</div>` : ''}
                  ${boardThickness ? `<div>• <strong>Board Thickness:</strong> ${boardThickness}</div>` : ''}
                  ${boardColor ? `<div>• <strong>Board Color:</strong> ${boardColor}</div>` : ''}
                  ${cubicleSize ? `<div>• <strong>Cubicle / Depth Size:</strong> ${cubicleSize}</div>` : ''}
                  ${doorSize ? `<div>• <strong>Door Size:</strong> ${doorSize}</div>` : ''}
                  ${overallHeight ? `<div>• <strong>Overall Height:</strong> ${overallHeight}</div>` : ''}
                  ${hardwarePackage ? `<div>• <strong>Hardware Package:</strong> ${hardwarePackage}</div>` : ''}
                </div>
              ` : ''}
            </td>
            <td style="text-align: center;">${it.hsnSac || '9403'}</td>
            <td style="text-align: center;">${it.unit}</td>
            <td style="text-align: right;">${it.quantity}</td>
            <td style="text-align: right;">${it.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: right;">${it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      })
      .join('');

    const defaultTerms = [
      'Order Acceptance: This Sales Order confirmation is executed strictly on the basis of approved site layouts and agreed commercial terms.',
      'Fabrication Lead-Time: Standard production turnaround is 7 to 10 working days from the date of advance payment clearance and signed site dimensions.',
      'Plant Storage & Demurrage: Free plant storage is provided for up to 5 days post fabrication. Holding demurrage of ₹500/day will apply thereafter if site delivery is held by the client.',
      'Pre-Dispatch Inspection: The client or their authorized project engineer is welcome to inspect cubicle panels and hardware at our plant prior to carton packaging.',
      'Site Civil Readiness: Level tile flooring, plumb masonry partitions, and clean unloading access are the sole responsibility of the client prior to delivery.',
      'Subject to Delhi jurisdiction only.',
    ];

    const termsToDisplay = Array.isArray(data.terms) && data.terms.length > 0 ? data.terms : defaultTerms;
    const termsList = termsToDisplay.map((t) => `<li>${t}</li>`).join('');

    const rawAccessoriesText =
      data.accessoriesText ||
      'Standard SS 304 Grade Hardware Package: Gravity Hinges with Nylon Bushing, Coat Hook with Rubber Buffer, Thumb-turn Indicator Lock (Red/White Vacant/Occupied display), Privacy Latch, SS Support Legs (100mm/150mm ground clearance), Top Rail & Wall U-Channels with SS 304 Fasteners.';
    const accessoriesText = rawAccessoriesText.replace(/\[SS Hardware\]/gi, '').replace(/\s{2,}/g, ' ').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sales Order Confirmation - ${data.orderNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      color: #000000 !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.4;
      color: #000000;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .container {
      width: 100%;
      max-width: 194mm;
      margin: 0 auto;
      border: 1px solid #000000;
      padding: 0;
      box-sizing: border-box;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1px solid #000000;
    }
    .header-table td {
      padding: 8px 10px;
      vertical-align: top;
    }
    .title-badge {
      display: inline-block;
      border: 1px solid #000000;
      padding: 3px 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: bold;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1px solid #000000;
    }
    .info-table td {
      padding: 8px 10px;
      vertical-align: top;
    }
    .body-wrapper {
      padding: 6px 10px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 10.5px;
      border: 1px solid #000000;
    }
    .items-table th {
      background: #ffffff;
      padding: 5px 6px;
      text-align: left;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #000000;
      font-weight: bold !important;
    }
    .items-table td {
      padding: 4px 6px;
      border: 1px solid #000000;
      vertical-align: top;
      font-weight: normal;
    }
    .spec-box {
      border: none !important;
      padding: 2px 0 2px 0;
      margin: 2px 0 0 0;
      font-size: 10px;
      line-height: 1.35;
      font-weight: normal;
    }
    .section-title {
      font-size: 11px;
      margin: 8px 0 3px 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-weight: bold !important;
    }
    .accessories-box {
      border: 1px solid #000000;
      padding: 6px 8px;
      font-size: 10px;
      line-height: 1.4;
      margin-bottom: 4px;
      font-weight: normal;
      white-space: pre-line;
    }
    .bank-box {
      border: 1px solid #000000;
      padding: 6px 8px;
      font-size: 10px;
      line-height: 1.4;
      margin-bottom: 4px;
      font-weight: normal;
    }
    .terms-box {
      font-size: 10px;
      line-height: 1.35;
      margin-top: 3px;
      font-weight: normal;
    }
    .terms-box ol {
      margin: 2px 0;
      padding-left: 16px;
    }
    .terms-box li {
      margin-bottom: 2px;
    }
    .sign-table {
      width: 100%;
      margin-top: 10px;
      border-top: 1px solid #000000;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    .sign-table td {
      padding: 8px 10px 0 10px;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .container {
        border: 1px solid #000000;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 50%; vertical-align: top;">
          ${logoSrc ? `<img src="${logoSrc}" height="64" alt="Logo" style="margin-bottom: 4px; display: block; object-fit: contain; max-width: 220px;" />` : ''}
          <div style="font-size: 15px; letter-spacing: 0.3px; font-weight: bold;">${data.companyName}</div>
          <div style="font-size: 10px; margin: 2px 0;">${data.companyAddress}${data.companyAddress && !data.companyAddress.includes('110093') ? ', PIN: 110093' : ''}</div>
          <div style="font-size: 10px;">
            ${data.companyPhone ? `Phone: ${data.companyPhone}` : ''}
            ${data.companyGstin ? ` | GSTIN: ${data.companyGstin}` : ''}
            ${data.companyPan ? ` | PAN: ${data.companyPan}` : ''}
          </div>
        </td>
        <td style="width: 34%; vertical-align: top; text-align: right;">
          <div class="title-badge">ORDER CONFIRMATION</div>
          <div style="margin: 5px 0 2px 0; font-size: 12px; font-family: monospace; font-weight: bold;">Ref: ${data.orderNumber}</div>
          <div style="margin: 2px 0; font-size: 10.5px;">Date: ${formattedDate}</div>
          <div style="margin: 2px 0; font-size: 10px;">Place of Supply: <strong>${data.placeOfSupply} (${data.placeOfSupplyStateCode})</strong></div>
          <div style="margin: 2px 0; font-size: 10px;">Status: <strong>${data.status}</strong></div>
          ${data.clientPoNumber ? `<div style="margin: 2px 0; font-size: 10px;">PO Ref: <strong>${data.clientPoNumber}</strong> ${data.clientPoDate ? `(${new Date(data.clientPoDate).toLocaleDateString('en-IN')})` : ''}</div>` : ''}
          ${data.quotationRef ? `<div style="margin: 2px 0; font-size: 9.5px;">Quote Ref: ${data.quotationRef}</div>` : ''}
          ${data.piNumber ? `<div style="margin: 2px 0; font-size: 9.5px;">PI Ref: ${data.piNumber}</div>` : ''}
        </td>
        <td style="width: 16%; vertical-align: top; text-align: right; padding-left: 6px;">
          ${data.qrDataUrl ? `
            <div style="display: inline-block; text-align: center;">
              <img src="${data.qrDataUrl}" width="75" height="75" alt="Verify QR" style="display: block; margin: 0 auto; border: none !important; outline: none !important;" />
              <div style="font-size: 8px; text-transform: uppercase; margin-top: 2px;">Verify Document</div>
            </div>
          ` : ''}
        </td>
      </tr>
    </table>

    <!-- Parties Grid: Bill To & Ship To -->
    <table class="info-table">
      <tr>
        <td style="vertical-align: top; width: 50%; padding-right: 12px;">
          <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase;">BILL TO (CUSTOMER):</div>
          <div style="font-size: 11px; font-weight: bold; margin: 2px 0;">${data.billTo.name}</div>
          <div style="font-size: 9.5px; margin: 1px 0;">${data.billTo.address}</div>
          <div style="font-size: 9.5px; margin: 1px 0;">State: ${data.billTo.state} ${data.billTo.stateCode ? `(${data.billTo.stateCode})` : ''}</div>
          ${data.billTo.gstin ? `<div style="font-size: 9.5px; margin: 1px 0;"><strong>GSTIN:</strong> ${data.billTo.gstin}</div>` : ''}
          ${data.billTo.pan ? `<div style="font-size: 9.5px; margin: 1px 0;"><strong>PAN:</strong> ${data.billTo.pan}</div>` : ''}
          ${data.billTo.phone ? `<div style="font-size: 9px; margin: 1px 0;">Phone: ${data.billTo.phone}</div>` : ''}
          ${data.billTo.email ? `<div style="font-size: 9px; margin: 1px 0;">Email: ${data.billTo.email}</div>` : ''}
        </td>
        <td style="vertical-align: top; width: 50%; border-left: 1px solid #000000; padding-left: 12px;">
          <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase;">SHIP TO (DELIVERY SITE):</div>
          <div style="font-size: 11px; font-weight: bold; margin: 2px 0;">${data.shipTo.name}</div>
          <div style="font-size: 9.5px; margin: 1px 0;">${data.shipTo.address}</div>
          <div style="font-size: 9.5px; margin: 1px 0;">State: ${data.shipTo.state} ${data.shipTo.stateCode ? `(${data.shipTo.stateCode})` : ''}</div>
          ${data.shipTo.gstin ? `<div style="font-size: 9.5px; margin: 1px 0;"><strong>GSTIN:</strong> ${data.shipTo.gstin}</div>` : ''}
          ${data.shipTo.phone ? `<div style="font-size: 9px; margin: 1px 0;">Contact: ${data.shipTo.phone}</div>` : ''}
        </td>
      </tr>
    </table>

    <div class="body-wrapper">
      <!-- Line Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">S.No</th>
            <th>Description & Technical Specification</th>
            <th style="width: 55px; text-align: center;">HSN/SAC</th>
            <th style="width: 42px; text-align: center;">Unit</th>
            <th style="width: 42px; text-align: right;">Qty</th>
            <th style="width: 75px; text-align: right;">Rate (${currSym})</th>
            <th style="width: 85px; text-align: right;">Amount (${currSym})</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}

          <!-- Pricing Summary Rows -->
          <tr>
            <td colspan="6" style="text-align: right; font-weight: bold;">Basic Price / Subtotal:</td>
            <td style="text-align: right; font-weight: bold;">${data.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${data.freightAmount > 0 ? `
            <tr>
              <td colspan="6" style="text-align: right;">Freight & Handling:</td>
              <td style="text-align: right;">${data.freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ` : ''}
          ${(() => {
            if (isDelhi) {
              const halfTax = data.totalTaxAmount / 2;
              const cgst = data.cgstAmount > 0 ? data.cgstAmount : halfTax;
              const sgst = data.sgstAmount > 0 ? data.sgstAmount : halfTax;
              return `<tr>
                  <td colspan="6" style="text-align: right;">CGST @ 9%:</td>
                  <td style="text-align: right;">${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td colspan="6" style="text-align: right;">SGST @ 9%:</td>
                  <td style="text-align: right;">${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>`;
            } else {
              const igst = data.igstAmount > 0 ? data.igstAmount : data.totalTaxAmount;
              return `<tr>
                  <td colspan="6" style="text-align: right;">IGST @ 18%:</td>
                  <td style="text-align: right;">${igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>`;
            }
          })()}
          <tr style="font-weight: bold; background: #ffffff;">
            <td colspan="6" style="text-align: right; font-size: 11px; text-transform: uppercase;">Total Order Value (${currSym}):</td>
            <td style="text-align: right; font-size: 11px;">${data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <!-- Amount in Words -->
      <div style="font-size: 10px; margin: 4px 0 6px 0; border: 1px solid #000000; padding: 4px 8px;">
        <strong>Amount Chargeable (in words):</strong> ${amountInWordsText}
      </div>

      <!-- Standard Inclusions & Accessories Box -->
      <div class="section-title">Standard Inclusions &amp; Hardware Accessories</div>
      <div class="accessories-box">${accessoriesText}</div>

      <!-- Bank Details -->
      ${data.bankDetails ? `
        <div class="section-title">Remittance &amp; Electronic Bank Coordinates (RTGS / NEFT / IMPS)</div>
        <div class="bank-box">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <tr>
              <td style="width: 50%; padding: 1px 0;"><strong>Bank Name:</strong> ${data.bankDetails.bankName}</td>
              <td style="width: 50%; padding: 1px 0;"><strong>A/C No:</strong> <span style="font-family: monospace; font-size: 11px; font-weight: bold;">${data.bankDetails.accountNumber}</span></td>
            </tr>
            <tr>
              <td style="padding: 1px 0;"><strong>IFSC Code:</strong> <span style="font-family: monospace; font-weight: bold;">${data.bankDetails.ifscCode || '-'}</span></td>
              <td style="padding: 1px 0;"><strong>Branch:</strong> ${data.bankDetails.branch || '-'}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 1px 0;"><strong>Account Name:</strong> ${data.bankDetails.accountName || data.companyName}</td>
            </tr>
          </table>
        </div>
      ` : ''}

      <!-- Commercial Terms -->
      <div class="section-title">Commercial Terms &amp; Conditions</div>
      <div class="terms-box">
        <ol>${termsList}</ol>
      </div>

      <!-- Signatory Sign-off -->
      <table class="sign-table">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase;">CLIENT ACCEPTANCE:</div>
            <div style="font-size: 9px; margin-top: 2px;">We hereby confirm acceptance of this Order Confirmation, specifications, prices, and terms.</div>
            <div style="height: 38px; border-bottom: 1px solid #000000; width: 170px; margin-top: 15px;"></div>
            <div style="font-size: 8.5px; margin-top: 3px;">Authorized Signature &amp; Company Seal</div>
          </td>
          <td style="width: 50%; text-align: right; vertical-align: top;">
            <div style="font-size: 9.5px; font-weight: bold;">For ${data.companyName}</div>
            <div style="height: 44px; display: flex; align-items: center; justify-content: flex-end; margin-top: 6px;">
              ${data.signatureUrl ? `<img src="${data.signatureUrl}" height="40" alt="Authorized Signature" style="display: block; max-height: 40px; object-fit: contain;" />` : '<div style="height: 38px; border-bottom: 1px solid #000000; width: 170px; display: inline-block;"></div>'}
            </div>
            <div style="font-size: 10px; font-weight: bold; margin-top: 3px;">
              ${data.signatoryName || 'Authorized Signatory'}
            </div>
            <div style="font-size: 8.5px; color: #334155;">
              ${data.signatoryDesignation || 'Operations / Sales Division'} ${data.signatoryPhone ? `| ${data.signatoryPhone}` : ''}
            </div>
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;
  },

  /**
   * Generates official GST Tax Invoice PDF HTML (Rule 46 compliant) with distinct Tax Invoice T&Cs
   */
  generateTaxInvoicePdfHtml(data: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    companyName: string;
    companyAddress: string;
    companyPhone?: string;
    companyEmail?: string;
    companyGstin?: string;
    companyPan?: string;
    logoUrl?: string;
    qrDataUrl?: string;
    customerName: string;
    customerGstin?: string;
    customerAddress?: string;
    consigneeName?: string;
    deliveryAddress?: string;
    placeOfSupply?: string;
    orderNumber?: string;
    piNumber?: string;
    items: Array<{
      serialNumber: number;
      description: string;
      hsnSac?: string;
      quantity: number;
      rate: number;
      amount: number;
      gstRate: number;
    }>;
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
    currency: string;
    status: string;
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      branchName?: string;
    };
    signatureUrl?: string;
    signatoryName?: string;
  }): string {
    const formattedDate = new Date(data.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const currSym = data.currency === 'AED' ? 'AED' : '₹';
    const logoSrc = resolveCompanyLogoDataUri(data.logoUrl);

    const itemRows = data.items
      .map(
        (it) => `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 4px;">${it.serialNumber}</td>
          <td style="border: 1px solid #000; padding: 4px;"><strong>${it.description}</strong></td>
          <td style="text-align: center; border: 1px solid #000; padding: 4px;">${it.hsnSac || '73089090'}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 4px;">${it.quantity}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 4px;">${currSym} ${Number(it.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 4px; font-weight: bold;">${currSym} ${Number(it.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 4px;">${it.gstRate || 18}%</td>
        </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${data.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; color: #000000 !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; line-height: 1.35; margin: 0; padding: 0; background: #fff; }
    .container { width: 100%; max-width: 194mm; margin: 0 auto; border: 1px solid #000; background: #fff; }
    table { width: 100%; border-collapse: collapse; }
    td, th { vertical-align: top; }
  </style>
</head>
<body>
  <div class="container">
    <table style="border-bottom: 1px solid #000;">
      <tr>
        <td style="width: 55%; padding: 8px 10px;">
          ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="height: 38px; max-width: 170px; object-fit: contain; margin-bottom: 4px;" />` : ''}
          <div style="font-size: 13px; font-weight: 800; text-transform: uppercase;">${data.companyName}</div>
          <div style="font-size: 9.5px; color: #334155;">${data.companyAddress}</div>
          <div style="font-size: 9.5px; margin-top: 2px;"><strong>GSTIN:</strong> ${data.companyGstin || '07CIJPS1392A2Z9'} | <strong>PAN:</strong> ${data.companyPan || 'CIJPS1392A'}</div>
          ${data.companyPhone ? `<div style="font-size: 9.5px;"><strong>Phone:</strong> ${data.companyPhone}</div>` : ''}
        </td>
        <td style="width: 45%; padding: 8px 10px; text-align: right; border-left: 1px solid #000;">
          <div style="display: inline-block; border: 1px solid #000; padding: 3px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: #f8fafc; margin-bottom: 6px;">
            TAX INVOICE (GST)
          </div>
          <table style="font-size: 10px; margin-top: 4px; float: right; width: auto;">
            <tr><td style="text-align: right; padding: 1px 4px;"><strong>Invoice No:</strong></td><td style="text-align: left; padding: 1px 4px; font-family: monospace; font-weight: bold;">${data.invoiceNumber}</td></tr>
            <tr><td style="text-align: right; padding: 1px 4px;"><strong>Invoice Date:</strong></td><td style="text-align: left; padding: 1px 4px;">${formattedDate}</td></tr>
            ${data.orderNumber ? `<tr><td style="text-align: right; padding: 1px 4px;"><strong>Order Ref:</strong></td><td style="text-align: left; padding: 1px 4px; font-family: monospace;">${data.orderNumber}</td></tr>` : ''}
            ${data.placeOfSupply ? `<tr><td style="text-align: right; padding: 1px 4px;"><strong>Place of Supply:</strong></td><td style="text-align: left; padding: 1px 4px;">${data.placeOfSupply}</td></tr>` : ''}
            <tr><td style="text-align: right; padding: 1px 4px;"><strong>Reverse Charge:</strong></td><td style="text-align: left; padding: 1px 4px;">NO</td></tr>
          </table>
          ${data.qrDataUrl ? `<div style="clear: both; padding-top: 4px;"><img src="${data.qrDataUrl}" alt="QR" style="width: 52px; height: 52px;" /></div>` : ''}
        </td>
      </tr>
    </table>

    <table style="border-bottom: 1px solid #000; font-size: 10px; width: 100%;">
      <tr>
        <td style="width: 50%; padding: 6px 10px; border-right: 1px solid #000; vertical-align: top;">
          <div style="font-weight: 800; text-transform: uppercase; font-size: 9.5px; color: #475569; margin-bottom: 2px;">BILLED TO (RECEIVER):</div>
          <div style="font-size: 11px; font-weight: bold;">${data.customerName}</div>
          <div>${data.customerAddress || 'Client Office Address'}</div>
          ${data.customerGstin ? `<div><strong>Customer GSTIN:</strong> ${data.customerGstin}</div>` : ''}
        </td>
        <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
          <div style="font-weight: 800; text-transform: uppercase; font-size: 9.5px; color: #475569; margin-bottom: 2px;">SHIPPED TO (DELIVERY / SITE):</div>
          <div style="font-size: 11px; font-weight: bold;">${data.consigneeName || data.customerName}</div>
          <div>${data.deliveryAddress || data.customerAddress || 'Same as Billing Address'}</div>
        </td>
      </tr>
    </table>

    <div style="padding: 6px 10px;">
      <table style="border: 1px solid #000; font-size: 10px; margin: 4px 0;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="width: 28px; border: 1px solid #000; padding: 4px; text-align: center;">S.N.</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: left;">Description of Goods</th>
            <th style="width: 60px; border: 1px solid #000; padding: 4px; text-align: center;">HSN/SAC</th>
            <th style="width: 50px; border: 1px solid #000; padding: 4px; text-align: right;">Qty</th>
            <th style="width: 75px; border: 1px solid #000; padding: 4px; text-align: right;">Rate</th>
            <th style="width: 85px; border: 1px solid #000; padding: 4px; text-align: right;">Amount</th>
            <th style="width: 45px; border: 1px solid #000; padding: 4px; text-align: center;">GST %</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <table style="margin-top: 4px;">
        <tr>
          <td style="width: 55%; font-size: 9px; padding-right: 8px;">
            <div style="border: 1px solid #cbd5e1; padding: 6px; background: #fafafa; margin-bottom: 4px;">
              <strong>Amount in Words:</strong> ${numberToWords(data.grandTotal, data.currency)}
            </div>
            ${data.bankDetails ? `
            <div style="border: 1px dashed #000; padding: 4px 6px; font-size: 8.5px; background: #f8fafc;">
              <strong>Bank Remittance Details:</strong><br/>
              Bank: ${data.bankDetails.bankName} | A/C No: ${data.bankDetails.accountNumber} | IFSC: ${data.bankDetails.ifscCode}
            </div>` : ''}
          </td>
          <td style="width: 45%;">
            <table style="border: 1px solid #000; font-size: 10px;">
              <tr>
                <td style="padding: 3px 6px; border-bottom: 1px solid #cbd5e1;">Taxable Value:</td>
                <td style="padding: 3px 6px; text-align: right; border-bottom: 1px solid #cbd5e1; font-weight: bold;">${currSym} ${Number(data.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${
                ((data.customerGstin && data.customerGstin.startsWith('07')) ||
                /delhi\b/i.test(data.placeOfSupply || '') ||
                /07\b/i.test(data.placeOfSupply || '') ||
                /delhi\b/i.test(data.customerAddress || '') ||
                !(data.placeOfSupply || '').trim())
                  ? `<tr>
                      <td style="padding: 3px 6px; border-bottom: 1px solid #cbd5e1;">CGST (9%):</td>
                      <td style="padding: 3px 6px; text-align: right; border-bottom: 1px solid #cbd5e1;">${currSym} ${(Number(data.taxAmount) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td style="padding: 3px 6px; border-bottom: 1px solid #cbd5e1;">SGST (9%):</td>
                      <td style="padding: 3px 6px; text-align: right; border-bottom: 1px solid #cbd5e1;">${currSym} ${(Number(data.taxAmount) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>`
                  : `<tr>
                      <td style="padding: 3px 6px; border-bottom: 1px solid #cbd5e1;">IGST (18%):</td>
                      <td style="padding: 3px 6px; text-align: right; border-bottom: 1px solid #cbd5e1;">${currSym} ${Number(data.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>`
              }
              <tr style="background: #0f172a; color: #fff;">
                <td style="padding: 5px 6px; font-weight: bold;">Invoice Total:</td>
                <td style="padding: 5px 6px; text-align: right; font-weight: bold; color: #7FB706;">${currSym} ${Number(data.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- DISTINCT TAX INVOICE TERMS & CONDITIONS -->
    <table style="border-top: 1px solid #000; font-size: 8.5px; padding: 6px 10px;">
      <tr>
        <td style="width: 65%; padding-right: 10px;">
          <div style="font-weight: 800; text-transform: uppercase; font-size: 9px; color: #000; margin-bottom: 2px;">
            TERMS & CONDITIONS OF TAX INVOICE:
          </div>
          <ol style="margin: 0; padding-left: 14px; line-height: 1.35; color: #334155;">
            <li><strong>Statutory Declaration:</strong> This Tax Invoice is issued under Section 31 of the CGST Act, 2017. Input Tax Credit (ITC) eligibility is contingent on GST portal matching.</li>
            <li><strong>Overdue Interest:</strong> Interest @ 18% per annum will be charged on all unpaid balances overdue beyond the agreed credit payment period.</li>
            <li><strong>Goods Once Sold:</strong> Custom cut-to-size cubicle boards and architectural hardware once supplied cannot be taken back, exchanged, or refunded.</li>
            <li><strong>Discrepancy Period:</strong> Any billing discrepancy or rate query must be notified in writing within 7 calendar days of invoice date.</li>
            <li><strong>Legal Jurisdiction:</strong> All contracts, supplies, and disputes are subject exclusively to the competent courts of Delhi / NCR.</li>
          </ol>
        </td>
        <td style="width: 35%; text-align: right; vertical-align: bottom;">
          <div style="font-size: 9px; color: #64748b;">For <strong>${data.companyName}</strong></div>
          <div style="height: 38px; display: flex; align-items: center; justify-content: flex-end;">
            ${data.signatureUrl ? `<img src="${data.signatureUrl}" height="32" alt="Sign" />` : '<span style="color: #cbd5e1; font-style: italic;">[Authorized Signature]</span>'}
          </div>
          <div style="font-size: 9px; font-weight: 800; border-top: 1px solid #000; display: inline-block; padding-top: 2px;">
            ${data.signatoryName || 'Authorized Signatory'}
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  },

  /**
   * Generates official Vehicle Dispatch Challan & Gate Pass PDF HTML with Driver sign-off and distinct Dispatch T&Cs
   */
  generateDispatchChallanPdfHtml(data: {
    dispatchNumber: string;
    dispatchDate: string;
    orderNumber?: string;
    packingListNumber?: string;
    companyName: string;
    companyAddress: string;
    companyGstin?: string;
    logoUrl?: string;
    qrDataUrl?: string;
    customerName: string;
    destinationSite: string;
    siteContactName?: string;
    siteContactPhone?: string;
    transporterName?: string;
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
    lrNumber?: string;
    lrDate?: string;
    ewayBillNumber?: string;
    totalPackages?: number;
    items: Array<{
      serialNumber: number;
      description: string;
      noOfPackets?: number;
      natureOfPacket?: string;
      quantity: number;
    }>;
    status: string;
    notes?: string;
    signatureUrl?: string;
  }): string {
    const formattedDate = new Date(data.dispatchDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const logoSrc = resolveCompanyLogoDataUri(data.logoUrl);

    const itemRows = data.items
      .map(
        (it) => `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 4px;">${it.serialNumber}</td>
          <td style="border: 1px solid #000; padding: 4px;"><strong>${it.description}</strong></td>
          <td style="text-align: center; border: 1px solid #000; padding: 4px;">${it.noOfPackets || 1}</td>
          <td style="border: 1px solid #000; padding: 4px;">${it.natureOfPacket || 'Carton Box / Panel Bundle'}</td>
          <td style="text-align: right; border: 1px solid #000; padding: 4px; font-weight: bold;">${it.quantity}</td>
        </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dispatch Challan - ${data.dispatchNumber}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; color: #000000 !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; line-height: 1.35; margin: 0; padding: 0; background: #fff; }
    .container { width: 100%; max-width: 194mm; margin: 0 auto; border: 1px solid #000; background: #fff; }
    table { width: 100%; border-collapse: collapse; }
    td, th { vertical-align: top; }
  </style>
</head>
<body>
  <div class="container">
    <table style="border-bottom: 1px solid #000;">
      <tr>
        <td style="width: 55%; padding: 8px 10px;">
          ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="height: 38px; max-width: 170px; object-fit: contain; margin-bottom: 4px;" />` : ''}
          <div style="font-size: 13px; font-weight: 800; text-transform: uppercase;">${data.companyName}</div>
          <div style="font-size: 9.5px; color: #334155;">${data.companyAddress}</div>
          <div style="font-size: 9.5px; margin-top: 2px;"><strong>GSTIN:</strong> ${data.companyGstin || '07CIJPS1392A2Z9'}</div>
        </td>
        <td style="width: 45%; padding: 8px 10px; text-align: right; border-left: 1px solid #000;">
          <div style="display: inline-block; border: 1px solid #000; padding: 3px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: #f8fafc; margin-bottom: 6px;">
            DISPATCH CHALLAN & GATE PASS
          </div>
          <table style="font-size: 10px; margin-top: 4px; float: right; width: auto;">
            <tr><td style="text-align: right; padding: 1px 4px;"><strong>Challan No:</strong></td><td style="text-align: left; padding: 1px 4px; font-family: monospace; font-weight: bold;">${data.dispatchNumber}</td></tr>
            <tr><td style="text-align: right; padding: 1px 4px;"><strong>Dispatch Date:</strong></td><td style="text-align: left; padding: 1px 4px;">${formattedDate}</td></tr>
            ${data.orderNumber ? `<tr><td style="text-align: right; padding: 1px 4px;"><strong>Order No:</strong></td><td style="text-align: left; padding: 1px 4px; font-family: monospace;">${data.orderNumber}</td></tr>` : ''}
            ${data.packingListNumber ? `<tr><td style="text-align: right; padding: 1px 4px;"><strong>Packing List:</strong></td><td style="text-align: left; padding: 1px 4px; font-family: monospace;">${data.packingListNumber}</td></tr>` : ''}
            ${data.ewayBillNumber ? `<tr><td style="text-align: right; padding: 1px 4px;"><strong>E-Way Bill:</strong></td><td style="text-align: left; padding: 1px 4px; font-weight: bold;">${data.ewayBillNumber}</td></tr>` : ''}
          </table>
          ${data.qrDataUrl ? `<div style="clear: both; padding-top: 4px;"><img src="${data.qrDataUrl}" alt="QR" style="width: 52px; height: 52px;" /></div>` : ''}
        </td>
      </tr>
    </table>

    <!-- Carrier & Site Details -->
    <table style="border-bottom: 1px solid #000; font-size: 10px;">
      <tr>
        <td style="width: 50%; padding: 6px 10px; border-right: 1px solid #000;">
          <div style="font-weight: 800; text-transform: uppercase; font-size: 9.5px; color: #475569; margin-bottom: 2px;">TRANSPORT & CARRIER DETAILS:</div>
          <div><strong>Transporter:</strong> ${data.transporterName || 'Dedicated Truck / Carrier'}</div>
          <div><strong>Vehicle Number:</strong> <span style="font-family: monospace; font-weight: bold;">${data.vehicleNumber || 'Pending Allocation'}</span></div>
          <div><strong>Driver Name / Phone:</strong> ${data.driverName || 'Driver'} ${data.driverPhone ? `(${data.driverPhone})` : ''}</div>
          ${data.lrNumber ? `<div><strong>LR / GR No:</strong> ${data.lrNumber} ${data.lrDate ? `dt. ${new Date(data.lrDate).toLocaleDateString('en-GB')}` : ''}</div>` : ''}
          <div><strong>Total Packages:</strong> ${data.totalPackages || data.items.reduce((s, it) => s + (it.noOfPackets || 1), 0)} Cartons / Bundles</div>
        </td>
        <td style="width: 50%; padding: 6px 10px;">
          <div style="font-weight: 800; text-transform: uppercase; font-size: 9.5px; color: #475569; margin-bottom: 2px;">DESTINATION SITE (CONSIGNEE):</div>
          <div style="font-size: 11px; font-weight: bold;">${data.customerName}</div>
          <div>${data.destinationSite}</div>
          ${data.siteContactName ? `<div><strong>Site Contact:</strong> ${data.siteContactName} ${data.siteContactPhone ? `(${data.siteContactPhone})` : ''}</div>` : ''}
        </td>
      </tr>
    </table>

    <div style="padding: 6px 10px;">
      <table style="border: 1px solid #000; font-size: 10px; margin: 4px 0;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="width: 28px; border: 1px solid #000; padding: 4px; text-align: center;">S.N.</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: left;">Package Description / Component Name</th>
            <th style="width: 50px; border: 1px solid #000; padding: 4px; text-align: center;">Packets</th>
            <th style="width: 140px; border: 1px solid #000; padding: 4px; text-align: left;">Nature of Packaging</th>
            <th style="width: 60px; border: 1px solid #000; padding: 4px; text-align: right;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <!-- DISTINCT DISPATCH & TRANSIT TERMS & CONDITIONS -->
    <table style="border-top: 1px solid #000; font-size: 8.5px; padding: 6px 10px;">
      <tr>
        <td colspan="3" style="padding-bottom: 6px;">
          <div style="font-weight: 800; text-transform: uppercase; font-size: 9px; color: #000; margin-bottom: 2px;">
            TERMS & CONDITIONS OF VEHICLE DISPATCH & TRANSIT:
          </div>
          <ol style="margin: 0; padding-left: 14px; line-height: 1.35; color: #334155;">
            <li><strong>Transit Risk:</strong> Goods in transit are covered by carrier road transport conditions. Transit insurance is the consignee's responsibility unless specified.</li>
            <li><strong>Security Gate Pass:</strong> This document serves as the authorized gate pass and must be endorsed & stamped by the destination site security guard and project engineer.</li>
            <li><strong>Unloading Responsibility:</strong> Consignee must provide labor and equipment for vehicle unloading within 3 hours of arrival.</li>
            <li><strong>Driver Acknowledgment:</strong> The carrier driver has inspected the carton count and tamper-proof weather packaging prior to factory exit.</li>
            <li><strong>Damage / Shortage Claim:</strong> Any discrepancy must be noted on the carrier POD copy and reported within 24 hours of delivery.</li>
          </ol>
        </td>
      </tr>
      <tr style="border-top: 1px dashed #cbd5e1; padding-top: 6px;">
        <td style="width: 33%; padding-top: 6px;">
          <div style="font-size: 8px; font-weight: bold; text-transform: uppercase;">1. Transporter / Driver:</div>
          <div style="height: 28px; padding-top: 6px; font-size: 9px;">${data.driverName || 'Driver Sign'}</div>
          <div style="border-top: 1px solid #94a3b8; display: inline-block; font-size: 8px; color: #64748b;">Driver Signature & Date</div>
        </td>
        <td style="width: 33%; padding-top: 6px; text-align: center;">
          <div style="font-size: 8px; font-weight: bold; text-transform: uppercase;">2. Factory Gate Outpass:</div>
          <div style="height: 28px; padding-top: 6px; font-size: 9px;">Security Outpass Verified</div>
          <div style="border-top: 1px solid #94a3b8; display: inline-block; font-size: 8px; color: #64748b;">Security Guard Sign / Stamp</div>
        </td>
        <td style="width: 34%; padding-top: 6px; text-align: right;">
          <div style="font-size: 8px; font-weight: bold; text-transform: uppercase;">3. Received by Consignee:</div>
          <div style="height: 28px; padding-top: 6px; font-size: 9px;">___________________________</div>
          <div style="border-top: 1px solid #94a3b8; display: inline-block; font-size: 8px; color: #64748b;">Site In-Charge Sign & Stamp</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  },
};

