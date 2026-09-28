"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsService = void 0;
const database_1 = require("../../config/database");
exports.leadsService = {
    async list(query) {
        const { page, limit, status, source, search } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (source)
            where.source = source;
        if (search)
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
            ];
        const [items, total] = await Promise.all([
            database_1.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            database_1.prisma.lead.count({ where }),
        ]);
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
    async getById(id) {
        const lead = await database_1.prisma.lead.findUnique({
            where: { id },
            include: { quotations: true, configuratorDesigns: true },
        });
        if (!lead)
            throw Object.assign(new Error('Lead not found'), { status: 404 });
        return lead;
    },
    async create(data) {
        return database_1.prisma.lead.create({ data: { ...data, tags: data.tags || [] } });
    },
    async update(id, data) {
        return database_1.prisma.lead.update({ where: { id }, data });
    },
    async delete(id) {
        return database_1.prisma.lead.delete({ where: { id } });
    },
    async getStats() {
        const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'WON', 'LOST'];
        const counts = await Promise.all(statuses.map((status) => database_1.prisma.lead.count({ where: { status: status } })));
        return Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
    },
};
//# sourceMappingURL=leads.service.js.map