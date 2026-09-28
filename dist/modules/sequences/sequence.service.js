"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequenceService = void 0;
exports.getFiscalYear = getFiscalYear;
exports.getShortFiscalYear = getShortFiscalYear;
const database_1 = require("../../config/database");
function getFiscalYear(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 = Jan, 3 = Apr
    if (month >= 3) {
        const nextYear = (year + 1).toString().slice(-2);
        return `${year}-${nextYear}`;
    }
    else {
        const prevYear = year - 1;
        const currYearShort = year.toString().slice(-2);
        return `${prevYear}-${currYearShort}`;
    }
}
function getShortFiscalYear(date = new Date()) {
    const yearShort = date.getFullYear().toString().slice(-2);
    const month = date.getMonth();
    if (month >= 3) {
        const nextYearShort = (date.getFullYear() + 1).toString().slice(-2);
        return `${yearShort}-${nextYearShort}`;
    }
    else {
        const prevYearShort = (date.getFullYear() - 1).toString().slice(-2);
        return `${prevYearShort}-${yearShort}`;
    }
}
exports.sequenceService = {
    /**
     * Generates the next concurrency-safe, non-reusable document number using atomic database locking.
     */
    async getNextDocumentNumber(companyProfileId, documentType, options) {
        const fiscalYear = getFiscalYear();
        const shortFy = getShortFiscalYear();
        return database_1.prisma.$transaction(async (tx) => {
            // Find or create sequence for company + docType + fiscalYear
            let sequence = await tx.documentSequence.findUnique({
                where: {
                    companyProfileId_documentType_fiscalYear: {
                        companyProfileId,
                        documentType,
                        fiscalYear,
                    },
                },
            });
            if (!sequence) {
                let defaultPrefix = '';
                let defaultPadding = 4;
                if (documentType === 'PO') {
                    defaultPrefix = `PRC/FY${fiscalYear}/`;
                    defaultPadding = 6;
                }
                else if (documentType === 'PI') {
                    defaultPrefix = `PPS/PI/${fiscalYear}/`;
                    defaultPadding = 4;
                }
                else if (documentType === 'QUOTATION') {
                    defaultPrefix = `PPS/QT/${shortFy}/`;
                    defaultPadding = 3;
                }
                else if (documentType === 'ORDER') {
                    defaultPrefix = `PPS/ORD/${fiscalYear}/`;
                    defaultPadding = 4;
                }
                else if (documentType === 'PACKING_LIST') {
                    defaultPrefix = `PPS/PL/${fiscalYear}/`;
                    defaultPadding = 4;
                }
                else if (documentType === 'HARDWARE_ISSUE') {
                    defaultPrefix = `PPS/HIL/${fiscalYear}/`;
                    defaultPadding = 4;
                }
                else {
                    defaultPrefix = `${documentType}/${fiscalYear}/`;
                    defaultPadding = 4;
                }
                sequence = await tx.documentSequence.create({
                    data: {
                        companyProfileId,
                        documentType,
                        fiscalYear,
                        prefix: options?.customPrefix || defaultPrefix,
                        currentNumber: 0,
                        padding: options?.padding ?? defaultPadding,
                    },
                });
            }
            // Increment atomically
            const updated = await tx.documentSequence.update({
                where: { id: sequence.id },
                data: { currentNumber: { increment: 1 } },
            });
            const nextNum = updated.currentNumber;
            const padded = String(nextNum).padStart(updated.padding, '0');
            const formattedNumber = `${updated.prefix}${padded}`;
            return {
                number: formattedNumber,
                sequenceNumber: nextNum,
                fiscalYear,
            };
        });
    },
};
//# sourceMappingURL=sequence.service.js.map