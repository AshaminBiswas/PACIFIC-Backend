"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = void 0;
const database_1 = require("../../config/database");
exports.auditService = {
    async log(params) {
        try {
            let safeUserId = null;
            if (params.userId) {
                try {
                    const userExists = await database_1.prisma.user.findUnique({
                        where: { id: params.userId },
                        select: { id: true },
                    });
                    if (userExists)
                        safeUserId = userExists.id;
                }
                catch {
                    safeUserId = null;
                }
            }
            return await database_1.prisma.auditLog.create({
                data: {
                    userId: safeUserId,
                    action: params.action,
                    module: params.module,
                    entityType: params.entityType,
                    entityId: params.entityId,
                    oldData: params.oldData ? JSON.parse(JSON.stringify(params.oldData)) : undefined,
                    newData: params.newData ? JSON.parse(JSON.stringify(params.newData)) : undefined,
                    ipAddress: params.ipAddress,
                    userAgent: params.userAgent,
                },
            });
        }
        catch (err) {
            console.error('[auditService] Failed to record audit log:', err);
            // Non-blocking: audit failure should not break main transaction unless required
            return null;
        }
    },
    async logMutation(params) {
        return this.log(params);
    },
    async list(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.module)
            where.module = query.module;
        if (query.action)
            where.action = query.action;
        if (query.entityType)
            where.entityType = query.entityType;
        const [items, total] = await Promise.all([
            database_1.prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true, role: true },
                    },
                },
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit,
            }),
            database_1.prisma.auditLog.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    },
};
//# sourceMappingURL=audit.service.js.map