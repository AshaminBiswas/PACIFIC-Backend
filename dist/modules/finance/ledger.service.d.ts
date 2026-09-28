export interface LedgerEntry {
    id: string;
    serialNo: number;
    date: Date | string;
    docType: 'PI' | 'SALES_ORDER' | 'PAYMENT' | 'OPENING';
    docRef: string;
    description: string;
    dueDate?: Date | string | null;
    daysOverdue?: number;
    debit: number;
    credit: number;
    runningBalance: number;
    status?: string;
    notes?: string;
}
export interface CustomerLedgerResult {
    customer: {
        id: string;
        legalName: string;
        tradeName?: string | null;
        gstin?: string | null;
        pan?: string | null;
        email?: string | null;
        phone?: string | null;
        paymentTermsDays: number;
        creditLimit?: number | null;
        customerType?: string | null;
        status: string;
        billingAddress?: any;
        primaryContact?: any;
    };
    company?: {
        legalName: string;
        tradeName?: string | null;
        gstin?: string | null;
        pan?: string | null;
        email?: string | null;
        phone?: string | null;
        address?: string | null;
        bankAccount?: {
            bankName: string;
            accountNumber: string;
            ifscCode?: string | null;
            swiftCode?: string | null;
            branch?: string | null;
        } | null;
        signatory?: {
            name: string;
            designation: string;
            signatureUrl?: string | null;
        } | null;
    };
    summary: {
        openingBalance: number;
        periodDebits: number;
        periodCredits: number;
        closingBalance: number;
        overdueAmount: number;
        daysOverdue: number;
        earliestDueDate: string | null;
        paymentTermsDays: number;
        currency: string;
        totalTransactions: number;
    };
    cadence: {
        currentStage: 'CURRENT' | 'REMINDER_1' | 'REMINDER_2' | 'REMINDER_3' | 'FINAL_NOTICE' | 'MANUAL_FOLLOWUP';
        lastReminderDate: string | null;
        nextReminderDate: string | null;
        followupStatus: string;
        priority: string;
        promisedPaymentDate?: string | null;
        promisedAmount?: number | null;
        notes?: string | null;
    };
    entries: LedgerEntry[];
    logs: any[];
}
export declare const ledgerService: {
    /**
     * Calculates comprehensive chronological customer ledger with running balance,
     * de-duplicating Sales Orders when Proforma Invoices already exist.
     */
    getCustomerLedger(customerId: string, options?: {
        fromDate?: string;
        toDate?: string;
    }): Promise<CustomerLedgerResult>;
    /**
     * Records a manual historical transaction (Debit or Credit) to update customer ledger balance.
     * Useful when migrating historical accounts and transactions before system rollout.
     */
    recordManualEntry(customerId: string, data: {
        entryType: "DEBIT" | "CREDIT";
        nature?: "OPENING_BALANCE" | "PAST_INVOICE" | "PAST_PAYMENT" | "ADJUSTMENT";
        date: string;
        docRef: string;
        description: string;
        amount: number;
        paymentMethod?: string;
        dueDate?: string;
    }, userId?: string): Promise<{
        type: string;
        record: {
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
        };
    } | {
        type: string;
        record: {
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
        };
    }>;
    /**
     * Generates a formal, executive monochrome Statement of Account PDF/HTML
     * designed identically to the Sales Quotation PDF.
     */
    generateLedgerHtml(data: CustomerLedgerResult, options?: {
        customNotes?: string;
        stageTitle?: string;
    }): string;
    /**
     * Dispatches the Statement of Account / Ledger to the customer via Email
     * and records an audit log entry.
     */
    sendCustomerLedgerEmail(customerId: string, options: {
        to?: string | string[];
        cc?: string[];
        subject?: string;
        notes?: string;
        stage?: "REMINDER_1" | "REMINDER_2" | "REMINDER_3" | "FINAL_NOTICE" | "MANUAL_EMAIL" | "STATEMENT";
    }, userId?: string): Promise<{
        success: boolean;
        emailId: string | undefined;
        recipients: string[];
        stage: "REMINDER_1" | "REMINDER_2" | "REMINDER_3" | "FINAL_NOTICE" | "MANUAL_EMAIL" | "STATEMENT";
        log: {
            response: string | null;
            id: string;
            createdAt: Date;
            userId: string | null;
            notes: string;
            followupId: string;
        };
        followup: {
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
     * Automated Overdue Cadence Engine:
     * Evaluates all customers with overdue balances.
     * Cadence:
     * - Day 1 Overdue -> Auto-Reminder 1
     * - 3 Consecutive Days after Reminder 1 -> Auto-Reminder 2
     * - 3 Consecutive Days after Reminder 2 -> Auto-Reminder 3
     * - 3 Consecutive Days after Reminder 3 -> Final Notice
     * - 3 Consecutive Days after Final Notice -> Flag for Manual Executive Follow-up
     */
    runPaymentOverdueCadence(): Promise<{
        evaluatedCount: number;
        remindersSent: number;
        escalatedCount: number;
        skippedCount: number;
        details: Array<{
            customer: string;
            action: string;
            stage?: string;
            note?: string;
        }>;
    }>;
    /**
     * Logs a manual follow-up touchpoint (Phone call, WhatsApp, in-person visit, promise to pay).
     */
    logFollowupTouchpoint(customerId: string, data: {
        channel: "PHONE" | "WHATSAPP" | "VISIT" | "EMAIL";
        notes: string;
        customerResponse?: string;
        promisedPaymentDate?: string;
        promisedAmount?: number;
        nextFollowupDate?: string;
        followupStatus?: any;
    }, userId?: string): Promise<{
        followup: {
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
        log: {
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
        };
    }>;
};
//# sourceMappingURL=ledger.service.d.ts.map