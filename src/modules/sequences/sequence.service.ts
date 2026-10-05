import { prisma } from '../../config/database';

export function getFiscalYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 3 = Apr
  if (month >= 3) {
    const nextYear = (year + 1).toString().slice(-2);
    return `${year}-${nextYear}`;
  } else {
    const prevYear = year - 1;
    const currYearShort = year.toString().slice(-2);
    return `${prevYear}-${currYearShort}`;
  }
}

export function getShortFiscalYear(date: Date = new Date()): string {
  const yearShort = date.getFullYear().toString().slice(-2);
  const month = date.getMonth();
  if (month >= 3) {
    const nextYearShort = (date.getFullYear() + 1).toString().slice(-2);
    return `${yearShort}-${nextYearShort}`;
  } else {
    const prevYearShort = (date.getFullYear() - 1).toString().slice(-2);
    return `${prevYearShort}-${yearShort}`;
  }
}

export type DocumentSequenceType =
  | 'PO'
  | 'PI'
  | 'SO'
  | 'INV'
  | 'QUOTATION'
  | 'ORDER'
  | 'PACKING_LIST'
  | 'HARDWARE_ISSUE';

export const sequenceService = {
  /**
   * Generates the next concurrency-safe, non-reusable document number using atomic database locking.
   * Supports branch-specific prefixing (e.g. PPSK/QT/<current_year>/00001 for Kolkata vs PPS/... for Main branch).
   */
  async getNextDocumentNumber(
    companyProfileId: string,
    documentType: DocumentSequenceType,
    options?: { customPrefix?: string; padding?: number; isKolkata?: boolean; branch?: string }
  ): Promise<{ number: string; sequenceNumber: number; fiscalYear: string }> {
    const fiscalYear = getFiscalYear();
    const shortFy = getShortFiscalYear();

    return prisma.$transaction(async (tx) => {
      // Check company profile to detect Kolkata branch vs Main branch
      const company = await tx.companyProfile.findUnique({
        where: { id: companyProfileId },
        select: { id: true, entityCode: true, stateCode: true, state: true, companyName: true, legalName: true },
      });

      const isKolkata = Boolean(
        options?.isKolkata ||
        options?.branch?.toUpperCase() === 'KOLKATA' ||
        (company && (
          company.entityCode === 'PPS-KOL' ||
          company.entityCode === 'PRC-KOL' ||
          company.stateCode === '19' ||
          company.state?.toLowerCase().includes('bengal') ||
          company.companyName?.toLowerCase().includes('kolkata') ||
          company.legalName?.toLowerCase().includes('kolkata')
        ))
      );

      // Determine default prefix and padding based on branch and doc type
      let defaultPrefix = '';
      let defaultPadding = 4;

      if (isKolkata) {
        // Kolkata Branch official prefix standard: PPSK/<DOC>/<YEAR>/00001 (5 digits padding)
        defaultPadding = 5;
        if (documentType === 'QUOTATION') {
          defaultPrefix = `PPSK/QT/${fiscalYear}/`;
        } else if (documentType === 'PI') {
          defaultPrefix = `PPSK/PI/${fiscalYear}/`;
        } else if (documentType === 'ORDER' || documentType === 'SO') {
          defaultPrefix = `PPSK/SO/${fiscalYear}/`;
        } else if (documentType === 'INV') {
          defaultPrefix = `PPSK/INV/${fiscalYear}/`;
        } else if (documentType === 'PACKING_LIST') {
          defaultPrefix = `PPSK/PL/${fiscalYear}/`;
        } else if (documentType === 'HARDWARE_ISSUE') {
          defaultPrefix = `PPSK/HIL/${fiscalYear}/`;
        } else if (documentType === 'PO') {
          defaultPrefix = `PPSK/PO/${fiscalYear}/`;
        } else {
          defaultPrefix = `PPSK/${documentType}/${fiscalYear}/`;
        }
      } else {
        // Main Branch (Delhi HQ)
        if (documentType === 'PO') {
          defaultPrefix = `PRC/FY${fiscalYear}/`;
          defaultPadding = 6;
        } else if (documentType === 'PI') {
          defaultPrefix = `PPS/PI/${fiscalYear}/`;
          defaultPadding = 4;
        } else if (documentType === 'QUOTATION') {
          defaultPrefix = `PPS/QT/${shortFy}/`;
          defaultPadding = 3;
        } else if (documentType === 'ORDER' || documentType === 'SO') {
          defaultPrefix = `PPS/ORD/${fiscalYear}/`;
          defaultPadding = 4;
        } else if (documentType === 'INV') {
          defaultPrefix = `PPS/INV/${shortFy}/`;
          defaultPadding = 4;
        } else if (documentType === 'PACKING_LIST') {
          defaultPrefix = `PPS/PL/${fiscalYear}/`;
          defaultPadding = 4;
        } else if (documentType === 'HARDWARE_ISSUE') {
          defaultPrefix = `PPS/HIL/${fiscalYear}/`;
          defaultPadding = 4;
        } else {
          defaultPrefix = `${documentType}/${fiscalYear}/`;
          defaultPadding = 4;
        }
      }

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

      const targetPrefix = options?.customPrefix || defaultPrefix;
      const targetPadding = options?.padding ?? defaultPadding;

      if (!sequence) {
        sequence = await tx.documentSequence.create({
          data: {
            companyProfileId,
            documentType,
            fiscalYear,
            prefix: targetPrefix,
            currentNumber: 0,
            padding: targetPadding,
          },
        });
      } else if (isKolkata && !sequence.prefix.startsWith('PPSK/')) {
        // Sync prefix and padding if existing record was created under legacy default
        sequence = await tx.documentSequence.update({
          where: { id: sequence.id },
          data: {
            prefix: targetPrefix,
            padding: targetPadding,
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
