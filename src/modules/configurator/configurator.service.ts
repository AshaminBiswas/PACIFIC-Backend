import { prisma } from '../../config/database';

export const configuratorService = {
  async list(query: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.configuratorDesign.findMany({
        where,
        include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.configuratorDesign.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const design = await prisma.configuratorDesign.findUnique({
      where: { id },
      include: { lead: true, quotations: true },
    });
    if (!design) throw Object.assign(new Error('Design not found'), { status: 404 });
    return design;
  },

  async submit(data: any) {
    return prisma.configuratorDesign.create({ data, include: { lead: true } });
  },

  async updateStatus(id: string, status: string) {
    return prisma.configuratorDesign.update({ where: { id }, data: { status: status as any } });
  },

  async delete(id: string) {
    return prisma.configuratorDesign.delete({ where: { id } });
  },
};
