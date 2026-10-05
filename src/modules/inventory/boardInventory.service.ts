import { PrismaClient, Prisma } from '@prisma/client';
import { inventoryAlertService } from './inventoryAlert.service';

const prisma = new PrismaClient();

export interface ListBoardsFilter {
  search?: string;
  vendorId?: string;
  vendorName?: string;
  boardType?: string;
  thickness?: string;
  status?: string;
  warehouse?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface InwardStockInput {
  inventoryItemId: string;
  quantity: number;
  supplierInvoiceNo?: string;
  supplierInvoiceDate?: string | Date;
  batchLotNo?: string;
  unitCost?: number;
  notes?: string;
  createdById?: string;
}

export interface ManualIssueInput {
  inventoryItemId: string;
  quantity: number;
  issueReference?: string;
  issuedToPerson?: string;
  notes?: string;
  createdById?: string;
}

export interface AutoDeductInput {
  issueListId: string;
  issueListNumber: string;
  orderId?: string;
  packingListId?: string;
  dispatchRecordId?: string;
  issueReference?: string;
  issuedToPerson?: string;
  items: Array<{
    designNo: string;
    thickness?: string;
    size?: string;
    quantity: number; // Sheets or panels
  }>;
  createdById?: string;
}

export class BoardInventoryService {
  /**
   * List boards with search, filters & pagination
   */
  async listBoards(filter: ListBoardsFilter) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.BoardInventoryItemWhereInput = {};

    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { designNo: { contains: q, mode: 'insensitive' } },
        { designName: { contains: q, mode: 'insensitive' } },
        { itemCode: { contains: q, mode: 'insensitive' } },
        { vendorName: { contains: q, mode: 'insensitive' } },
        { size: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filter.vendorId) {
      where.vendorId = filter.vendorId;
    }

    if (filter.vendorName && filter.vendorName !== 'ALL') {
      where.vendorName = { contains: filter.vendorName, mode: 'insensitive' };
    }

    if (filter.boardType && filter.boardType !== 'ALL') {
      where.boardType = { contains: filter.boardType, mode: 'insensitive' };
    }

    if (filter.thickness && filter.thickness !== 'ALL') {
      where.thickness = filter.thickness;
    }

    if (filter.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }

    if (filter.warehouse && filter.warehouse !== 'ALL') {
      where.warehouse = filter.warehouse.toUpperCase();
    }

    if (filter.category && filter.category !== 'ALL') {
      where.category = filter.category;
    }

