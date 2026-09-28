"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const child_process_1 = require("child_process");
const resend_1 = require("resend");
const env_1 = require("../config/env");
class EmailService {
    constructor() {
        this.client = null;
        if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
            this.client = new resend_1.Resend(process.env.RESEND_API_KEY);
        }
    }
    getClient() {
        if (!this.client && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
            this.client = new resend_1.Resend(process.env.RESEND_API_KEY);
        }
        return this.client;
    }
    /**
     * Resilient curl transport: Uses Windows OS native TLS (Schannel), completely immune
     * to Node.js Undici connect timeouts and Cloudflare renegotiation issues.
     */
    sendViaCurl(apiKey, payload) {
        return new Promise((resolve) => {
            try {
                const jsonStr = JSON.stringify(payload);
                const child = (0, child_process_1.execFile)('curl.exe', [
                    '-s',
                    '-X', 'POST',
                    'https://api.resend.com/emails',
                    '-H', `Authorization: Bearer ${apiKey}`,
                    '-H', 'Content-Type: application/json',
                    '--data-binary', '@-',
                ], { maxBuffer: 50 * 1024 * 1024, timeout: 35000 }, (err, stdout, stderr) => {
                    if (err) {
                        return resolve({
                            success: false,
                            error: `curl error: ${err.message || stderr}`,
                        });
                    }
                    try {
                        const data = JSON.parse(stdout);
                        if (data.id) {
                            return resolve({ success: true, id: data.id });
                        }
                        if (data.error || data.message) {
                            const errMsg = typeof data.error === 'object' ? data.error.message : (data.error || data.message);
                            return resolve({ success: false, error: errMsg });
                        }
                        return resolve({ success: false, error: stdout || 'Unknown response from Resend' });
                    }
                    catch {
                        return resolve({ success: false, error: `Invalid response from Resend: ${stdout}` });
                    }
                });
                child.on('error', (spawnErr) => {
                    resolve({ success: false, error: `Failed to spawn curl: ${spawnErr.message}` });
                });
                child.stdin?.write(jsonStr);
                child.stdin?.end();
            }
            catch (err) {
                resolve({ success: false, error: `curl execution failed: ${err.message}` });
            }
        });
    }
    async sendEmail(options) {
        const apiKey = process.env.RESEND_API_KEY || env_1.env.resend?.apiKey;
        const fromAddress = options.from ||
            process.env.RESEND_FROM ||
            env_1.env.resend?.from ||
            'Pacific Products & Solutions <ejaj@pacificproduct.in>';
        if (!apiKey || !apiKey.startsWith('re_')) {
            console.log(`[EmailService (Mock)] To: ${options.to} | Subject: "${options.subject}"`);
            console.log(`[EmailService (Mock)] Set RESEND_API_KEY in .env to send live emails.`);
            return { success: true, id: `mock-${Date.now()}` };
        }
        const payload = {
            from: fromAddress,
            to: Array.isArray(options.to) ? options.to : [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
            reply_to: options.replyTo,
            attachments: options.attachments?.map((att) => ({
                filename: att.filename,
                content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
                contentType: att.contentType,
            })),
        };
        // 1. Primary: Use curl.exe (OS-level SChannel TLS, fast & resilient on Windows)
        const curlResult = await this.sendViaCurl(apiKey, payload);
        if (curlResult.success) {
            console.log(`✅ [EmailService] Email sent via Resend (curl) (ID: ${curlResult.id}) to ${options.to}`);
            return curlResult;
        }
        console.warn(`[EmailService] curl transport failed (${curlResult.error}), attempting fallback to Resend SDK...`);
        // 2. Secondary Fallback: Resend SDK
        try {
            const resend = this.getClient();
            if (resend) {
                const response = await resend.emails.send({
                    from: fromAddress,
                    to: Array.isArray(options.to) ? options.to : [options.to],
                    subject: options.subject,
                    html: options.html,
                    text: options.text,
                    replyTo: options.replyTo,
                    attachments: options.attachments?.map((att) => ({
                        filename: att.filename,
                        content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
                        contentType: att.contentType,
                    })),
                });
                if (response.error) {
                    console.error('[EmailService] Resend SDK returned error:', response.error);
                    return { success: false, error: response.error.message };
                }
                console.log(`✅ [EmailService] Email sent via Resend SDK (ID: ${response.data?.id}) to ${options.to}`);
                return { success: true, id: response.data?.id };
            }
        }
        catch (sdkErr) {
            console.error('[EmailService] Resend SDK threw exception:', sdkErr);
        }
        return {
            success: false,
            error: curlResult.error || 'Failed to dispatch email via Resend',
        };
    }
    // ─── Document-Specific Helpers ──────────────────────────────────────────────
    async sendQuotationEmail(params) {
        const subject = `Pacific Quotation Ref: ${params.quoteNumber} — ${params.projectName || 'Restroom Cubicles Offer'}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background: #070714; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #7FB706; margin: 0; font-size: 20px;">PACIFIC PRODUCTS & SOLUTIONS</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase;">Official Project Quotation</p>
        </div>
        <div style="padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear <strong>${params.clientName}</strong>,</p>
          <p>Thank you for your enquiry with Pacific Products & Solutions. We take pleasure in submitting our formal quotation letter for your project.</p>
          <div style="background: #f8fafc; border-left: 4px solid #7FB706; padding: 12px 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px;"><strong>Quotation Ref:</strong> ${params.quoteNumber}</p>
            ${params.projectName ? `<p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Project:</strong> ${params.projectName}</p>` : ''}
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Offer Value:</strong> ${params.grandTotal}</p>
          </div>
          <p>Our offer includes premium compact solid phenolic laminate partitions and grade SS-304 architectural cubicle fittings.</p>
          <p style="margin-top: 24px;">Please feel free to reach out to our project sales engineering team with any questions.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #64748b; margin: 0;">
            Pacific Products & Solutions | Restroom Cubicles • HPL Lockers • Hardware<br />
            Email: sales@pacificrestroomcubicle.com | Web: https://pacificrestroomcubicle.com
          </p>
        </div>
      </div>
    `;
        return this.sendEmail({ to: params.to, subject, html });
    }
    async sendOrderConfirmationEmail(params) {
        const subject = `Sales Order Confirmed: ${params.orderNumber} — Pacific Products & Solutions`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background: #070714; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #7FB706; margin: 0; font-size: 20px;">PACIFIC PRODUCTS & SOLUTIONS</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase;">Order Confirmation</p>
        </div>
        <div style="padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear <strong>${params.clientName}</strong>,</p>
          <p>We are pleased to confirm receipt of your order. Production scheduling and raw material allocation have commenced.</p>
          <div style="background: #f8fafc; border-left: 4px solid #7FB706; padding: 12px 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px;"><strong>Order Ref:</strong> ${params.orderNumber}</p>
            ${params.customerPoNumber ? `<p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Client PO Ref:</strong> ${params.customerPoNumber}</p>` : ''}
            <p style="margin: 4px 0 0 0; font-size: 13px;"><strong>Total Amount:</strong> ${params.grandTotal}</p>
          </div>
          <p>You can track the dispatch status and digital packing list updates directly through our enterprise portal.</p>
        </div>
      </div>
    `;
        return this.sendEmail({ to: params.to, subject, html });
    }
}
exports.emailService = new EmailService();
//# sourceMappingURL=email.service.js.map