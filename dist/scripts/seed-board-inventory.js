"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const SUPPLIERS = [
    {
        legalName: 'ROYAL CROWN LAMINATES LTD',
        tradeName: 'Royal Crown',
        vendorType: 'HPL_BOARDS',
        contactPerson: 'Manoj Patel',
        phone: '+91 98250 11223',
        email: 'sales@royalcrownlaminates.com',
        city: 'Ahmedabad',
        state: 'Gujarat',
    },
    {
        legalName: 'STYLAM INDUSTRIES LIMITED',
        tradeName: 'Stylam',
        vendorType: 'HPL_BOARDS',
        contactPerson: 'Rajiv Sharma',
        phone: '+91 98140 22334',
        email: 'info@stylam.com',
        city: 'Panchkula',
        state: 'Haryana',
    },
    {
        legalName: 'MERINO INDUSTRIES LIMITED',
        tradeName: 'Merino',
        vendorType: 'HPL_BOARDS',
        contactPerson: 'Suresh Singhania',
        phone: '+91 98300 44556',
        email: 'merino@merinoindia.com',
        city: 'Kolkata',
        state: 'West Bengal',
    },
    {
        legalName: 'BALAJI ACTION BUILDWELL (ACTION TESA)',
        tradeName: 'Balaji Action Tesa',
        vendorType: 'HDF_BOARDS',
        contactPerson: 'Ajay Aggarwal',
        phone: '+91 98110 55667',
        email: 'sales@actiontesa.com',
        city: 'New Delhi',
        state: 'Delhi',
    },
];
async function seed() {
    console.log('Seeding 4 Board Suppliers and initial Board Inventory...');
    const vendorMap = new Map(); // tradeName -> vendorProfile.id
    for (const sup of SUPPLIERS) {
        let party = await prisma.businessParty.findFirst({
            where: {
                OR: [
                    { legalName: { contains: sup.tradeName, mode: 'insensitive' } },
                    { tradeName: { contains: sup.tradeName, mode: 'insensitive' } },
                ],
            },
            include: { vendorProfile: true },
        });
        if (!party) {
            party = await prisma.businessParty.create({
                data: {
                    legalName: sup.legalName,
                    tradeName: sup.tradeName,
                    partyType: 'VENDOR',
                    status: 'ACTIVE',
                    contacts: {
                        create: {
                            name: sup.contactPerson,
                            phone: sup.phone,
                            email: sup.email,
                            isPrimary: true,
                        },
                    },
                    addresses: {
                        create: {
                            addressType: 'BILLING',
                            addressLine1: 'Industrial Area Phase-II',
                            city: sup.city,
                            state: sup.state,
                            country: 'India',
                            postalCode: '110001',
                        },
                    },
                },
                include: { vendorProfile: true },
            });
        }
        let vendorProfile = party?.vendorProfile;
        if (!vendorProfile && party) {
            vendorProfile = await prisma.vendorProfile.create({
                data: {
                    partyId: party.id,
                    vendorType: sup.vendorType,
                    paymentTermsDays: 30,
                    status: 'ACTIVE',
                },
            });
        }
        if (vendorProfile) {
            vendorMap.set(sup.tradeName, vendorProfile.id);
            console.log(`✓ Supplier ready: ${sup.tradeName} (ID: ${vendorProfile.id})`);
        }
    }
    // Sample Board Inventory Items
    const SAMPLE_BOARDS = [
        {
            itemCode: 'BRD-STY-21091-12MM',
            designNo: '21091',
            designName: 'Frosty White Suede',
            size: "1220 x 2440 mm (4' x 8')",
            thickness: '12mm',
            boardType: 'Solid Compact Laminate (HPL)',
            supplierKey: 'Stylam',
            openingStock: 120,
            currentStock: 120,
            reorderLevel: 25,
            unitCost: 2850,
            locationRack: 'Bay 01 - Rack A-01',
        },
        {
            itemCode: 'BRD-STY-21055-12MM',
            designNo: '21055',
            designName: 'Slate Grey Suede',
            size: "1220 x 2440 mm (4' x 8')",
            thickness: '12mm',
            boardType: 'Solid Compact Laminate (HPL)',
            supplierKey: 'Stylam',
            openingStock: 85,
            currentStock: 85,
            reorderLevel: 20,
            unitCost: 2850,
            locationRack: 'Bay 01 - Rack A-02',
        },
        {
            itemCode: 'BRD-STY-4402-18MM',
            designNo: '4402',
            designName: 'Smoked Walnut Woodgrain',
            size: "1300 x 2800 mm (4.25' x 9.25')",
            thickness: '18mm',
            boardType: 'Solid Compact Laminate (HPL)',
            supplierKey: 'Stylam',
            openingStock: 45,
            currentStock: 45,
            reorderLevel: 15,
            unitCost: 4600,
            locationRack: 'Bay 01 - Rack B-01',
        },
        {
            itemCode: 'BRD-RC-101-12MM',
            designNo: 'RC-101',
            designName: 'Titanium Grey Gloss',
            size: "1220 x 2440 mm (4' x 8')",
            thickness: '12mm',
            boardType: 'Solid Compact Laminate (HPL)',
            supplierKey: 'Royal Crown',
            openingStock: 70,
            currentStock: 70,
            reorderLevel: 20,
            unitCost: 2750,
            locationRack: 'Bay 02 - Rack A-01',
        },
        {
            itemCode: 'BRD-RC-204-18MM',
            designNo: 'RC-204',
            designName: 'Natural Teak Texture',
            size: "1220 x 2440 mm (4' x 8')",
            thickness: '18mm',
            boardType: 'Solid Compact Laminate (HPL)',
            supplierKey: 'Royal Crown',
            openingStock: 30,
            currentStock: 30,
            reorderLevel: 10,
            unitCost: 4400,
            locationRack: 'Bay 02 - Rack A-03',
        },
        {
            itemCode: 'BRD-MER-3101-12MM',
            designNo: 'MR-3101',
            designName: 'Charcoal Matte',
            size: "1220 x 2440 mm (4' x 8')",
            thickness: '12mm',
            boardType: 'Solid Compact Laminate (HPL)',
            supplierKey: 'Merino',
            openingStock: 60,
            currentStock: 60,
            reorderLevel: 15,
            unitCost: 2900,
            locationRack: 'Bay 03 - Rack A-01',
        },
        {
            itemCode: 'BRD-MER-5208-18MM',
            designNo: 'MR-5208',
            designName: 'Alpine White',
            size: "1830 x 3660 mm (6' x 12')",
            thickness: '18mm',
            boardType: 'Solid Compact Laminate (HPL)',
            supplierKey: 'Merino',
            openingStock: 40,
            currentStock: 40,
            reorderLevel: 10,
            unitCost: 6800,
            locationRack: 'Bay 03 - Rack B-02',
        },
        {
            itemCode: 'BRD-ACT-HDHMR-12MM',
            designNo: 'ACT-HDHMR-12',
            designName: 'HDHMR Moisture Guard Raw Board',
            size: "1830 x 2440 mm (6' x 8')",
            thickness: '12mm',
            boardType: 'High Density Fiberboard (HDF)',
            supplierKey: 'Balaji Action Tesa',
            openingStock: 150,
            currentStock: 150,
            reorderLevel: 30,
            unitCost: 1650,
            locationRack: 'Bay 04 - Stack 01',
        },
        {
            itemCode: 'BRD-ACT-HDHMR-18MM',
            designNo: 'ACT-HDHMR-18',
            designName: 'HDHMR Moisture Guard High-Strength',
            size: "1830 x 2440 mm (6' x 8')",
            thickness: '18mm',
            boardType: 'High Density Fiberboard (HDF)',
            supplierKey: 'Balaji Action Tesa',
            openingStock: 110,
            currentStock: 110,
            reorderLevel: 25,
            unitCost: 2250,
            locationRack: 'Bay 04 - Stack 02',
        },
    ];
    for (const b of SAMPLE_BOARDS) {
        const vendorId = vendorMap.get(b.supplierKey);
        if (!vendorId)
            continue;
        const existing = await prisma.boardInventoryItem.findUnique({
            where: { itemCode: b.itemCode },
        });
        if (!existing) {
            const item = await prisma.boardInventoryItem.create({
                data: {
                    itemCode: b.itemCode,
                    designNo: b.designNo,
                    designName: b.designName,
                    size: b.size,
                    thickness: b.thickness,
                    boardType: b.boardType,
                    vendorId,
                    vendorName: b.supplierKey,
                    openingStock: b.openingStock,
                    currentStock: b.currentStock,
                    totalInward: b.openingStock,
                    totalIssued: 0,
                    reorderLevel: b.reorderLevel,
                    unitCost: b.unitCost,
                    locationRack: b.locationRack,
                    status: 'ACTIVE',
                },
            });
            // Create opening stock inward movement
            await prisma.boardStockMovement.create({
                data: {
                    movementNumber: `BSM-INIT-${item.serialNumber.toString().padStart(4, '0')}`,
                    inventoryItemId: item.id,
                    movementType: 'INWARD',
                    quantity: b.openingStock,
                    stockBefore: 0,
                    stockAfter: b.openingStock,
                    supplierInvoiceNo: 'INITIAL-OPENING-STOCK',
                    supplierInvoiceDate: new Date(),
                    unitCost: b.unitCost,
                    totalValue: b.openingStock * b.unitCost,
                    notes: `Opening inventory baseline for ${b.supplierKey} ${b.designNo}`,
                },
            });
            console.log(`✓ Seeded Board SKU: ${b.designNo} - ${b.designName} (${b.supplierKey})`);
        }
        else {
            console.log(`✓ Board SKU already exists: ${b.itemCode}`);
        }
    }
    console.log('🎉 Seeding completed successfully!');
}
seed()
    .catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-board-inventory.js.map