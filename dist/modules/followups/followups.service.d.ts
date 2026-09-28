export declare const followupsService: {
    list(query: {
        page?: number;
        limit?: number;
        customerId?: string;
        followupStatus?: string;
        priority?: string;
        assignedUserId?: string;
    }): Promise<{
        items: ({
            logs: ({
                user: {
                    firstName: string;
                    lastName: string;
                    id: string;
                } | null;
            } & {
                response: string | null;
                id: string;
                createdAt: Date;
                userId: string | null;
                notes: string;
                followupId: string;
            })[];
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
            assignedUser: {
                email: string;
                firstName: string;
                lastName: string;
                id: string;
            } | null;
            reminders: {
                id: string;
                createdAt: Date;
                followupId: string;
                reminderDate: Date;
                isCompleted: boolean;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            proformaInvoiceId: string | null;
            customerId: string;
            dueDate: Date | null;
            nextFollowupDate: Date | null;
            followupStatus: import(".prisma/client").$Enums.FollowupStatus;
            outstandingAmount: import("@prisma/client/runtime/library").Decimal;
            priority: import(".prisma/client").$Enums.FollowupPriority;
            assignedUserId: string | null;
            promisedPaymentDate: Date | null;
            promisedAmount: import("@prisma/client/runtime/library").Decimal | null;
            communicationChannel: string;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getById(id: string): Promise<{
        logs: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
            } | null;
        } & {
            response: string | null;
            id: string;
            createdAt: Date;
            userId: string | null;
            notes: string;
            followupId: string;
        })[];
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
            contacts: {
                email: string | null;
                id: string;
                createdAt: Date;
                name: string;
                phone: string | null;
                designation: string | null;
                partyId: string;
                department: string | null;
                isPrimary: boolean;
            }[];
        } & {
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
        assignedUser: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        } | null;
        reminders: {
            id: string;
            createdAt: Date;
            followupId: string;
            reminderDate: Date;
            isCompleted: boolean;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        proformaInvoiceId: string | null;
        customerId: string;
        dueDate: Date | null;
        nextFollowupDate: Date | null;
        followupStatus: import(".prisma/client").$Enums.FollowupStatus;
        outstandingAmount: import("@prisma/client/runtime/library").Decimal;
        priority: import(".prisma/client").$Enums.FollowupPriority;
        assignedUserId: string | null;
        promisedPaymentDate: Date | null;
        promisedAmount: import("@prisma/client/runtime/library").Decimal | null;
        communicationChannel: string;
    }>;
    getByCustomer(customerId: string): Promise<({
        logs: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
            } | null;
        } & {
            response: string | null;
            id: string;
            createdAt: Date;
            userId: string | null;
            notes: string;
            followupId: string;
        })[];
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
            customerProfile: {
                status: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                partyId: string;
                customerType: string;
                creditLimit: import("@prisma/client/runtime/library").Decimal | null;
                paymentTermsDays: number;
            } | null;
            contacts: {
                email: string | null;
                id: string;
                createdAt: Date;
                name: string;
                phone: string | null;
                designation: string | null;
                partyId: string;
                department: string | null;
                isPrimary: boolean;
            }[];
            addresses: {
                id: string;
                createdAt: Date;
                gstin: string | null;
                country: string;
                state: string;
                stateCode: string | null;
                addressLine1: string;
                addressLine2: string | null;
                city: string;
                postalCode: string | null;
                partyId: string;
                addressType: string;
                isDefaultBilling: boolean;
                isDefaultShipping: boolean;
            }[];
        } & {
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
        assignedUser: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        } | null;
        reminders: {
            id: string;
            createdAt: Date;
            followupId: string;
            reminderDate: Date;
            isCompleted: boolean;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        proformaInvoiceId: string | null;
        customerId: string;
        dueDate: Date | null;
        nextFollowupDate: Date | null;
        followupStatus: import(".prisma/client").$Enums.FollowupStatus;
        outstandingAmount: import("@prisma/client/runtime/library").Decimal;
        priority: import(".prisma/client").$Enums.FollowupPriority;
        assignedUserId: string | null;
        promisedPaymentDate: Date | null;
        promisedAmount: import("@prisma/client/runtime/library").Decimal | null;
        communicationChannel: string;
    }) | null>;
    create(data: any, userId?: string): Promise<{
        logs: {
            response: string | null;
            id: string;
            createdAt: Date;
            userId: string | null;
            notes: string;
            followupId: string;
        }[];
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        proformaInvoiceId: string | null;
        customerId: string;
        dueDate: Date | null;
        nextFollowupDate: Date | null;
        followupStatus: import(".prisma/client").$Enums.FollowupStatus;
        outstandingAmount: import("@prisma/client/runtime/library").Decimal;
        priority: import(".prisma/client").$Enums.FollowupPriority;
        assignedUserId: string | null;
        promisedPaymentDate: Date | null;
        promisedAmount: import("@prisma/client/runtime/library").Decimal | null;
        communicationChannel: string;
    }>;
    addLog(followupId: string, logData: {
        notes: string;
        response?: string;
        nextFollowupDate?: string;
        followupStatus?: any;
        promisedPaymentDate?: string;
        promisedAmount?: number;
    }, userId?: string): Promise<{
        log: {
            response: string | null;
            id: string;
            createdAt: Date;
            userId: string | null;
            notes: string;
            followupId: string;
        };
        followup: {
            logs: {
                response: string | null;
                id: string;
                createdAt: Date;
                userId: string | null;
                notes: string;
                followupId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            proformaInvoiceId: string | null;
            customerId: string;
            dueDate: Date | null;
            nextFollowupDate: Date | null;
            followupStatus: import(".prisma/client").$Enums.FollowupStatus;
            outstandingAmount: import("@prisma/client/runtime/library").Decimal;
            priority: import(".prisma/client").$Enums.FollowupPriority;
            assignedUserId: string | null;
            promisedPaymentDate: Date | null;
            promisedAmount: import("@prisma/client/runtime/library").Decimal | null;
            communicationChannel: string;
        };
    }>;
    /**
     * Dues Recovery Dashboard Statistics
     */
    getRecoveryDashboard(): Promise<{
        totalOutstanding: number;
        overdueAmount: number;
        dueTodayCount: number;
        dueThisWeekCount: number;
        promiseToPayCount: number;
        promiseToPayAmount: number;
        pendingFollowupsCount: number;
        collectedToday: number;
    }>;
};
//# sourceMappingURL=followups.service.d.ts.map