    const [total, items] = await Promise.all([
      prisma.boardInventoryItem.count({ where }),
      prisma.boardInventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ serialNumber: 'asc' }],
        include: {
          vendor: {
            include: {
              party: {
                select: { id: true, legalName: true, tradeName: true, phone: true, email: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single board SKU 360 view with transaction history
   */
  async getBoardById(id: string) {
    const board = await prisma.boardInventoryItem.findUnique({
      where: { id },
      include: {
        vendor: {
          include: {
            party: true,
          },
        },
        movements: {
          take: 50,
          orderBy: { movementDate: 'desc' },
        },
      },
    });

    if (!board) {
      throw new Error(`Board SKU not found with ID: ${id}`);
    }

    return board;
  }

  /**
   * Create a new board SKU master
   */
  async createBoard(data: {
    category?: string;
    warehouse?: string;
    designNo: string;
    designName?: string;
    size: string;
    thickness: string;
    boardType: string;
    vendorId: string;
    vendorName?: string;
    openingStock?: number;
    reorderLevel?: number;
    unitCost?: number;
    locationRack?: string;
    notes?: string;
  }) {
    // Lookup vendor profile by vendorProfile.id or partyId
    let vendorProfile = await prisma.vendorProfile.findFirst({
      where: {
        OR: [
          { id: data.vendorId },
          { partyId: data.vendorId },
        ],
      },
      include: { party: true },
    });

    if (!vendorProfile) {
      // Check if data.vendorId is a businessParty
      const party = await prisma.businessParty.findUnique({
        where: { id: data.vendorId },
      });
      if (party) {
        vendorProfile = await prisma.vendorProfile.create({
          data: {
            partyId: party.id,
            vendorType: 'HPL_BOARDS',
          },
          include: { party: true },
        });
      }
    }

    const resolvedVendorId = vendorProfile?.id || data.vendorId;
    const vendorName =
      data.vendorName ||
      vendorProfile?.party?.tradeName ||
      vendorProfile?.party?.legalName ||
      'Supplier';

    const category = data.category?.trim() || 'RESTROOM_CUBICLE';
    const warehouse = (data.warehouse?.trim() || 'DELHI').toUpperCase();

    const prefix = vendorName.slice(0, 3).toUpperCase();
    const cleanDesign = data.designNo.replace(/[^a-zA-Z0-9]/g, '');
    const cleanThick = data.thickness.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const itemCode = `BRD-${warehouse.slice(0, 3)}-${prefix}-${cleanDesign}-${cleanThick}-${Date.now().toString().slice(-4)}`;

    const opening = Number(data.openingStock) || 0;
    const reorder = Number(data.reorderLevel) || 10;
    const initialStatus = opening === 0 ? 'OUT_OF_STOCK' : opening <= reorder ? 'LOW_STOCK' : 'ACTIVE';

    const createdItem = await prisma.$transaction(async (tx) => {
      const item = await tx.boardInventoryItem.create({
        data: {
          itemCode,
          category,
          warehouse,
          designNo: data.designNo.trim(),
          designName: data.designName?.trim() || null,
          size: data.size.trim(),
          thickness: data.thickness.trim(),
          boardType: data.boardType.trim(),
          vendorId: resolvedVendorId,
          vendorName,
          openingStock: opening,
          currentStock: opening,
          totalInward: opening,
          totalIssued: 0,
          reorderLevel: reorder,
          unitCost: data.unitCost ? Number(data.unitCost) : null,
          locationRack: data.locationRack?.trim() || null,
          status: initialStatus,
          notes: data.notes?.trim() || null,
        },
      });

      if (opening > 0) {
        await tx.boardStockMovement.create({
          data: {
            movementNumber: `BSM-OPN-${item.serialNumber.toString().padStart(4, '0')}`,
            inventoryItemId: item.id,
            warehouse: item.warehouse,
            movementType: 'INWARD',
            quantity: opening,
            stockBefore: 0,
            stockAfter: opening,
            supplierInvoiceNo: 'OPENING-STOCK',
            supplierInvoiceDate: new Date(),
            unitCost: data.unitCost ? Number(data.unitCost) : null,
            totalValue: data.unitCost ? opening * Number(data.unitCost) : null,
            notes: 'Initial opening stock allocation',
          },
        });
      }

      return item;
    });

    // Low stock automated email alert upon creation if opening stock <= reorder level
    if (opening <= reorder && !inventoryAlertService.isAlertPaused()) {
      inventoryAlertService
        .checkAndTriggerLowStockAlert(createdItem.id, 'New SKU Initialized at or below Reorder Level')
        .catch((err) => {
          console.error('[InventoryAlert] Creation alert dispatch error:', err.message);
        });
    }

    return createdItem;
  }

  /**
   * Update board item details
   */
  async updateBoard(
    id: string,
    data: {
      category?: string;
      warehouse?: string;
      vendorId?: string;
      vendorName?: string;
      designNo?: string;
      designName?: string;
      size?: string;
      thickness?: string;
      boardType?: string;
      openingStock?: number | string;
      currentStock?: number | string;
      reorderLevel?: number | string;
      unitCost?: number | string;
      locationRack?: string;
      notes?: string;
    }
  ) {
    const existing = await prisma.boardInventoryItem.findUnique({ where: { id } });
    if (!existing) throw new Error('Board SKU not found');

    const newReorder = data.reorderLevel !== undefined && data.reorderLevel !== '' 
      ? Number(data.reorderLevel) 
      : Number(existing.reorderLevel);

    let newOpening = existing.openingStock;
    let newCurrent = existing.currentStock;
    let newTotalInward = existing.totalInward;

    if (data.openingStock !== undefined && data.openingStock !== '') {
      const parsedOpening = Number(data.openingStock);
      if (!isNaN(parsedOpening) && parsedOpening >= 0) {
        const openingDiff = parsedOpening - Number(existing.openingStock);
        newOpening = new Prisma.Decimal(parsedOpening);

        // If currentStock is not explicitly provided, adjust currentStock by the difference in opening stock
        if (data.currentStock === undefined || data.currentStock === '') {
          const adjustedCurrent = Math.max(0, Number(existing.currentStock) + openingDiff);
          newCurrent = new Prisma.Decimal(adjustedCurrent);
        }

        const adjustedTotalInward = Math.max(0, Number(existing.totalInward) + openingDiff);
        newTotalInward = new Prisma.Decimal(adjustedTotalInward);
      }
    }

    if (data.currentStock !== undefined && data.currentStock !== '') {
      const parsedCurrent = Number(data.currentStock);
      if (!isNaN(parsedCurrent) && parsedCurrent >= 0) {
        newCurrent = new Prisma.Decimal(parsedCurrent);
      }
    }

    const currStockNum = Number(newCurrent);
    const newStatus = currStockNum === 0 ? 'OUT_OF_STOCK' : currStockNum <= newReorder ? 'LOW_STOCK' : 'ACTIVE';

    // If vendor changed, resolve vendor name
    let vendorName = data.vendorName;
    if (data.vendorId && data.vendorId !== existing.vendorId && !vendorName) {
      const vendorProfile = await prisma.vendorProfile.findFirst({
        where: { OR: [{ id: data.vendorId }, { partyId: data.vendorId }] },
        include: { party: true },
      });
      vendorName = vendorProfile?.party?.tradeName || vendorProfile?.party?.legalName || undefined;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.boardInventoryItem.update({
        where: { id },
        data: {
          category: data.category ? data.category.trim() : undefined,
          warehouse: data.warehouse ? data.warehouse.trim().toUpperCase() : undefined,
          vendorId: data.vendorId || undefined,
          vendorName: vendorName || undefined,
          designNo: data.designNo ? data.designNo.trim() : undefined,
          designName: data.designName !== undefined ? data.designName?.trim() || null : undefined,
          size: data.size ? data.size.trim() : undefined,
          thickness: data.thickness ? data.thickness.trim() : undefined,
          boardType: data.boardType ? data.boardType.trim() : undefined,
          openingStock: newOpening,
          currentStock: newCurrent,
          totalInward: newTotalInward,
          reorderLevel: newReorder,
          unitCost: data.unitCost !== undefined && data.unitCost !== '' ? Number(data.unitCost) : undefined,
          locationRack: data.locationRack !== undefined ? data.locationRack?.trim() || null : undefined,
          notes: data.notes !== undefined ? data.notes?.trim() || null : undefined,
          status: newStatus,
        },
      });

      // If openingStock changed, synchronize the initial opening stock movement record if it exists
      if (data.openingStock !== undefined && data.openingStock !== '') {
        const opnMovement = await tx.boardStockMovement.findFirst({
          where: {
            inventoryItemId: id,
            movementType: 'INWARD',
            movementNumber: { startsWith: 'BSM-OPN-' },
          },
        });
        if (opnMovement) {
          await tx.boardStockMovement.update({
            where: { id: opnMovement.id },
            data: {
              quantity: newOpening,
              stockAfter: newOpening,
            },
          });
        }
      }

      return item;
    });

    if (currStockNum <= newReorder && !inventoryAlertService.isAlertPaused()) {
      inventoryAlertService
        .checkAndTriggerLowStockAlert(updated.id, 'SKU Reorder Level or Properties Updated')
        .catch((err) => {
          console.error('[InventoryAlert] Update alert dispatch error:', err.message);
        });
    }

    return updated;
  }

  /**
   * Delete board SKU
   */
  async deleteBoard(id: string) {
    return prisma.boardInventoryItem.delete({ where: { id } });
  }

  /**
   * Record Stock Inward (which date from which company add board in stock)
   */
  async addStockInward(input: InwardStockInput) {
    const qty = Number(input.quantity);
    if (!qty || qty <= 0) {
      throw new Error('Inward quantity must be greater than 0');
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.boardInventoryItem.findUnique({
        where: { id: input.inventoryItemId },
      });
      if (!item) throw new Error('Board SKU not found');

      const stockBefore = Number(item.currentStock);
      const stockAfter = stockBefore + qty;
      const reorder = Number(item.reorderLevel);
      const updatedStatus = stockAfter <= reorder ? 'LOW_STOCK' : 'ACTIVE';

      // 1. Update BoardInventoryItem stock balances
      const updated = await tx.boardInventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: stockAfter,
          totalInward: Number(item.totalInward) + qty,
          unitCost: input.unitCost !== undefined ? Number(input.unitCost) : item.unitCost,
          status: updatedStatus,
        },
      });

      // 2. Generate unique movement number
      const seq = await tx.boardStockMovement.count();
      const movementNumber = `BSM-INW-${Date.now().toString().slice(-6)}-${(seq + 1).toString().padStart(4, '0')}`;

      // 3. Create immutable movement ledger
      const movement = await tx.boardStockMovement.create({
        data: {
          movementNumber,
          inventoryItemId: item.id,
          warehouse: item.warehouse,
          movementType: 'INWARD',
          movementDate: input.supplierInvoiceDate ? new Date(input.supplierInvoiceDate) : new Date(),
          quantity: qty,
          stockBefore,
          stockAfter,
          supplierInvoiceNo: input.supplierInvoiceNo || null,
          supplierInvoiceDate: input.supplierInvoiceDate ? new Date(input.supplierInvoiceDate) : null,
          batchLotNo: input.batchLotNo || null,
          unitCost: input.unitCost ? Number(input.unitCost) : item.unitCost,
          totalValue: input.unitCost ? qty * Number(input.unitCost) : null,
          notes: input.notes || null,
          createdById: input.createdById || null,
        },
      });

      return { item: updated, movement };
    });
  }

