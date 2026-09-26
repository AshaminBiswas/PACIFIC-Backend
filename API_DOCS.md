# Pacific Restroom Cubicle (PRC) — REST API Documentation

Base URL: `http://localhost:5001/api/v1` (Dev) | `https://api.pacificrestroomcubicle.com/api/v1` (Prod)  
Interactive Swagger UI: `http://localhost:5001/api/v1/docs`  
OpenAPI 3.0 Spec JSON: `http://localhost:5001/api/v1/docs/json`  

---

## 1. Authentication & Security

All authenticated endpoints require an `Authorization` header with a Bearer JWT:
```http
Authorization: Bearer <jwt_access_token>
```

### Endpoints
- `POST /auth/login` — Sign in with email and password.
- `POST /auth/refresh` — Refresh access token using refresh token.
- `POST /auth/logout` — Revoke session.
- `GET  /auth/me` — Return currently authenticated user profile and roles.

---

## 2. Public Document Verification (`/verify/:token`)

Every issued document (Proforma Invoice or Purchase Order) receives a non-sequential, cryptographically signed verification token.

```http
GET /verify/:token
```
### Response (200 OK)
```json
{
  "valid": true,
  "message": "✓ Verified Genuine Document issued by Pacific Products & Solutions",
  "document": {
    "documentType": "PI",
    "documentNumber": "PPS/PI/2026-27/0815",
    "companyName": "PACIFIC PRODUCTS AND SOLUTIONS",
    "partyName": "Gencon India Pvt. Ltd.",
    "date": "2026-09-21T09:00:00.000Z",
    "currency": "INR",
    "maskedAmount": "₹ 1,50,000",
    "status": "ISSUED",
    "verifiedAt": "2026-09-21T10:00:00.000Z"
  }
}
```
*Note: Public verification never exposes internal database IDs, cost prices, or internal notes.*

---

## 3. Companies & Multi-Entity (`/companies`)

- `GET   /companies` — List all registered company entities (India / UAE).
- `GET   /companies/:id` — Get company details, bank accounts, terms, and signatories.
- `POST  /companies` — Create a company entity.
- `PATCH /companies/:id` — Update company settings.
- `POST  /companies/:id/addresses` — Add registered or factory address.
- `POST  /companies/:id/bank-accounts` — Add company bank account.
- `POST  /companies/:id/signatories` — Add authorized signatory with signature.
- `POST  /companies/:id/terms` — Add default terms & conditions clause.

---

## 4. B2B CRM & Customer 360 (`/crm/customers`)

- `GET   /crm/customers` — Paginated list of customers with search by name, GSTIN, phone.
- `GET   /crm/customers/:id` — Full customer profile with contacts and addresses.
- `GET   /crm/customers/:id/360` — Real-time Customer 360 dashboard (total purchase value, outstanding balance, advance balance, PI history, payments, active follow-ups).
- `POST  /crm/customers` — Create customer with billing/shipping addresses and contacts.
- `PATCH /crm/customers/:id` — Update customer details.
- `DELETE /crm/customers/:id` — Soft-delete customer.
- `POST  /crm/customers/:id/contacts` — Add new contact person.
- `POST  /crm/customers/:id/addresses` — Add billing or delivery site address.

---

## 5. Vendor Management (`/vendors`)

- `GET   /vendors` — List suppliers of HPL boards, hardware, aluminium, stainless steel, nylon, and raw materials.
- `GET   /vendors/:id` — Get vendor profile and purchase history.
- `POST  /vendors` — Create supplier with type, addresses, and contacts.
- `PATCH /vendors/:id` — Update supplier information.
- `DELETE /vendors/:id` — Remove supplier.

---

## 6. Purchase Orders (`/procurement/po`)

- `GET  /procurement/po` — List purchase orders.
- `GET  /procurement/po/:id` — Get PO details with line items (finish, thickness, cutting size).
- `POST /procurement/po` — Create a PO draft. Automatically generates an atomic concurrency-safe number: `PRC/FY2026-27/000001`.
- `POST /procurement/po/:id/approve` — Approve PO, generate verification QR code, and update status.
- `POST /procurement/po/:id/cancel` — Cancel PO with mandatory reason.
- `GET  /procurement/po/:id/pdf` — Render print-ready single-page A4 PDF/HTML.

---

## 7. Proforma Invoices (`/sales/pi`)

- `GET  /sales/pi` — List Proforma Invoices.
- `GET  /sales/pi/:id` — Get PI details with items, tax summary, terms, and QR code.
- `POST /sales/pi` — Create PI draft. Automatically calculates GST via the tax engine (intra-state CGST+SGST vs. inter-state IGST) based on Place of Supply.
- `POST /sales/pi/:id/issue` — Officially issue PI, permanently assign atomic sequence `PPS/PI/2026-27/0815`, generate public QR token, and render document immutable.
- `POST /sales/pi/:id/duplicate` — Duplicate existing PI as a new draft.
- `POST /sales/pi/:id/cancel` — Cancel PI with audit history.
- `GET  /sales/pi/:id/pdf` — Render print-ready A4 Proforma Invoice with QR code, tax summary, and amount in words.

