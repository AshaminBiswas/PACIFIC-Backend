# Pacific Restroom Cubicle — OpenAPI 3.0 & Swagger UI Documentation

**Pacific Restroom Cubicle (PRC)** / **Pacific Products & Solutions (PPS)**  
Enterprise B2B Restroom Cubicles, Partition Hardware & HPL Manufacturing ERP/CRM.

---

## 1. Accessing Interactive Swagger UI

Start the backend API server:
```bash
cd D:\PACIFIC-Backend
npm run dev
```

Open in any browser:
- **Interactive Swagger UI**: [http://localhost:5001/api/v1/docs](http://localhost:5001/api/v1/docs)
- **Raw OpenAPI 3.0 JSON Specification**: [http://localhost:5001/api/v1/docs/json](http://localhost:5001/api/v1/docs/json)

---

## 2. Authentication & Authorization

All enterprise ERP endpoints are protected by capability-based RBAC and require a valid Bearer JWT.

1. In Swagger UI, click the green **Authorize** button (or padlock icon).
2. Enter your JWT access token:
   ```text
   Bearer <your_jwt_access_token>
   ```
3. Click **Authorize** -> **Close**. Every subsequent request will automatically send `Authorization: Bearer ...`.

---

## 3. OpenAPI 3.0 Specification Architecture

The interactive documentation is defined in `src/modules/docs/docs.routes.ts` and groups all enterprise services into 8 primary domains:

| Domain | Tag | Base Path | Key Capabilities |
|---|---|---|---|
| **Sales Quotations** | `Sales Quotations` | `/api/v1/sales/quotations` | Formal narrative letters (`PPS/D/<FY>/<seq>`), revision tracking (R0 $\to$ R1), SEZ LUT validator, 1-click order convert |
| **Sales Orders** | `Sales Orders` | `/api/v1/sales/orders` | Central hub (`PPS/ORD/<FY>/<seq>`), universal cross-doc search, document timeline (`Quotation -> Order -> PI -> PL -> HIL -> Dues`) |
| **Packing Lists** | `Packing Lists` | `/api/v1/logistics/packing-lists` | Dispatch lists (`PPS/PL/<FY>/<seq>`), BOM explosion, packet nature tagging, dual signatures, QR digital acknowledgment |
| **Hardware Store** | `Hardware Store` | `/api/v1/warehouse` | 44-item hardware catalog, store issuance (`PPS/HIL/<FY>/<seq>`), 4-role sequential sign-off |
| **B2B CRM** | `B2B CRM` | `/api/v1/crm` | Customer 360 view, contact/address hierarchy, fuzzy deduplication (`/check-duplicates`), Customer Merge Tool (`/merge`) |
| **Procurement** | `Procurement` | `/api/v1/procurement/po` | Supplier POs (`PRC/FY2026-27/000001`), approval flow, cutting size line items, vector A4 PDF |
| **Sales Invoices** | `Sales Invoices` | `/api/v1/sales/pi` | Proforma Invoices (`PPS/PI/2026-27/0815`), Place of Supply GST engine, public verification QR |
| **Public Verification**| `Public Logistics Verification` | `/api/v1/verify` & `/acknowledge-receipt` | Safe public lookup without exposing internal database IDs, consignee digital signature capture |

---

## 4. Key Endpoints Reference & Payloads

### 4.1. Formal Sales Quotation Letter (`/api/v1/sales/quotations`)

#### Create Quotation Letter (`POST /api/v1/sales/quotations`)
```bash
curl -X POST http://localhost:5001/api/v1/sales/quotations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "companyProfileId": "comp-1",
    "customerId": "cust-1",
    "subject": "Quotation for Supply and Installation of Restroom Cubicles - CyberCity Project",
    "salutation": "Dear Sir/Madam,",
    "narrativeOpening": "We thank you for your enquiry and take immense pleasure in submitting our formal offer.",
    "technicalSpecification": "Pacific 12mm Compact Solid Phenolic Laminate with SS-304 Hardware.",
    "hardwareNote": "All hardware fittings conforming to SS Grade 304 anti-corrosion standards.",
    "isSezExempt": false,
    "items": [
      {
        "serialNumber": 1,
        "description": "Supply of Pacific Classic Toilet Cubicle 12mm HPL",
        "hsnCode": "39259090",
        "quantity": 10,
        "unit": "NOS",
        "rate": 14500,
        "discountPercent": 5,
        "gstRate": 18
      }
    ],
    "termsAndConditions": [
      "Taxes: GST 18% extra as applicable.",
      "Delivery: 10-12 working days from date of confirmed purchase order.",
      "Payment: 50% advance along with order, balance against delivery."
    ]
  }'
```

#### Convert to Central Sales Order (`POST /api/v1/sales/quotations/:id/convert-to-order`)
```bash
curl -X POST http://localhost:5001/api/v1/sales/quotations/quote-123/convert-to-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "customerPoNumber": "PO-GURGAON-2026-09",
    "customerPoDate": "2026-09-21T10:00:00.000Z"
  }'
```

---

### 4.2. Central Sales Order Hub (`/api/v1/sales/orders`)

#### Document Timeline (`GET /api/v1/sales/orders/:id/timeline`)
Returns chronological lifecycle documents:
```json
{
  "orderNumber": "PPS/ORD/2026-27/0001",
  "timeline": [
    { "type": "QUOTATION", "number": "PPS/D/26-27/817", "date": "2026-09-20", "status": "CONVERTED" },
    { "type": "ORDER", "number": "PPS/ORD/2026-27/0001", "date": "2026-09-21", "status": "CONFIRMED" },
    { "type": "PROFORMA_INVOICE", "number": "PPS/PI/2026-27/0815", "date": "2026-09-21", "status": "ISSUED" },
    { "type": "PACKING_LIST", "number": "PPS/PL/2026-27/0001", "date": "2026-09-22", "status": "DISPATCHED" },
    { "type": "HARDWARE_ISSUE", "number": "PPS/HIL/2026-27/0001", "date": "2026-09-22", "status": "ISSUED" },
    { "type": "PAYMENT", "number": "RCP-2026-0045", "amount": 150000, "status": "RECONCILED" }
  ]
}
```

---

### 4.3. Packing List Generation (`/api/v1/logistics/packing-lists`)

#### Auto-Explode BOM for Order (`GET /api/v1/logistics/packing-lists/order-bom/:orderId`)
Automatically converts cubicle quantities (e.g. 10 Toilet Cubicles) into:
- Doors (12mm HPL)
- Pilasters (12mm HPL)
- Intermediate Partitions (12mm HPL)
- Aluminium Toprails (Athena Wings standard)
- Hardware box bundles with packet nature classification (`Board`, `Bundle`, `Corrugated Box`, `Wooden Crate`).

#### Public Consignee Acknowledgment (`POST /api/v1/acknowledge-receipt/:token`)
```bash
curl -X POST http://localhost:5001/api/v1/acknowledge-receipt/ack_tok_98234 \
  -H "Content-Type: application/json" \
  -d '{
    "receivedByName": "Vikram Singh",
    "receivedByPhone": "+91 98765 43210",
    "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }'
```

---

### 4.4. Hardware Catalog & Store Issues (`/api/v1/warehouse`)

- 44 Master Catalog Items pre-seeded (`Gravity Hinges`, `Adjustable Legs`, `Indicator Locks`, `Coathooks`, `U Channels`, `Toprails`, `Shoeboxes`).
- Sequential 4-Role Sign-Off flow:
  1. `store_keeper` signs off materials collected.
  2. `packed_by` signs off packaging intact.
  3. `checked_by` verifies item count against packing list.
  4. `store_incharge` authorizes gate pass release.

---

### 4.5. CRM Deduplication & Customer Merge (`/api/v1/crm`)

#### Fuzzy Deduplication Check (`POST /api/v1/crm/check-duplicates`)
```bash
curl -X POST http://localhost:5001/api/v1/crm/check-duplicates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "legalName": "Gencon India Private Limited",
    "gstin": "06AABCG1234F1Z5",
    "phone": "+91 98111 22233",
    "email": "procurement@gencon.in"
  }'
```

#### Merge Customers (`POST /api/v1/crm/merge`)
```bash
curl -X POST http://localhost:5001/api/v1/crm/merge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "canonicalCustomerId": "party-target-123",
    "duplicateCustomerId": "party-duplicate-456",
    "reason": "Duplicate account created during Gurgaon phase 2 enquiry"
  }'
```
*Note: The Customer Merge Tool moves all quotations, orders, proforma invoices, payments, contacts, and delivery addresses to `canonicalCustomerId` inside a single ACID database transaction and archives the duplicate.*

---

## 5. Client SDK & Type Generation

Generate client SDKs directly from the `/docs/json` endpoint:

```bash
# Generate TypeScript Axios Client
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:5001/api/v1/docs/json \
  -g typescript-axios \
  -o ./generated-client
```
