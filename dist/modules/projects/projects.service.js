"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsService = void 0;
const database_1 = require("../../config/database");
exports.projectsService = {
    async list(query) {
        const { page, limit, status, search } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (search)
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { clientCompany: { contains: search, mode: 'insensitive' } },
            ];
        const [items, total] = await Promise.all([
            database_1.prisma.commercialProject.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            database_1.prisma.commercialProject.count({ where }),
        ]);
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
    async getById(id) {
        const project = await database_1.prisma.commercialProject.findUnique({ where: { id }, include: { invoices: true, assignedTo: { select: { id: true, firstName: true, lastName: true } } } });
        if (!project)
            throw Object.assign(new Error('Project not found'), { status: 404 });
        return project;
    },
    async create(data, userId) {
        return database_1.prisma.commercialProject.create({ data: { ...data, images: data.images || [], tags: data.tags || [], assignedToId: data.assignedToId || userId } });
    },
    async update(id, data) {
        return database_1.prisma.commercialProject.update({ where: { id }, data });
    },
    async delete(id) {
        return database_1.prisma.commercialProject.delete({ where: { id } });
    },
};
//# sourceMappingURL=projects.service.js.map