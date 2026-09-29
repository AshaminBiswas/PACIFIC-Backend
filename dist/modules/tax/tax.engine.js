"use strict";
/**
 * GST Tax Engine for Pacific Restroom Cubicle (PRC)
 * Centralizes all tax calculations for Proforma Invoices, Sales Orders, and Invoices.
 * Adheres strictly to Indian GST Law & Place of Supply (POS) rules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GST_STATE_CODE_MAP = void 0;
exports.calculateGstTax = calculateGstTax;
exports.isDelhiGst = isDelhiGst;
function round2(val) {
    return Math.round((val + Number.EPSILON) * 100) / 100;
}
function normalizeStateCode(val) {
    if (!val)
        return '';
    const s = val.trim().toLowerCase();
    if (s === '07' || s === 'delhi' || s.includes('delhi'))
        return '07';
    return s;
}
function calculateGstTax(params) {
    const cleanBuyerGstin = (params.buyerGstin || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    let isIntraState = false;
    if (cleanBuyerGstin.length >= 2) {
        // Supreme authority: GST number starting with 07 -> CGST 9% + SGST 9%, otherwise IGST 18%
        isIntraState = cleanBuyerGstin.startsWith('07');
    }
    else {
        // Unregistered / B2C buyer fallback:
        const sellerCode = normalizeStateCode(params.sellerStateCode || '07');
        const posCode = normalizeStateCode(params.placeOfSupplyStateCode || sellerCode);
        isIntraState = sellerCode !== '' && sellerCode === posCode;
    }
    const isReverseCharge = Boolean(params.isReverseCharge);
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    // Rate bucket aggregator for summary
    const summaryBuckets = new Map();
    const calculatedItems = params.items.map((item) => {
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
            }
            else {
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
            }
            else {
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
    const taxSummary = Array.from(summaryBuckets.entries())
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
exports.GST_STATE_CODE_MAP = {
    '01': 'Jammu & Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli and Daman & Diu',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman & Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
};
function isDelhiGst(gstin, stateCode, stateName) {
    const cleanGstin = (gstin || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanGstin.length >= 2) {
        return cleanGstin.startsWith('07');
    }
    const code = (stateCode || '').trim();
    if (code === '07')
        return true;
    if (code && code !== '07' && !isNaN(Number(code)))
        return false;
    const name = (stateName || '').trim().toLowerCase();
    return name.includes('delhi');
}
//# sourceMappingURL=tax.engine.js.map