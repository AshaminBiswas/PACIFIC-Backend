export declare const financeService: {
    listPayments(query: {
        page?: number;
        limit?: number;
        partyId?: string;
        paymentType?: string;
    }): Promise<{
        items: ({
            companyProfile: {
                status: string;
                email: string | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                phone: string | null;
                currency: string;
                companyName: string;
                legalName: string;
                gstin: string | null;
                pan: string | null;
                entityCode: string;
                country: string;
                taxRegime: string;
                vatNumber: string | null;
                state: string | null;
                stateCode: string | null;
                website: string | null;
                logoUrl: string | null;
                signatureUrl: string | null;
            };
            party: {
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
            allocations: ({
                proformaInvoice: {
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
                } | null;
            } & {
                id: string;
                createdAt: Date;
                proformaInvoiceId: string | null;
                documentType: string;
                documentId: string;
                allocatedAmount: import("@prisma/client/runtime/library").Decimal;
                paymentId: string;
            })[];
        } & {
            status: import(".prisma/client").$Enums.PaymentRecordStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            currency: string;
            companyProfileId: string;
            partyId: string;
            paymentDate: Date;
            referenceNumber: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            paymentType: import(".prisma/client").$Enums.PaymentType;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            unallocatedAmount: import("@prisma/client/runtime/library").Decimal;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getPaymentById(id: string): Promise<{
        companyProfile: {
            status: string;
            email: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            currency: string;
            companyName: string;
            legalName: string;
            gstin: string | null;
            pan: string | null;
            entityCode: string;
            country: string;
            taxRegime: string;
            vatNumber: string | null;
            state: string | null;
            stateCode: string | null;
            website: string | null;
            logoUrl: string | null;
            signatureUrl: string | null;
        };
        party: {
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
        allocations: ({
            proformaInvoice: {
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
            } | null;
        } & {
            id: string;
            createdAt: Date;
            proformaInvoiceId: string | null;
            documentType: string;
            documentId: string;
            allocatedAmount: import("@prisma/client/runtime/library").Decimal;
            paymentId: string;
        })[];
        transactions: {
            id: string;
            createdAt: Date;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            paymentId: string | null;
            accountType: string;
            transactionType: string;
            referenceId: string | null;
        }[];
    } & {
        status: import(".prisma/client").$Enums.PaymentRecordStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        currency: string;
        companyProfileId: string;
        partyId: string;
        paymentDate: Date;
        referenceNumber: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentType: import(".prisma/client").$Enums.PaymentType;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        unallocatedAmount: import("@prisma/client/runtime/library").Decimal;
    }>;
    /**
     * Records an immutable payment and allocates it across specified invoices/documents.
     */
    recordPayment(data: any, userId?: string): Promise<{
        party: {
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
        allocations: {
            id: string;
            createdAt: Date;
            proformaInvoiceId: string | null;
            documentType: string;
            documentId: string;
            allocatedAmount: import("@prisma/client/runtime/library").Decimal;
            paymentId: string;
        }[];
    } & {
        status: import(".prisma/client").$Enums.PaymentRecordStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        currency: string;
        companyProfileId: string;
        partyId: string;
        paymentDate: Date;
        referenceNumber: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentType: import(".prisma/client").$Enums.PaymentType;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        unallocatedAmount: import("@prisma/client/runtime/library").Decimal;
    }>;
    getReceivables(query: {
        status?: string;
    }): Promise<({
        proformaInvoice: {
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
        } | null;
        customer: {
            party: {
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
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            partyId: string;
            customerType: string;
            creditLimit: import("@prisma/client/runtime/library").Decimal | null;
            paymentTermsDays: number;
        };
    } & {
        status: import(".prisma/client").$Enums.ReceivableStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        proformaInvoiceId: string | null;
        customerId: string;
        dueDate: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal;
        balanceAmount: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    getPayables(query: {
        status?: string;
    }): Promise<({
        purchaseOrder: {
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
        } | null;
        vendor: {
            party: {
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
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            partyId: string;
            paymentTermsDays: number;
            vendorType: string;
        };
    } & {
        status: import(".prisma/client").$Enums.ReceivableStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        purchaseOrderId: string | null;
        vendorId: string;
        dueDate: Date | null;
        paidAmount: import("@prisma/client/runtime/library").Decimal;
        balanceAmount: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    getLedgerSummary(): Promise<{
        receivables: {
            total: number;
            collected: number;
            outstanding: number;
        };
        payables: {
            total: number;
            paid: number;
            outstanding: number;
        };
        monthlyCollections: number;
    }>;
};
//# sourceMappingURL=finance.service.d.ts.map