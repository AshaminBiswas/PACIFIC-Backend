export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}
declare class EmailService {
    private client;
    constructor();
    private getClient;
    /**
     * Resilient curl transport: Uses Windows OS native TLS (Schannel), completely immune
     * to Node.js Undici connect timeouts and Cloudflare renegotiation issues.
     */
    private sendViaCurl;
    sendEmail(options: SendEmailOptions): Promise<{
        success: boolean;
        id?: string;
        error?: string;
    }>;
    sendQuotationEmail(params: {
        to: string;
        clientName: string;
        quoteNumber: string;
        projectName?: string;
        grandTotal: string;
        pdfHtml?: string;
    }): Promise<{
        success: boolean;
        id?: string;
        error?: string;
    }>;
    sendOrderConfirmationEmail(params: {
        to: string;
        clientName: string;
        orderNumber: string;
        customerPoNumber?: string;
        grandTotal: string;
    }): Promise<{
        success: boolean;
        id?: string;
        error?: string;
    }>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=email.service.d.ts.map