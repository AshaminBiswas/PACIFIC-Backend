# Pacific Restroom Cubicle — Backend Project Context

## 1. Project Overview

**Pacific Restroom Cubicle (PRC)** is a complete enterprise B2B manufacturing and trading platform for commercial restroom cubicles, toilet partitions, shower cubicles, urinal partitions, HPL lockers, cubicle hardware, and raw materials.

| Property | Value |
|----------|-------|
| **Project** | Pacific Restroom Cubicle Backend API (Enterprise ERP/CRM) |
| **Port** | 5001 |
| **API Prefix** | `/api/v1` |
| **Interactive Docs** | `http://localhost:5001/api/v1/docs` (Swagger UI) |
| **Admin URL** | `http://localhost:5176` (PACIFIC-Admin) |
| **Website URL** | `http://localhost:5173` (PACIFIC RESTROOM CUBICLE corporate site) |

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js ≥18, TypeScript 5.6 strict |
| Framework | Express.js v4 |
| ORM | Prisma Client v5.22 |
| Database | PostgreSQL via Supabase |
| Auth & RBAC | JWT (access + refresh tokens), bcryptjs, capability-based RBAC |
| Validation | Zod |
| Logging | Winston & Winston Daily Rotate |
| Document Gen | Custom Vector A4 Engine + `pdfmake` |
| API Docs | Swagger UI (`/docs`), OpenAPI 3.0 (`/docs/json`), `API_DOCS.md` |
| Security | Helmet, CORS, express-rate-limit, Signed QR Tokens |

## 3. Project Structure

```
D:\PACIFIC-Backend\
├── prisma/
│   └── schema.prisma         # Full B2B ERP/CRM models
├── src/
│   ├── server.ts             # HTTP server entry point (port 5001)
│   ├── app.ts                # Express app, middleware, all routes
│   ├── config/
│   │   ├── env.ts            # Typed environment config
│   │   ├── database.ts       # PrismaClient singleton
│   │   └── logger.ts         # Winston logger
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT verification, requireAuth, requireRole
│   │   ├── rbac.middleware.ts    # Granular capability check requirePermission, requireEntityScope
│   │   ├── validate.middleware.ts # Zod schema validator
│   │   └── error.middleware.ts   # notFoundHandler, errorHandler
│   ├── scripts/
│   │   └── fix-db.js         # Idempotent DB DDL patches for all ERP tables
│   └── modules/
│       ├── auth/             # Login, register, JWT refresh, logout
│       ├── companies/        # Multi-entity configuration (India GST / UAE VAT), bank details, signatories
│       ├── crm/              # B2B customer master & real-time Customer 360 view
│       ├── vendors/          # Supplier master (HPL boards, Hardware, SS, Aluminium, Nylon)
│       ├── procurement/      # Purchase orders, line items, atomic numbering, approval, A4 PDF
│       ├── sales/            # Proforma invoices, POS GST engine, atomic numbering, public QR, A4 PDF
│       ├── products-master/  # Extended products with materials, finishes, units, barcodes, HSN
│       ├── finance/          # Payments, document allocations, receivables & payables ledger
│       ├── followups/        # Payment follow-ups & dues recovery dashboard
│       ├── qr/               # QR generator, camera scan decoder, and public verification lookup
│       ├── audit/            # Centralized mutation audit logging
│       ├── docs/             # Swagger UI and OpenAPI 3.0 router
│       ├── tax/              # Centralized GST Tax Engine
│       ├── sequences/        # Concurrency-safe atomic sequence generator
│       ├── utils/            # numberToWords (INR & AED)
│       ├── pdf/              # A4 print-ready PDF/HTML generator
│       ├── configurator/     # 3D configurator design submissions
│       ├── quotes/           # Quotation generation
│       ├── leads/            # Website lead capture
│       ├── projects/         # Commercial project portfolio
│       ├── invoices/         # Invoices management
│       ├── cms/              # Blogs, Gallery, Hero Slides, Catalogs, FAQs, Testimonials
│       └── dashboard/        # Admin metrics + stats
├── API_DOCS.md
├── SWAGGER_DOCS.md
├── PROJECT_CONTEXT.md
└── .agents/skills/pacific-backend-dev/SKILL.md
```

## 4. Database Models

