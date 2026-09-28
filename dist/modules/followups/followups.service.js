"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.followupsService = void 0;
const database_1 = require("../../config/database");
const audit_service_1 = require("../audit/audit.service");
exports.followupsService = {
    async list(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.customerId)
            where.customerId = query.customerId;
        if (query.followupStatus)
            where.followupStatus = query.followupStatus;
        if (query.priority)
            where.priority = query.priority;
        if (query.assignedUserId)
            where.assignedUserId = query.assignedUserId;
        const [items, total] = await Promise.all([
            database_1.prisma.paymentFollowup.findMany({
                where,
                include: {
                    customer: true,
                    proformaInvoice: true,
                    assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
                    logs: {
                        include: { user: { select: { id: true, firstName: true, lastName: true } } },
                        orderBy: { createdAt: 'desc' },
                    },
                    reminders: {
                        orderBy: { reminderDate: 'asc' },
                    },
                },
                orderBy: { nextFollowupDate: 'asc' },
                skip,
                take: limit,
            }),
            database_1.prisma.paymentFollowup.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    },
    async getById(id) {
        const followup = await database_1.prisma.paymentFollowup.findUnique({
            where: { id },
            include: {
                customer: {
                    include: { contacts: true },
                },
                proformaInvoice: true,
                assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
                logs: {
                    include: { user: { select: { id: true, firstName: true, lastName: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                reminders: true,
            },
        });
        if (!followup)
            throw Object.assign(new Error('Follow-up not found'), { status: 404 });
        return followup;
    },
    async getByCustomer(customerId) {
        const followup = await database_1.prisma.paymentFollowup.findFirst({
            where: { customerId },
            include: {
                customer: {
                    include: { contacts: true, addresses: true, customerProfile: true },
                },
                proformaInvoice: true,
                assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
                logs: {
                    include: { user: { select: { id: true, firstName: true, lastName: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                reminders: {
                    orderBy: { reminderDate: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return followup;
    },
    async create(data, userId) {
        const followup = await database_1.prisma.paymentFollowup.create({
            data: {
                customerId: data.customerId,
                proformaInvoiceId: data.proformaInvoiceId,
                outstandingAmount: Number(data.outstandingAmount) || 0,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                followupStatus: data.followupStatus || 'PENDING',
                priority: data.priority || 'MEDIUM',
                assignedUserId: data.assignedUserId || userId,
                nextFollowupDate: data.nextFollowupDate ? new Date(data.nextFollowupDate) : undefined,
                promisedPaymentDate: data.promisedPaymentDate ? new Date(data.promisedPaymentDate) : undefined,
                promisedAmount: data.promisedAmount ? Number(data.promisedAmount) : undefined,
                notes: data.notes,
                communicationChannel: data.communicationChannel || 'PHONE',
                logs: data.initialNote
                    ? {
                        create: {
                            userId,
                            notes: data.initialNote,
                            response: data.customerResponse,
                        },
                    }
                    : undefined,
            },
            include: {
                customer: true,
                logs: true,
            },
        });
        await audit_service_1.auditService.log({
            userId,
            action: 'CREATE',
            module: 'Finance',
            entityType: 'PaymentFollowup',
            entityId: followup.id,
            newData: followup,
        });
        return followup;
    },
    async addLog(followupId, logData, userId) {
        return database_1.prisma.$transaction(async (tx) => {
            const log = await tx.paymentFollowupLog.create({
                data: {
                    followupId,
                    userId,
                    notes: logData.notes,
                    response: logData.response,
                },
            });
            const updateData = {};
            if (logData.followupStatus)
                updateData.followupStatus = logData.followupStatus;
            if (logData.nextFollowupDate)
                updateData.nextFollowupDate = new Date(logData.nextFollowupDate);
            if (logData.promisedPaymentDate)
                updateData.promisedPaymentDate = new Date(logData.promisedPaymentDate);
            if (logData.promisedAmount !== undefined)
                updateData.promisedAmount = Number(logData.promisedAmount);
            const updated = await tx.paymentFollowup.update({
                where: { id: followupId },
                data: updateData,
                include: { logs: true },
            });
            return { log, followup: updated };
        });
    },
    /**
     * Dues Recovery Dashboard Statistics
     */
    async getRecoveryDashboard() {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
        const [allFollowups, promises, collections] = await Promise.all([
            database_1.prisma.paymentFollowup.findMany({
                where: { followupStatus: { not: 'RESOLVED' } },
            }),
            database_1.prisma.paymentFollowup.aggregate({
                where: {
                    promisedAmount: { not: null },
                    followupStatus: 'PROMISED_TO_PAY',
                },
                _sum: { promisedAmount: true },
                _count: true,
            }),
            database_1.prisma.payment.aggregate({
                _sum: { amount: true },
                where: {
                    paymentDate: { gte: startOfToday },
                },
            }),
        ]);
        let totalOutstanding = 0;
        let overdueAmount = 0;
        let dueTodayCount = 0;
        let dueThisWeekCount = 0;
        let pendingCount = 0;
        allFollowups.forEach((f) => {
            const amt = Number(f.outstandingAmount) || 0;
            totalOutstanding += amt;
            if (f.dueDate && new Date(f.dueDate) < now) {
                overdueAmount += amt;
            }
            if (f.nextFollowupDate) {
                const next = new Date(f.nextFollowupDate);
                if (next >= startOfToday && next <= endOfToday)
                    dueTodayCount++;
                else if (next >= startOfToday && next <= endOfWeek)
                    dueThisWeekCount++;
            }
            if (f.followupStatus === 'PENDING')
                pendingCount++;
        });
        return {
            totalOutstanding,
            overdueAmount,
            dueTodayCount,
            dueThisWeekCount,
            promiseToPayCount: promises._count,
            promiseToPayAmount: Number(promises._sum.promisedAmount || 0),
            pendingFollowupsCount: pendingCount,
            collectedToday: Number(collections._sum.amount || 0),
        };
    },
};
//# sourceMappingURL=followups.service.js.map