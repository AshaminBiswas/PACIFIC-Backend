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
    gstRate: number;
}
export interface TaxCalculationParams {
    sellerStateCode: string;
    placeOfSupplyStateCode: string;
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
    amount: number;
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
export declare function calculateGstTax(params: TaxCalculationParams): TaxCalculationResult;
//# sourceMappingURL=tax.engine.d.ts.map