| Model | Purpose |
|-------|---------|
| `User` | Admin users with system roles and custom role assignments |
| `Role` / `Permission` | Granular capability-based access control |
| `CompanyProfile` | Multiple seller entities (India INR/GST & UAE AED/VAT) |
| `DocumentSequence` | Concurrency-safe, atomic, financial-year aware document sequences |
| `BusinessParty` | Shared business party layer for both Customers and Vendors |
| `CustomerProfile` | B2B customer credit limit, terms, and Customer 360 KPIs |
| `VendorProfile` | Supplier categorization (HPL, Hardware, Aluminium, SS, Nylon) |
| `PartyContact` / `Address` | Multiple contact persons and multi-address support (Bill To / Ship To) |
| `ProductCategory` / `Subcategory` | Product categorization hierarchy |
| `ProductMaterial` / `Finish` / `Unit` | Master specifications for compact laminate, stainless steel, etc. |
| `Product` | Centralized products with SKU, barcode, HSN/SAC, GST, cutting size |
| `PurchaseOrder` | Vendor purchase orders with atomic numbering `PRC/FY2026-27/000001` |
| `ProformaInvoice` | Customer PIs with atomic numbering `PPS/PI/2026-27/0815` & GST engine |
| `SalesQuotation` / `Item` / `Revision` | Formal sales quotation letters (`PPS/D/26-27/817`), narrative specs & revisions |
| `QuotationContentTemplate` | Boilerplate narrative clauses and terms & conditions library |
| `SalesOrder` / `Item` / `StatusHistory` | Central sales orders (`PPS/ORD/2026-27/0001`) with partial dispatch reconciliation |
| `PackingList` / `Item` / `PacketNature` | Packing lists (`PPS/PL/2026-27/0001`), BOM explosion & packet classification |
| `ProductBom` | Bill of materials definitions for cubicle components |
| `HardwareCatalogItem` | 44-item master hardware store catalog |
| `HardwareIssueList` / `Item` | Store hardware issuance (`PPS/HIL/2026-27/0001`) with 4-role sequential sign-off |
| `CustomerMergeLog` | Audit trail and snapshot of customer deduplication merges |
| `Payment` / `PaymentAllocation` | Financial payments and multi-document allocation |
| `ReceivableEntry` / `PayableEntry` | Financial ledger tracking open dues |
| `PaymentFollowup` | Dues recovery tasks, customer responses, and recovery dashboard |
| `QrCode` / `VerificationToken` | Public document verification tokens and scan history |
| `AuditLog` | Structured mutation audit trail across all modules |

## 5. API Endpoints Map

### Public & Verification
- `GET  /api/v1/verify/:token` — Public document verification (Safe JSON)
- `GET  /api/v1/acknowledge-receipt/:token` — Public consignee receipt lookup
- `POST /api/v1/acknowledge-receipt/:token` — Public consignee digital receipt submission
- `GET  /api/v1/docs` — Interactive Swagger UI
- `GET  /api/v1/docs/json` — OpenAPI 3.0 specification

### Multi-Entity & Settings
- `GET    /api/v1/companies`
- `POST   /api/v1/companies`
- `GET    /api/v1/companies/:id`
- `PATCH  /api/v1/companies/:id`
- `POST   /api/v1/companies/:id/addresses`
- `POST   /api/v1/companies/:id/bank-accounts`
- `POST   /api/v1/companies/:id/signatories`
- `POST   /api/v1/companies/:id/terms`

### B2B CRM & Customer 360
- `GET    /api/v1/crm` — list customers
- `GET    /api/v1/crm/:id`
- `GET    /api/v1/crm/:id/360` — Customer 360 KPI dashboard
- `POST   /api/v1/crm`
- `PATCH  /api/v1/crm/:id`
- `DELETE /api/v1/crm/:id`
- `POST   /api/v1/crm/check-duplicates` — Fuzzy deduplication detector
- `POST   /api/v1/crm/merge` — Customer Merge Tool

### Formal Sales Quotations
- `GET    /api/v1/sales/quotations` — List formal quotation letters
- `POST   /api/v1/sales/quotations` — Create quotation letter (`PPS/D/26-27/817`)
- `GET    /api/v1/sales/quotations/:id` — Get quotation with revisions
- `PATCH  /api/v1/sales/quotations/:id` — Update draft quotation
- `POST   /api/v1/sales/quotations/:id/revision` — Create new revision (R0 -> R1)
- `POST   /api/v1/sales/quotations/:id/convert-to-order` — 1-Click order convert
- `GET    /api/v1/sales/quotations/:id/pdf` — Render print-ready A4 PDF
- `GET    /api/v1/sales/quotations/templates` — Reusable narrative clauses (cached)
- `POST   /api/v1/sales/quotations/templates` — Save boilerplate template

