"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companiesService = void 0;
const database_1 = require("../../config/database");
const audit_service_1 = require("../audit/audit.service");
exports.companiesService = {
    async list() {
        return database_1.prisma.companyProfile.findMany({
            include: {
                addresses: true,
                bankAccounts: true,
                signatories: true,
                terms: true,
                sequences: true,
            },
            orderBy: { createdAt: 'asc' },
        });
    },
    async getById(id) {
        const profile = await database_1.prisma.companyProfile.findUnique({
            where: { id },
            include: {
                addresses: true,
                bankAccounts: true,
                signatories: true,
                terms: true,
                sequences: true,
            },
        });
        if (!profile)
            throw Object.assign(new Error('Company profile not found'), { status: 404 });
        return profile;
    },
    async create(data, userId) {
        const company = await database_1.prisma.companyProfile.create({
            data: {
                companyName: data.companyName,
                legalName: data.legalName,
                entityCode: data.entityCode,
                country: data.country || 'India',
                currency: data.currency || (data.country === 'UAE' ? 'AED' : 'INR'),
                taxRegime: data.taxRegime || (data.country === 'UAE' ? 'VAT' : 'GST'),
                gstin: data.gstin,
                pan: data.pan,
                vatNumber: data.vatNumber,
                state: data.state,
                stateCode: data.stateCode,
                phone: data.phone,
                email: data.email,
                website: data.website,
                logoUrl: data.logoUrl,
                signatureUrl: data.signatureUrl,
                status: data.status || 'ACTIVE',
            },
        });
        await audit_service_1.auditService.log({
            userId,
            action: 'CREATE',
            module: 'Settings',
            entityType: 'CompanyProfile',
            entityId: company.id,
            newData: company,
        });
        return company;
    },
    async update(id, data, userId) {
        const old = await database_1.prisma.companyProfile.findUnique({ where: { id } });
        const updated = await database_1.prisma.companyProfile.update({
            where: { id },
            data,
        });
        await audit_service_1.auditService.log({
            userId,
            action: 'UPDATE',
            module: 'Settings',
            entityType: 'CompanyProfile',
            entityId: id,
            oldData: old,
            newData: updated,
        });
        return updated;
    },
    async addAddress(companyProfileId, data) {
        return database_1.prisma.companyAddress.create({
            data: { ...data, companyProfileId },
        });
    },
    async addBankAccount(companyProfileId, data) {
        return database_1.prisma.companyBankAccount.create({
            data: { ...data, companyProfileId },
        });
    },
    async addSignatory(companyProfileId, data) {
        return database_1.prisma.companySignatory.create({
            data: { ...data, companyProfileId },
        });
    },
    async addTerm(companyProfileId, data) {
        return database_1.prisma.companyTerm.create({
            data: { ...data, companyProfileId },
        });
    },
};
//# sourceMappingURL=companies.service.js.map