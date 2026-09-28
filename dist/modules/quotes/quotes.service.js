"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotesService = void 0;
const database_1 = require("../../config/database");
function generateNumber(prefix) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${year}${month}-${rand}`;
}
exports.quotesService = {
    async list(query) {
        const { page, limit, status, leadId } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (leadId)
            where.leadId = leadId;
        const [items, total] = await Promise.all([
            database_1.prisma.quotation.findMany({
                where,
                include: {
                    lead: { select: { id: true, firstName: true, lastName: true, email: true } },
                    items: { include: { product: { select: { id: true, name: true } } } },
                    createdBy: { select: { id: true, firstName: true, lastName: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            database_1.prisma.quotation.count({ where }),
        ]);
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
    async getById(id) {
        const quote = await database_1.prisma.quotation.findUnique({
            where: { id },
            include: { lead: true, design: true, items: { include: { product: true } }, invoice: true, createdBy: true },
        });
        if (!quote)
            throw Object.assign(new Error('Quotation not found'), { status: 404 });
        return quote;
    },
    async create(data, userId) {
        const quoteNumber = generateNumber('QT');
        const items = data.items || [];
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxAmount = data.taxAmount || 0;
        const discountAmount = data.discountAmount || 0;
        const totalAmount = subtotal + taxAmount - discountAmount;
        return database_1.prisma.quotation.create({
            data: {
                quoteNumber,
                leadId: data.leadId,
                designId: data.designId,
                createdById: userId,
                status: 'DRAFT',
                validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
                subtotal,
                taxAmount,
                discountAmount,
                totalAmount,
                notes: data.notes,
                terms: data.terms,
                items: {
                    create: items.map((item) => ({
                        productId: item.productId,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.quantity * item.unitPrice,
                        notes: item.notes,
                    })),
                },
            },
            include: { items: true, lead: true },
        });
    },
    async update(id, data) {
        const existing = await database_1.prisma.quotation.findUnique({ where: { id } });
        if (!existing)
            throw Object.assign(new Error('Quotation not found'), { status: 404 });
        const updateData = {};
        if (data.status)
            updateData.status = data.status;
        if (data.validUntil)
            updateData.validUntil = new Date(data.validUntil);
        if (data.notes !== undefined)
            updateData.notes = data.notes;
        if (data.terms !== undefined)
            updateData.terms = data.terms;
        if (data.taxAmount !== undefined)
            updateData.taxAmount = Number(data.taxAmount);
        if (data.discountAmount !== undefined)
            updateData.discountAmount = Number(data.discountAmount);
        if (data.items && Array.isArray(data.items)) {
            await database_1.prisma.quotationItem.deleteMany({ where: { quotationId: id } });
            const subtotal = data.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
            updateData.subtotal = subtotal;
            const tax = updateData.taxAmount !== undefined ? updateData.taxAmount : Number(existing.taxAmount || 0);
            const discount = updateData.discountAmount !== undefined ? updateData.discountAmount : Number(existing.discountAmount || 0);
            updateData.totalAmount = subtotal + tax - discount;
            await database_1.prisma.quotationItem.createMany({
                data: data.items.map((item) => ({
                    quotationId: id,
                    productId: item.productId || null,
                    description: item.description || '',
                    quantity: Number(item.quantity) || 1,
                    unitPrice: Number(item.unitPrice) || 0,
                    totalPrice: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
                    notes: item.notes || null,
                })),
            });
        }
        return database_1.prisma.quotation.update({
            where: { id },
            data: updateData,
            include: { items: true, lead: true },
        });
    },
    async updateStatus(id, status) {
        return database_1.prisma.quotation.update({ where: { id }, data: { status: status } });
    },
    async delete(id) {
        return database_1.prisma.quotation.delete({ where: { id } });
    },
};
//# sourceMappingURL=quotes.service.js.map