### Central Sales Orders Hub
- `GET    /api/v1/sales/orders` — List orders with universal cross-doc search
- `POST   /api/v1/sales/orders` — Create sales order (`PPS/ORD/2026-27/0001`)
- `GET    /api/v1/sales/orders/:id` — Order details & dispatch reconciliation
- `PATCH  /api/v1/sales/orders/:id` — Update order
- `PATCH  /api/v1/sales/orders/:id/status` — Lifecycle transition with audit reason
- `GET    /api/v1/sales/orders/:id/timeline` — Unified cross-document timeline
- `GET    /api/v1/sales/orders/:id/pdf` — Render print-ready A4 order confirmation

### Packing Lists & Logistics
- `GET    /api/v1/logistics/packing-lists` — List packing lists
- `POST   /api/v1/logistics/packing-lists` — Create packing list (`PPS/PL/2026-27/0001`)
- `GET    /api/v1/logistics/packing-lists/:id` — Packing list details
- `POST   /api/v1/logistics/packing-lists/:id/dispatch` — Mark dispatched & token gen
- `POST   /api/v1/logistics/packing-lists/:id/acknowledge` — Manual receipt record
- `GET    /api/v1/logistics/packing-lists/:id/pdf` — Dual-signature A4 PDF
- `GET    /api/v1/logistics/packing-lists/packet-types` — Packet classifications (cached)
- `GET    /api/v1/logistics/packing-lists/order-bom/:orderId` — 1-Click BOM explosion

### Warehouse Hardware Store & Issues
- `GET    /api/v1/warehouse/hardware-catalog` — 44-item master catalog (cached)
- `POST   /api/v1/warehouse/hardware-catalog` — Add item
- `PATCH  /api/v1/warehouse/hardware-catalog/:id` — Update specs
- `GET    /api/v1/warehouse/hardware-issues` — List issue lists
- `POST   /api/v1/warehouse/hardware-issues` — Create issue list (`PPS/HIL/2026-27/0001`)
- `GET    /api/v1/warehouse/hardware-issues/:id` — Get 44 items & sign-off state
- `PATCH  /api/v1/warehouse/hardware-issues/:id/sign-off` — 4-Role sequential sign-off
- `GET    /api/v1/warehouse/hardware-issues/:id/pdf` — Vector checklist PDF

### Vendor Management
- `GET    /api/v1/vendors`
- `GET    /api/v1/vendors/:id`
- `POST   /api/v1/vendors`
- `PATCH  /api/v1/vendors/:id`
- `DELETE /api/v1/vendors/:id`

### Procurement (Purchase Orders)
- `GET    /api/v1/procurement/po`
- `POST   /api/v1/procurement/po`
- `GET    /api/v1/procurement/po/:id`
- `POST   /api/v1/procurement/po/:id/approve`
- `POST   /api/v1/procurement/po/:id/cancel`
- `GET    /api/v1/procurement/po/:id/pdf`

### Sales (Proforma Invoices)
- `GET    /api/v1/sales/pi`
- `POST   /api/v1/sales/pi`
- `GET    /api/v1/sales/pi/:id`
- `POST   /api/v1/sales/pi/:id/issue`
- `POST   /api/v1/sales/pi/:id/duplicate`
- `POST   /api/v1/sales/pi/:id/cancel`
- `GET    /api/v1/sales/pi/:id/pdf`

### Products Master Extended
- `GET    /api/v1/products/master`
- `POST   /api/v1/products/master`
- `GET    /api/v1/products/master/:id`
- `PATCH  /api/v1/products/master/:id`
- `DELETE /api/v1/products/master/:id`
- `GET    /api/v1/products/master/materials`
- `GET    /api/v1/products/master/finishes`
- `GET    /api/v1/products/master/units`
- `GET    /api/v1/products/master/subcategories`

### Finance & Payments
- `GET    /api/v1/finance/payments`
- `POST   /api/v1/finance/payments`
- `GET    /api/v1/finance/receivables`
- `GET    /api/v1/finance/payables`
- `GET    /api/v1/finance/summary`

### Dues Recovery & Follow-ups
- `GET    /api/v1/followups`
- `POST   /api/v1/followups`
- `GET    /api/v1/followups/:id`
- `POST   /api/v1/followups/:id/logs`
- `GET    /api/v1/followups/dashboard`

### QR Subsystem
- `POST   /api/v1/qr/scan` — Camera / Token decoder & router
- `POST   /api/v1/qr/generate`
- `GET    /api/v1/qr/history`

### Audit Trail
- `GET    /api/v1/audit`
