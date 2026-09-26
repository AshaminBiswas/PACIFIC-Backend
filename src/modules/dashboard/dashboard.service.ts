import { prisma } from '../../config/database';

export const dashboardService = {
  async getStats() {
    const [
      totalProducts,
      totalLeads,
      newLeads,
      totalQuotations,
      pendingQuotations,
      totalProjects,
      activeProjects,
      totalInvoices,
      paidInvoices,
      configuratorDesigns,
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'NEW' } }),
      prisma.quotation.count(),
      prisma.quotation.count({ where: { status: { in: ['DRAFT', 'SENT'] } } }),
      prisma.commercialProject.count(),
      prisma.commercialProject.count({ where: { status: { in: ['IN_PROGRESS', 'INSTALLATION'] } } }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.configuratorDesign.count(),
    ]);

    // Revenue summary
    const revenueData = await prisma.invoice.aggregate({
      where: { status: 'PAID' },
      _sum: { totalAmount: true },
    });
    const pendingRevenueData = await prisma.invoice.aggregate({
      where: { status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] } },
      _sum: { totalAmount: true },
    });

    // Recent leads
    const recentLeads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, status: true, source: true, createdAt: true },
    });

    // Recent configurator designs
    const recentDesigns = await prisma.configuratorDesign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { lead: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    return {
      overview: {
        totalProducts,
        totalLeads,
        newLeads,
        totalQuotations,
        pendingQuotations,
        totalProjects,
        activeProjects,
        totalInvoices,
        paidInvoices,
        configuratorDesigns,
      },
      revenue: {
        paid: Number(revenueData._sum.totalAmount || 0),
        pending: Number(pendingRevenueData._sum.totalAmount || 0),
      },
      recentLeads,
      recentDesigns,
    };
  },
};
