"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = void 0;
const database_1 = require("../../config/database");
exports.dashboardService = {
    async getStats() {
        const [totalProducts, totalLeads, newLeads, totalQuotations, pendingQuotations, totalProjects, activeProjects, totalInvoices, paidInvoices, configuratorDesigns,] = await Promise.all([
            database_1.prisma.product.count({ where: { isActive: true } }),
            database_1.prisma.lead.count(),
            database_1.prisma.lead.count({ where: { status: 'NEW' } }),
            database_1.prisma.quotation.count(),
            database_1.prisma.quotation.count({ where: { status: { in: ['DRAFT', 'SENT'] } } }),
            database_1.prisma.commercialProject.count(),
            database_1.prisma.commercialProject.count({ where: { status: { in: ['IN_PROGRESS', 'INSTALLATION'] } } }),
            database_1.prisma.invoice.count(),
            database_1.prisma.invoice.count({ where: { status: 'PAID' } }),
            database_1.prisma.configuratorDesign.count(),
        ]);
        // Revenue summary
        const revenueData = await database_1.prisma.invoice.aggregate({
            where: { status: 'PAID' },
            _sum: { totalAmount: true },
        });
        const pendingRevenueData = await database_1.prisma.invoice.aggregate({
            where: { status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] } },
            _sum: { totalAmount: true },
        });
        // Recent leads
        const recentLeads = await database_1.prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, firstName: true, lastName: true, email: true, status: true, source: true, createdAt: true },
        });
        // Recent configurator designs
        const recentDesigns = await database_1.prisma.configuratorDesign.findMany({
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
//# sourceMappingURL=dashboard.service.js.map