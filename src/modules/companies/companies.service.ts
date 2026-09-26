import { prisma } from '../../config/database';
import { auditService } from '../audit/audit.service';

export const companiesService = {
  async list() {
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
  },

  async getById(id: string) {
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
    return prisma.companyAddress.create({
      data: { ...data, companyProfileId },
    });
  },

  async addBankAccount(companyProfileId: string, data: any) {
    return prisma.companyBankAccount.create({
      data: { ...data, companyProfileId },
    });
  },

  async addSignatory(companyProfileId: string, data: any) {
    return prisma.companySignatory.create({
      data: { ...data, companyProfileId },
    });
  },

  async addTerm(companyProfileId: string, data: any) {
    return prisma.companyTerm.create({
      data: { ...data, companyProfileId },
    });
  },
};
