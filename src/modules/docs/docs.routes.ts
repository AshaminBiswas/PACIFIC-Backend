import { Router, Request, Response } from 'express';

const router = Router();

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Pacific Restroom Cubicle (PRC) — Enterprise ERP & REST API',
    version: '2.0.0',
    description: `
**Pacific Restroom Cubicle (PRC)** is India and UAE's premier B2B manufacturer and contractor for commercial restroom cubicles, toilet partitions, HPL lockers, and architectural hardware.

### Key Architectural Capabilities:
- **Shared Master Data**: Single unified Party (Customer/Vendor) layer across CRM, Procurement, Sales, and Finance.
- **Multi-Entity Management**: Support for India (INR/GST) and UAE (AED/VAT).
- **Atomic Concurrency-Safe Numbering**: \`PRC/FY2026-27/000001\` for POs and \`PPS/PI/2026-27/0815\` for PIs.
- **GST Tax Engine**: Automatic intra-state (CGST+SGST) vs. inter-state (IGST) tax calculation with Place of Supply (POS) rules, reverse charge, and multi-rate summary reconciliation.
- **Centralized QR Subsystem**: Cryptographically signed tokens, public-safe verification at \`/api/v1/verify/:token\`, and admin camera scanning.
- **High-Fidelity A4 PDF Generation**: Vector print-ready layouts with company header, delivery/billing addresses, QR code, and signatures.
- **Granular RBAC**: Capability-based permissions and company entity scoping.
    `,
    contact: {
      name: 'Pacific Products & Solutions Support',
      email: 'sales@pacificrestroomcubicle.com',
      url: 'https://pacificrestroomcubicle.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5001/api/v1',
      description: 'Local Development Server',
    },
    {
      url: 'https://api.pacificrestroomcubicle.com/api/v1',
      description: 'Production Cloud API',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT access token in the format: Bearer <token>',
      },
    },
  },
  paths: {
    '/auth/super-admin': {
      post: {
        summary: 'Provision or elevate a Super Admin user (Postman / Setup)',
        description: 'Creates a Super Admin in the database with bcrypt hash, assigns SUPER_ADMIN role, syncs to Supabase Auth, and returns Bearer JWT tokens.',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@pacificrestroomcubicle.com' },
                  password: { type: 'string', minLength: 6, example: 'SuperSecure2026!' },
                  firstName: { type: 'string', example: 'Pacific' },
                  lastName: { type: 'string', example: 'SuperAdmin' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Super Admin successfully provisioned' },
          400: { description: 'Validation error (missing email or password)' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'User Login (Super Admin / Staff)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@pacificrestroomcubicle.com' },
                  password: { type: 'string', example: 'SuperSecure2026!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'JWT tokens and user profile' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/verify/{token}': {
      get: {
        summary: 'Public document verification endpoint',
        description: 'Validates and returns safe public metadata for an issued PI or PO without exposing internal database IDs.',
        parameters: [
          { name: 'token', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Document verification summary' },
          404: { description: 'Invalid or revoked token' },
        },
      },
    },
    '/companies': {
      get: {
        summary: 'List company entities (India / UAE)',
        responses: { 200: { description: 'Array of company profiles' } },
      },
      post: {
        summary: 'Create a company entity profile',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Company created' } },
      },
    },
    '/crm/customers': {
      get: {
        summary: 'List B2B customers with search and pagination',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Paginated customer list' } },
      },
      post: {
        summary: 'Create a B2B customer with contacts and addresses',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Customer created' } },
      },
    },
    '/crm/customers/{id}/360': {
      get: {
        summary: 'Customer 360 view',
        description: 'Returns real-time financial KPIs (total purchases, outstanding, overdue, PI history, payments, follow-ups).',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Customer 360 KPIs and history' } },
      },
    },
    '/procurement/vendors': {
      get: {
        summary: 'List suppliers (HPL, Hardware, Aluminium, SS, Nylon)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Paginated vendor list' } },
      },
      post: {
        summary: 'Create a vendor profile',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Vendor created' } },
      },
    },
    '/procurement/po': {
      get: {
        summary: 'List purchase orders',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Paginated PO list' } },
      },
      post: {
        summary: 'Create a purchase order with atomic numbering (PRC/FY2026-27/000001)',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'PO created' } },
      },
    },
    '/procurement/po/{id}/approve': {
      post: {
        summary: 'Approve a purchase order and generate verification QR token',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'PO approved' } },
      },
    },
    '/procurement/po/{id}/pdf': {
      get: {
        summary: 'Render print-ready A4 Purchase Order PDF / HTML',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Print-ready HTML document' } },
      },
    },
    '/sales/pi': {
      get: {
        summary: 'List Proforma Invoices',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Paginated PI list' } },
      },
      post: {
        summary: 'Create a Proforma Invoice draft with server GST calculation',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'PI draft created' } },
      },
    },
    '/sales/pi/{id}/issue': {
      post: {
        summary: 'Issue PI officially with atomic sequence (PPS/PI/2026-27/0815) and QR token',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'PI issued and made immutable' } },
      },
    },
    '/sales/pi/{id}/pdf': {
      get: {
        summary: 'Render print-ready A4 Proforma Invoice with tax summary and QR code',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Print-ready HTML document' } },
      },
    },
    '/finance/payments': {
      get: {
        summary: 'List payment receipts and disbursements',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Payment records' } },
      },
      post: {
        summary: 'Record payment and allocate against documents',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Payment recorded and ledger updated' } },
      },
    },
    '/finance/followups': {
      get: {
        summary: 'List payment follow-up records',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Follow-ups list' } },
      },
      post: {
        summary: 'Create payment follow-up task',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Follow-up created' } },
      },
    },
    '/finance/followups/dashboard': {
      get: {
        summary: 'Dues Recovery Dashboard KPIs (outstanding, overdue, promise-to-pay)',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Recovery metrics' } },
      },
    },
    '/qr/scan': {
      post: {
        summary: 'Admin QR camera scanner decoder',
        description: 'Decodes QR token, logs scan, and returns target admin navigation route for PI, PO, Product, or Inventory.',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Scanned entity details and route' } },
      },
    },
    '/audit': {
      get: {
        summary: 'View audit logs of mutations across all modules',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Audit log entries' } },
      },
    },

    // ─── Formal Sales Quotations ─────────────────────────────────────────────
    '/sales/quotations': {
      get: {
        summary: 'List formal sales quotations with filters & pagination',
        tags: ['Sales Quotations'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'customerId', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated sales quotations' } },
      },
      post: {
        summary: 'Draft formal sales quotation letter (PPS/D/26-27/817)',
        description: 'Creates project quotation letter with narrative clauses, SEZ exemption handling, and line items.',
        tags: ['Sales Quotations'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Quotation letter created' } },
      },
    },
    '/sales/quotations/{id}': {
      get: {
        summary: 'Get quotation details, line items, and revision history',
        tags: ['Sales Quotations'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Quotation details' } },
      },
      patch: {
        summary: 'Update quotation letter draft',
        tags: ['Sales Quotations'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Quotation updated' } },
      },
    },
    '/sales/quotations/{id}/revision': {
      post: {
        summary: 'Create a new quotation revision (R0 -> R1 -> R2)',
        description: 'Snapshots existing revision into history and increments revision counter.',
        tags: ['Sales Quotations'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'New revision created' } },
      },
    },
    '/sales/quotations/{id}/convert-to-order': {
      post: {
        summary: '1-Click convert quotation to central sales order (PPS/ORD/2026-27/0001)',
        tags: ['Sales Quotations'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sales order created and quotation linked' } },
      },
    },
    '/sales/quotations/{id}/pdf': {
      get: {
        summary: 'Render print-ready A4 formal sales quotation letter HTML',
        tags: ['Sales Quotations'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Print-ready HTML document' } },
      },
    },
    '/sales/quotations/templates': {
      get: {
        summary: 'List boilerplate narrative clauses and T&C templates',
        tags: ['Sales Quotations'],
        parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Content library templates' } },
      },
      post: {
        summary: 'Create or update boilerplate template clause',
        tags: ['Sales Quotations'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Template saved' } },
      },
    },

    // ─── Central Sales Orders Hub ───────────────────────────────────────────
    '/sales/orders': {
      get: {
        summary: 'List sales orders with universal cross-document search',
        tags: ['Sales Orders'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'customerId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Paginated sales orders' } },
      },
      post: {
        summary: 'Create central sales order (PPS/ORD/2026-27/0001)',
        tags: ['Sales Orders'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Sales order created' } },
      },
    },
    '/sales/orders/{id}': {
      get: {
        summary: 'Get order details with line items and dispatch reconciliation',
        tags: ['Sales Orders'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order details' } },
      },
      patch: {
        summary: 'Update sales order items or metadata',
        tags: ['Sales Orders'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order updated' } },
      },
    },
    '/sales/orders/{id}/status': {
      patch: {
        summary: 'Transition order status with reason and audit history',
        tags: ['Sales Orders'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order status transitioned' } },
      },
    },
    '/sales/orders/{id}/timeline': {
      get: {
        summary: 'Order document timeline (Quotation -> Order -> PI -> PL -> HIL -> Dues)',
        tags: ['Sales Orders'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Unified document timeline' } },
      },
    },
    '/sales/orders/{id}/pdf': {
      get: {
        summary: 'Render print-ready A4 Sales Order confirmation HTML',
        tags: ['Sales Orders'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Print-ready HTML document' } },
      },
    },

    // ─── Packing Lists & Logistics ──────────────────────────────────────────
    '/logistics/packing-lists': {
      get: {
        summary: 'List packing lists with partial dispatch status',
        tags: ['Packing Lists'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'orderId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Paginated packing lists' } },
      },
      post: {
        summary: 'Create packing list with BOM explosion (PPS/PL/2026-27/0001)',
        tags: ['Packing Lists'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Packing list created' } },
      },
    },
    '/logistics/packing-lists/{id}': {
      get: {
        summary: 'Get packing list details and categorized packet items',
        tags: ['Packing Lists'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Packing list details' } },
      },
    },
    '/logistics/packing-lists/{id}/dispatch': {
      post: {
        summary: 'Mark packing list as dispatched and generate consignee QR acknowledgment token',
        tags: ['Packing Lists'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Dispatched with digitalAckToken' } },
      },
    },
    '/logistics/packing-lists/{id}/pdf': {
      get: {
        summary: 'Render print-ready A4 Packing List with dual signature layout',
        tags: ['Packing Lists'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Print-ready HTML document' } },
      },
    },
    '/logistics/packing-lists/packet-types': {
      get: {
        summary: 'List packet nature classification lookups (Board, Channel, Box, Bundle, Crate)',
        tags: ['Packing Lists'],
        responses: { 200: { description: 'Packet types' } },
      },
    },
    '/logistics/packing-lists/order-bom/{orderId}': {
      get: {
        summary: 'Auto-explode Order BOM into cubicle door, pilaster, and partition components',
        tags: ['Packing Lists'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Exploded BOM line items' } },
      },
    },

    // ─── Warehouse Hardware Catalog & Store Issues ───────────────────────────
    '/warehouse/hardware-catalog': {
      get: {
        summary: 'List master 44-item hardware catalog',
        tags: ['Hardware Store'],
        parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Hardware items' } },
      },
      post: {
        summary: 'Add hardware catalog item',
        tags: ['Hardware Store'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Hardware item created' } },
      },
    },
    '/warehouse/hardware-catalog/{id}': {
      patch: {
        summary: 'Update hardware catalog item specs or sort order',
        tags: ['Hardware Store'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Item updated' } },
      },
    },
    '/warehouse/hardware-issues': {
      get: {
        summary: 'List store hardware issue lists',
        tags: ['Hardware Store'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Hardware issue lists' } },
      },
      post: {
        summary: 'Generate store hardware issue list (PPS/HIL/2026-27/0001)',
        tags: ['Hardware Store'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Hardware issue list created' } },
      },
    },
    '/warehouse/hardware-issues/{id}': {
      get: {
        summary: 'Get hardware issue list with all 44 items and sign-off timestamps',
        tags: ['Hardware Store'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Issue list details' } },
      },
    },
    '/warehouse/hardware-issues/{id}/sign-off': {
      patch: {
        summary: 'Sequential 4-role sign-off (Store Keeper, Packed by, Checked by, Store Incharge)',
        tags: ['Hardware Store'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sign-off recorded' } },
      },
    },
    '/warehouse/hardware-issues/{id}/pdf': {
      get: {
        summary: 'Render print-ready A4 Hardware Store Issue Checklist HTML',
        tags: ['Hardware Store'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Print-ready HTML document' } },
      },
    },

    // ─── CRM Deduplication & Customer Merge ──────────────────────────────────
    '/crm/check-duplicates': {
      post: {
        summary: 'Real-time fuzzy customer deduplication detector',
        description: 'Checks for duplicates across GSTIN, PAN, Phone, Email, and Legal Name.',
        tags: ['B2B CRM'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Deduplication match results' } },
      },
    },
    '/crm/merge': {
      post: {
        summary: 'Customer Merge Tool — relinks all orders, PIs, quotations, and payments',
        tags: ['B2B CRM'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Customers merged and audit logged' } },
      },
    },

    // ─── Public Digital Receipt Acknowledgment ───────────────────────────────
    '/acknowledge-receipt/{token}': {
      get: {
        summary: 'Public consignee receipt verification',
        description: 'Public endpoint scanned via QR on packing list or cartons.',
        tags: ['Public Logistics Verification'],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Safe packing list summary' } },
      },
      post: {
        summary: 'Public consignee digital receipt submission with signature',
        tags: ['Public Logistics Verification'],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Receipt confirmed and marked acknowledged' } },
      },
    },
  },
};

// Return raw OpenAPI spec JSON
router.get('/json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

// Serve interactive Swagger UI HTML
router.get('/', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pacific Restroom Cubicle — API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://pacificrestroomcubicle.com/logo.webp" />
  <style>
    body { margin: 0; background: #0f172a; }
    .topbar { display: none !important; }
    .swagger-ui .info .title { color: #7FB706; }
    .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
    .swagger-ui img { filter: invert(100%) hue-rotate(180deg); }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/v1/docs/json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
