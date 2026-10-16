import { prisma } from '../../config/database';

export interface HardwareItemDto {
  id: string;
  sku: string;
  name: string;
  category: string;
  material: string;
  color: string;
  unit: string;
  hsnCode: string;
  warehouse: string;
  vendorId?: string;
  vendorName?: string;
  openingStock: number;
  currentStock: number;
  totalInward: number;
  totalIssued: number;
  reorderLevel: number;
  unitCost: number;
  locationRack?: string;
  dia?: string;
  length?: string;
  width?: string;
  imageUrl?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HardwareStockMovementDto {
  id: string;
  movementNumber: string;
  hardwareItemId: string;
  sku: string;
  hardwareName: string;
  material: string;
  warehouse: string;
  movementType: string;
  movementDate: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  unit: string;
  dia?: string;
  length?: string;
  width?: string;
  supplierInvoiceNo?: string;
  supplierInvoiceDate?: string;
  batchLotNo?: string;
  unitCost: number;
  totalValue: number;
  issueReference?: string;
  issuedToPerson?: string;
  notes?: string;
  createdById?: string;
  createdAt: string;
}

function mapRowToItem(r: any): HardwareItemDto {
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    category: r.category || 'Cubicle Hardware',
    material: r.material || 'STAINLESS_STEEL',
    color: r.color || r.finish || 'Standard',
    unit: r.unit || "No's",
    hsnCode: r.hsn_code || '8302',
    warehouse: r.warehouse || 'DELHI',
    vendorId: r.vendor_id || undefined,
    vendorName: r.vendor_name || undefined,
    openingStock: Number(r.opening_stock) || 0,
    currentStock: Number(r.current_stock) || 0,
    totalInward: Number(r.total_inward) || 0,
    totalIssued: Number(r.total_issued) || 0,
    reorderLevel: Number(r.reorder_level || r.reorder_qty) || 10,
    unitCost: Number(r.unit_cost) || 0,
    locationRack: r.location_rack || undefined,
    dia: r.dia || undefined,
    length: r.length || undefined,
    width: r.width || undefined,
    imageUrl: r.image_url || undefined,
    status: r.status || 'ACTIVE',
    notes: r.notes || r.description || undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapRowToMovement(r: any): HardwareStockMovementDto {
  return {
    id: r.id,
    movementNumber: r.movement_number,
    hardwareItemId: r.hardware_item_id,
    sku: r.sku,
    hardwareName: r.hardware_name || r.item_name || '',
    material: r.material || 'STAINLESS_STEEL',
    warehouse: r.warehouse || 'DELHI',
    movementType: r.movement_type || 'INWARD',
    movementDate: r.movement_date ? String(r.movement_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    quantity: Number(r.quantity) || 0,
    stockBefore: Number(r.stock_before) || 0,
    stockAfter: Number(r.stock_after) || 0,
    unit: r.unit || "No's",
    dia: r.dia || undefined,
    length: r.length || undefined,
    width: r.width || undefined,
    supplierInvoiceNo: r.supplier_invoice_no || r.vendor_invoice_no || undefined,
    supplierInvoiceDate: r.supplier_invoice_date ? String(r.supplier_invoice_date).slice(0, 10) : undefined,
    batchLotNo: r.batch_lot_no || undefined,
    unitCost: Number(r.unit_cost) || 0,
    totalValue: Number(r.total_value || r.total_valuation) || 0,
    issueReference: r.issue_reference || r.work_order_ref || undefined,
    issuedToPerson: r.issued_to_person || undefined,
    notes: r.notes || undefined,
    createdById: r.created_by_id || undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

function sqlStringOrNull(val: string | undefined | null): string {
  if (val === undefined || val === null) return 'NULL';
  const str = String(val).trim();
  if (str === '') return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function escapeSql(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).replace(/'/g, "''");
}

export class HardwareInventoryService {
  /**
   * List Hardware Inventory items with pagination and filters
   */
  async listItems(params: {
    page?: number;
    limit?: number;
    search?: string;
    warehouse?: string;
    material?: string;
    color?: string;
    unit?: string;
    vendorId?: string;
    status?: string;
    dia?: string;
    length?: string;
    width?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 25));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["1=1"];

    if (params.search) {
      const s = params.search.replace(/'/g, "''").trim();
      conditions.push(`(sku ILIKE '%${s}%' OR name ILIKE '%${s}%' OR color ILIKE '%${s}%')`);
    }
    if (params.warehouse && params.warehouse !== 'ALL') {
      const w = params.warehouse.replace(/'/g, "''").trim();
      conditions.push(`warehouse = '${w}'`);
    }
    if (params.material && params.material !== 'ALL') {
      const m = params.material.replace(/'/g, "''").trim();
      conditions.push(`material = '${m}'`);
    }
    if (params.status && params.status !== 'ALL') {
      const st = params.status.replace(/'/g, "''").trim();
      conditions.push(`status = '${st}'`);
    }
    if (params.color) {
      const c = params.color.replace(/'/g, "''").trim();
      conditions.push(`color = '${c}'`);
    }
    if (params.unit) {
      const u = params.unit.replace(/'/g, "''").trim();
      conditions.push(`unit = '${u}'`);
    }
    if (params.vendorId) {
      const v = params.vendorId.replace(/'/g, "''").trim();
      conditions.push(`vendor_id = '${v}'`);
    }
    if (params.dia) {
      const d = params.dia.replace(/'/g, "''").trim();
      conditions.push(`dia = '${d}'`);
    }
    if (params.length) {
      const l = params.length.replace(/'/g, "''").trim();
      conditions.push(`length = '${l}'`);
    }
    if (params.width) {
      const wd = params.width.replace(/'/g, "''").trim();
      conditions.push(`width = '${wd}'`);
    }

    const whereClause = conditions.join(' AND ');

    const [rows, countRes] = (await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM hardware_inventory_items 
        WHERE ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT count(*) as total FROM hardware_inventory_items 
        WHERE ${whereClause}
      `),
    ])) as [any[], any[]];

    const total = Number(countRes[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);
    const items = rows.map(mapRowToItem);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get item by ID or SKU
   */
  async getItemById(id: string) {
    const cleanId = id.replace(/'/g, "''").trim();
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_inventory_items 
      WHERE id = '${cleanId}' OR sku = '${cleanId}' 
      LIMIT 1
    `);

    if (!rows.length) {
      throw new Error(`Hardware item not found with ID or SKU: ${id}`);
    }

    const item = mapRowToItem(rows[0]);

    // Fetch up to 25 recent movements
    const movRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_stock_movements 
      WHERE hardware_item_id = '${escapeSql(item.id)}' OR sku = '${escapeSql(item.sku)}' 
      ORDER BY created_at DESC 
      LIMIT 25
    `);

    return {
      ...item,
      movements: movRows.map(mapRowToMovement),
    };
  }

  /**
   * Create a new Hardware SKU master
   */
  async createItem(data: {
    sku: string;
    name: string;
    material: string;
    color: string;
    unit?: string;
    hsnCode?: string;
    warehouse?: string;
    vendorId?: string;
    vendorName?: string;
    openingStock?: number;
    reorderLevel?: number;
    unitCost?: number;
    locationRack?: string;
    dia?: string;
    length?: string;
    width?: string;
    imageUrl?: string;
    notes?: string;
  }) {
    if (!data.sku || !data.sku.trim()) {
      throw new Error('SKU / Part Number is required.');
    }
    if (!data.name || !data.name.trim()) {
      throw new Error('Hardware item name is required.');
    }
    const cleanSku = data.sku.trim().toUpperCase().replace(/'/g, "''");
    // Check if SKU exists
    const existing: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_inventory_items WHERE sku = '${cleanSku}' LIMIT 1
    `);
    if (existing.length > 0) {
      throw new Error(`Hardware item with SKU "${data.sku}" already exists.`);
    }

    const id = `hw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const opening = Number(data.openingStock) || 0;
    const reorder = Number(data.reorderLevel) || 10;
    const unitCost = Number(data.unitCost) || 0;
    const initialStatus = opening <= 0 ? 'OUT_OF_STOCK' : opening <= reorder ? 'LOW_STOCK' : 'ACTIVE';
    const now = new Date();

    const name = data.name.trim().replace(/'/g, "''");
    const material = (data.material || 'STAINLESS_STEEL').trim().replace(/'/g, "''");
    const color = (data.color || 'Standard').trim().replace(/'/g, "''");
    const unit = (data.unit || "No's").trim().replace(/'/g, "''");
    const hsn = (data.hsnCode || '8302').trim().replace(/'/g, "''");
    const wh = (data.warehouse || 'DELHI').trim().toUpperCase().replace(/'/g, "''");
    const vendorId = sqlStringOrNull(data.vendorId);
    const vendorName = sqlStringOrNull(data.vendorName);
    const locationRack = sqlStringOrNull(data.locationRack);
    const dia = sqlStringOrNull(data.dia);
    const length = sqlStringOrNull(data.length);
    const width = sqlStringOrNull(data.width);
    const imageUrl = sqlStringOrNull(data.imageUrl);
    const notes = sqlStringOrNull(data.notes);

    await prisma.$queryRawUnsafe(`
      INSERT INTO hardware_inventory_items (
        id, sku, name, category, material, color, unit, hsn_code, warehouse,
        vendor_id, vendor_name, opening_stock, current_stock, total_inward, total_issued,
        reorder_level, unit_cost, location_rack, dia, length, width, image_url,
        status, notes, created_at, updated_at
      ) VALUES (
        '${id}', '${cleanSku}', '${name}', 'Cubicle Hardware', '${material}', '${color}', '${unit}', '${hsn}', '${wh}',
        ${vendorId}, ${vendorName}, ${opening}, ${opening}, ${opening}, 0,
        ${reorder}, ${unitCost}, ${locationRack}, ${dia}, ${length}, ${width}, ${imageUrl},
        '${initialStatus}', ${notes}, NOW(), NOW()
      )
    `);

    // If opening stock > 0, log an initial inward movement
    if (opening > 0) {
      const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const movNum = `MOV-HW-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const totalVal = opening * unitCost;

      await prisma.$queryRawUnsafe(`
        INSERT INTO hardware_stock_movements (
          id, movement_number, hardware_item_id, sku, hardware_name, item_name,
          material, warehouse, movement_type, movement_date, quantity,
          stock_before, stock_after, unit, unit_cost, total_value, total_valuation,
          notes, created_at
        ) VALUES (
          '${movId}', '${movNum}', '${id}', '${cleanSku}', '${name}', '${name}',
          '${material}', '${wh}', 'INWARD', CURRENT_DATE, ${opening},
          0, ${opening}, '${unit}', ${unitCost}, ${totalVal}, ${totalVal},
          'Initial opening stock registration', NOW()
        )
      `);
    }

    const inserted: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_inventory_items WHERE id = '${id}' LIMIT 1
    `);

    return mapRowToItem(inserted[0]);
  }

  /**
   * Update an existing hardware item
   */
  async updateItem(id: string, data: Partial<HardwareItemDto>) {
    const cleanId = id.replace(/'/g, "''").trim();
    const existing: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_inventory_items WHERE id = '${cleanId}' LIMIT 1
    `);
    if (!existing.length) {
      throw new Error(`Hardware item not found with ID: ${id}`);
    }

    const sets: string[] = ['updated_at = NOW()'];

    if (data.name !== undefined) sets.push(`name = '${data.name.replace(/'/g, "''")}'`);
    if (data.material !== undefined) sets.push(`material = '${data.material.replace(/'/g, "''")}'`);
    if (data.color !== undefined) sets.push(`color = '${data.color.replace(/'/g, "''")}'`);
    if (data.unit !== undefined) sets.push(`unit = '${data.unit.replace(/'/g, "''")}'`);
    if (data.hsnCode !== undefined) sets.push(`hsn_code = '${data.hsnCode.replace(/'/g, "''")}'`);
    if (data.warehouse !== undefined) sets.push(`warehouse = '${data.warehouse.replace(/'/g, "''")}'`);
    if (data.vendorId !== undefined) sets.push(`vendor_id = ${sqlStringOrNull(data.vendorId)}`);
    if (data.vendorName !== undefined) sets.push(`vendor_name = ${sqlStringOrNull(data.vendorName)}`);
    if (data.reorderLevel !== undefined) sets.push(`reorder_level = ${Number(data.reorderLevel) || 10}`);
    if (data.unitCost !== undefined) sets.push(`unit_cost = ${Number(data.unitCost) || 0}`);
    if (data.locationRack !== undefined) sets.push(`location_rack = ${sqlStringOrNull(data.locationRack)}`);
    if (data.dia !== undefined) sets.push(`dia = ${sqlStringOrNull(data.dia)}`);
    if (data.length !== undefined) sets.push(`length = ${sqlStringOrNull(data.length)}`);
    if (data.width !== undefined) sets.push(`width = ${sqlStringOrNull(data.width)}`);
    if (data.imageUrl !== undefined) sets.push(`image_url = ${sqlStringOrNull(data.imageUrl)}`);
    if (data.status !== undefined) sets.push(`status = '${data.status.replace(/'/g, "''")}'`);
    if (data.notes !== undefined) sets.push(`notes = ${sqlStringOrNull(data.notes)}`);

    await prisma.$queryRawUnsafe(`
      UPDATE hardware_inventory_items 
      SET ${sets.join(', ')} 
      WHERE id = '${cleanId}'
    `);

    const updated: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_inventory_items WHERE id = '${cleanId}' LIMIT 1
    `);

    return mapRowToItem(updated[0]);
  }

  /**
   * Delete hardware item and related movements
   */
  async deleteItem(id: string) {
    const cleanId = id.replace(/'/g, "''").trim();
    await prisma.$queryRawUnsafe(`
      DELETE FROM hardware_stock_movements WHERE hardware_item_id = '${cleanId}'
    `);
    await prisma.$queryRawUnsafe(`
      DELETE FROM hardware_inventory_items WHERE id = '${cleanId}'
    `);
    return { success: true };
  }

  /**
   * Inward Stock Movement
   */
  async inwardStock(data: {
    hardwareItemId: string;
    quantity: number;
    warehouse?: string;
    supplierInvoiceNo?: string;
    supplierInvoiceDate?: string;
    batchLotNo?: string;
    unitCost?: number;
    locationRack?: string;
    notes?: string;
  }) {
    const cleanId = data.hardwareItemId.replace(/'/g, "''").trim();
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_inventory_items WHERE id = '${cleanId}' LIMIT 1
    `);
    if (!rows.length) throw new Error('Selected hardware item was not found.');

    const item = rows[0];
    const qty = Number(data.quantity) || 0;
    if (qty <= 0) throw new Error('Inward quantity must be greater than zero.');

    const stockBefore = Number(item.current_stock) || 0;
    const stockAfter = stockBefore + qty;
    const reorder = Number(item.reorder_level) || 10;
    const updatedStatus = stockAfter <= 0 ? 'OUT_OF_STOCK' : stockAfter <= reorder ? 'LOW_STOCK' : 'ACTIVE';
    const unitCost = data.unitCost !== undefined ? Number(data.unitCost) : Number(item.unit_cost) || 0;
    const totalVal = qty * unitCost;

    const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const movNum = `INW-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const invNo = sqlStringOrNull(data.supplierInvoiceNo);
    const invDate = sqlStringOrNull(data.supplierInvoiceDate);
    const batchNo = sqlStringOrNull(data.batchLotNo);
    const notes = sqlStringOrNull(data.notes);
    const rack = data.locationRack ? sqlStringOrNull(data.locationRack) : item.location_rack ? sqlStringOrNull(item.location_rack) : 'NULL';

    const cleanWarehouse = escapeSql(data.warehouse || item.warehouse || 'DELHI');
    const cleanSku = escapeSql(item.sku);
    const cleanName = escapeSql(item.name);
    const cleanMaterial = escapeSql(item.material || 'STAINLESS_STEEL');
    const cleanUnit = escapeSql(item.unit || "No's");

    // 1. Update item stock
    await prisma.$queryRawUnsafe(`
      UPDATE hardware_inventory_items 
      SET 
        current_stock = ${stockAfter}, 
        total_inward = total_inward + ${qty},
        unit_cost = ${unitCost},
        status = '${updatedStatus}',
        location_rack = ${rack},
        updated_at = NOW()
      WHERE id = '${cleanId}'
    `);

    // 2. Insert stock movement
    await prisma.$queryRawUnsafe(`
      INSERT INTO hardware_stock_movements (
        id, movement_number, hardware_item_id, sku, hardware_name, item_name,
        material, warehouse, movement_type, movement_date, quantity,
        stock_before, stock_after, unit, unit_cost, total_value, total_valuation,
        supplier_invoice_no, supplier_invoice_date, batch_lot_no, notes, created_at
      ) VALUES (
        '${movId}', '${movNum}', '${cleanId}', '${cleanSku}', '${cleanName}', '${cleanName}',
        '${cleanMaterial}', '${cleanWarehouse}', 'INWARD', CURRENT_DATE, ${qty},
        ${stockBefore}, ${stockAfter}, '${cleanUnit}', ${unitCost}, ${totalVal}, ${totalVal},
        ${invNo}, ${invDate}, ${batchNo}, ${notes}, NOW()
      )
    `);

    const updatedItemRow: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_inventory_items WHERE id = '${cleanId}' LIMIT 1
    `);
    const movRow: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_stock_movements WHERE id = '${movId}' LIMIT 1
    `);

    return {
      item: mapRowToItem(updatedItemRow[0]),
      movement: mapRowToMovement(movRow[0]),
    };
  }

  /**
   * Issue Stock Movement
   */
  async issueStock(data: {
    hardwareItemId: string;
    quantity: number;
    warehouse?: string;
    issueReference?: string;
    issuedToPerson?: string;
    notes?: string;
  }) {
    const cleanId = data.hardwareItemId.replace(/'/g, "''").trim();
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_inventory_items WHERE id = '${cleanId}' LIMIT 1
    `);
    if (!rows.length) throw new Error('Selected hardware item was not found.');

    const item = rows[0];
    const qty = Number(data.quantity) || 0;
    if (qty <= 0) throw new Error('Issue quantity must be greater than zero.');

    const stockBefore = Number(item.current_stock) || 0;
    if (stockBefore < qty) {
      throw new Error(`Insufficient stock. Current available: ${stockBefore} ${item.unit || "No's"}`);
    }

    const stockAfter = stockBefore - qty;
    const reorder = Number(item.reorder_level) || 10;
    const updatedStatus = stockAfter <= 0 ? 'OUT_OF_STOCK' : stockAfter <= reorder ? 'LOW_STOCK' : 'ACTIVE';
    const unitCost = Number(item.unit_cost) || 0;
    const totalVal = qty * unitCost;

    const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const movNum = `ISS-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const issueRef = sqlStringOrNull(data.issueReference);
    const issuedTo = sqlStringOrNull(data.issuedToPerson);
    const notes = sqlStringOrNull(data.notes);

    const cleanWarehouse = escapeSql(data.warehouse || item.warehouse || 'DELHI');
    const cleanSku = escapeSql(item.sku);
    const cleanName = escapeSql(item.name);
    const cleanMaterial = escapeSql(item.material || 'STAINLESS_STEEL');
    const cleanUnit = escapeSql(item.unit || "No's");

    // 1. Update item stock
    await prisma.$queryRawUnsafe(`
      UPDATE hardware_inventory_items 
      SET 
        current_stock = ${stockAfter}, 
        total_issued = total_issued + ${qty},
        status = '${updatedStatus}',
        updated_at = NOW()
      WHERE id = '${cleanId}'
    `);

    // 2. Insert stock movement
    await prisma.$queryRawUnsafe(`
      INSERT INTO hardware_stock_movements (
        id, movement_number, hardware_item_id, sku, hardware_name, item_name,
        material, warehouse, movement_type, movement_date, quantity,
        stock_before, stock_after, unit, unit_cost, total_value, total_valuation,
        issue_reference, issued_to_person, notes, created_at
      ) VALUES (
        '${movId}', '${movNum}', '${cleanId}', '${cleanSku}', '${cleanName}', '${cleanName}',
        '${cleanMaterial}', '${cleanWarehouse}', 'ISSUE', CURRENT_DATE, ${qty},
        ${stockBefore}, ${stockAfter}, '${cleanUnit}', ${unitCost}, ${totalVal}, ${totalVal},
        ${issueRef}, ${issuedTo}, ${notes}, NOW()
      )
    `);

    const updatedItemRow: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_inventory_items WHERE id = '${cleanId}' LIMIT 1
    `);
    const movRow: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_stock_movements WHERE id = '${movId}' LIMIT 1
    `);

    return {
      item: mapRowToItem(updatedItemRow[0]),
      movement: mapRowToMovement(movRow[0]),
    };
  }

  /**
   * List Stock Movements
   */
  async listMovements(params: {
    hardwareItemId?: string;
    sku?: string;
    warehouse?: string;
    movementType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 25));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["1=1"];

    if (params.hardwareItemId) {
      conditions.push(`hardware_item_id = '${params.hardwareItemId.replace(/'/g, "''")}'`);
    }
    if (params.sku) {
      conditions.push(`sku = '${params.sku.replace(/'/g, "''")}'`);
    }
    if (params.warehouse && params.warehouse !== 'ALL') {
      conditions.push(`warehouse = '${params.warehouse.replace(/'/g, "''")}'`);
    }
    if (params.movementType && params.movementType !== 'ALL') {
      conditions.push(`movement_type = '${params.movementType.replace(/'/g, "''")}'`);
    }

    const whereClause = conditions.join(' AND ');

    const [rows, countRes] = (await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM hardware_stock_movements 
        WHERE ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT count(*) as total FROM hardware_stock_movements 
        WHERE ${whereClause}
      `),
    ])) as [any[], any[]];

    const total = Number(countRes[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);

    return {
      items: rows.map(mapRowToMovement),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get Live Analytics & Metrics
   */
  async getAnalyticsSummary(warehouse?: string) {
    const whClause = warehouse && warehouse !== 'ALL' ? `WHERE warehouse = '${warehouse.replace(/'/g, "''").toUpperCase()}'` : '';
    const [items, movements] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM hardware_inventory_items ${whClause}`),
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM hardware_stock_movements ${whClause} ORDER BY created_at DESC`),
    ]);

    const totalSkus = items.length;
    let totalUnits = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const materialDistribution: Record<string, { skus: number; units: number; valuation: number }> = {};
    const branchDistribution: Record<string, { skus: number; units: number; valuation: number }> = {};
    const colorDistribution: Record<string, number> = {};
    const unitDistribution: Record<string, number> = {};

    items.forEach((item) => {
      const stock = Number(item.current_stock) || 0;
      const cost = Number(item.unit_cost) || 0;
      const val = stock * cost;

      totalUnits += stock;
      totalValuation += val;

      const reorder = Number(item.reorder_level || item.reorder_qty) || 10;
      if (stock <= 0) outOfStockCount++;
      else if (stock <= reorder) lowStockCount++;

      const mat = item.material || 'OTHER';
      if (!materialDistribution[mat]) materialDistribution[mat] = { skus: 0, units: 0, valuation: 0 };
      materialDistribution[mat].skus++;
      materialDistribution[mat].units += stock;
      materialDistribution[mat].valuation += val;

      const wh = item.warehouse || 'DELHI';
      if (!branchDistribution[wh]) branchDistribution[wh] = { skus: 0, units: 0, valuation: 0 };
      branchDistribution[wh].skus++;
      branchDistribution[wh].units += stock;
      branchDistribution[wh].valuation += val;

      const col = item.color || item.finish || 'Standard';
      colorDistribution[col] = (colorDistribution[col] || 0) + 1;

      const u = item.unit || "No's";
      unitDistribution[u] = (unitDistribution[u] || 0) + 1;
    });

    const inwardMovements = movements.filter((m) => m.movement_type === 'INWARD');
    const issueMovements = movements.filter((m) => m.movement_type === 'ISSUE');

    const totalInwardUnits = inwardMovements.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
    const totalIssuedUnits = issueMovements.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);

    return {
      totalSkus,
      totalUnits,
      totalValuation: Math.round(totalValuation * 100) / 100,
      lowStockCount,
      outOfStockCount,
      totalInwardUnits,
      totalIssuedUnits,
      materialDistribution,
      branchDistribution,
      colorDistribution,
      unitDistribution,
      recentMovements: movements.slice(0, 10).map(mapRowToMovement),
    };
  }