---

## 8. Extended Products Master (`/products/master`)

- `GET  /products/master` — Filterable products catalog.
- `GET  /products/master/:id` — Product detail with materials, finishes, units, and QR code.
- `POST /products/master` — Create product with HSN/SAC, cutting specs, and GST rate.
- `PATCH /products/master/:id` — Update product specifications.
- `GET  /products/master/materials` — List materials (Compact Laminate / HPL, SS 304, Nylon, Aluminium).
- `GET  /products/master/finishes` — List surface finishes (Suede, Matt, Brushed SS, Black Matte).
- `GET  /products/master/units` — List measurement units (SET, NOS, SQFT, SQM, KGS, RMT).
- `GET  /products/master/subcategories` — List subcategories.

---

## 9. Finance & Payments (`/finance`)

- `GET  /finance/payments` — List payment records.
- `POST /finance/payments` — Record payment (Customer payment, Advance, Refund) and allocate against Proforma Invoices.
- `GET  /finance/receivables` — Outstanding customer receivables ledger.
- `GET  /finance/payables` — Vendor payables ledger.
- `GET  /finance/summary` — Aggregate ledger metrics (total receivables, total payables, monthly collections).

---

## 10. Payment Follow-ups & Dues Recovery (`/followups`)

- `GET  /followups` — List payment follow-ups.
- `POST /followups` — Create follow-up task with assigned agent and due date.
- `POST /followups/:id/logs` — Record customer communication log (promise to pay, dispute, notes).
- `GET  /followups/dashboard` — Dues Recovery Dashboard KPIs (total outstanding, overdue, due today, due this week, promise-to-pay count & amount).

---

## 11. QR Code Subsystem (`/qr`)

- `POST /qr/scan` — Admin QR decoder. Takes scanned token or URL from device camera or manual input, verifies token, records scan log, and returns target admin navigation route.
- `POST /qr/generate` — Generate custom QR identifier.
- `GET  /qr/history` — Audit log of recent QR scans.

---

## 12. Central Audit Trail (`/audit`)

- `GET  /audit` — Centralized log of mutations across CRM, Procurement, Sales, Finance, Settings, and QR. Filterable by module and action.

---

## 13. Formal Sales Quotation Letters (`/sales/quotations`)

