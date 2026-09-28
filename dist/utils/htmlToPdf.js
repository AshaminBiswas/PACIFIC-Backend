"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlToPdfBuffer = htmlToPdfBuffer;
const puppeteer_1 = __importDefault(require("puppeteer"));
/**
 * Converts an HTML string to a PDF Buffer using headless Chromium (puppeteer).
 * The resulting buffer is a valid PDF file suitable for email attachments.
 */
async function htmlToPdfBuffer(html) {
    const browser = await puppeteer_1.default.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    });
    try {
        const page = await browser.newPage();
        // Set the HTML content — wait for 'load' then give fonts/images a moment to settle
        await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
        // Small delay to allow any remaining layout reflows
        await new Promise((r) => setTimeout(r, 500));
        // Generate A4 PDF matching the @page { size: A4; margin: 8mm } in the template
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
            printBackground: true,
        });
        return Buffer.from(pdfBuffer);
    }
    finally {
        await browser.close();
    }
}
//# sourceMappingURL=htmlToPdf.js.map