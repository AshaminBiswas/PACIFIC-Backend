---
name: pacific-backend-dev
description: >-
  Use this skill when developing, refactoring, or extending backend modules, Prisma database models,
  API endpoints, RBAC, GST tax logic, QR verification, or PDF engines in PACIFIC-Backend (D:\PACIFIC-Backend).
---

# Pacific Restroom Cubicle Backend Development Guide

## Project Location
`D:\PACIFIC-Backend\` — Port **5001**, API prefix `/api/v1`  
Interactive Swagger UI: `http://localhost:5001/api/v1/docs`  
OpenAPI 3.0 Spec JSON: `http://localhost:5001/api/v1/docs/json`

## Directory Conventions (`src/`)

- `modules/<feature>/`:
  - `<feature>.routes.ts`: Express route definitions, middleware chains (`requireAuth`, `requirePermission`, `requireRole`, `validate`).
  - `<feature>.controller.ts`: HTTP request parsing, response formatting, status codes.
  - `<feature>.service.ts`: Core business logic, Prisma queries, transaction handling.
- `modules/tax/tax.engine.ts`: Centralized GST engine (intra vs inter-state, reverse charge, multi-rate reconciliation, grand total rounding).
- `modules/sequences/sequence.service.ts`: Concurrency-safe atomic FY-aware sequence generator:
  - Quotations: `PPS/D/26-27/817`
  - Sales Orders: `PPS/ORD/2026-27/0001`
  - Packing Lists: `PPS/PL/2026-27/0001`
  - Hardware Issues: `PPS/HIL/2026-27/0001`
  - Proforma Invoices: `PPS/PI/2026-27/0815`
  - Purchase Orders: `PRC/FY2026-27/000001`
- `modules/qr/qr.service.ts`: Cryptographically signed tokens, QR payload builder, public verification lookup, and admin scan parser.
- `modules/pdf/pdf.service.ts`: High-fidelity single-page print-ready A4 vector PDF/HTML generator for Quotation, Order, Packing List, Hardware Issue, PO, and PI.
- `modules/audit/audit.service.ts`: Centralized mutation audit logging service (`logMutation`).
- `utils/cache.ts`: Lightweight in-memory TTL caching for master lookup data (packet natures, hardware catalog items, quotation templates).
- `middleware/rbac.middleware.ts`: `requirePermission(code)` and `requireEntityScope` guards.
- `scripts/fix-db.js`: Idempotent DDL patches applied on server boot.

## Core ERP Modules

1. **Formal Sales Quotations** (`/api/v1/sales/quotations`): Narrative sales quotation letters (`PPS/D/26-27/817`), revision tracking (R0 -> R1), SEZ LUT validator (0% IGST), and 1-click order convert.
2. **Central Sales Orders Hub** (`/api/v1/sales/orders`): Central sales order records (`PPS/ORD/2026-27/0001`), universal cross-document search, document timeline drawer, partial dispatch reconciliation.
3. **Packing Lists & Logistics** (`/api/v1/logistics/packing-lists`): Dispatch lists (`PPS/PL/2026-27/0001`), BOM auto-explosion, packet nature classification, dual signature blocks, and QR consignee digital acknowledgment.
4. **Warehouse Hardware Store & Issues** (`/api/v1/warehouse`): 44-item master hardware catalog (`/hardware-catalog`), store issuance (`PPS/HIL/2026-27/0001`), and 4-role sequential sign-off.
5. **B2B CRM & Customer 360** (`/api/v1/crm`): Real-time Customer 360 KPIs, contact/address trees, fuzzy deduplication detector (`/check-duplicates`), and ACID Customer Merge Tool (`/merge`).
6. **Companies** (`/api/v1/companies`): Multi-entity configuration (India INR/GST & UAE AED/VAT), bank accounts, signatories.
7. **Vendors** (`/api/v1/vendors`): Supplier master for HPL boards, hardware, aluminium, stainless steel, nylon.
8. **Procurement** (`/api/v1/procurement/po`): Purchase orders with atomic numbering, approval workflow, and A4 PDF.
9. **Sales PIs** (`/api/v1/sales/pi`): Proforma invoices with Place of Supply GST calculation, atomic sequence, QR token, and PDF.
10. **Products Master** (`/api/v1/products/master`): Extended catalog with materials, finishes, units, barcodes, cutting size.
11. **Finance** (`/api/v1/finance`): Payments, allocations, receivables, payables ledger, and summary.
12. **Follow-ups** (`/api/v1/followups`): Dues recovery tracking and recovery dashboard.
13. **QR Subsystem** (`/api/v1/qr`): Scanner decoder, QR generator, and public verification lookup (`/api/v1/verify/:token`).
14. **Audit** (`/api/v1/audit`): Complete mutation audit trail.

## Database Migration Protocol

1. **Edit Schema**: Modify `prisma/schema.prisma`.
2. **Add Idempotent DDL to `src/scripts/fix-db.js`**:
   All new tables/columns must use `IF NOT EXISTS` pattern.
3. **Regenerate Client**:
   ```bash
   cd D:\PACIFIC-Backend
   npx prisma generate
   ```
4. **Compile & Verify**:
   ```bash
   npx tsc --noEmit
   ```
5. **Update `PROJECT_CONTEXT.md`** with new models and endpoints.
6. **Sync to Admin**: Update `D:\PACIFIC-Admin\src\api/` and `src\types\admin.ts`.
