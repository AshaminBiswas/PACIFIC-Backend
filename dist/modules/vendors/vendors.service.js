"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorsService = void 0;
const database_1 = require("../../config/database");
const audit_service_1 = require("../audit/audit.service");
exports.vendorsService = {
    async listVendors(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {
            partyType: { in: ['VENDOR', 'BOTH'] },
        };
        if (query.status) {
            where.status = query.status;
        }
        else {
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
            database_1.prisma.businessParty.findMany({
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
            database_1.prisma.businessParty.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    },
    async getVendorById(id) {
        const vendor = await database_1.prisma.businessParty.findUnique({
            where: { id },
            include: {
                vendorProfile: true,
                contacts: true,
                addresses: true,
                purchaseOrders: {
                    orderBy: { poDate: 'desc' },
                    take: 20,
                },
                payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 20,
                },
            },
        });
        if (!vendor)
            throw Object.assign(new Error('Vendor not found'), { status: 404 });
        const totalPoValue = vendor.purchaseOrders.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
        const totalPaidValue = vendor.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const outstandingBalance = Math.max(0, totalPoValue - totalPaidValue);
        return {
            ...vendor,
            summary: {
                totalPoValue,
                totalPaidValue,
                outstandingBalance,
                totalPoCount: vendor.purchaseOrders.length,
                totalPaymentsCount: vendor.payments.length,
            },
        };
    },
    async createVendor(data, userId) {
        return database_1.prisma.$transaction(async (tx) => {
            const party = await tx.businessParty.create({
                data: {
                    companyProfileId: data.companyProfileId,
                    partyType: data.partyType || 'VENDOR',
                    legalName: data.legalName,
                    tradeName: data.tradeName,
                    gstin: data.gstin ? data.gstin.toUpperCase().trim() : undefined,
                    pan: data.pan ? data.pan.toUpperCase().trim() : undefined,
                    email: data.email,
                    phone: data.phone,
                    status: data.status || 'ACTIVE',
                    notes: data.notes,
                },
            });
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
                    await tx.partyContact.create({
                        data: { ...c, partyId: party.id },
                    });
                }
            }
            if (Array.isArray(data.addresses)) {
                for (const a of data.addresses) {
                    await tx.partyAddress.create({
                        data: { ...a, partyId: party.id },
                    });
                }
            }
            await audit_service_1.auditService.log({
                userId,
                action: 'CREATE',
                module: 'Procurement',
                entityType: 'Vendor',
                entityId: party.id,
                newData: { party, profile },
            });
            return tx.businessParty.findUnique({
                where: { id: party.id },
                include: { vendorProfile: true, contacts: true, addresses: true },
            });
        });
    },
    async updateVendor(id, data, userId) {
        return database_1.prisma.$transaction(async (tx) => {
            const old = await tx.businessParty.findUnique({
                where: { id },
                include: { vendorProfile: true, contacts: true, addresses: true },
            });
            if (!old) {
                throw Object.assign(new Error('Vendor not found'), { status: 404 });
            }
            const party = await tx.businessParty.update({
                where: { id },
                data: {
                    legalName: data.legalName !== undefined ? data.legalName : old.legalName,
                    tradeName: data.tradeName !== undefined ? data.tradeName : old.tradeName,
                    gstin: data.gstin !== undefined ? (data.gstin ? data.gstin.toUpperCase().trim() : null) : old.gstin,
                    pan: data.pan !== undefined ? (data.pan ? data.pan.toUpperCase().trim() : null) : old.pan,
                    email: data.email !== undefined ? data.email : old.email,
                    phone: data.phone !== undefined ? data.phone : old.phone,
                    status: data.status !== undefined ? data.status : old.status,
                    notes: data.notes !== undefined ? data.notes : old.notes,
                },
            });
            const profileData = {};
            if (data.vendorType !== undefined)
                profileData.vendorType = data.vendorType;
            if (data.paymentTermsDays !== undefined)
                profileData.paymentTermsDays = Number(data.paymentTermsDays) || 30;
            if (data.vendorProfile)
                Object.assign(profileData, data.vendorProfile);
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
                    await tx.partyContact.create({
                        data: {
                            partyId: id,
                            name: c.name,
                            designation: c.designation || null,
                            phone: c.phone || null,
                            email: c.email || null,
                            isPrimary: c.isPrimary ?? false,
                        },
                    });
                }
            }
            if (Array.isArray(data.addresses)) {
                await tx.partyAddress.deleteMany({ where: { partyId: id } });
                for (const a of data.addresses) {
                    await tx.partyAddress.create({
                        data: {
                            partyId: id,
                            addressType: a.addressType || 'OFFICE',
                            addressLine1: a.addressLine1,
                            addressLine2: a.addressLine2 || null,
                            city: a.city,
                            state: a.state,
                            stateCode: a.stateCode || null,
                            postalCode: a.postalCode || null,
                            gstin: a.gstin || null,
                            isDefaultBilling: a.isDefaultBilling ?? true,
                        },
                    });
                }
            }
            await audit_service_1.auditService.log({
                userId,
                action: 'UPDATE',
                module: 'Procurement',
                entityType: 'Vendor',
                entityId: id,
                oldData: old,
                newData: party,
            });
            return tx.businessParty.findUnique({
                where: { id },
                include: { vendorProfile: true, contacts: true, addresses: true },
            });
        });
    },
    async deleteVendor(id, userId) {
        const old = await database_1.prisma.businessParty.findUnique({
            where: { id },
            include: { vendorProfile: true },
        });
        if (!old)
            return null;
        const [poCount, paymentCount, exportExpenseCount] = await Promise.all([
            database_1.prisma.purchaseOrder.count({ where: { vendorId: id } }),
            database_1.prisma.payment.count({ where: { partyId: id } }),
            database_1.prisma.exportExpense.count({ where: { vendorId: id } }),
        ]);
        if (poCount > 0 || paymentCount > 0 || exportExpenseCount > 0) {
            const updated = await database_1.prisma.businessParty.update({
                where: { id },
                data: { status: 'DELETED' },
            });
            if (userId) {
                await audit_service_1.auditService.log({
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
        await database_1.prisma.partyContact.deleteMany({ where: { partyId: id } });
        await database_1.prisma.partyAddress.deleteMany({ where: { partyId: id } });
        await database_1.prisma.vendorProfile.deleteMany({ where: { partyId: id } });
        const vendor = await database_1.prisma.businessParty.delete({ where: { id } });
        if (userId) {
            await audit_service_1.auditService.log({
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
//# sourceMappingURL=vendors.service.js.map