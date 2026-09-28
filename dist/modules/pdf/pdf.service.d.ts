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
export declare const pdfService: {
    /**
     * Generates single-page A4 print-ready HTML for Purchase Orders
     */
    generatePoHtml(data: PoPdfData): string;
    /**
     * Generates formal Proforma Invoice PDF HTML matching the Quotation letterhead & vector layout,
     * with company logo, dual Bill To / Ship To party cards, technical specifications breakdown,
     * Delhi/Interstate statutory GST breakdown, bank remittance details, and signature sign-off.
     */
    generatePiHtml(data: PiPdfData): string;
    /**
     * Generates formal Sales Quotation letter PDF HTML with narrative covering letter,
     * embedded pricing table, specs block, accessories, warranties, T&Cs, and staff sign-off.
     */
    generateQuotationPdfHtml(data: QuotationPdfData): string;
    /**
     * Generates formal International Export Quotation / Proforma Offer PDF HTML
     */
    generateExportQuotationPdfHtml(data: ExportQuotationPdfData): string;
    /**
     * Generates standard Packing List PDF HTML matching the SAS Software Noida reference.
     */
    generatePackingListPdfHtml(data: PackingListPdfData): string;
    /**
     * Generates Hardware Issue List PDF HTML for store room issuance.
     */
    generateHardwareIssuePdfHtml(data: HardwareIssuePdfData): string;
    /**
     * Generates formal Sales Order Confirmation PDF HTML matching the Quotation & PI layout
     * with company logo, dual Bill To / Ship To party cards, technical specifications breakdown,
     * Delhi/Interstate statutory GST breakdown, bank remittance details, and signature sign-off.
     */
    generateSalesOrderPdfHtml(data: SalesOrderPdfData): string;
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
    }): string;
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
    }): string;
};
//# sourceMappingURL=pdf.service.d.ts.map