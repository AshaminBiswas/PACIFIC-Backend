import { prisma } from '../../config/database';

export const projectsService = {
  async list(query: { page: number; limit: number; status?: string; search?: string }) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { clientName: { contains: search, mode: 'insensitive' } },
      { clientCompany: { contains: search, mode: 'insensitive' } },
    ];
    const [items, total] = await Promise.all([
      prisma.commercialProject.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.commercialProject.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const project = await prisma.commercialProject.findUnique({ where: { id }, include: { invoices: true, assignedTo: { select: { id: true, firstName: true, lastName: true } } } });
    if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
    return project;
  },

  async create(data: any, userId?: string) {
    return prisma.commercialProject.create({ data: { ...data, images: data.images || [], tags: data.tags || [], assignedToId: data.assignedToId || userId } });
  },

  async update(id: string, data: any) {
    return prisma.commercialProject.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.commercialProject.delete({ where: { id } });
  },
};
