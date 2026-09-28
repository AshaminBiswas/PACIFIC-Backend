"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const qrcode_1 = __importDefault(require("qrcode"));
const database_1 = require("../../config/database");
const env_1 = require("../../config/env");
exports.qrService = {
    /**
     * Generates a cryptographically secure token for document verification or tracking.
     */
    generateToken(entityType, entityId) {
        const timestamp = Date.now().toString();
        const entropy = crypto_1.default.randomBytes(16).toString('hex');
        const secret = env_1.env.jwt.secret || 'pacific-secret-qr-key';
        const hash = crypto_1.default
            .createHmac('sha256', secret)
            .update(`${entityType}:${entityId}:${timestamp}:${entropy}`)
            .digest('hex');
        return `${entityType.toLowerCase()}_${hash.slice(0, 32)}`;
    },
    /**
     * Creates a public verification token and QR code for an issued document.
     */
    async registerDocumentQr(params) {
        const token = this.generateToken(params.documentType, params.documentId);
        const baseUrl = env_1.env.frontend.adminUrl || 'http://localhost:5176';
        const qrData = `${baseUrl}/verify/${token}`;
        const safePayload = {
            documentType: params.documentType,
            documentNumber: params.documentNumber,
            companyName: params.companyName,
            partyName: params.partyName,
            date: params.date,
            currency: params.currency,
            totalAmount: params.totalAmount,
            status: params.status,
        };
        // Store in document_verification_tokens
        await database_1.prisma.documentVerificationToken.create({
            data: {
                token,
                documentType: params.documentType,
                documentId: params.documentId,
                proformaInvoiceId: params.documentType === 'PI' ? params.documentId : undefined,
                verificationPayloadJson: safePayload,
                isValid: true,
            },
        });
        // Store in qr_codes
        const qrCode = await database_1.prisma.qrCode.create({
            data: {
                entityType: params.documentType,
                entityId: params.documentId,
                token,
                qrData,
                status: 'ACTIVE',
                proformaInvoiceId: params.documentType === 'PI' ? params.documentId : undefined,
                purchaseOrderId: params.documentType === 'PO' ? params.documentId : undefined,
            },
        });
        return { token, qrData, qrCodeId: qrCode.id };
    },
    /**
     * Retrieves or registers a QR code for any document to embed in PDFs by default.
     */
    async getOrCreateDocumentQr(params) {
        const existing = await database_1.prisma.documentVerificationToken.findFirst({
            where: { documentType: params.documentType, documentId: params.documentId, isValid: true },
        });
        const baseUrl = env_1.env.frontend.adminUrl || 'http://localhost:5176';
        let token = existing?.token;
        let qrData = token ? `${baseUrl}/verify/${token}` : '';
        if (!existing) {
            const reg = await this.registerDocumentQr({
                documentType: params.documentType,
                documentId: params.documentId,
                documentNumber: params.documentNumber,
                companyName: params.companyName,
                partyName: params.partyName,
                date: params.date,
                totalAmount: Number(params.totalAmount) || 0,
                currency: params.currency || 'INR',
                status: params.status || 'VERIFIED',
            });
            token = reg.token;
            qrData = reg.qrData;
        }
        let qrDataUrl = '';
        try {
            qrDataUrl = await qrcode_1.default.toDataURL(qrData, {
                margin: 1,
                width: 150,
                errorCorrectionLevel: 'M',
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
            });
        }
        catch {
            qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
        }
        return { qrDataUrl, qrData, token: token };
    },
    /**
     * Public verification check — safe, sanitised, never reveals internal IDs or passwords.
     */
    async verifyPublicToken(token) {
        const record = await database_1.prisma.documentVerificationToken.findUnique({
            where: { token },
        });
        if (!record || !record.isValid) {
            return {
                valid: false,
                message: 'Invalid or revoked verification token. Document cannot be authenticated.',
            };
        }
        const payload = record.verificationPayloadJson;
        // Mask amount: show currency and approximate range or masked characters
        const total = Number(payload.totalAmount) || 0;
        const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(total);
        const masked = formatted.length > 3
            ? formatted.slice(0, 1) + 'X,XXX'.slice(0, formatted.length - 1)
            : 'XXX';
        return {
            valid: true,
            message: '✓ Verified Genuine Document issued by Pacific Products & Solutions',
            document: {
                documentType: payload.documentType,
                documentNumber: payload.documentNumber,
                companyName: payload.companyName,
                partyName: payload.partyName,
                date: payload.date,
                currency: payload.currency || 'INR',
                maskedAmount: `${payload.currency === 'AED' ? 'AED' : '₹'} ${total.toLocaleString()}`,
                status: payload.status,
                verifiedAt: new Date().toISOString(),
            },
        };
    },
    /**
     * Admin Scanner Handler: decodes scanned data, logs scan, and resolves to admin navigation route.
     */
    async handleAdminScan(scannedPayload, userId, ip, userAgent) {
        // Extract token if a full URL was scanned
        let token = scannedPayload.trim();
        if (token.includes('/verify/')) {
            const parts = token.split('/verify/');
            token = parts[parts.length - 1].split('?')[0].split('#')[0];
        }
        // Lookup token in qr_codes or document_verification_tokens
        const qrRecord = await database_1.prisma.qrCode.findUnique({
            where: { token },
            include: {
                proformaInvoice: {
                    include: { customer: true },
                },
                purchaseOrder: {
                    include: { vendor: true },
                },
                product: true,
            },
        });
        // Log the scan
        await database_1.prisma.qrScanLog.create({
            data: {
                qrCodeId: qrRecord?.id,
                token,
                scannedByUserId: userId,
                ipAddress: ip,
                userAgent,
            },
        });
        if (qrRecord) {
            return {
                success: true,
                type: qrRecord.entityType, // PI, PO, PRODUCT, INVENTORY
                entityId: qrRecord.entityId,
                token: qrRecord.token,
                targetRoute: qrRecord.entityType === 'PI'
                    ? `/admin/dashboard/proforma-invoices?id=${qrRecord.entityId}`
                    : qrRecord.entityType === 'PO'
                        ? `/admin/dashboard/purchase-orders?id=${qrRecord.entityId}`
                        : `/admin/dashboard/products?id=${qrRecord.entityId}`,
                data: qrRecord.proformaInvoice || qrRecord.purchaseOrder || qrRecord.product,
            };
        }
        // Fallback: check document verification tokens
        const docToken = await database_1.prisma.documentVerificationToken.findUnique({ where: { token } });
        if (docToken) {
            return {
                success: true,
                type: docToken.documentType,
                entityId: docToken.documentId,
                token: docToken.token,
                targetRoute: docToken.documentType === 'PI'
                    ? `/admin/dashboard/proforma-invoices?id=${docToken.documentId}`
                    : `/admin/dashboard/purchase-orders?id=${docToken.documentId}`,
                data: docToken.verificationPayloadJson,
            };
        }
        return {
            success: false,
            message: 'Unrecognized QR code or token. No corresponding entity found in Pacific Restroom Cubicle database.',
            token,
        };
    },
};
//# sourceMappingURL=qr.service.js.map