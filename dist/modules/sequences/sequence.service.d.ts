export declare function getFiscalYear(date?: Date): string;
export declare function getShortFiscalYear(date?: Date): string;
export type DocumentSequenceType = 'PO' | 'PI' | 'SO' | 'INV' | 'QUOTATION' | 'ORDER' | 'PACKING_LIST' | 'HARDWARE_ISSUE';
export declare const sequenceService: {
    /**
     * Generates the next concurrency-safe, non-reusable document number using atomic database locking.
     */
    getNextDocumentNumber(companyProfileId: string, documentType: DocumentSequenceType, options?: {
        customPrefix?: string;
        padding?: number;
    }): Promise<{
        number: string;
        sequenceNumber: number;
        fiscalYear: string;
    }>;
};
//# sourceMappingURL=sequence.service.d.ts.map