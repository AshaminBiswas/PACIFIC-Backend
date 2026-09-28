"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardwareIssueController = void 0;
const hardware_issue_service_1 = require("./hardware-issue.service");
exports.hardwareIssueController = {
    // Master Catalog
    async listCatalog(req, res, next) {
        try {
            const data = await hardware_issue_service_1.hardwareIssueService.listCatalog(req.query.category);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createCatalogItem(req, res, next) {
        try {
            const data = await hardware_issue_service_1.hardwareIssueService.createCatalogItem(req.body);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateCatalogItem(req, res, next) {
        try {
            const data = await hardware_issue_service_1.hardwareIssueService.updateCatalogItem(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    // Issue Lists
    async listIssues(req, res, next) {
        try {
            const data = await hardware_issue_service_1.hardwareIssueService.listIssues(req.query);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getIssueById(req, res, next) {
        try {
            const data = await hardware_issue_service_1.hardwareIssueService.getIssueById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async createIssue(req, res, next) {
        try {
            const data = await hardware_issue_service_1.hardwareIssueService.createIssue(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async updateIssue(req, res, next) {
        try {
            const data = await hardware_issue_service_1.hardwareIssueService.updateIssue(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data, message: 'Hardware issue list updated successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteIssue(req, res, next) {
        try {
            const data = await hardware_issue_service_1.hardwareIssueService.deleteIssue(req.params.id, req.user?.id);
            res.json({ success: true, data, message: 'Hardware issue list deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async signStep(req, res, next) {
        try {
            const { role, name } = req.body;
            if (!role || !name) {
                throw new Error('Sign-off role and signatory name are required');
            }
            const data = await hardware_issue_service_1.hardwareIssueService.signStep(req.params.id, role, name);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getPdf(req, res, next) {
        try {
            const html = await hardware_issue_service_1.hardwareIssueService.getPdfHtml(req.params.id);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=hardware-issue.controller.js.map