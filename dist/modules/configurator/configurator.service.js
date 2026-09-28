"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configuratorService = void 0;
const database_1 = require("../../config/database");
exports.configuratorService = {
    async list(query) {
        const { page, limit, status } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        const [items, total] = await Promise.all([
            database_1.prisma.configuratorDesign.findMany({
                where,
                include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            database_1.prisma.configuratorDesign.count({ where }),
        ]);
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
    async getById(id) {
        const design = await database_1.prisma.configuratorDesign.findUnique({
            where: { id },
            include: { lead: true, quotations: true },
        });
        if (!design)
            throw Object.assign(new Error('Design not found'), { status: 404 });
        return design;
    },
    async submit(data) {
        return database_1.prisma.configuratorDesign.create({ data, include: { lead: true } });
    },
    async updateStatus(id, status) {
        return database_1.prisma.configuratorDesign.update({ where: { id }, data: { status: status } });
    },
    async delete(id) {
        return database_1.prisma.configuratorDesign.delete({ where: { id } });
    },
};
//# sourceMappingURL=configurator.service.js.map