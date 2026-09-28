"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotationsController = void 0;
const quotations_service_1 = require("./quotations.service");
const htmlToPdf_1 = require("../../utils/htmlToPdf");
exports.quotationsController = {
    async list(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.list(req.query);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.getById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.create(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.update(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            await quotations_service_1.quotationsService.delete(req.params.id, req.user?.id);
            res.json({ success: true, message: 'Sales Quotation deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async revise(req, res, next) {
        try {
            const { reason, ...updateData } = req.body;
            const data = await quotations_service_1.quotationsService.revise(req.params.id, updateData, reason, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async send(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.send(req.params.id, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async sendEmail(req, res, next) {
        try {
            const result = await quotations_service_1.quotationsService.sendEmail(req.params.id, req.body, req.user?.id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    },
    async getFollowups(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.getFollowups(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createFollowup(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.createFollowup(req.params.id, req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async sendFollowupEmail(req, res, next) {
        try {
            const result = await quotations_service_1.quotationsService.sendFollowupEmail(req.params.id, req.body, req.user?.id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    },
    async convertToPI(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.convertToPI(req.params.id, req.user?.id);
            res.json({ success: true, data, message: 'Proforma Invoice generated from Quotation' });
        }
        catch (err) {
            next(err);
        }
    },
    async convertToOrder(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.convertToOrder(req.params.id, req.user?.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getPdf(req, res, next) {
        try {
            const html = await quotations_service_1.quotationsService.getPdfHtml(req.params.id);
            if (req.query.download === 'true') {
                const quote = await quotations_service_1.quotationsService.getById(req.params.id);
                const pdfBuffer = await (0, htmlToPdf_1.htmlToPdfBuffer)(html);
                const refName = (quote.referenceNumber || quote.quotationNumber || req.params.id).replace(/[\/\\]/g, '_');
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Quotation_${refName}.pdf"`);
                res.send(pdfBuffer);
                return;
            }
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    },
    async listTemplates(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.listTemplates(req.query.category);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async saveTemplate(req, res, next) {
        try {
            const data = await quotations_service_1.quotationsService.saveTemplate(req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=quotations.controller.js.map