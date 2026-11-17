import { prisma } from '../../config/database';

export interface LogAuditParams {
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ISSUE' | 'APPROVE' | 'CANCEL' | 'ALLOCATE' | 'SCAN' | 'LOGIN' | string;
  module: 'CRM' | 'Procurement' | 'Sales' | 'Finance' | 'Settings' | 'QR' | 'Products' | 'Auth' | 'Logistics' | 'Warehouse' | string;
  entityType: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}

export const auditService = {
  async log(params: LogAuditParams) {
    try {
      let safeUserId: string | null = null;
      if (params.userId) {
        try {
          const userExists = await prisma.user.findUnique({
            where: { id: params.userId },
            select: { id: true },
          });
          if (userExists) safeUserId = userExists.id;
        } catch {
          safeUserId = null;
        }
      }

      return await prisma.auditLog.create({
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
    } catch (err) {
      console.error('[auditService] Failed to record audit log:', err);
      // Non-blocking: audit failure should not break main transaction unless required
      return null;
    }
  },

  async logMutation(params: LogAuditParams) {
    return this.log(params);
  },


  async list(query: { page?: number; limit?: number; module?: string; action?: string; entityType?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
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
      prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async listAdminActivity(query: {
    page?: number;
    limit?: number;
    actorId?: string;
    targetType?: string;
    targetId?: string;
    action?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.targetType && query.targetType !== 'ALL') where.targetType = query.targetType;
    if (query.targetId) where.targetId = query.targetId;
    if (query.action && query.action !== 'ALL') where.action = query.action;

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { details: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { targetType: { contains: q, mode: 'insensitive' } },
        { actor: { firstName: { contains: q, mode: 'insensitive' } } },
        { actor: { lastName: { contains: q, mode: 'insensitive' } } },
        { actor: { email: { contains: q, mode: 'insensitive' } } },
        { actor: { adminId: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [items, total] = await Promise.all([
      prisma.adminActivityLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              adminId: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePhoto: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminActivityLog.count({ where }),
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
