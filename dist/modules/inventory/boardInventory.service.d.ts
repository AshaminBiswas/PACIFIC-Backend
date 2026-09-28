import { Prisma } from '@prisma/client';
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
        quantity: number;
    }>;
    createdById?: string;
}
export declare class BoardInventoryService {
    /**
     * List boards with search, filters & pagination
     */
    listBoards(filter: ListBoardsFilter): Promise<{
        items: ({
            vendor: {
                party: {
                    email: string | null;
                    id: string;
                    phone: string | null;
                    legalName: string;
                    tradeName: string | null;
                };
            } & {
                status: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                partyId: string;
                paymentTermsDays: number;
                vendorType: string;
            };
        } & {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            thickness: string;
            category: string;
            unit: string;
            designName: string | null;
            notes: string | null;
            boardType: string;
            size: string;
            vendorId: string;
            serialNumber: number;
            designNo: string;
            itemCode: string;
            warehouse: string;
            vendorName: string | null;
            openingStock: Prisma.Decimal;
            currentStock: Prisma.Decimal;
            totalInward: Prisma.Decimal;
            totalIssued: Prisma.Decimal;
            reorderLevel: Prisma.Decimal;
            unitCost: Prisma.Decimal | null;
            locationRack: string | null;
            lastAlertSentAt: Date | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Get single board SKU 360 view with transaction history
     */
    getBoardById(id: string): Promise<{
        vendor: {
            party: {
                status: string;
                email: string | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                notes: string | null;
                phone: string | null;
                companyProfileId: string | null;
                partyType: import(".prisma/client").$Enums.PartyType;
                legalName: string;
                tradeName: string | null;
                gstin: string | null;
                pan: string | null;
            };
        } & {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            partyId: string;
            paymentTermsDays: number;
            vendorType: string;
        };
        movements: {
            id: string;
            createdAt: Date;
            createdById: string | null;
            notes: string | null;
            quantity: Prisma.Decimal;
            orderId: string | null;
            packingListId: string | null;
            warehouse: string;
            unitCost: Prisma.Decimal | null;
            movementDate: Date;
            movementNumber: string;
            movementType: import(".prisma/client").$Enums.BoardMovementType;
            stockBefore: Prisma.Decimal;
            stockAfter: Prisma.Decimal;
            supplierInvoiceNo: string | null;
            supplierInvoiceDate: Date | null;
            batchLotNo: string | null;
            totalValue: Prisma.Decimal | null;
            issueListId: string | null;
            issueListNumber: string | null;
            dispatchRecordId: string | null;
            issueReference: string | null;
            issuedToPerson: string | null;
            inventoryItemId: string;
        }[];
    } & {
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        thickness: string;
        category: string;
        unit: string;
        designName: string | null;
        notes: string | null;
        boardType: string;
        size: string;
        vendorId: string;
        serialNumber: number;
        designNo: string;
        itemCode: string;
        warehouse: string;
        vendorName: string | null;
        openingStock: Prisma.Decimal;
        currentStock: Prisma.Decimal;
        totalInward: Prisma.Decimal;
        totalIssued: Prisma.Decimal;
        reorderLevel: Prisma.Decimal;
        unitCost: Prisma.Decimal | null;
        locationRack: string | null;
        lastAlertSentAt: Date | null;
    }>;
    /**
     * Create a new board SKU master
     */
    createBoard(data: {
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
    }): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        thickness: string;
        category: string;
        unit: string;
        designName: string | null;
        notes: string | null;
        boardType: string;
        size: string;
        vendorId: string;
        serialNumber: number;
        designNo: string;
        itemCode: string;
        warehouse: string;
        vendorName: string | null;
        openingStock: Prisma.Decimal;
        currentStock: Prisma.Decimal;
        totalInward: Prisma.Decimal;
        totalIssued: Prisma.Decimal;
        reorderLevel: Prisma.Decimal;
        unitCost: Prisma.Decimal | null;
        locationRack: string | null;
        lastAlertSentAt: Date | null;
    }>;
    /**
     * Update board item details
     */
    updateBoard(id: string, data: {
        designNo?: string;
        designName?: string;
        size?: string;
        thickness?: string;
        boardType?: string;
        reorderLevel?: number;
        unitCost?: number;
        locationRack?: string;
        notes?: string;
    }): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        thickness: string;
        category: string;
        unit: string;
        designName: string | null;
        notes: string | null;
        boardType: string;
        size: string;
        vendorId: string;
        serialNumber: number;
        designNo: string;
        itemCode: string;
        warehouse: string;
        vendorName: string | null;
        openingStock: Prisma.Decimal;
        currentStock: Prisma.Decimal;
        totalInward: Prisma.Decimal;
        totalIssued: Prisma.Decimal;
        reorderLevel: Prisma.Decimal;
        unitCost: Prisma.Decimal | null;
        locationRack: string | null;
        lastAlertSentAt: Date | null;
    }>;
    /**
     * Delete board SKU
     */
    deleteBoard(id: string): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        thickness: string;
        category: string;
        unit: string;
        designName: string | null;
        notes: string | null;
        boardType: string;
        size: string;
        vendorId: string;
        serialNumber: number;
        designNo: string;
        itemCode: string;
        warehouse: string;
        vendorName: string | null;
        openingStock: Prisma.Decimal;
        currentStock: Prisma.Decimal;
        totalInward: Prisma.Decimal;
        totalIssued: Prisma.Decimal;
        reorderLevel: Prisma.Decimal;
        unitCost: Prisma.Decimal | null;
        locationRack: string | null;
        lastAlertSentAt: Date | null;
    }>;
    /**
     * Record Stock Inward (which date from which company add board in stock)
     */
    addStockInward(input: InwardStockInput): Promise<{
        item: {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            thickness: string;
            category: string;
            unit: string;
            designName: string | null;
            notes: string | null;
            boardType: string;
            size: string;
            vendorId: string;
            serialNumber: number;
            designNo: string;
            itemCode: string;
            warehouse: string;
            vendorName: string | null;
            openingStock: Prisma.Decimal;
            currentStock: Prisma.Decimal;
            totalInward: Prisma.Decimal;
            totalIssued: Prisma.Decimal;
            reorderLevel: Prisma.Decimal;
            unitCost: Prisma.Decimal | null;
            locationRack: string | null;
            lastAlertSentAt: Date | null;
        };
        movement: {
            id: string;
            createdAt: Date;
            createdById: string | null;
            notes: string | null;
            quantity: Prisma.Decimal;
            orderId: string | null;
            packingListId: string | null;
            warehouse: string;
            unitCost: Prisma.Decimal | null;
            movementDate: Date;
            movementNumber: string;
            movementType: import(".prisma/client").$Enums.BoardMovementType;
            stockBefore: Prisma.Decimal;
            stockAfter: Prisma.Decimal;
            supplierInvoiceNo: string | null;
            supplierInvoiceDate: Date | null;
            batchLotNo: string | null;
            totalValue: Prisma.Decimal | null;
            issueListId: string | null;
            issueListNumber: string | null;
            dispatchRecordId: string | null;
            issueReference: string | null;
            issuedToPerson: string | null;
            inventoryItemId: string;
        };
    }>;
    /**
     * Manual Stock Issue (factory production, sample, scrap)
     */
    issueStockManual(input: ManualIssueInput): Promise<{
        item: {
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            thickness: string;
            category: string;
            unit: string;
            designName: string | null;
            notes: string | null;
            boardType: string;
            size: string;
            vendorId: string;
            serialNumber: number;
            designNo: string;
            itemCode: string;
            warehouse: string;
            vendorName: string | null;
            openingStock: Prisma.Decimal;
            currentStock: Prisma.Decimal;
            totalInward: Prisma.Decimal;
            totalIssued: Prisma.Decimal;
            reorderLevel: Prisma.Decimal;
            unitCost: Prisma.Decimal | null;
            locationRack: string | null;
            lastAlertSentAt: Date | null;
        };
        movement: {
            id: string;
            createdAt: Date;
            createdById: string | null;
            notes: string | null;
            quantity: Prisma.Decimal;
            orderId: string | null;
            packingListId: string | null;
            warehouse: string;
            unitCost: Prisma.Decimal | null;
            movementDate: Date;
            movementNumber: string;
            movementType: import(".prisma/client").$Enums.BoardMovementType;
            stockBefore: Prisma.Decimal;
            stockAfter: Prisma.Decimal;
            supplierInvoiceNo: string | null;
            supplierInvoiceDate: Date | null;
            batchLotNo: string | null;
            totalValue: Prisma.Decimal | null;
            issueListId: string | null;
            issueListNumber: string | null;
            dispatchRecordId: string | null;
            issueReference: string | null;
            issuedToPerson: string | null;
            inventoryItemId: string;
        };
    }>;
    /**
     * Auto-deduct stock upon Issue List / Dispatch creation (Editable)
     */
    autoDeductForIssueList(input: AutoDeductInput): Promise<{
        success: boolean;
        deductions: {
            itemCode: string;
            designNo: string;
            deductedQty: number;
            movementId: string;
        }[];
        totalDeducted: number;
    }>;
    /**
     * Edit / Adjust an existing auto-deducted stock movement
     */
    adjustDeductionMovement(movementId: string, data: {
        newQuantity: number;
        reason?: string;
        adjustedByUserId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        createdById: string | null;
        notes: string | null;
        quantity: Prisma.Decimal;
        orderId: string | null;
        packingListId: string | null;
        warehouse: string;
        unitCost: Prisma.Decimal | null;
        movementDate: Date;
        movementNumber: string;
        movementType: import(".prisma/client").$Enums.BoardMovementType;
        stockBefore: Prisma.Decimal;
        stockAfter: Prisma.Decimal;
        supplierInvoiceNo: string | null;
        supplierInvoiceDate: Date | null;
        batchLotNo: string | null;
        totalValue: Prisma.Decimal | null;
        issueListId: string | null;
        issueListNumber: string | null;
        dispatchRecordId: string | null;
        issueReference: string | null;
        issuedToPerson: string | null;
        inventoryItemId: string;
    }>;
    /**
     * List 4 Board Suppliers with SKU counts & total stock
     */
    listSuppliers(): Promise<{
        id: string;
        partyId: string;
        name: string;
        legalName: string;
        vendorType: string;
        contactPerson: string | null;
        phone: string | null;
        email: string | null;
        totalSkus: number;
        totalSheets: number;
    }[]>;
    /**
     * Query Stock Movement Ledger (Audit Log)
     */
    getMovements(params: {
        inventoryItemId?: string;
        movementType?: string;
        timeframe?: 'day' | 'week' | 'month' | 'year' | 'custom';
        startDate?: string;
        endDate?: string;
        warehouse?: string;
        limit?: number;
    }): Promise<({
        inventoryItem: {
            id: string;
            thickness: string;
            category: string;
            designName: string | null;
            boardType: string;
            size: string;
            designNo: string;
            itemCode: string;
            warehouse: string;
            vendorName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        createdById: string | null;
        notes: string | null;
        quantity: Prisma.Decimal;
        orderId: string | null;
        packingListId: string | null;
        warehouse: string;
        unitCost: Prisma.Decimal | null;
        movementDate: Date;
        movementNumber: string;
        movementType: import(".prisma/client").$Enums.BoardMovementType;
        stockBefore: Prisma.Decimal;
        stockAfter: Prisma.Decimal;
        supplierInvoiceNo: string | null;
        supplierInvoiceDate: Date | null;
        batchLotNo: string | null;
        totalValue: Prisma.Decimal | null;
        issueListId: string | null;
        issueListNumber: string | null;
        dispatchRecordId: string | null;
        issueReference: string | null;
        issuedToPerson: string | null;
        inventoryItemId: string;
    })[]>;
    /**
     * Analytics & KPI Dashboard
     */
    getAnalyticsSummary(timeframe?: 'day' | 'week' | 'month' | 'year' | 'custom', startDate?: string, endDate?: string, warehouse?: string, category?: string): Promise<{
        totalSkus: number;
        totalSheets: number;
        totalValuation: number;
        lowStockCount: number;
        outOfStockCount: number;
        periodInward: number;
        periodIssued: number;
        supplierDistribution: Record<string, {
            skus: number;
            sheets: number;
            valuation: number;
        }>;
        thicknessDistribution: Record<string, number>;
        boardTypeDistribution: Record<string, number>;
    }>;
}
export declare const boardInventoryService: BoardInventoryService;
//# sourceMappingURL=boardInventory.service.d.ts.map