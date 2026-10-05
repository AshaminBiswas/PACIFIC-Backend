import crypto from 'crypto';
import { prisma } from '../../config/database';
import { sequenceService } from '../sequences/sequence.service';
import { pdfService } from '../pdf/pdf.service';
import { auditService } from '../audit/audit.service';
import { ordersService } from '../orders/orders.service';
import { memoryCache } from '../../utils/cache';
import { qrService } from '../qr/qr.service';
import { boardInventoryService } from '../inventory/boardInventory.service';

export const packingListsService = {
  async list(params?: {
    search?: string;
    orderId?: string;
    customerId?: string;
    receiptStatus?: string;
    page?: number;
    limit?: number;
    branch?: string;
  }) {
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.orderId) where.orderId = params.orderId;
    if (params?.customerId) where.customerId = params.customerId;
    if (params?.receiptStatus) where.receiptStatus = params.receiptStatus;
    if (params?.branch) {
      if (params.branch.toUpperCase() === 'KOLKATA') {
        where.packingListNumber = { startsWith: 'PPSK/' };
      } else if (params.branch.toUpperCase() === 'MAIN') {
        where.NOT = { packingListNumber: { startsWith: 'PPSK/' } };
      }
    }
    if (params?.search) {
      where.OR = [
        { packingListNumber: { contains: params.search, mode: 'insensitive' } },
        { consignorName: { contains: params.search, mode: 'insensitive' } },
        { shipToName: { contains: params.search, mode: 'insensitive' } },
        { siteContactName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.packingList.count({ where }),
      prisma.packingList.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          customer: true,
          order: { select: { id: true, orderNumber: true, status: true } },
          proformaInvoice: { select: { id: true, piNumber: true } },
          items: true,
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const pl = await prisma.packingList.findUnique({
      where: { id },
      include: {
        customer: true,
        companyProfile: true,
        order: {
          include: { items: true },
        },
        proformaInvoice: true,
        items: { orderBy: { serialNumber: 'asc' } },
      },
    });
    if (!pl) throw new Error('Packing List not found');
    return pl;
  },

  async create(data: any, userId?: string) {
    // Check mandatory link to Order
    if (!data.orderId && !data.isStandalone) {
      throw new Error('Packing list requires a linked Sales Order number. If this is a standalone dispatch (sample/replacement), please mark as Standalone.');
    }

    let customerId = data.customerId;
    let companyProfileId = data.companyProfileId;
    let linkedOrder: any = null;

    if (data.orderId) {
      linkedOrder = await prisma.salesOrder.findUnique({
        where: { id: data.orderId },
        include: { customer: { include: { addresses: true, contacts: true } }, items: true },
      });
      if (!linkedOrder) throw new Error('Linked Sales Order not found');
      customerId = customerId || linkedOrder.customerId;
      companyProfileId = companyProfileId || linkedOrder.companyProfileId;
    }

    if (!customerId) throw new Error('Customer ID is required');
    if (!companyProfileId) throw new Error('Company Profile ID is required');

    const company = await prisma.companyProfile.findUnique({
      where: { id: companyProfileId },
      include: { addresses: true, signatories: true },
    });
    if (!company) throw new Error('Company Profile not found');

    const customer = await prisma.businessParty.findUnique({
      where: { id: customerId },
      include: { addresses: true, contacts: true },
    });
    if (!customer) throw new Error('Customer not found');

    // Sequence generation
    const seq = await sequenceService.getNextDocumentNumber(company.id, 'PACKING_LIST');
    const packingListNumber = seq.number;

    // Line items handling: from input or BOM explosion
    let itemsData: any[] = [];
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      itemsData = data.items.map((it: any, idx: number) => ({
        serialNumber: idx + 1,
        description: it.description,
        size: it.size || null,
        designNo: it.designNo || null,
        quantity: Number(it.quantity) || 1,
        noOfPackets: it.noOfPackets != null ? Number(it.noOfPackets) : null,
        natureOfPacket: it.natureOfPacket || null,
      }));
    } else if (linkedOrder && data.autoExplodeBom) {
      // Auto-explode BOM for all items in order
      let sNo = 1;
      for (const orderItem of linkedOrder.items) {
        const orderQty = Number(orderItem.quantity) || 1;
        // Check if BOM exists for product
        const boms = orderItem.productId
          ? await prisma.productBom.findMany({ where: { productId: orderItem.productId } })
          : [];

        if (boms.length > 0) {
          for (const b of boms) {
            itemsData.push({
              serialNumber: sNo++,
              description: b.componentDescription,
              size: b.defaultSize,
              designNo: b.defaultDesignNo,
              quantity: Math.round(Number(b.ratioPerUnit) * orderQty),
              noOfPackets: Math.ceil(orderQty / 5),
              natureOfPacket: b.natureOfPacket || 'Board',
            });
          }
        } else {
          // Standard default cubicle components explosion
          itemsData.push(
            { serialNumber: sNo++, description: 'Door Panel', size: '600x1785mm', designNo: '1120 SD', quantity: orderQty, noOfPackets: Math.ceil(orderQty / 2), natureOfPacket: 'Board' },
            { serialNumber: sNo++, description: 'Divider Panel', size: '1500x1800mm', designNo: '1120 SD', quantity: orderQty, noOfPackets: Math.ceil(orderQty / 2), natureOfPacket: 'Board' },
            { serialNumber: sNo++, description: 'Mid / End Panel', size: '150x1995mm', designNo: '1120 SD', quantity: orderQty * 2, noOfPackets: orderQty, natureOfPacket: 'Board' },
            { serialNumber: sNo++, description: 'Black U Channel', size: '(L)', designNo: 'Black', quantity: orderQty * 3, noOfPackets: 1, natureOfPacket: 'Channel' },
            { serialNumber: sNo++, description: 'Black Door Stopper Channel', size: '(L)', designNo: 'Black', quantity: orderQty, noOfPackets: 1, natureOfPacket: 'Channel' },
            { serialNumber: sNo++, description: 'Black T-Line Toprail', size: '(L)', designNo: 'Black', quantity: orderQty, noOfPackets: 1, natureOfPacket: 'Channel' },
            { serialNumber: sNo++, description: 'Nylon Black Hardware Set', size: 'Set', designNo: 'Black', quantity: orderQty, noOfPackets: Math.ceil(orderQty / 10), natureOfPacket: 'Corrugated Box' },
            { serialNumber: sNo++, description: 'SS Screw & Wall Plug Kit', size: 'Kit', designNo: 'SS', quantity: orderQty, noOfPackets: null, natureOfPacket: null }
          );
        }
      }
    }

    if (itemsData.length === 0) {
      throw new Error('At least one component line item is required for the packing list.');
    }

    const totalQuantity = itemsData.reduce((sum, it) => sum + it.quantity, 0);
    const totalPackages = itemsData.reduce((sum, it) => sum + (it.noOfPackets || 0), 0);

    // Discrepancy warning & partial dispatch detection
    let isPartialDispatch = Boolean(data.isPartialDispatch);
    if (linkedOrder) {
      const orderTotalUnits = linkedOrder.items.reduce((sum: number, it: any) => sum + Number(it.quantity), 0);
      if (totalQuantity < orderTotalUnits) {
        isPartialDispatch = true;
      }
    }

    const digitalAckToken = crypto.randomBytes(16).toString('hex');

    const packingList = await prisma.packingList.create({
      data: {
        packingListNumber,
        orderId: data.orderId || null,
        proformaInvoiceId: data.proformaInvoiceId || null,
        customerId: customer.id,
        companyProfileId: company.id,
        date: data.date ? new Date(data.date) : new Date(),
        consignorName: data.consignorName || company.legalName || 'M/s. Pacific Products & Solutions',
        consignorAddress: data.consignorAddress || company.addresses?.[0]?.addressLine1 || 'H-3, JR Complex, Mela Ram Farm, Mandoli, New Delhi-110093',
        shipToName: data.shipToName || customer.legalName,
        shipToAddress: data.shipToAddress || customer.addresses?.[0]?.addressLine1 || '',
        siteContactName: data.siteContactName || customer.contacts?.[0]?.name || null,
        siteContactPhone: data.siteContactPhone || customer.contacts?.[0]?.phone || null,
        isPartialDispatch,
        isStandalone: Boolean(data.isStandalone),
        totalQuantity,
        totalPackages,
        receiptStatus: 'DISPATCHED',
        checkedByName: data.checkedByName || 'Warehouse Team',
        authorisedSignatoryName: data.authorisedSignatoryName || company.signatories?.[0]?.name || 'Pacific Authorised Signatory',
        digitalAckToken,
        createdById: userId || null,
        items: {
          create: itemsData,
        },
      },
      include: { items: true, customer: true, order: true },
    });

    // Reconcile order dispatch status if linked
    if (data.orderId) {
      await ordersService.reconcileDispatch(data.orderId);
    }

    // Auto-deduct board inventory stock for dispatched board components
    try {
      const boardItemsToDeduct = itemsData
        .filter(
          (it: any) =>
            it.designNo &&
            (it.natureOfPacket === 'Board' ||
              it.description?.toLowerCase().includes('panel') ||
              it.description?.toLowerCase().includes('board') ||
              it.description?.toLowerCase().includes('door') ||
              it.description?.toLowerCase().includes('divider'))
        )
        .map((it: any) => ({
          designNo: it.designNo,
          size: it.size || undefined,
          quantity: Math.max(1, Math.ceil(Number(it.quantity) / 2)),
        }));

      if (boardItemsToDeduct.length > 0) {
        await boardInventoryService.autoDeductForIssueList({
          issueListId: packingList.id,
          issueListNumber: packingList.packingListNumber,
          orderId: packingList.orderId || undefined,
          packingListId: packingList.id,
          issueReference: `Packing List ${packingList.packingListNumber} Dispatch`,
          items: boardItemsToDeduct,
          createdById: userId,
        });
      }
    } catch (deductErr) {
      console.warn('[BoardInventory] Auto-deduction notice:', deductErr);
    }

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'CREATE',
        module: 'Logistics',
        entityType: 'PackingList',
        entityId: packingList.id,
        newData: { packingListNumber, totalQuantity, totalPackages, isPartialDispatch },
      });
    }

    return packingList;
  },

  async acknowledge(id: string, data: { receivedByName: string; receivedByPhone: string; signatureData?: string }) {
    const updated = await prisma.packingList.update({
      where: { id },
      data: {
        receiptStatus: 'ACKNOWLEDGED',
        receivedByName: data.receivedByName,
        receivedByPhone: data.receivedByPhone,
        receivedAt: new Date(),
        receiptSignatureData: data.signatureData || null,
      },
    });

    return updated;
  },

  async getByToken(token: string) {
    const pl = await prisma.packingList.findUnique({
      where: { digitalAckToken: token },
      include: {
        customer: true,
        order: { select: { id: true, orderNumber: true } },
        items: { orderBy: { serialNumber: 'asc' } },
      },
    });
    if (!pl) throw new Error('Packing list verification token not found or invalid');
    return pl;
  },

  async acknowledgeByToken(token: string, data: { receivedByName: string; receivedByPhone: string; signatureData?: string }) {
    const pl = await this.getByToken(token);
    return this.acknowledge(pl.id, data);
  },


  async update(id: string, data: any, userId?: string) {
    const existing = await prisma.packingList.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new Error('Packing List not found');

    const updatePayload: any = {};
    if (data.consignorName !== undefined) updatePayload.consignorName = data.consignorName;
    if (data.consignorAddress !== undefined) updatePayload.consignorAddress = data.consignorAddress;
    if (data.shipToName !== undefined) updatePayload.shipToName = data.shipToName;
    if (data.shipToAddress !== undefined) updatePayload.shipToAddress = data.shipToAddress;
    if (data.siteContactName !== undefined) updatePayload.siteContactName = data.siteContactName;
    if (data.siteContactPhone !== undefined) updatePayload.siteContactPhone = data.siteContactPhone;
    if (data.checkedByName !== undefined) updatePayload.checkedByName = data.checkedByName;
    if (data.authorisedSignatoryName !== undefined) updatePayload.authorisedSignatoryName = data.authorisedSignatoryName;
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.totalPackages !== undefined) updatePayload.totalPackages = Number(data.totalPackages) || 0;
    if (data.isPartialDispatch !== undefined) updatePayload.isPartialDispatch = Boolean(data.isPartialDispatch);

    if (data.items && Array.isArray(data.items)) {
      await prisma.packingListItem.deleteMany({ where: { packingListId: id } });
      let totalQty = 0;
      const itemsToCreate = data.items.map((it: any, idx: number) => {
        const qty = Number(it.quantity) || 0;
        totalQty += qty;
        return {
          packingListId: id,
          serialNumber: idx + 1,
          description: it.description || '',
          size: it.size || null,
          designNo: it.designNo || null,
          quantity: qty,
          noOfPackets: it.noOfPackets != null ? Number(it.noOfPackets) : null,
          natureOfPacket: it.natureOfPacket || null,
        };
      });
      await prisma.packingListItem.createMany({ data: itemsToCreate });
      updatePayload.totalQuantity = totalQty;
    }

    const updated = await prisma.packingList.update({
      where: { id },
      data: updatePayload,
      include: {
        customer: true,
        order: true,
        items: true,
      },
    });

    if (userId) {
      await auditService.log({
        module: 'Logistics',
        entityType: 'PACKING_LIST',
        entityId: id,
        action: 'UPDATE',
        userId,
        newData: data,
      });
    }

    return updated;
  },

  async delete(id: string, userId?: string) {
    const existing = await prisma.packingList.findUnique({ where: { id } });
    if (!existing) throw new Error('Packing List not found');

    await prisma.packingListItem.deleteMany({ where: { packingListId: id } });
    await prisma.packingList.delete({ where: { id } });

    if (userId) {
      await auditService.log({
        module: 'Logistics',
        entityType: 'PACKING_LIST',
        entityId: id,
        action: 'DELETE',
        userId,
        oldData: { packingListNumber: existing.packingListNumber },
      });
    }

    return { success: true, message: 'Packing List deleted successfully' };
  },

  async getPdfHtml(id: string): Promise<string> {
    const pl = await this.getById(id);

    const qrResult = await qrService.getOrCreateDocumentQr({
      documentType: 'PACKING_LIST',
      documentId: pl.id,
      documentNumber: pl.packingListNumber,
      companyName: pl.consignorName || 'Pacific Products & Solutions',
      partyName: pl.shipToName || 'Consignee',
      date: pl.date.toISOString(),
      totalAmount: Number(pl.totalQuantity) || 0,
      status: 'ISSUED',
    });

    return pdfService.generatePackingListPdfHtml({
      packingListNumber: pl.packingListNumber,
      date: pl.date.toISOString(),
      linkedOrderNumber: pl.order?.orderNumber,
      linkedPiNumber: pl.proformaInvoice?.piNumber,
      consignorName: pl.consignorName,
      consignorAddress: pl.consignorAddress,
      shipToName: pl.shipToName,
      shipToAddress: pl.shipToAddress,
      siteContactName: pl.siteContactName || undefined,
      siteContactPhone: pl.siteContactPhone || undefined,
      items: pl.items.map((it) => ({
        serialNumber: it.serialNumber,
        description: it.description,
        size: it.size || undefined,
        designNo: it.designNo || undefined,
        quantity: Number(it.quantity),
        noOfPackets: it.noOfPackets != null ? Number(it.noOfPackets) : undefined,
        natureOfPacket: it.natureOfPacket || undefined,
      })),
      totalQuantity: Number(pl.totalQuantity),
      totalPackages: pl.totalPackages || undefined,
      isPartialDispatch: pl.isPartialDispatch,
      checkedByName: pl.checkedByName || undefined,
      authorisedSignatoryName: pl.authorisedSignatoryName || undefined,
      receivedByName: pl.receivedByName || undefined,
      receivedByPhone: pl.receivedByPhone || undefined,
      receivedAt: pl.receivedAt?.toISOString(),
      receiptSignatureData: pl.receiptSignatureData || undefined,
      qrDataUrl: qrResult.qrDataUrl,
    });
  },

  async listPacketTypes() {
    const cacheKey = 'lookup:packet-types';
    const cached = memoryCache.get<any[]>(cacheKey);
    if (cached) return cached;

    const data = await prisma.packetNatureLookup.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    memoryCache.set(cacheKey, data, 600);
    return data;
  },

  async addPacketType(name: string) {
    memoryCache.invalidate('lookup:packet-types');
    return prisma.packetNatureLookup.create({
      data: { name: name.trim() },
    });
  },
};
