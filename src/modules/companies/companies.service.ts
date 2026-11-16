import { prisma } from '../../config/database';
import { auditService } from '../audit/audit.service';
import { memoryCache } from '../../utils/cache';

export const companiesService = {
  async list() {
    return memoryCache.coalesce('companies:list', async () => {
      return prisma.companyProfile.findMany({
        include: {
          addresses: true,
          bankAccounts: true,
          signatories: true,
          terms: true,
          sequences: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    }, 1800); // 30m TTL
  },

  async getById(id: string) {
    return memoryCache.coalesce(`companies:detail:${id}`, async () => {
      const profile = await prisma.companyProfile.findUnique({
        where: { id },
        include: {
          addresses: true,
          bankAccounts: true,
          signatories: true,
          terms: true,
          sequences: true,
        },
      });
      if (!profile) throw Object.assign(new Error('Company profile not found'), { status: 404 });
      return profile;
    }, 1800);
  },

  async create(data: any, userId?: string) {
    const company = await prisma.companyProfile.create({
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

    memoryCache.invalidate('companies:');

    await auditService.log({
      userId,
      action: 'CREATE',
      module: 'Settings',
      entityType: 'CompanyProfile',
      entityId: company.id,
      newData: company,
    });

    return company;
  },

  async update(id: string, data: any, userId?: string) {
    const old = await prisma.companyProfile.findUnique({ where: { id } });
    const updated = await prisma.companyProfile.update({
      where: { id },
      data,
    });

    memoryCache.invalidate('companies:');

    await auditService.log({
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

  async addAddress(companyProfileId: string, data: any) {
    const res = await prisma.companyAddress.create({
      data: { ...data, companyProfileId },
    });
    memoryCache.invalidate('companies:');
    return res;
  },

  async addBankAccount(companyProfileId: string, data: any) {
    const res = await prisma.companyBankAccount.create({
      data: { ...data, companyProfileId },
    });
    memoryCache.invalidate('companies:');
    return res;
  },

  async addSignatory(companyProfileId: string, data: any) {
    const res = await prisma.companySignatory.create({
      data: { ...data, companyProfileId },
    });
    memoryCache.invalidate('companies:');
    return res;
  },

  async addTerm(companyProfileId: string, data: any) {
    const res = await prisma.companyTerm.create({
      data: { ...data, companyProfileId },
    });
    memoryCache.invalidate('companies:');
    return res;
  },
};
