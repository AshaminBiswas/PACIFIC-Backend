import { prisma } from '../../config/database';
import { sequenceService } from '../sequences/sequence.service';
import { qrService } from '../qr/qr.service';
import { pdfService } from '../pdf/pdf.service';
import { auditService } from '../audit/audit.service';

export const poService = {
  async list(query: { page?: number; limit?: number; status?: string; vendorId?: string; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.vendorId) where.vendorId = query.vendorId;
    if (query.search) {
      where.OR = [
        { poNumber: { contains: query.search, mode: 'insensitive' } },
        { vendor: { legalName: { contains: query.search, mode: 'insensitive' } } },
        { subject: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: true,
          companyProfile: true,
          items: true,
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { poDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: {
          include: { contacts: true, addresses: true },
        },
        companyProfile: {
          include: { addresses: true, bankAccounts: true, signatories: true },
        },
        items: {
          include: { product: true },
          orderBy: { serialNumber: 'asc' },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        qrCodes: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!po) throw Object.assign(new Error('Purchase Order not found'), { status: 404 });
    return po;
  },

  async create(data: any, userId?: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Get or pick default company profile if not passed
      let companyProfileId = data.companyProfileId;
      if (!companyProfileId) {
        const defaultCompany = await tx.companyProfile.findFirst({
          where: { status: 'ACTIVE' },
        });
        if (!defaultCompany) {
          throw new Error('No active company profile found. Please configure company profile first.');
        }
        companyProfileId = defaultCompany.id;
      }

      // 2. Generate atomic, concurrency-safe PO number
      const seq = await sequenceService.getNextDocumentNumber(companyProfileId, 'PO');
      const poNumber = seq.number;

      // 3. Compute items and totals
      let subtotal = 0;
      let totalGst = 0;

      const itemsToCreate = (data.items || []).map((it: any, index: number) => {
        const qty = Math.max(0, Number(it.quantity) || 1);
        const rate = Math.max(0, Number(it.rate) || 0);
        const amount = Math.round(qty * rate * 100) / 100;
        const gstRate = Number(it.gstRate ?? 18);
        const gstAmount = Math.round(amount * (gstRate / 100) * 100) / 100;

        subtotal += amount;
        totalGst += gstAmount;

        return {
          serialNumber: index + 1,
          productId: it.productId,
          description: it.description,
          finish: it.finish,
          thickness: it.thickness,
          cuttingSize: it.cuttingSize,
          quantity: qty,
          unit: it.unit || 'NOS',
          rate,
          amount,
          gstRate,
          gstAmount,
        };
      });

      const totalAmount = Math.round((subtotal + totalGst) * 100) / 100;

      // 4. Default addresses if not supplied
      const defaultDelivery = {
        line1: 'H-3, JR Complex, Gate-4, Melaram Farm',
        line2: 'Sewadham Road, Mandoli',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110093',
        mobile: '9818592113',
      };

      const defaultBilling = {
        line1: 'H-3, JR Complex, Gate-4, Melaram Farm',
        line2: 'Sewadham Road, Mandoli',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110093',
        gstin: '07CIJPS1392A2Z9',
        pan: 'CIJPS1392A',
      };

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          companyProfileId,
          vendorId: data.vendorId,
          poDate: data.poDate ? new Date(data.poDate) : new Date(),
          subject: data.subject || 'Purchase Order for Cubicle Hardware & Materials',
          description: data.description || 'Supply of material as per agreed specifications.',
          deliveryAddressJson: data.deliveryAddress || defaultDelivery,
          billingAddressJson: data.billingAddress || defaultBilling,
          paymentTerms: data.paymentTerms || '50% Advance and 50% before dispatch.',
          deliveryTerms: data.deliveryTerms || '5 days from date of PO.',
          subtotal,
          gstAmount: totalGst,
          totalAmount,
          currency: data.currency || 'INR',
          status: 'DRAFT',
          createdById: userId,
          items: {
            create: itemsToCreate,
          },
          statusHistory: {
            create: {
              toStatus: 'DRAFT',
              changedById: userId,
              reason: 'PO Draft Created',
            },
          },
        },
        include: {
          items: true,
          vendor: true,
          companyProfile: true,
        },
      });

      await auditService.log({
        userId,
        action: 'CREATE',
        module: 'Procurement',
        entityType: 'PurchaseOrder',
        entityId: po.id,
        newData: po,
      });

      return po;
    });
  },

  async approve(id: string, userId: string) {
    const po = await this.getById(id);
    if (po.status !== 'DRAFT' && po.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot approve PO in status '${po.status}'`);
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        statusHistory: {
          create: {
            fromStatus: po.status,
            toStatus: 'APPROVED',
            changedById: userId,
            reason: 'PO Approved by Manager',
          },
        },
      },
      include: {
        companyProfile: true,
        vendor: true,
      },
    });

    // Register verification QR code
    await qrService.registerDocumentQr({
      documentType: 'PO',
      documentId: id,
      documentNumber: po.poNumber,
      companyName: po.companyProfile.companyName,
      partyName: po.vendor.legalName,
      date: po.poDate.toISOString(),
      totalAmount: Number(po.totalAmount),
      currency: po.currency,
      status: 'APPROVED',
    });

    await auditService.log({
      userId,
      action: 'APPROVE',
      module: 'Procurement',
      entityType: 'PurchaseOrder',
      entityId: id,
      newData: { status: 'APPROVED', approvedById: userId },
    });

    return updated;
  },

  async cancel(id: string, reason: string, userId: string) {
    const po = await this.getById(id);
    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      throw new Error(`Cannot cancel PO in status '${po.status}'`);
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        statusHistory: {
          create: {
            fromStatus: po.status,
            toStatus: 'CANCELLED',
            changedById: userId,
            reason: reason || 'Cancelled by Admin',
          },
        },
      },
    });

    await auditService.log({
      userId,
      action: 'CANCEL',
      module: 'Procurement',
      entityType: 'PurchaseOrder',
      entityId: id,
      newData: { status: 'CANCELLED', reason },
    });

    return updated;
  },

  async delete(id: string, userId: string) {
    const po = await this.getById(id);
    await prisma.$transaction(async (tx) => {
      await tx.payableEntry.deleteMany({ where: { purchaseOrderId: id } });
      await tx.qrCode.deleteMany({ where: { entityId: id, entityType: 'PO' } });
      await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
      await tx.purchaseOrderStatusHistory.deleteMany({ where: { poId: id } });
      await tx.purchaseOrder.delete({ where: { id } });
    });

    await auditService.log({
      userId,
      action: 'DELETE',
      module: 'Procurement',
      entityType: 'PurchaseOrder',
      entityId: id,
      oldData: { poNumber: po.poNumber },
    });

    return { success: true };
  },

  async getPdfHtml(id: string) {
    const po = await this.getById(id);

    const deliveryAddress = po.deliveryAddressJson as any;
    const billingAddress = po.billingAddressJson as any;

    const qrResult = await qrService.getOrCreateDocumentQr({
      documentType: 'PO',
      documentId: po.id,
      documentNumber: po.poNumber,
      companyName: po.companyProfile.companyName,
      partyName: po.vendor.legalName,
      date: po.poDate.toISOString(),
      totalAmount: Number(po.totalAmount),
      currency: po.currency,
      status: po.status,
    });
    const qrDataUrl = qrResult.qrDataUrl;

    return pdfService.generatePoHtml({
      poNumber: po.poNumber,
      poDate: po.poDate.toISOString(),
      subject: po.subject || undefined,
      description: po.description || undefined,
      companyName: po.companyProfile.companyName,
      companyAddress: `${po.companyProfile.state || ''}, ${po.companyProfile.country}`,
      companyGstin: po.companyProfile.gstin || undefined,
      companyPan: po.companyProfile.pan || undefined,
      vendorName: po.vendor.legalName,
      vendorAddress: po.vendor.addresses[0]
        ? `${po.vendor.addresses[0].addressLine1}, ${po.vendor.addresses[0].city}, ${po.vendor.addresses[0].state}`
        : 'Vendor Location',
      vendorGstin: po.vendor.gstin || undefined,
      deliveryAddress: {
        line1: deliveryAddress.line1 || 'H-3, JR Complex, Gate-4',
        line2: deliveryAddress.line2 || 'Melaram Farm, Sewadham Road, Mandoli',
        city: deliveryAddress.city || 'Delhi',
        state: deliveryAddress.state || 'Delhi',
        postalCode: deliveryAddress.postalCode || '110093',
        mobile: deliveryAddress.mobile || '9818592113',
      },
      billingAddress: {
        line1: billingAddress.line1 || 'H-3, JR Complex, Gate-4',
        line2: billingAddress.line2 || 'Melaram Farm, Sewadham Road, Mandoli',
        city: billingAddress.city || 'Delhi',
        state: billingAddress.state || 'Delhi',
        postalCode: billingAddress.postalCode || '110093',
        gstin: billingAddress.gstin || '07CIJPS1392A2Z9',
        pan: billingAddress.pan || 'CIJPS1392A',
      },
      paymentTerms: po.paymentTerms || '50% Advance and 50% before dispatch.',
      deliveryTerms: po.deliveryTerms || '5 days from date of PO.',
      items: po.items.map((it) => ({
        serialNumber: it.serialNumber,
        description: it.description,
        finish: it.finish || undefined,
        thickness: it.thickness || undefined,
        cuttingSize: it.cuttingSize || undefined,
        quantity: Number(it.quantity),
        unit: it.unit,
        rate: Number(it.rate),
        amount: Number(it.amount),
      })),
      subtotal: Number(po.subtotal),
      gstAmount: Number(po.gstAmount),
      totalAmount: Number(po.totalAmount),
      currency: po.currency,
      qrDataUrl,
      signatureUrl: po.companyProfile.signatureUrl || undefined,
    });
  },
};