- `GET   /sales/quotations` — Paginated list of formal sales quotation letters with filters by search, customer, and status (`DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `REVISED`, `CONVERTED`).
- `GET   /sales/quotations/:id` — Full quotation letter details with line items, narrative specs, SEZ exemption details, and revision history.
- `POST  /sales/quotations` — Create formal sales quotation letter. Automatically assigns atomic financial-year sequence: `PPS/D/26-27/817`.
- `PATCH /sales/quotations/:id` — Update draft quotation letter.
- `POST  /sales/quotations/:id/revision` — Snapshot current quotation into `sales_quotation_revisions` and create new incremented revision (`R0` -> `R1` -> `R2`).
- `POST  /sales/quotations/:id/convert-to-order` — 1-Click conversion of accepted quotation into central sales order (`PPS/ORD/2026-27/0001`).
- `GET   /sales/quotations/:id/pdf` — Render vector print-ready A4 formal quotation letter with company header, narrative prose, items table, and authorized signature.
- `GET   /sales/quotations/templates` — List boilerplate narrative clauses (Standard Opening, Compact Laminate Specs, SS-304 Hardware Note, Delivery Terms). Cached in-memory for sub-5ms latency.
- `POST  /sales/quotations/templates` — Create or update reusable template clause.

---

## 14. Central Sales Orders Hub (`/sales/orders`)

- `GET   /sales/orders` — List sales orders with universal cross-document search (`orderNumber`, `customerPoNumber`, customer name, project name).
- `GET   /sales/orders/:id` — Get sales order with line items, customer snapshots, and dispatch reconciliation quantities (`quantity` vs `dispatchedQuantity`).
- `POST  /sales/orders` — Create sales order. Automatically generates atomic sequence: `PPS/ORD/2026-27/0001`.
- `PATCH /sales/orders/:id` — Update sales order metadata and line items.
- `PATCH /sales/orders/:id/status` — Transition order lifecycle status (`DRAFT` $\to$ `CONFIRMED` $\to$ `IN_PRODUCTION` $\to$ `DISPATCHED` $\to$ `COMPLETED` $\to$ `CANCELLED`) with mandatory comment and audit log.
- `GET   /sales/orders/:id/timeline` — Unified cross-document timeline showing complete order lifecycle:
  `Quotation (PPS/D/...) -> Sales Order (PPS/ORD/...) -> Proforma Invoice (PPS/PI/...) -> Packing Lists (PPS/PL/...) -> Hardware Issue (PPS/HIL/...) -> Dues Reconciliation`.
- `GET   /sales/orders/:id/pdf` — Render vector print-ready A4 Sales Order confirmation document.

---

## 15. Packing Lists & Logistics (`/logistics/packing-lists`)

- `GET   /logistics/packing-lists` — List packing lists with search, order filter, and receipt status (`DISPATCHED`, `ACKNOWLEDGED`).
- `GET   /logistics/packing-lists/:id` — Get packing list with categorized line items.
- `POST  /logistics/packing-lists` — Create packing list. Automatically generates atomic sequence `PPS/PL/2026-27/0001` and digital receipt verification token. Supports standalone dispatch bypass or linked sales order.
- `POST  /logistics/packing-lists/:id/dispatch` — Mark packing list as dispatched and generate public QR verification token for consignee receipt.
- `POST  /logistics/packing-lists/:id/acknowledge` — Admin manual recording of delivery receipt (recipient name, phone, signature data).
- `GET   /logistics/packing-lists/:id/pdf` — Render print-ready vector A4 packing list with dual signature blocks (Consignor / Authorized Signatory + Consignee Receiver).
- `GET   /logistics/packing-lists/packet-types` — List lookup packet nature classifications:
  `Board`, `Channel`, `Corrugated Box`, `Bundle`, `Wooden Crate`, `Loose Packet`. Cached in-memory.
- `POST  /logistics/packing-lists/packet-types` — Add custom packet classification.
- `GET   /logistics/packing-lists/order-bom/:orderId` — 1-Click BOM Auto-Explosion: decomposes cubicle line items into Doors, Pilasters, Intermediate Partitions, Toprails, and Hardware sets.

---

## 16. Warehouse Hardware Store & Issue Lists (`/warehouse`)

### 16.1 Master Hardware Catalog (`/warehouse/hardware-catalog`)
- `GET    /warehouse/hardware-catalog` — Master 44-item hardware catalog with categories (`Cubicle Hardware`, `Aluminium Extrusions`, `Locker Hardware`, `Screws & Fasteners`, `Accessories`). Cached in-memory.
- `POST   /warehouse/hardware-catalog` — Add new hardware item.
- `PATCH  /warehouse/hardware-catalog/:id` — Update hardware specification (size, color, sort order).
- `DELETE /warehouse/hardware-catalog/:id` — Soft-deactivate item from store catalog.

### 16.2 Store Hardware Issue Lists (`/warehouse/hardware-issues`)
- `GET   /warehouse/hardware-issues` — List store hardware issue lists.
- `GET   /warehouse/hardware-issues/:id` — Full issue checklist with all 44 items, quantities issued, remarks, and 4-role sequential sign-off timestamps.
- `POST  /warehouse/hardware-issues` — Create hardware issue list. Automatically generates atomic sequence: `PPS/HIL/2026-27/0001`.
- `PATCH /warehouse/hardware-issues/:id/sign-off` — Sequential 4-Role Sign-Off flow:
  1. `store_keeper` — Store Keeper verifies items picked from warehouse bins.
  2. `packed_by` — Packing staff confirms packaging integrity.
  3. `checked_by` — Logistics quality officer reconciles quantities against Packing List.
  4. `store_incharge` — Store Incharge authorizes gate pass and material release.
- `GET   /warehouse/hardware-issues/:id/pdf` — Render print-ready vector A4 Hardware Store Issue Checklist document.

---

## 17. CRM Deduplication & Customer Merge (`/crm`)

- `POST /crm/check-duplicates` — Real-time debounced customer deduplication detector. Scans for potential duplicate party profiles using:
  - Exact match on GSTIN (case-insensitive)
  - Exact match on PAN
  - Normalized 10-digit phone number match
  - Email address match
  - Fuzzy trigram similarity on legal name / trade name
- `POST /crm/merge` — Customer Merge Tool:
  - Consolidates duplicate customer records into a single canonical customer (`canonicalCustomerId`).
  - Relinks all historic Quotations, Sales Orders, Proforma Invoices, Payments, Delivery Addresses, and Contact Persons.
  - Generates an immutable audit record in `customer_merge_logs` with a complete JSON snapshot of the merged entity.
  - Soft-archives the duplicate record to prevent duplicate future billing.

---

## 18. Public Consignee Digital Receipt Acknowledgment (`/acknowledge-receipt/:token`)

- `GET  /acknowledge-receipt/:token` — Public endpoint scanned via QR code on cartons or physical packing lists. Returns safe non-confidential delivery metadata (Packing List number, consignor, delivery destination, and package count).
- `POST /acknowledge-receipt/:token` — Consignee digital receipt submission:
  - Payload: `{ receivedByName, receivedByPhone, signatureData, remarks }`
  - Instantly updates packing list status to `ACKNOWLEDGED` with timestamp and digital signature capture.
