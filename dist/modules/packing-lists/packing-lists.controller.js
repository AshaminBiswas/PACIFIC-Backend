"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packingListsController = void 0;
const packing_lists_service_1 = require("./packing-lists.service");
exports.packingListsController = {
    async list(req, res, next) {
        try {
            const data = await packing_lists_service_1.packingListsService.list(req.query);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const data = await packing_lists_service_1.packingListsService.getById(req.params.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const data = await packing_lists_service_1.packingListsService.create(req.body, req.user?.id);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const data = await packing_lists_service_1.packingListsService.update(req.params.id, req.body, req.user?.id);
            res.json({ success: true, data, message: 'Packing List updated successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            const data = await packing_lists_service_1.packingListsService.delete(req.params.id, req.user?.id);
            res.json({ success: true, data, message: 'Packing List deleted successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async acknowledge(req, res, next) {
        try {
            const data = await packing_lists_service_1.packingListsService.acknowledge(req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getByToken(req, res, next) {
        try {
            const data = await packing_lists_service_1.packingListsService.getByToken(req.params.token);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async acknowledgeByToken(req, res, next) {
        try {
            const data = await packing_lists_service_1.packingListsService.acknowledgeByToken(req.params.token, req.body);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getPdf(req, res, next) {
        try {
            const html = await packing_lists_service_1.packingListsService.getPdfHtml(req.params.id);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    },
    async listPacketTypes(req, res, next) {
        try {
            const data = await packing_lists_service_1.packingListsService.listPacketTypes();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async addPacketType(req, res, next) {
        try {
            const { name } = req.body;
            if (!name)
                throw new Error('Packet type name is required');
            const data = await packing_lists_service_1.packingListsService.addPacketType(name);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=packing-lists.controller.js.map