  /**
   * Manual Stock Issue (factory production, sample, scrap)
   */
  async issueStockManual(input: ManualIssueInput) {
    const qty = Number(input.quantity);
    if (!qty || qty <= 0) {
      throw new Error('Issue quantity must be greater than 0');
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.boardInventoryItem.findUnique({
        where: { id: input.inventoryItemId },
      });
      if (!item) throw new Error('Board SKU not found');

      const stockBefore = Number(item.currentStock);
      const stockAfter = Math.max(0, stockBefore - qty);
      const reorder = Number(item.reorderLevel);
      const updatedStatus = stockAfter === 0 ? 'OUT_OF_STOCK' : stockAfter <= reorder ? 'LOW_STOCK' : 'ACTIVE';

      // 1. Update BoardInventoryItem stock balances
      const updated = await tx.boardInventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: stockAfter,
          totalIssued: Number(item.totalIssued) + qty,
          status: updatedStatus,
        },
      });

      // 2. Generate unique movement number
      const seq = await tx.boardStockMovement.count();
      const movementNumber = `BSM-ISS-${Date.now().toString().slice(-6)}-${(seq + 1).toString().padStart(4, '0')}`;

      // 3. Create movement ledger entry
      const movement = await tx.boardStockMovement.create({
        data: {
          movementNumber,
          inventoryItemId: item.id,
          warehouse: item.warehouse,
          movementType: 'ISSUE_MANUAL',
          movementDate: new Date(),
          quantity: qty,
          stockBefore,
          stockAfter,
          issueReference: input.issueReference || 'Manual Factory Issue',
          issuedToPerson: input.issuedToPerson || null,
          notes: input.notes || null,
          createdById: input.createdById || null,
        },
      });

