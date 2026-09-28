"use strict";
/**
 * Number to Words Converter for Pacific Restroom Cubicle (PRC)
 * Supports INR (Lakhs / Crores / Rupees / Paise) and AED (Millions / Thousands / Dirhams / Fils)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.numberToWords = numberToWords;
const ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
];
const TENS = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];
function convertBelowThousand(n) {
    let str = '';
    if (n >= 100) {
        str += ONES[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
    }
    if (n >= 20) {
        str += TENS[Math.floor(n / 10)] + ' ';
        n %= 10;
    }
    if (n > 0) {
        str += ONES[n] + ' ';
    }
    return str.trim();
}
/**
 * Converts Indian format (Crores, Lakhs, Thousands, Hundreds)
 */
function convertInr(num) {
    if (num === 0)
        return 'Zero';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;
    let result = '';
    if (crore > 0) {
        result += convertBelowThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
        result += convertBelowThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
        result += convertBelowThousand(thousand) + ' Thousand ';
    }
    if (remainder > 0) {
        result += convertBelowThousand(remainder);
    }
    return result.trim();
}
/**
 * Converts International format (Billions, Millions, Thousands, Hundreds)
 */
function convertInternational(num) {
    if (num === 0)
        return 'Zero';
    const billion = Math.floor(num / 1000000000);
    num %= 1000000000;
    const million = Math.floor(num / 1000000);
    num %= 1000000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;
    let result = '';
    if (billion > 0) {
        result += convertBelowThousand(billion) + ' Billion ';
    }
    if (million > 0) {
        result += convertBelowThousand(million) + ' Million ';
    }
    if (thousand > 0) {
        result += convertBelowThousand(thousand) + ' Thousand ';
    }
    if (remainder > 0) {
        result += convertBelowThousand(remainder);
    }
    return result.trim();
}
function numberToWords(amount, currency = 'INR') {
    if (isNaN(amount) || amount === null || amount === undefined)
        return '';
    const cleanAmount = Math.abs(Number(amount));
    const wholePart = Math.floor(cleanAmount);
    const decimalPart = Math.round((cleanAmount - wholePart) * 100);
    const curr = currency.toUpperCase();
    if (curr === 'AED') {
        const wholeStr = convertInternational(wholePart);
        let words = `${wholeStr} Dirham${wholePart === 1 ? '' : 's'}`;
        if (decimalPart > 0) {
            const decStr = convertBelowThousand(decimalPart);
            words += ` and ${decStr} Fil${decimalPart === 1 ? '' : 's'}`;
        }
        return `${words} Only`;
    }
    // Default: INR
    const wholeStr = convertInr(wholePart);
    let words = `${wholeStr} Rupees`;
    if (decimalPart > 0) {
        const decStr = convertInr(decimalPart);
        words += ` and ${decStr} Paise`;
    }
    return `${words} Only`;
}
//# sourceMappingURL=numberToWords.js.map