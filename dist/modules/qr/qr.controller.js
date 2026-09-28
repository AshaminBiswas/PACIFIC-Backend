"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrController = void 0;
const qr_service_1 = require("./qr.service");
const database_1 = require("../../config/database");
exports.qrController = {
    /**
     * Admin Scan Handler — called when admin scans any QR code via camera or manual entry.
     */
    async scan(req, res, next) {
        try {
            const { payload } = req.body;
            if (!payload) {
                res.status(400).json({ success: false, message: 'Scanned payload or token is required' });
                return;
            }
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];
            const result = await qr_service_1.qrService.handleAdminScan(payload, req.user?.id, ip, userAgent);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Public Document Verification — safe, non-guessable, never exposes internal database IDs.
     */
    async verifyPublicToken(req, res, next) {
        try {
            const { token } = req.params;
            const result = await qr_service_1.qrService.verifyPublicToken(token);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Generate QR code for a given entity
     */
    async generate(req, res, next) {
        try {
            const { entityType, entityId } = req.body;
            if (!entityType || !entityId) {
                res.status(400).json({ success: false, message: 'entityType and entityId are required' });
                return;
            }
            const token = qr_service_1.qrService.generateToken(entityType, entityId);
            const qrData = `http://localhost:5176/verify/${token}`;
            const qr = await database_1.prisma.qrCode.create({
                data: {
                    entityType,
                    entityId,
                    token,
                    qrData,
                    status: 'ACTIVE',
                },
            });
            res.status(201).json({ success: true, data: qr });
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * Scan history
     */
    async getScanHistory(_req, res, next) {
        try {
            const logs = await database_1.prisma.qrScanLog.findMany({
                orderBy: { scannedAt: 'desc' },
                take: 50,
            });
            res.json({ success: true, data: logs });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=qr.controller.js.map