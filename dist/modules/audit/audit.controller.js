"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditController = void 0;
const audit_service_1 = require("./audit.service");
exports.auditController = {
    async list(req, res, next) {
        try {
            const data = await audit_service_1.auditService.list({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                module: req.query.module,
                action: req.query.action,
                entityType: req.query.entityType,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=audit.controller.js.map