  /**
   * List Hardware Branches
   */
  async listBranches() {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_branches ORDER BY code ASC
    `);
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      city: r.city,
      state: r.state,
      address: r.address || undefined,
      phone: r.phone || undefined,
      contactPerson: r.contact_person || undefined,
      isDefault: Boolean(r.is_default),
      isActive: Boolean(r.is_active),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * List Hardware Vendors
   */
  async listVendors() {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM hardware_vendors ORDER BY name ASC
    `);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      legalName: r.legal_name || r.name,
      contactPerson: r.contact_person || undefined,
      phone: r.phone || '',
      email: r.email || undefined,
      gstin: r.gstin || undefined,
      city: r.city || undefined,
      address: r.address || undefined,
      materialCategories: Array.isArray(r.materials_supplied) ? r.materials_supplied : ['STAINLESS_STEEL'],
      totalSkus: Number(r.total_skus) || 0,
      isActive: Boolean(r.is_active !== false && r.status !== 'INACTIVE'),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * Delete Vendor
   */
  async deleteVendor(id: string) {
    const cleanId = id.replace(/'/g, "''").trim();
    await prisma.$queryRawUnsafe(`
      DELETE FROM hardware_vendors WHERE id = '${cleanId}'
    `);
    return { success: true };
  }
}

export const hardwareInventoryService = new HardwareInventoryService();
