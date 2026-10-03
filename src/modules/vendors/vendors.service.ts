import { prisma } from '../../config/database';
import { auditService } from '../audit/audit.service';

export const vendorsService = {
  async listVendors(query: { page?: number; limit?: number; search?: string; vendorType?: string; status?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      partyType: { in: ['VENDOR', 'BOTH'] },
    };

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { not: 'DELETED' };
    }
    if (query.vendorType) {
      where.vendorProfile = { vendorType: query.vendorType };
    }
    if (query.search) {
      where.OR = [
        { legalName: { contains: query.search, mode: 'insensitive' } },
        { tradeName: { contains: query.search, mode: 'insensitive' } },
        { gstin: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.businessParty.findMany({
        where,
        include: {
          vendorProfile: true,
          contacts: true,
          addresses: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.businessParty.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getVendorById(id: string) {
    const vendor = await prisma.businessParty.findUnique({
      where: { id },
      include: {
        vendorProfile: true,
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        addresses: {
          orderBy: [{ isDefaultBilling: 'desc' }, { createdAt: 'asc' }],
        },
        purchaseOrders: {
          include: {
            items: true,
          },
          orderBy: { poDate: 'desc' },
          take: 50,
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 50,
        },
      },
    });

    if (!vendor) throw Object.assign(new Error('Vendor not found'), { status: 404 });

    const totalPoValue = vendor.purchaseOrders.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
    const totalPaidValue = vendor.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const outstandingBalance = Math.max(0, totalPoValue - totalPaidValue);

    // Aggregate material supplies record across all POs
    const materialMap = new Map<string, {
      description: string;
      finish?: string;
      thickness?: string;
      cuttingSize?: string;
      unit: string;
      totalQuantity: number;
      lastRate: number;
      lastSuppliedDate: string;
      poCount: number;
      poNumbers: string[];
    }>();

    for (const po of vendor.purchaseOrders) {
      for (const item of (po as any).items || []) {
        const descKey = (item.description || '').trim();
        const finishKey = (item.finish || '').trim();
        const thickKey = (item.thickness || '').trim();
        const unitKey = (item.unit || '').trim();
        const key = `${descKey}_${finishKey}_${thickKey}_${unitKey}`.toLowerCase();
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const poDateStr = po.poDate ? (po.poDate instanceof Date ? po.poDate.toISOString() : String(po.poDate)) : '';

        const existing = materialMap.get(key);
        if (existing) {
          existing.totalQuantity += qty;
          if (rate > 0) existing.lastRate = rate;
          if (!existing.poNumbers.includes(po.poNumber)) {
            existing.poNumbers.push(po.poNumber);
            existing.poCount++;
          }
          if (poDateStr && (!existing.lastSuppliedDate || poDateStr > existing.lastSuppliedDate)) {
            existing.lastSuppliedDate = poDateStr;
          }
        } else {
          materialMap.set(key, {
            description: item.description,
            finish: item.finish || undefined,
            thickness: item.thickness || undefined,
            cuttingSize: item.cuttingSize || undefined,
            unit: item.unit || 'NOS',
            totalQuantity: qty,
            lastRate: rate,
            lastSuppliedDate: poDateStr,
            poCount: 1,
            poNumbers: [po.poNumber],
          });
        }
      }
    }

    const materialSupplies = Array.from(materialMap.values()).sort(
      (a, b) => (b.lastSuppliedDate || '').localeCompare(a.lastSuppliedDate || '')
    );

    return {
      ...vendor,
      materialSupplies,
      summary: {
        totalPoValue,
        totalPaidValue,
        outstandingBalance,
        totalPoCount: vendor.purchaseOrders.length,
        totalPaymentsCount: vendor.payments.length,
        totalMaterialTypesCount: materialSupplies.length,
      },
    };
  },

  async createVendor(data: any, userId?: string) {
    let createdPartyId: string | null = null;
    let auditData: any = null;

    const result = await prisma.$transaction(
      async (tx) => {
        // Resolve company profile cleanly without empty string UUID errors
        let compProfileId = data.companyProfileId;
        if (!compProfileId || typeof compProfileId !== 'string' || compProfileId.trim() === '') {
          const defaultComp = await tx.companyProfile.findFirst({ select: { id: true } });
          compProfileId = defaultComp?.id || null;
        }

        const notesVal =
          data.notes !== undefined
            ? typeof data.notes === 'object'
              ? JSON.stringify(data.notes)
              : String(data.notes)
            : undefined;

        const party = await tx.businessParty.create({
          data: {
            companyProfileId: compProfileId,
            partyType: data.partyType || 'VENDOR',
            legalName: (data.legalName || '').trim(),
            tradeName: data.tradeName ? data.tradeName.trim() : undefined,
            gstin: data.gstin ? data.gstin.toUpperCase().trim() : undefined,
            pan: data.pan ? data.pan.toUpperCase().trim() : undefined,
            email: data.email ? data.email.trim() : undefined,
            phone: data.phone ? data.phone.trim() : undefined,
            status: data.status || 'ACTIVE',
            notes: notesVal,
          },
        });
        createdPartyId = party.id;

        const profile = await tx.vendorProfile.create({
          data: {
            partyId: party.id,
            vendorType: data.vendorType || 'RAW_MATERIALS',
            paymentTermsDays: Number(data.paymentTermsDays) || 30,
            status: 'ACTIVE',
          },
        });

        if (Array.isArray(data.contacts)) {
          for (const c of data.contacts) {
            if (c.name && String(c.name).trim()) {
              await tx.partyContact.create({
                data: {
                  partyId: party.id,
                  name: String(c.name).trim(),
                  designation: c.designation ? String(c.designation).trim() : null,
                  phone: c.phone ? String(c.phone).trim() : null,
                  email: c.email ? String(c.email).trim() : null,
                  isPrimary: Boolean(c.isPrimary),
                },
              });
            }
          }
        }

        if (Array.isArray(data.addresses)) {
          for (const a of data.addresses) {
            if (a.addressLine1 && String(a.addressLine1).trim()) {
              await tx.partyAddress.create({
                data: {
                  partyId: party.id,
                  addressType: a.addressType || 'BILLING',
                  addressLine1: String(a.addressLine1).trim(),
                  addressLine2: a.addressLine2 ? String(a.addressLine2).trim() : null,
                  city: a.city ? String(a.city).trim() : 'Delhi',
                  state: a.state ? String(a.state).trim() : 'Delhi',
                  stateCode: a.stateCode ? String(a.stateCode).trim() : null,
                  postalCode: a.postalCode ? String(a.postalCode).trim() : null,
                  gstin: a.gstin ? String(a.gstin).toUpperCase().trim() : null,
                  country: a.country || 'India',
                  isDefaultBilling: a.isDefaultBilling !== undefined ? Boolean(a.isDefaultBilling) : true,
                  isDefaultShipping: Boolean(a.isDefaultShipping),
                },
              });
            }
          }
        }

        auditData = { party, profile };

        return tx.businessParty.findUnique({
          where: { id: party.id },
          include: { vendorProfile: true, contacts: true, addresses: true },
        });
      },
      { maxWait: 15000, timeout: 45000 }
    );

    // Decoupled audit logging outside the transaction to prevent connection pool exhaustion
    if (createdPartyId && auditData) {
      auditService.log({
        userId,
        action: 'CREATE',
        module: 'Procurement',
        entityType: 'Vendor',
        entityId: createdPartyId,
        newData: auditData,
      }).catch((e) => console.error('[auditService] createVendor log error:', e));
    }

    return result;
  },

  async updateVendor(id: string, data: any, userId?: string) {
    let auditData: any = null;

    const result = await prisma.$transaction(
      async (tx) => {
        const old = await tx.businessParty.findUnique({
          where: { id },
          include: { vendorProfile: true, contacts: true, addresses: true },
        });

        if (!old) {
          throw Object.assign(new Error('Vendor not found'), { status: 404 });
        }

        const notesVal =
          data.notes !== undefined
            ? typeof data.notes === 'object'
              ? JSON.stringify(data.notes)
              : String(data.notes)
            : old.notes;

        const party = await tx.businessParty.update({
          where: { id },
          data: {
            legalName: data.legalName !== undefined ? String(data.legalName).trim() : old.legalName,
            tradeName: data.tradeName !== undefined ? (data.tradeName ? String(data.tradeName).trim() : null) : old.tradeName,
            gstin: data.gstin !== undefined ? (data.gstin ? String(data.gstin).toUpperCase().trim() : null) : old.gstin,
            pan: data.pan !== undefined ? (data.pan ? String(data.pan).toUpperCase().trim() : null) : old.pan,
            email: data.email !== undefined ? (data.email ? String(data.email).trim() : null) : old.email,
            phone: data.phone !== undefined ? (data.phone ? String(data.phone).trim() : null) : old.phone,
            status: data.status !== undefined ? data.status : old.status,
            notes: notesVal,
          },
        });

        const profileData: any = {};
        if (data.vendorType !== undefined) profileData.vendorType = data.vendorType;
        if (data.paymentTermsDays !== undefined) profileData.paymentTermsDays = Number(data.paymentTermsDays) || 30;
        if (data.vendorProfile) Object.assign(profileData, data.vendorProfile);

        if (Object.keys(profileData).length > 0) {
          await tx.vendorProfile.upsert({
            where: { partyId: id },
            create: {
              partyId: id,
              vendorType: profileData.vendorType || 'RAW_MATERIALS',
              paymentTermsDays: profileData.paymentTermsDays || 30,
              status: 'ACTIVE',
            },
            update: profileData,
          });
        }

        if (Array.isArray(data.contacts)) {
          await tx.partyContact.deleteMany({ where: { partyId: id } });
          for (const c of data.contacts) {
            if (c.name && String(c.name).trim()) {
              await tx.partyContact.create({
                data: {
                  partyId: id,
                  name: String(c.name).trim(),
                  designation: c.designation ? String(c.designation).trim() : null,
                  phone: c.phone ? String(c.phone).trim() : null,
                  email: c.email ? String(c.email).trim() : null,
                  isPrimary: Boolean(c.isPrimary),
                },
              });
            }
          }
        }

        if (Array.isArray(data.addresses)) {
          await tx.partyAddress.deleteMany({ where: { partyId: id } });
          for (const a of data.addresses) {
            if (a.addressLine1 && String(a.addressLine1).trim()) {
              await tx.partyAddress.create({
                data: {
                  partyId: id,
                  addressType: a.addressType || 'BILLING',
                  addressLine1: String(a.addressLine1).trim(),
                  addressLine2: a.addressLine2 ? String(a.addressLine2).trim() : null,
                  city: a.city ? String(a.city).trim() : 'Delhi',
                  state: a.state ? String(a.state).trim() : 'Delhi',
                  stateCode: a.stateCode ? String(a.stateCode).trim() : null,
                  postalCode: a.postalCode ? String(a.postalCode).trim() : null,
                  gstin: a.gstin ? String(a.gstin).toUpperCase().trim() : null,
                  country: a.country || 'India',
                  isDefaultBilling: a.isDefaultBilling !== undefined ? Boolean(a.isDefaultBilling) : true,
                  isDefaultShipping: Boolean(a.isDefaultShipping),
                },
              });
            }
          }
        }

        auditData = { old, party };

        return tx.businessParty.findUnique({
          where: { id },
          include: { vendorProfile: true, contacts: true, addresses: true },
        });
      },
      { maxWait: 15000, timeout: 45000 }
    );

    if (auditData) {
      auditService.log({
        userId,
        action: 'UPDATE',
        module: 'Procurement',
        entityType: 'Vendor',
        entityId: id,
        oldData: auditData.old,
        newData: auditData.party,
      }).catch((e) => console.error('[auditService] updateVendor log error:', e));
    }

    return result;
  },

  async deleteVendor(id: string, userId?: string) {
    const old = await prisma.businessParty.findUnique({
      where: { id },
      include: { vendorProfile: true },
    });
    if (!old) return null;

    const [poCount, paymentCount, exportExpenseCount] = await Promise.all([
      prisma.purchaseOrder.count({ where: { vendorId: id } }),
      prisma.payment.count({ where: { partyId: id } }),
      prisma.exportExpense.count({ where: { vendorId: id } }),
    ]);

    if (poCount > 0 || paymentCount > 0 || exportExpenseCount > 0) {
      const updated = await prisma.businessParty.update({
        where: { id },
        data: { status: 'DELETED' },
      });
      if (userId) {
        await auditService.log({
          userId,
          action: 'DELETE',
          module: 'Procurement',
          entityType: 'Vendor',
          entityId: id,
          oldData: old,
          newData: { status: 'DELETED', reason: 'Soft-deleted due to linked purchase orders/payments' },
        });
      }
      return updated;
    }

    await prisma.partyContact.deleteMany({ where: { partyId: id } });
    await prisma.partyAddress.deleteMany({ where: { partyId: id } });
    await prisma.vendorProfile.deleteMany({ where: { partyId: id } });

    const vendor = await prisma.businessParty.delete({ where: { id } });
    if (userId) {
      await auditService.log({
        userId,
        action: 'DELETE',
        module: 'Procurement',
        entityType: 'Vendor',
        entityId: id,
        oldData: vendor,
      });
    }
    return vendor;
  },
};
