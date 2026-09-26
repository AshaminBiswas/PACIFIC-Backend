import { prisma } from '../../config/database';

function generateNumber(prefix: string): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}${month}-${rand}`;
}

export const quotesService = {
  async list(query: { page: number; limit: number; status?: string; leadId?: string }) {
    const { page, limit, status, leadId } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
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
      prisma.quotation.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const quote = await prisma.quotation.findUnique({
      where: { id },
      include: { lead: true, design: true, items: { include: { product: true } }, invoice: true, createdBy: true },
    });
    if (!quote) throw Object.assign(new Error('Quotation not found'), { status: 404 });
    return quote;
  },

  async create(data: any, userId?: string) {
    const quoteNumber = generateNumber('QT');
    const items = data.items || [];

    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = data.taxAmount || 0;
    const discountAmount = data.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    return prisma.quotation.create({
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
          create: items.map((item: any) => ({
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

  async update(id: string, data: any) {
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) throw Object.assign(new Error('Quotation not found'), { status: 404 });

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.validUntil) updateData.validUntil = new Date(data.validUntil);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;
    if (data.taxAmount !== undefined) updateData.taxAmount = Number(data.taxAmount);
    if (data.discountAmount !== undefined) updateData.discountAmount = Number(data.discountAmount);

    if (data.items && Array.isArray(data.items)) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
      const subtotal = data.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
      updateData.subtotal = subtotal;
      const tax = updateData.taxAmount !== undefined ? updateData.taxAmount : Number(existing.taxAmount || 0);
      const discount = updateData.discountAmount !== undefined ? updateData.discountAmount : Number(existing.discountAmount || 0);
      updateData.totalAmount = subtotal + tax - discount;

      await prisma.quotationItem.createMany({
        data: data.items.map((item: any) => ({
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

    return prisma.quotation.update({
      where: { id },
      data: updateData,
      include: { items: true, lead: true },
    });
  },

  async updateStatus(id: string, status: string) {
    return prisma.quotation.update({ where: { id }, data: { status: status as any } });
  },

  async delete(id: string) {
    return prisma.quotation.delete({ where: { id } });
  },
};
