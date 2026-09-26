import { prisma } from '../../config/database';

export const leadsService = {
  async list(query: { page: number; limit: number; status?: string; source?: string; search?: string }) {
    const { page, limit, status, source, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];

    const [items, total] = await Promise.all([
      prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.lead.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { quotations: true, configuratorDesigns: true },
    });
    if (!lead) throw Object.assign(new Error('Lead not found'), { status: 404 });
    return lead;
  },

  async create(data: any) {
    return prisma.lead.create({ data: { ...data, tags: data.tags || [] } });
  },

  async update(id: string, data: any) {
    return prisma.lead.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.lead.delete({ where: { id } });
  },

  async getStats() {
    const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'WON', 'LOST'];
    const counts = await Promise.all(
      statuses.map((status) => prisma.lead.count({ where: { status: status as any } }))
    );
    return Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  },
};
