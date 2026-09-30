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
export declare const qrService: {
    /**
     * Generates a cryptographically secure token for document verification or tracking.
     */
    generateToken(entityType: string, entityId: string): string;
    /**
     * Creates a public verification token and QR code for an issued document.
     */
    registerDocumentQr(params: {
        documentType: string;
        documentId: string;
        documentNumber: string;
        companyName: string;
        partyName: string;
        date: string;
        totalAmount: number;
        currency: string;
        status: string;
    }): Promise<{
        token: string;
        qrData: string;
        qrCodeId: string;
    }>;
    /**
     * Retrieves or registers a QR code for any document to embed in PDFs by default.
     */
    getOrCreateDocumentQr(params: {
        documentType: string;
        documentId: string;
        documentNumber: string;
        companyName: string;
        partyName: string;
        date: string;
        totalAmount?: number;
        currency?: string;
        status?: string;
    }): Promise<{
        qrDataUrl: string;
        qrData: string;
        token: string;
    }>;
    /**
     * Public verification check — safe, sanitised, never reveals internal IDs or passwords.
     */
    verifyPublicToken(token: string): Promise<PublicVerificationResult>;
    /**
     * Admin Scanner Handler: decodes scanned data, logs scan, and resolves to admin navigation route.
     */
    handleAdminScan(scannedPayload: string, userId?: string, ip?: string, userAgent?: string): Promise<{
        success: boolean;
        type: string;
        entityId: string;
        token: string;
        targetRoute: string;
        data: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            slug: string;
            description: string | null;
            shortDesc: string | null;
            sku: string | null;
            barcode: string | null;
            hsnSac: string | null;
            categoryId: string | null;
            subcategoryId: string | null;
            materialId: string | null;
            finishId: string | null;
            unitId: string | null;
            thickness: string | null;
            cuttingSize: string | null;
            gstRate: import("@prisma/client/runtime/library").Decimal | null;
            basePrice: import("@prisma/client/runtime/library").Decimal | null;
            costPrice: import("@prisma/client/runtime/library").Decimal | null;
            isFeatured: boolean;
            images: import("@prisma/client/runtime/library").JsonValue;
            specifications: import("@prisma/client/runtime/library").JsonValue;
            tags: string[];
            metaTitle: string | null;
            metaDescription: string | null;
            createdById: string | null;
        } | ({
            customer: {
                status: string;
                email: string | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                notes: string | null;
                phone: string | null;
                companyProfileId: string | null;
                partyType: import(".prisma/client").$Enums.PartyType;
                legalName: string;
                tradeName: string | null;
                gstin: string | null;
                pan: string | null;
            };
        } & {
            status: import(".prisma/client").$Enums.PIStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            quotationId: string | null;
            piNumber: string;
            piDate: Date;
            companyProfileId: string;
            customerId: string;
            placeOfSupply: string;
            placeOfSupplyStateCode: string;
            reverseCharge: boolean;
            modeOfTransport: string | null;
            vehicleNumber: string | null;
            grLrNumber: string | null;
            linkedPoNumber: string | null;
            linkedPoDate: Date | null;
            freightAmount: import("@prisma/client/runtime/library").Decimal;
            taxableAmount: import("@prisma/client/runtime/library").Decimal;
            cgstAmount: import("@prisma/client/runtime/library").Decimal;
            sgstAmount: import("@prisma/client/runtime/library").Decimal;
            igstAmount: import("@prisma/client/runtime/library").Decimal;
            totalTaxAmount: import("@prisma/client/runtime/library").Decimal;
            roundingAdjustment: import("@prisma/client/runtime/library").Decimal;
            grandTotal: import("@prisma/client/runtime/library").Decimal;
            amountInWords: string | null;
            issuedById: string | null;
            orderId: string | null;
            quotationRef: string | null;
            advancePercentage: import("@prisma/client/runtime/library").Decimal;
            advanceRequiredAmount: import("@prisma/client/runtime/library").Decimal;
            advanceReceivedAmount: import("@prisma/client/runtime/library").Decimal;
            advancePaymentStatus: string;
            advancePaymentDate: Date | null;
            advancePaymentReference: string | null;
            advancePaymentMode: string | null;
            convertedOrderId: string | null;
        }) | ({
            vendor: {
                status: string;
                email: string | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                notes: string | null;
                phone: string | null;
                companyProfileId: string | null;
                partyType: import(".prisma/client").$Enums.PartyType;
                legalName: string;
                tradeName: string | null;
                gstin: string | null;
                pan: string | null;
            };
        } & {
            status: import(".prisma/client").$Enums.POStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            createdById: string | null;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            companyProfileId: string;
            poNumber: string;
            vendorId: string;
            poDate: Date;
            subject: string | null;
            deliveryAddressJson: import("@prisma/client/runtime/library").JsonValue;
            billingAddressJson: import("@prisma/client/runtime/library").JsonValue;
            paymentTerms: string | null;
            deliveryTerms: string | null;
            gstAmount: import("@prisma/client/runtime/library").Decimal;
            approvedById: string | null;
        }) | null;
        message?: undefined;
    } | {
        success: boolean;
        type: string;
        entityId: string;
        token: string;
        targetRoute: string;
        data: import("@prisma/client/runtime/library").JsonValue;
        message?: undefined;
    } | {
        success: boolean;
        message: string;
        token: string;
        type?: undefined;
        entityId?: undefined;
        targetRoute?: undefined;
        data?: undefined;
    }>;
};
//# sourceMappingURL=qr.service.d.ts.map