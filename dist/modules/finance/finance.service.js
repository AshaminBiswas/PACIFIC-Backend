"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeService = void 0;
const database_1 = require("../../config/database");
const audit_service_1 = require("../audit/audit.service");
exports.financeService = {
    async listPayments(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.partyId)
            where.partyId = query.partyId;
        if (query.paymentType)
            where.paymentType = query.paymentType;
        const [items, total] = await Promise.all([
            database_1.prisma.payment.findMany({
                where,
                include: {
                    party: true,
                    companyProfile: true,
                    allocations: {
                        include: { proformaInvoice: true },
                    },
                },
                orderBy: { paymentDate: 'desc' },
                skip,
                take: limit,
            }),
            database_1.prisma.payment.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    },
    async getPaymentById(id) {
        const payment = await database_1.prisma.payment.findUnique({
            where: { id },
            include: {
                party: true,
                companyProfile: true,
                allocations: {
                    include: { proformaInvoice: true },
                },
                transactions: true,
            },
        });
        if (!payment)
            throw Object.assign(new Error('Payment not found'), { status: 404 });
        return payment;
    },
    /**
     * Records an immutable payment and allocates it across specified invoices/documents.
     */
    async recordPayment(data, userId) {
        return database_1.prisma.$transaction(async (tx) => {
            let companyProfileId = data.companyProfileId;
            if (!companyProfileId) {
                const defaultCompany = await tx.companyProfile.findFirst({ where: { status: 'ACTIVE' } });
                if (!defaultCompany)
                    throw new Error('No active company profile configured');
                companyProfileId = defaultCompany.id;
            }
            const totalAmount = Math.max(0, Number(data.amount) || 0);
            let remainingUnallocated = totalAmount;
            const allocationsToCreate = [];
            // Process allocations if provided
            if (Array.isArray(data.allocations)) {
                for (const alloc of data.allocations) {
                    const allocAmount = Math.min(remainingUnallocated, Math.max(0, Number(alloc.allocatedAmount) || 0));
                    if (allocAmount > 0) {
                        remainingUnallocated = Math.round((remainingUnallocated - allocAmount) * 100) / 100;
                        allocationsToCreate.push({
                            documentType: alloc.documentType || 'PI',
                            documentId: alloc.documentId,
                            proformaInvoiceId: alloc.documentType === 'PI' ? alloc.documentId : undefined,
                            allocatedAmount: allocAmount,
                        });
                        // Update receivable entry if PI
                        if (alloc.documentType === 'PI') {
                            const rec = await tx.receivableEntry.findFirst({
                                where: { proformaInvoiceId: alloc.documentId },
                            });
                            if (rec) {
                                const newPaid = Math.round((Number(rec.paidAmount) + allocAmount) * 100) / 100;
                                const newBal = Math.max(0, Math.round((Number(rec.totalAmount) - newPaid) * 100) / 100);
                                await tx.receivableEntry.update({
                                    where: { id: rec.id },
                                    data: {
                                        paidAmount: newPaid,
                                        balanceAmount: newBal,
                                        status: newBal === 0 ? 'PAID' : 'PARTIALLY_PAID',
                                    },
                                });
                            }
                        }
                    }
                }
            }
            // Create Payment Record
            const payment = await tx.payment.create({
                data: {
                    companyProfileId,
                    partyId: data.partyId,
                    paymentType: data.paymentType || 'CUSTOMER_PAYMENT',
                    paymentMethod: data.paymentMethod || 'NEFT_RTGS',
                    referenceNumber: data.referenceNumber,
                    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
                    amount: totalAmount,
                    unallocatedAmount: remainingUnallocated,
                    currency: data.currency || 'INR',
                    notes: data.notes,
                    status: 'CONFIRMED',
                    allocations: {
                        create: allocationsToCreate,
                    },
                    transactions: {
                        create: [
                            {
                                accountType: 'ASSET',
                                transactionType: 'DEBIT',
                                amount: totalAmount,
                                description: `Payment received via ${data.paymentMethod || 'NEFT_RTGS'} - Ref: ${data.referenceNumber || 'N/A'}`,
                            },
                        ],
                    },
                },
                include: {
                    allocations: true,
                    party: true,
                },
            });
            await audit_service_1.auditService.log({
                userId,
                action: 'ALLOCATE',
                module: 'Finance',
                entityType: 'Payment',
                entityId: payment.id,
                newData: payment,
            });
            return payment;
        });
    },
    async getReceivables(query) {
        const where = {};
        if (query.status)
            where.status = query.status;
        return database_1.prisma.receivableEntry.findMany({
            where,
            include: {
                customer: {
                    include: { party: true },
                },
                proformaInvoice: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    },
    async getPayables(query) {
        const where = {};
        if (query.status)
            where.status = query.status;
        return database_1.prisma.payableEntry.findMany({
            where,
            include: {
                vendor: {
                    include: { party: true },
                },
                purchaseOrder: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    },
    async getLedgerSummary() {
        const [totalReceivables, totalPayables, paymentsThisMonth] = await Promise.all([
            database_1.prisma.receivableEntry.aggregate({
                _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
            }),
            database_1.prisma.payableEntry.aggregate({
                _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
            }),
            database_1.prisma.payment.aggregate({
                _sum: { amount: true },
                where: {
                    paymentDate: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
        ]);
        return {
            receivables: {
                total: Number(totalReceivables._sum.totalAmount || 0),
                collected: Number(totalReceivables._sum.paidAmount || 0),
                outstanding: Number(totalReceivables._sum.balanceAmount || 0),
            },
            payables: {
                total: Number(totalPayables._sum.totalAmount || 0),
                paid: Number(totalPayables._sum.paidAmount || 0),
                outstanding: Number(totalPayables._sum.balanceAmount || 0),
            },
            monthlyCollections: Number(paymentsThisMonth._sum.amount || 0),
        };
    },
};
//# sourceMappingURL=finance.service.js.map