      return { item: updated, movement };
    });

    // Low stock automated email alert
    if (Number(result.item.currentStock) <= Number(result.item.reorderLevel) && !inventoryAlertService.isAlertPaused()) {
      inventoryAlertService
        .checkAndTriggerLowStockAlert(
          result.item.id,
          `Manual Stock Issue (${input.quantity} ${result.item.unit}) - ${input.issueReference || 'Factory Request'}`
        )
        .catch((err) => {
          console.error('[InventoryAlert] Alert dispatch error:', err.message);
        });
    }

    return result;
  }

  /**
   * Auto-deduct stock upon Issue List / Dispatch creation (Editable)
   */
  async autoDeductForIssueList(input: AutoDeductInput) {
    const results: Array<{ itemCode: string; designNo: string; deductedQty: number; movementId: string }> = [];

    await prisma.$transaction(async (tx) => {
      for (const reqItem of input.items) {
        if (!reqItem.quantity || reqItem.quantity <= 0) continue;

        // Find matching board inventory item by designNo (and optional thickness)
        const match = await tx.boardInventoryItem.findFirst({
          where: {
            designNo: { equals: reqItem.designNo.trim(), mode: 'insensitive' },
            ...(reqItem.thickness ? { thickness: { contains: reqItem.thickness.trim() } } : {}),
          },
        });

        if (!match) {
          console.warn(`[BoardInventory] No inventory match found for Design No: ${reqItem.designNo}`);
          continue;
        }

        const qty = Number(reqItem.quantity);
        const stockBefore = Number(match.currentStock);
        const stockAfter = Math.max(0, stockBefore - qty);
        const reorder = Number(match.reorderLevel);
        const updatedStatus = stockAfter === 0 ? 'OUT_OF_STOCK' : stockAfter <= reorder ? 'LOW_STOCK' : 'ACTIVE';

        // 1. Decrement currentStock
        await tx.boardInventoryItem.update({
          where: { id: match.id },
          data: {
            currentStock: stockAfter,
            totalIssued: Number(match.totalIssued) + qty,
            status: updatedStatus,
          },
        });

        // 2. Log ISSUE_AUTO movement
        const seq = await tx.boardStockMovement.count();
        const movementNumber = `BSM-AUTO-${Date.now().toString().slice(-6)}-${(seq + 1).toString().padStart(4, '0')}`;

        const m = await tx.boardStockMovement.create({
          data: {
            movementNumber,
            inventoryItemId: match.id,
            warehouse: match.warehouse,
            movementType: 'ISSUE_AUTO',
            movementDate: new Date(),
            quantity: qty,
            stockBefore,
            stockAfter,
            issueListId: input.issueListId,
            issueListNumber: input.issueListNumber,
            orderId: input.orderId || null,
            packingListId: input.packingListId || null,
            dispatchRecordId: input.dispatchRecordId || null,
            issueReference: input.issueReference || `Issue List ${input.issueListNumber}`,
            issuedToPerson: input.issuedToPerson || null,
            createdById: input.createdById || null,
          },
        });

        if (stockAfter <= reorder && !inventoryAlertService.isAlertPaused()) {
          inventoryAlertService
            .checkAndTriggerLowStockAlert(
              match.id,
              `Auto-Deduction for Issue List ${input.issueListNumber} (${qty} ${match.unit})`
            )
            .catch((err) => {
              console.error('[InventoryAlert] Auto-deduct alert dispatch error:', err.message);
            });
        }

        results.push({
          itemCode: match.itemCode,
          designNo: match.designNo,
          deductedQty: qty,
          movementId: m.id,
        });
      }
    });

    return {
      success: true,
      deductions: results,
      totalDeducted: results.reduce((acc, r) => acc + r.deductedQty, 0),
    };
  }

  /**
   * Edit / Adjust an existing auto-deducted stock movement
   */
  async adjustDeductionMovement(
    movementId: string,
    data: { newQuantity: number; reason?: string; adjustedByUserId?: string }
  ) {
    const newQty = Number(data.newQuantity);
    if (newQty < 0) throw new Error('Quantity cannot be negative');

    return prisma.$transaction(async (tx) => {
      const movement = await tx.boardStockMovement.findUnique({
        where: { id: movementId },
        include: { inventoryItem: true },
      });
      if (!movement) throw new Error('Movement record not found');

      const oldQty = Number(movement.quantity);
      const diff = newQty - oldQty; // If positive: deduct more; If negative: return stock
      if (diff === 0) return movement;

      const item = movement.inventoryItem;
      const currStock = Number(item.currentStock);
      const adjustedStock = Math.max(0, currStock - diff);
      const reorder = Number(item.reorderLevel);
      const newStatus = adjustedStock === 0 ? 'OUT_OF_STOCK' : adjustedStock <= reorder ? 'LOW_STOCK' : 'ACTIVE';

      // 1. Update Board Item stock balance
      await tx.boardInventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: adjustedStock,
          totalIssued: Math.max(0, Number(item.totalIssued) + diff),
          status: newStatus,
        },
      });

      // 2. Update movement record
      const updatedMovement = await tx.boardStockMovement.update({
        where: { id: movementId },
        data: {
          quantity: newQty,
          stockAfter: adjustedStock,
          notes: `${movement.notes ? movement.notes + ' | ' : ''}Adjusted from ${oldQty} to ${newQty} sheets (${data.reason || 'Manual Adjustment'})`,
        },
      });

      // Low stock alert check
      if (adjustedStock <= reorder && !inventoryAlertService.isAlertPaused()) {
        inventoryAlertService
          .checkAndTriggerLowStockAlert(
            item.id,
            `Stock Movement Adjusted to ${newQty} ${item.unit} (${data.reason || 'Reconciliation'})`
          )
          .catch((err) => {
            console.error('[InventoryAlert] Adjustment alert dispatch error:', err.message);
          });
      }

      return updatedMovement;
    });
  }

  /**
   * List 4 Board Suppliers with SKU counts & total stock
   */
  async listSuppliers() {
    // Fetch all active vendors from Vendor & Supplier Master (/admin/dashboard/vendors)
    const parties = await prisma.businessParty.findMany({
      where: {
        partyType: { in: ['VENDOR', 'BOTH'] },
        status: { not: 'DELETED' },
      },
      include: {
        vendorProfile: {
          include: {
            boardItems: {
              select: { id: true, currentStock: true },
            },
          },
        },
        contacts: true,
      },
      orderBy: { tradeName: 'asc' },
    });

    const suppliers = [];
    for (const party of parties) {
      let vendorProfile = party.vendorProfile;
      let boardItems: Array<{ id: string; currentStock: any }> = vendorProfile?.boardItems || [];
      if (!vendorProfile) {
        const newProfile = await prisma.vendorProfile.create({
          data: {
            partyId: party.id,
            vendorType: 'HPL_BOARDS',
          },
        });
        vendorProfile = newProfile as any;
        boardItems = [];
      }

      if (!vendorProfile) continue;

      const displayName = party.tradeName?.trim() || party.legalName?.trim() || 'Vendor';

      suppliers.push({
        id: vendorProfile.id,
        partyId: party.id,
        name: displayName,
        legalName: party.legalName,
        vendorType: vendorProfile.vendorType,
        contactPerson: party.contacts?.[0]?.name || null,
        phone: party.phone || null,
        email: party.email || null,
        totalSkus: boardItems.length,
        totalSheets: boardItems.reduce((acc: number, item: any) => acc + Number(item.currentStock), 0),
      });
    }

    return suppliers;
  }

  /**
   * Query Stock Movement Ledger (Audit Log)
   */
  async getMovements(params: {
    inventoryItemId?: string;
    movementType?: string;
    timeframe?: 'day' | 'week' | 'month' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
    warehouse?: string;
    limit?: number;
  }) {
    const where: Prisma.BoardStockMovementWhereInput = {};

    if (params.inventoryItemId) {
      where.inventoryItemId = params.inventoryItemId;
    }

    if (params.warehouse && params.warehouse !== 'ALL') {
      where.warehouse = params.warehouse.toUpperCase();
    }

    if (params.movementType && params.movementType !== 'ALL') {
      where.movementType = params.movementType as any;
    }

    // Timeframe filters
    const now = new Date();
    if (params.timeframe === 'day') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      where.movementDate = { gte: startOfDay };
    } else if (params.timeframe === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      where.movementDate = { gte: startOfWeek };
    } else if (params.timeframe === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      where.movementDate = { gte: startOfMonth };
    } else if (params.timeframe === 'year') {
      // Indian Financial Year: April 1 of current or previous year
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const startOfFy = new Date(fyYear, 3, 1, 0, 0, 0);
      where.movementDate = { gte: startOfFy };
    } else if (params.timeframe === 'custom' && params.startDate && params.endDate) {
      where.movementDate = {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      };
    }

    return prisma.boardStockMovement.findMany({
      where,
      take: Math.min(200, params.limit || 100),
      orderBy: { movementDate: 'desc' },
      include: {
        inventoryItem: {
          select: {
            id: true,
            itemCode: true,
            designNo: true,
            designName: true,
            size: true,
            thickness: true,
            boardType: true,
            vendorName: true,
            warehouse: true,
            category: true,
          },
        },
      },
    });
  }

  /**
   * Analytics & KPI Dashboard
   */
  async getAnalyticsSummary(
    timeframe?: 'day' | 'week' | 'month' | 'year' | 'custom',
    startDate?: string,
    endDate?: string,
    warehouse?: string,
    category?: string
  ) {
    const boardWhere: Prisma.BoardInventoryItemWhereInput = {};
    if (warehouse && warehouse !== 'ALL') {
      boardWhere.warehouse = warehouse.toUpperCase();
    }
    if (category && category !== 'ALL') {
      boardWhere.category = category;
    }

    const [allBoards, movements] = await Promise.all([
      prisma.boardInventoryItem.findMany({
        where: boardWhere,
        select: {
          id: true,
          designNo: true,
          boardType: true,
          thickness: true,
          vendorName: true,
          currentStock: true,
          unitCost: true,
          status: true,
          reorderLevel: true,
          warehouse: true,
          category: true,
        },
      }),
      this.getMovements({ timeframe, startDate, endDate, warehouse, limit: 500 }),
    ]);

    const totalSkus = allBoards.length;
    const totalSheets = allBoards.reduce((acc, b) => acc + Number(b.currentStock), 0);
    const totalValuation = allBoards.reduce((acc, b) => acc + Number(b.currentStock) * (Number(b.unitCost) || 0), 0);
    const lowStockCount = allBoards.filter((b) => b.status === 'LOW_STOCK').length;
    const outOfStockCount = allBoards.filter((b) => b.status === 'OUT_OF_STOCK').length;

    // Supplier Breakdown
    const supplierMap: Record<string, { skus: number; sheets: number; valuation: number }> = {
      'Royal Crown': { skus: 0, sheets: 0, valuation: 0 },
      Stylam: { skus: 0, sheets: 0, valuation: 0 },
      Merino: { skus: 0, sheets: 0, valuation: 0 },
      'Balaji Action Tesa': { skus: 0, sheets: 0, valuation: 0 },
    };

    allBoards.forEach((b) => {
      const vName = b.vendorName || 'Other';
      if (!supplierMap[vName]) {
        supplierMap[vName] = { skus: 0, sheets: 0, valuation: 0 };
      }
      supplierMap[vName].skus += 1;
      supplierMap[vName].sheets += Number(b.currentStock);
      supplierMap[vName].valuation += Number(b.currentStock) * (Number(b.unitCost) || 0);
    });

    // Thickness Breakdown
    const thicknessMap: Record<string, number> = {};
    allBoards.forEach((b) => {
      thicknessMap[b.thickness] = (thicknessMap[b.thickness] || 0) + Number(b.currentStock);
    });

    // Board Type Breakdown
    const boardTypeMap: Record<string, number> = {};
    allBoards.forEach((b) => {
      boardTypeMap[b.boardType] = (boardTypeMap[b.boardType] || 0) + Number(b.currentStock);
    });

    // Inward vs Outward in selected period
    const periodInward = movements
      .filter((m) => m.movementType === 'INWARD')
      .reduce((acc, m) => acc + Number(m.quantity), 0);
    const periodIssued = movements
      .filter((m) => m.movementType === 'ISSUE_AUTO' || m.movementType === 'ISSUE_MANUAL')
      .reduce((acc, m) => acc + Number(m.quantity), 0);

    return {
      totalSkus,
      totalSheets,
      totalValuation,
      lowStockCount,
      outOfStockCount,
      periodInward,
      periodIssued,
      supplierDistribution: supplierMap,
      thicknessDistribution: thicknessMap,
      boardTypeDistribution: boardTypeMap,
    };
  }
}

export const boardInventoryService = new BoardInventoryService();
