/**
 * GST Tax Engine for Pacific Restroom Cubicle (PRC)
 * Centralizes all tax calculations for Proforma Invoices, Sales Orders, and Invoices.
 * Adheres strictly to Indian GST Law & Place of Supply (POS) rules.
 */

export interface TaxLineItemInput {
  productId?: string;
  description: string;
  quantity: number;
  rate: number;
  gstRate: number; // e.g. 18, 12, 5, 0
}

export interface TaxCalculationParams {
  sellerStateCode: string; // e.g. "07" for Delhi
  placeOfSupplyStateCode: string; // e.g. "07" for Delhi, "06" for Haryana
  items: TaxLineItemInput[];
  freightAmount?: number;
  freightGstRate?: number;
  isReverseCharge?: boolean;
}

export interface CalculatedLineItem {
  productId?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number; // quantity * rate
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
}

export interface TaxSummaryRow {
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface TaxCalculationResult {
  isIntraState: boolean;
  isReverseCharge: boolean;
  subtotal: number;
  freightAmount: number;
  freightTax: number;
  totalTaxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  roundingAdjustment: number;
  grandTotal: number;
  items: CalculatedLineItem[];
  taxSummary: TaxSummaryRow[];
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function normalizeStateCode(val?: string): string {
  if (!val) return '';
  const s = val.trim().toLowerCase();
  if (s === '07' || s === 'delhi' || s.includes('delhi')) return '07';
  return s;
}

export function calculateGstTax(params: TaxCalculationParams): TaxCalculationResult {
  const sellerCode = normalizeStateCode(params.sellerStateCode || '07');
  const posCode = normalizeStateCode(params.placeOfSupplyStateCode || sellerCode);
  const isIntraState = sellerCode !== '' && sellerCode === posCode;
  const isReverseCharge = Boolean(params.isReverseCharge);

  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  // Rate bucket aggregator for summary
  const summaryBuckets = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }>();

  const calculatedItems: CalculatedLineItem[] = params.items.map((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const amount = round2(qty * rate);
    const taxableAmount = amount;
    const gstRate = Number(item.gstRate) || 0;

    subtotal = round2(subtotal + amount);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (!isReverseCharge && gstRate > 0) {
      if (isIntraState) {
        const halfRate = gstRate / 2;
        cgst = round2(taxableAmount * (halfRate / 100));
        sgst = round2(taxableAmount * (halfRate / 100));
        igst = 0;
      } else {
        cgst = 0;
        sgst = 0;
        igst = round2(taxableAmount * (gstRate / 100));
      }
    }

    const itemTotalTax = round2(cgst + sgst + igst);
    const totalAmount = round2(taxableAmount + itemTotalTax);

    totalCgst = round2(totalCgst + cgst);
    totalSgst = round2(totalSgst + sgst);
    totalIgst = round2(totalIgst + igst);

    // Aggregate in summary bucket
    const currentBucket = summaryBuckets.get(gstRate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
    currentBucket.taxable = round2(currentBucket.taxable + taxableAmount);
    currentBucket.cgst = round2(currentBucket.cgst + cgst);
    currentBucket.sgst = round2(currentBucket.sgst + sgst);
    currentBucket.igst = round2(currentBucket.igst + igst);
    currentBucket.totalTax = round2(currentBucket.totalTax + itemTotalTax);
    summaryBuckets.set(gstRate, currentBucket);

    return {
      productId: item.productId,
      description: item.description,
      quantity: qty,
      rate,
      amount,
      gstRate,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalAmount,
    };
  });

  // Freight handling
  const freightAmount = round2(Math.max(0, Number(params.freightAmount) || 0));
  let freightTax = 0;
  if (freightAmount > 0) {
    const freightGstRate = Number(params.freightGstRate ?? 18);
    let freightCgst = 0;
    let freightSgst = 0;
    let freightIgst = 0;

    if (!isReverseCharge && freightGstRate > 0) {
      if (isIntraState) {
        const halfRate = freightGstRate / 2;
        freightCgst = round2(freightAmount * (halfRate / 100));
        freightSgst = round2(freightAmount * (halfRate / 100));
      } else {
        freightIgst = round2(freightAmount * (freightGstRate / 100));
      }
    }

    freightTax = round2(freightCgst + freightSgst + freightIgst);
    totalCgst = round2(totalCgst + freightCgst);
    totalSgst = round2(totalSgst + freightSgst);
    totalIgst = round2(totalIgst + freightIgst);

    const fBucket = summaryBuckets.get(freightGstRate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
    fBucket.taxable = round2(fBucket.taxable + freightAmount);
    fBucket.cgst = round2(fBucket.cgst + freightCgst);
    fBucket.sgst = round2(fBucket.sgst + freightSgst);
    fBucket.igst = round2(fBucket.igst + freightIgst);
    fBucket.totalTax = round2(fBucket.totalTax + freightTax);
    summaryBuckets.set(freightGstRate, fBucket);
  }

  const totalTaxableAmount = round2(subtotal + freightAmount);
  const totalTaxAmount = round2(totalCgst + totalSgst + totalIgst);

  // Exact unrounded grand total
  const rawGrandTotal = round2(totalTaxableAmount + totalTaxAmount);
  // Rounded grand total to nearest integer
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundingAdjustment = round2(roundedGrandTotal - rawGrandTotal);
  const grandTotal = roundedGrandTotal;

  // Convert map to sorted tax summary array
  const taxSummary: TaxSummaryRow[] = Array.from(summaryBuckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([gstRate, val]) => ({
      gstRate,
      taxableAmount: val.taxable,
      cgst: val.cgst,
      sgst: val.sgst,
      igst: val.igst,
      totalTax: val.totalTax,
    }));

  return {
    isIntraState,
    isReverseCharge,
    subtotal,
    freightAmount,
    freightTax,
    totalTaxableAmount,
    cgstAmount: totalCgst,
    sgstAmount: totalSgst,
    igstAmount: totalIgst,
    totalTaxAmount,
    roundingAdjustment,
    grandTotal,
    items: calculatedItems,
    taxSummary,
  };
}
