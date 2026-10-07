#!/usr/bin/env node
/**
 * fix-db.js — Idempotent schema patches applied on every server boot.
 * Safe to run multiple times (all statements use IF NOT EXISTS / IF NOT EXISTS).
 * Uses DIRECT_URL (port 5432) for DDL operations.
 */
const { Client } = require('pg');

async function run() {
  const connectionString = (process.env.DATABASE_URL || process.env.DIRECT_URL || '')
    .replace('?pgbouncer=true&connection_limit=15&pool_timeout=20', '');
  if (!connectionString) {
    console.warn('[fix-db] No DATABASE_URL/DIRECT_URL set — skipping schema auto-heal');
    return;
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('[fix-db] Connected. Applying idempotent patches...');

    // 1. Extensions
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Roles & Permissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        "isSystem" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        module TEXT NOT NULL,
        description TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        "roleId" TEXT REFERENCES roles(id) ON DELETE CASCADE,
        "permissionId" TEXT REFERENCES permissions(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY ("roleId", "permissionId")
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
        "roleId" TEXT REFERENCES roles(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY ("userId", "roleId")
      );
    `);

    // 3. Company Profiles & Multi-Entity
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_profiles (
        id TEXT PRIMARY KEY,
        "companyName" TEXT NOT NULL,
        "legalName" TEXT NOT NULL,
        "entityCode" TEXT UNIQUE NOT NULL,
        country TEXT DEFAULT 'India',
        currency TEXT DEFAULT 'INR',
        "taxRegime" TEXT DEFAULT 'GST',
        gstin TEXT,
        pan TEXT,
        "vatNumber" TEXT,
        state TEXT,
        "stateCode" TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        "logoUrl" TEXT,
        "signatureUrl" TEXT,
        status TEXT DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS company_addresses (
        id TEXT PRIMARY KEY,
        "companyProfileId" TEXT REFERENCES company_profiles(id) ON DELETE CASCADE,
        type TEXT DEFAULT 'REGISTERED',
        "addressLine1" TEXT NOT NULL,
        "addressLine2" TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        "stateCode" TEXT,
        "postalCode" TEXT NOT NULL,
        phone TEXT,
        "isDefault" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS company_bank_accounts (
        id TEXT PRIMARY KEY,
        "companyProfileId" TEXT REFERENCES company_profiles(id) ON DELETE CASCADE,
        "bankName" TEXT NOT NULL,
        "accountNumber" TEXT NOT NULL,
        "ifscCode" TEXT,
        "swiftCode" TEXT,
        branch TEXT,
        iban TEXT,
        "isDefault" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS company_terms (
        id TEXT PRIMARY KEY,
        "companyProfileId" TEXT REFERENCES company_profiles(id) ON DELETE CASCADE,
        "documentType" TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        "sortOrder" INTEGER DEFAULT 0,
        "isDefault" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS company_signatories (
        id TEXT PRIMARY KEY,
        "companyProfileId" TEXT REFERENCES company_profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        designation TEXT NOT NULL,
        "signatureUrl" TEXT,
        "isDefault" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS document_sequences (
        id TEXT PRIMARY KEY,
        "companyProfileId" TEXT REFERENCES company_profiles(id) ON DELETE CASCADE,
        "documentType" TEXT NOT NULL,
        "fiscalYear" TEXT NOT NULL,
        prefix TEXT NOT NULL,
        "currentNumber" INTEGER DEFAULT 0,
        padding INTEGER DEFAULT 6,
        "updatedAt" TIMESTAMPTZ DEFAULT now(),
        UNIQUE ("companyProfileId", "documentType", "fiscalYear")
      );

      CREATE TABLE IF NOT EXISTS user_entity_access (
        "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
        "companyProfileId" TEXT REFERENCES company_profiles(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY ("userId", "companyProfileId")
      );
    `);

    // 4. Business Parties (CRM & Procurement Master)
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'VENDOR', 'BOTH');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS business_parties (
        id TEXT PRIMARY KEY,
        "companyProfileId" TEXT REFERENCES company_profiles(id),
        "partyType" "PartyType" DEFAULT 'CUSTOMER',
        "legalName" TEXT NOT NULL,
        "tradeName" TEXT,
        gstin TEXT,
        pan TEXT,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'ACTIVE',
        notes TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS customer_profiles (
        id TEXT PRIMARY KEY,
        "partyId" TEXT UNIQUE REFERENCES business_parties(id) ON DELETE CASCADE,
        "customerType" TEXT DEFAULT 'CONTRACTOR',
        "creditLimit" NUMERIC(12, 2),
        "paymentTermsDays" INTEGER DEFAULT 30,
        status TEXT DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS vendor_profiles (
        id TEXT PRIMARY KEY,
        "partyId" TEXT UNIQUE REFERENCES business_parties(id) ON DELETE CASCADE,
        "vendorType" TEXT DEFAULT 'RAW_MATERIALS',
        "paymentTermsDays" INTEGER DEFAULT 30,
        status TEXT DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS party_contacts (
        id TEXT PRIMARY KEY,
        "partyId" TEXT REFERENCES business_parties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        designation TEXT,
        department TEXT,
        phone TEXT,
        email TEXT,
        "isPrimary" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS party_addresses (
        id TEXT PRIMARY KEY,
        "partyId" TEXT REFERENCES business_parties(id) ON DELETE CASCADE,
        "addressType" TEXT DEFAULT 'BILLING',
        "addressLine1" TEXT NOT NULL,
        "addressLine2" TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        "stateCode" TEXT,
        country TEXT DEFAULT 'India',
        "postalCode" TEXT,
        gstin TEXT,
        "isDefaultBilling" BOOLEAN DEFAULT false,
        "isDefaultShipping" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 5. Product Master Extension
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_subcategories (
        id TEXT PRIMARY KEY,
        "categoryId" TEXT REFERENCES product_categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        "sortOrder" INTEGER DEFAULT 0,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        UNIQUE ("categoryId", slug)
      );

      CREATE TABLE IF NOT EXISTS product_materials (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS product_finishes (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS product_units (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        "productId" TEXT REFERENCES products(id) ON DELETE CASCADE,
        "variantName" TEXT NOT NULL,
        sku TEXT UNIQUE,
        barcode TEXT,
        price NUMERIC(12, 2),
        attributes JSONB DEFAULT '{}'::jsonb,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS product_documents (
        id TEXT PRIMARY KEY,
        "productId" TEXT REFERENCES products(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        "fileUrl" TEXT NOT NULL,
        "fileType" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      -- Extend products table
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS "subcategoryId" TEXT REFERENCES product_subcategories(id),
        ADD COLUMN IF NOT EXISTS "materialId" TEXT REFERENCES product_materials(id),
        ADD COLUMN IF NOT EXISTS "finishId" TEXT REFERENCES product_finishes(id),
        ADD COLUMN IF NOT EXISTS "unitId" TEXT REFERENCES product_units(id),
        ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE,
        ADD COLUMN IF NOT EXISTS "hsnSac" TEXT,
        ADD COLUMN IF NOT EXISTS "gstRate" NUMERIC(5, 2) DEFAULT 18.00,
        ADD COLUMN IF NOT EXISTS "costPrice" NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS thickness TEXT,
        ADD COLUMN IF NOT EXISTS "cuttingSize" TEXT;
    `);

    // 6. Purchase Orders
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        "poNumber" TEXT UNIQUE NOT NULL,
        "companyProfileId" TEXT REFERENCES company_profiles(id) NOT NULL,
        "vendorId" TEXT REFERENCES business_parties(id) NOT NULL,
        "poDate" TIMESTAMPTZ DEFAULT now(),
        subject TEXT,
        description TEXT,
        "deliveryAddressJson" JSONB NOT NULL,
        "billingAddressJson" JSONB NOT NULL,
        "paymentTerms" TEXT,
        "deliveryTerms" TEXT,
        subtotal NUMERIC(12, 2) DEFAULT 0,
        "gstAmount" NUMERIC(12, 2) DEFAULT 0,
        "totalAmount" NUMERIC(12, 2) DEFAULT 0,
        currency TEXT DEFAULT 'INR',
        status "POStatus" DEFAULT 'DRAFT',
        "createdById" TEXT REFERENCES users(id),
        "approvedById" TEXT REFERENCES users(id),
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id TEXT PRIMARY KEY,
        "poId" TEXT REFERENCES purchase_orders(id) ON DELETE CASCADE,
        "serialNumber" INTEGER NOT NULL,
        "productId" TEXT REFERENCES products(id),
        description TEXT NOT NULL,
        finish TEXT,
        thickness TEXT,
        "cuttingSize" TEXT,
        quantity NUMERIC(10, 2) NOT NULL,
        unit TEXT DEFAULT 'NOS',
        rate NUMERIC(12, 2) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        "gstRate" NUMERIC(5, 2) DEFAULT 18.00,
        "gstAmount" NUMERIC(12, 2) DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS purchase_order_status_history (
        id TEXT PRIMARY KEY,
        "poId" TEXT REFERENCES purchase_orders(id) ON DELETE CASCADE,
        "fromStatus" "POStatus",
        "toStatus" "POStatus" NOT NULL,
        "changedById" TEXT REFERENCES users(id),
        reason TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 7. Proforma Invoices
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "PIStatus" AS ENUM ('DRAFT', 'ISSUED', 'CONVERTED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS proforma_invoices (
        id TEXT PRIMARY KEY,
        "piNumber" TEXT UNIQUE NOT NULL,
        "piDate" TIMESTAMPTZ DEFAULT now(),
        "companyProfileId" TEXT REFERENCES company_profiles(id) NOT NULL,
        "customerId" TEXT REFERENCES business_parties(id) NOT NULL,
        "placeOfSupply" TEXT NOT NULL,
        "placeOfSupplyStateCode" TEXT NOT NULL,
        "reverseCharge" BOOLEAN DEFAULT false,
        "modeOfTransport" TEXT,
        "vehicleNumber" TEXT,
        "grLrNumber" TEXT,
        "linkedPoNumber" TEXT,
        "linkedPoDate" TIMESTAMPTZ,
        subtotal NUMERIC(12, 2) DEFAULT 0,
        "freightAmount" NUMERIC(12, 2) DEFAULT 0,
        "taxableAmount" NUMERIC(12, 2) DEFAULT 0,
        "cgstAmount" NUMERIC(12, 2) DEFAULT 0,
        "sgstAmount" NUMERIC(12, 2) DEFAULT 0,
        "igstAmount" NUMERIC(12, 2) DEFAULT 0,
        "totalTaxAmount" NUMERIC(12, 2) DEFAULT 0,
        "roundingAdjustment" NUMERIC(6, 2) DEFAULT 0,
        "grandTotal" NUMERIC(12, 2) DEFAULT 0,
        "amountInWords" TEXT,
        currency TEXT DEFAULT 'INR',
        status "PIStatus" DEFAULT 'DRAFT',
        "createdById" TEXT REFERENCES users(id),
        "issuedById" TEXT REFERENCES users(id),
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS proforma_invoice_parties (
        id TEXT PRIMARY KEY,
        "piId" TEXT REFERENCES proforma_invoices(id) ON DELETE CASCADE,
        "partyRole" TEXT NOT NULL,
        "partyName" TEXT NOT NULL,
        gstin TEXT,
        "addressLine" TEXT NOT NULL,
        state TEXT NOT NULL,
        "stateCode" TEXT,
        phone TEXT,
        email TEXT
      );

      CREATE TABLE IF NOT EXISTS proforma_invoice_items (
        id TEXT PRIMARY KEY,
        "piId" TEXT REFERENCES proforma_invoices(id) ON DELETE CASCADE,
        "serialNumber" INTEGER NOT NULL,
        "productId" TEXT REFERENCES products(id),
        description TEXT NOT NULL,
        "hsnSac" TEXT,
        quantity NUMERIC(10, 2) NOT NULL,
        unit TEXT DEFAULT 'NOS',
        rate NUMERIC(12, 2) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        "gstRate" NUMERIC(5, 2) DEFAULT 18.00,
        "taxableAmount" NUMERIC(12, 2) NOT NULL,
        cgst NUMERIC(12, 2) DEFAULT 0,
        sgst NUMERIC(12, 2) DEFAULT 0,
        igst NUMERIC(12, 2) DEFAULT 0,
        "totalAmount" NUMERIC(12, 2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS proforma_invoice_tax_summary (
        id TEXT PRIMARY KEY,
        "piId" TEXT REFERENCES proforma_invoices(id) ON DELETE CASCADE,
        "gstRate" NUMERIC(5, 2) NOT NULL,
        "taxableAmount" NUMERIC(12, 2) NOT NULL,
        cgst NUMERIC(12, 2) DEFAULT 0,
        sgst NUMERIC(12, 2) DEFAULT 0,
        igst NUMERIC(12, 2) DEFAULT 0,
        "totalTax" NUMERIC(12, 2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS proforma_invoice_terms (
        id TEXT PRIMARY KEY,
        "piId" TEXT REFERENCES proforma_invoices(id) ON DELETE CASCADE,
        "clauseNumber" INTEGER NOT NULL,
        text TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS proforma_invoice_status_history (
        id TEXT PRIMARY KEY,
        "piId" TEXT REFERENCES proforma_invoices(id) ON DELETE CASCADE,
        "fromStatus" "PIStatus",
        "toStatus" "PIStatus" NOT NULL,
        "changedById" TEXT REFERENCES users(id),
        comment TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 8. Finance, Payments & Follow-ups
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "PaymentType" AS ENUM ('CUSTOMER_PAYMENT', 'VENDOR_PAYMENT', 'ADVANCE', 'REFUND');
        CREATE TYPE "PaymentMethod" AS ENUM ('NEFT_RTGS', 'IMPS', 'UPI', 'CHEQUE', 'CASH', 'CARD');
        CREATE TYPE "PaymentRecordStatus" AS ENUM ('CONFIRMED', 'REVERSED');
        CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');
        CREATE TYPE "FollowupStatus" AS ENUM ('PENDING', 'CONTACTED', 'PROMISED_TO_PAY', 'DISPUTED', 'RESOLVED');
        CREATE TYPE "FollowupPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        "companyProfileId" TEXT REFERENCES company_profiles(id) NOT NULL,
        "partyId" TEXT REFERENCES business_parties(id) NOT NULL,
        "paymentType" "PaymentType" DEFAULT 'CUSTOMER_PAYMENT',
        "paymentMethod" "PaymentMethod" DEFAULT 'NEFT_RTGS',
        "referenceNumber" TEXT,
        "paymentDate" TIMESTAMPTZ DEFAULT now(),
        amount NUMERIC(12, 2) NOT NULL,
        "unallocatedAmount" NUMERIC(12, 2) NOT NULL,
        currency TEXT DEFAULT 'INR',
        notes TEXT,
        status "PaymentRecordStatus" DEFAULT 'CONFIRMED',
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS payment_allocations (
        id TEXT PRIMARY KEY,
        "paymentId" TEXT REFERENCES payments(id) ON DELETE CASCADE,
        "documentType" TEXT NOT NULL,
        "documentId" TEXT NOT NULL,
        "proformaInvoiceId" TEXT REFERENCES proforma_invoices(id),
        "allocatedAmount" NUMERIC(12, 2) NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS financial_transactions (
        id TEXT PRIMARY KEY,
        "paymentId" TEXT REFERENCES payments(id),
        "accountType" TEXT NOT NULL,
        "transactionType" TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        description TEXT NOT NULL,
        "referenceId" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS receivable_entries (
        id TEXT PRIMARY KEY,
        "customerId" TEXT REFERENCES customer_profiles(id) NOT NULL,
        "proformaInvoiceId" TEXT REFERENCES proforma_invoices(id),
        "totalAmount" NUMERIC(12, 2) NOT NULL,
        "paidAmount" NUMERIC(12, 2) DEFAULT 0,
        "balanceAmount" NUMERIC(12, 2) NOT NULL,
        "dueDate" TIMESTAMPTZ,
        status "ReceivableStatus" DEFAULT 'OPEN',
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS payable_entries (
        id TEXT PRIMARY KEY,
        "vendorId" TEXT REFERENCES vendor_profiles(id) NOT NULL,
        "purchaseOrderId" TEXT REFERENCES purchase_orders(id),
        "totalAmount" NUMERIC(12, 2) NOT NULL,
        "paidAmount" NUMERIC(12, 2) DEFAULT 0,
        "balanceAmount" NUMERIC(12, 2) NOT NULL,
        "dueDate" TIMESTAMPTZ,
        status "ReceivableStatus" DEFAULT 'OPEN',
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS payment_followups (
        id TEXT PRIMARY KEY,
        "customerId" TEXT REFERENCES business_parties(id) NOT NULL,
        "proformaInvoiceId" TEXT REFERENCES proforma_invoices(id),
        "outstandingAmount" NUMERIC(12, 2) NOT NULL,
        "dueDate" TIMESTAMPTZ,
        "followupStatus" "FollowupStatus" DEFAULT 'PENDING',
        priority "FollowupPriority" DEFAULT 'MEDIUM',
        "assignedUserId" TEXT REFERENCES users(id),
        "nextFollowupDate" TIMESTAMPTZ,
        "promisedPaymentDate" TIMESTAMPTZ,
        "promisedAmount" NUMERIC(12, 2),
        notes TEXT,
        "communicationChannel" TEXT DEFAULT 'PHONE',
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS payment_followup_logs (
        id TEXT PRIMARY KEY,
        "followupId" TEXT REFERENCES payment_followups(id) ON DELETE CASCADE,
        "userId" TEXT REFERENCES users(id),
        notes TEXT NOT NULL,
        response TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS payment_followup_reminders (
        id TEXT PRIMARY KEY,
        "followupId" TEXT REFERENCES payment_followups(id) ON DELETE CASCADE,
        "reminderDate" TIMESTAMPTZ NOT NULL,
        "isCompleted" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      -- Quotation Followups
      CREATE TABLE IF NOT EXISTS quotation_followups (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "quotationId" TEXT REFERENCES sales_quotations(id) ON DELETE CASCADE NOT NULL,
        "channel" TEXT NOT NULL DEFAULT 'CALL',
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "discussionNotes" TEXT,
        "nextFollowupDate" TIMESTAMPTZ,
        "contactPerson" TEXT,
        "contactPhone" TEXT,
        "contactEmail" TEXT,
        "performedById" TEXT REFERENCES users(id),
        "performedByName" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_quotation_followups_qid ON quotation_followups("quotationId");
      CREATE INDEX IF NOT EXISTS idx_quotation_followups_next ON quotation_followups("nextFollowupDate");
      CREATE INDEX IF NOT EXISTS idx_quotation_followups_status ON quotation_followups("status");

      ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS "nextFollowupDate" TIMESTAMPTZ;
      ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS "followupStatus" TEXT DEFAULT 'PENDING';
      ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS "lastFollowupDate" TIMESTAMPTZ;
      ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS "followupCount" INT DEFAULT 0;
    `);

    // 9. QR Subsystem & Public Verification Tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id TEXT PRIMARY KEY,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        "qrData" TEXT NOT NULL,
        "qrImageUrl" TEXT,
        status TEXT DEFAULT 'ACTIVE',
        "expiresAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "proformaInvoiceId" TEXT REFERENCES proforma_invoices(id),
        "purchaseOrderId" TEXT REFERENCES purchase_orders(id),
        "productId" TEXT REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS document_verification_tokens (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        "documentType" TEXT NOT NULL,
        "documentId" TEXT NOT NULL,
        "proformaInvoiceId" TEXT REFERENCES proforma_invoices(id),
        "verificationPayloadJson" JSONB NOT NULL,
        "isValid" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS qr_scan_logs (
        id TEXT PRIMARY KEY,
        "qrCodeId" TEXT REFERENCES qr_codes(id),
        token TEXT NOT NULL,
        "scannedByUserId" TEXT,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "scannedAt" TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 10. Audit Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        "userId" TEXT REFERENCES users(id),
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "oldData" JSONB,
        "newData" JSONB,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        timestamp TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 11. Sales Quotations (Letter Quotations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_quotations (
        id TEXT PRIMARY KEY,
        "referenceNumber" TEXT NOT NULL,
        "revisionNumber" INT DEFAULT 1,
        date TIMESTAMPTZ DEFAULT now(),
        "companyProfileId" TEXT REFERENCES company_profiles(id),
        "customerId" TEXT REFERENCES business_parties(id),
        "issuingStaffId" TEXT REFERENCES users(id),
        "createdById" TEXT REFERENCES users(id),
        "recipientSalutation" TEXT DEFAULT 'Mr.',
        "recipientName" TEXT NOT NULL,
        "recipientCompany" TEXT,
        "recipientAddress" TEXT,
        "recipientEmail" TEXT,
        "recipientPhone" TEXT,
        "projectName" TEXT NOT NULL,
        subject TEXT NOT NULL,
        title TEXT DEFAULT 'Quotation for Supply of Toilet Cubicles',
        currency TEXT DEFAULT 'INR',
        "basicPrice" NUMERIC(12, 2) DEFAULT 0,
        "installationCharge" NUMERIC(12, 2) DEFAULT 0,
        "freightTerms" TEXT DEFAULT 'Extra as Actual / To pay',
        "freightAmount" NUMERIC(12, 2) DEFAULT 0,
        "gstRate" NUMERIC(5, 2) DEFAULT 18.00,
        "isSezExempt" BOOLEAN DEFAULT false,
        "sezCertificateRef" TEXT,
        "gstAmount" NUMERIC(12, 2) DEFAULT 0,
        "grandTotal" NUMERIC(12, 2) DEFAULT 0,
        "amountInWords" TEXT,
        "accessoriesText" TEXT,
        "warrantyText" TEXT,
        "generalTerms" TEXT,
        "otherTerms" TEXT,
        "paymentTerms" TEXT,
        "deliveryTerms" TEXT,
        "statutoryComplianceTerms" TEXT,
        "validityDays" INT DEFAULT 30,
        "validUntil" TIMESTAMPTZ,
        status TEXT DEFAULT 'DRAFT',
        "convertedOrderId" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uq_sales_quotation_ref_rev UNIQUE ("referenceNumber", "revisionNumber")
      );

      CREATE TABLE IF NOT EXISTS sales_quotation_items (
        id TEXT PRIMARY KEY,
        "quotationId" TEXT REFERENCES sales_quotations(id) ON DELETE CASCADE,
        "serialNumber" INT NOT NULL,
        "productId" TEXT REFERENCES products(id),
        description TEXT NOT NULL,
        unit TEXT DEFAULT 'NOS',
        quantity NUMERIC(10, 2) NOT NULL,
        rate NUMERIC(12, 2) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        "cubicleSize" TEXT,
        "boardColor" TEXT,
        "boardThickness" TEXT,
        "doorSize" TEXT,
        "overallHeight" TEXT,
        "customSpecsJson" JSONB
      );

      CREATE TABLE IF NOT EXISTS sales_quotation_revisions (
        id TEXT PRIMARY KEY,
        "quotationId" TEXT REFERENCES sales_quotations(id) ON DELETE CASCADE,
        "revisionNumber" INT NOT NULL,
        "snapshotJson" JSONB NOT NULL,
        reason TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS quotation_content_templates (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        "productCategory" TEXT,
        "isDefault" BOOLEAN DEFAULT false,
        version INT DEFAULT 1,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 12. Central Sales Orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id TEXT PRIMARY KEY,
        "orderNumber" TEXT UNIQUE NOT NULL,
        "orderDate" TIMESTAMPTZ DEFAULT now(),
        "companyProfileId" TEXT REFERENCES company_profiles(id),
        "customerId" TEXT REFERENCES business_parties(id),
        source TEXT DEFAULT 'DIRECT_ENTRY',
        "quotationId" TEXT REFERENCES sales_quotations(id),
        "quotationRef" TEXT,
        "customerPoNumber" TEXT,
        "customerPoDate" TIMESTAMPTZ,
        "customerPoFileUrl" TEXT,
        currency TEXT DEFAULT 'INR',
        subtotal NUMERIC(12, 2) DEFAULT 0,
        "taxAmount" NUMERIC(12, 2) DEFAULT 0,
        "grandTotal" NUMERIC(12, 2) DEFAULT 0,
        status TEXT DEFAULT 'DRAFT',
        "statusReason" TEXT,
        "billingAddressSnapshot" JSONB,
        "shippingAddressSnapshot" JSONB,
        "siteContactSnapshot" JSONB,
        "createdById" TEXT REFERENCES users(id),
        "approvedById" TEXT REFERENCES users(id),
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS sales_order_items (
        id TEXT PRIMARY KEY,
        "orderId" TEXT REFERENCES sales_orders(id) ON DELETE CASCADE,
        "serialNumber" INT NOT NULL,
        "productId" TEXT REFERENCES products(id),
        description TEXT NOT NULL,
        quantity NUMERIC(10, 2) NOT NULL,
        "dispatchedQuantity" NUMERIC(10, 2) DEFAULT 0,
        unit TEXT DEFAULT 'NOS',
        rate NUMERIC(12, 2) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        "specsJson" JSONB
      );

      CREATE TABLE IF NOT EXISTS sales_order_status_history (
        id TEXT PRIMARY KEY,
        "orderId" TEXT REFERENCES sales_orders(id) ON DELETE CASCADE,
        "fromStatus" TEXT,
        "toStatus" TEXT NOT NULL,
        "changedById" TEXT REFERENCES users(id),
        comment TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now()
      );

      -- Link proforma_invoices to sales_orders
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "orderId" TEXT REFERENCES sales_orders(id);
    `);

    // 13. Packing Lists & BOM
    await client.query(`
      CREATE TABLE IF NOT EXISTS packing_lists (
        id TEXT PRIMARY KEY,
        "packingListNumber" TEXT UNIQUE NOT NULL,
        "orderId" TEXT REFERENCES sales_orders(id),
        "proformaInvoiceId" TEXT REFERENCES proforma_invoices(id),
        "customerId" TEXT REFERENCES business_parties(id),
        "companyProfileId" TEXT REFERENCES company_profiles(id),
        date TIMESTAMPTZ DEFAULT now(),
        "consignorName" TEXT NOT NULL,
        "consignorAddress" TEXT NOT NULL,
        "shipToName" TEXT NOT NULL,
        "shipToAddress" TEXT NOT NULL,
        "siteContactName" TEXT,
        "siteContactPhone" TEXT,
        "isPartialDispatch" BOOLEAN DEFAULT false,
        "isStandalone" BOOLEAN DEFAULT false,
        "totalQuantity" NUMERIC(10, 2) DEFAULT 0,
        "totalPackages" INT,
        "receiptStatus" TEXT DEFAULT 'DISPATCHED',
        "checkedByName" TEXT,
        "authorisedSignatoryName" TEXT,
        "receivedByName" TEXT,
        "receivedByPhone" TEXT,
        "receivedAt" TIMESTAMPTZ,
        "receiptSignatureData" TEXT,
        "digitalAckToken" TEXT UNIQUE,
        "createdById" TEXT REFERENCES users(id),
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS packing_list_items (
        id TEXT PRIMARY KEY,
        "packingListId" TEXT REFERENCES packing_lists(id) ON DELETE CASCADE,
        "serialNumber" INT NOT NULL,
        description TEXT NOT NULL,
        size TEXT,
        "designNo" TEXT,
        quantity NUMERIC(10, 2) NOT NULL,
        "noOfPackets" INT,
        "natureOfPacket" TEXT
      );

      CREATE TABLE IF NOT EXISTS packet_nature_lookups (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        "sortOrder" INT DEFAULT 0,
        "isActive" BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS product_boms (
        id TEXT PRIMARY KEY,
        "productId" TEXT REFERENCES products(id) ON DELETE CASCADE,
        "componentDescription" TEXT NOT NULL,
        "defaultSize" TEXT,
        "defaultDesignNo" TEXT,
        "ratioPerUnit" NUMERIC(10, 4) DEFAULT 1,
        "natureOfPacket" TEXT,
        category TEXT,
        "sortOrder" INT DEFAULT 0
      );
    `);

    // 14. Hardware Catalog & Issue Lists
    await client.query(`
      CREATE TABLE IF NOT EXISTS hardware_catalog_items (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        "defaultSize" TEXT,
        "defaultColor" TEXT,
        "sortOrder" INT DEFAULT 0,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS hardware_issue_lists (
        id TEXT PRIMARY KEY,
        "issueNumber" TEXT UNIQUE NOT NULL,
        date TIMESTAMPTZ DEFAULT now(),
        "customerId" TEXT REFERENCES business_parties(id),
        "orderId" TEXT REFERENCES sales_orders(id),
        "proformaInvoiceId" TEXT REFERENCES proforma_invoices(id),
        "buyerName" TEXT NOT NULL,
        "buyerAddress" TEXT NOT NULL,
        "projectName" TEXT,
        status TEXT DEFAULT 'DRAFT',
        "storeKeeperName" TEXT,
        "storeKeeperSignedAt" TIMESTAMPTZ,
        "packedByName" TEXT,
        "packedBySignedAt" TIMESTAMPTZ,
        "checkedByName" TEXT,
        "checkedBySignedAt" TIMESTAMPTZ,
        "inchargeName" TEXT,
        "inchargeSignedAt" TIMESTAMPTZ,
        "createdById" TEXT REFERENCES users(id),
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS hardware_issue_list_items (
        id TEXT PRIMARY KEY,
        "issueListId" TEXT REFERENCES hardware_issue_lists(id) ON DELETE CASCADE,
        "serialNumber" INT NOT NULL,
        "hardwareCatalogItemId" TEXT REFERENCES hardware_catalog_items(id),
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        color TEXT,
        size TEXT,
        quantity NUMERIC(10, 2) NOT NULL,
        remarks TEXT,
        "isCustomItem" BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS customer_merge_logs (
        id TEXT PRIMARY KEY,
        "canonicalCustomerId" TEXT NOT NULL,
        "mergedCustomerId" TEXT NOT NULL,
        "mergedCustomerData" JSONB NOT NULL,
        "performedByUserId" TEXT,
        "performedAt" TIMESTAMPTZ DEFAULT now(),
        reason TEXT
      );
    `);

    // 15. Default Seeds for Packet Natures and 44 Hardware Catalog Items
    await client.query(`
      INSERT INTO packet_nature_lookups (id, name, "sortOrder") VALUES
        ('pkt-1', 'Board', 1),
        ('pkt-2', 'Channel', 2),
        ('pkt-3', 'Corrugated Box', 3),
        ('pkt-4', 'Bundle', 4),
        ('pkt-5', 'Wooden Crate', 5),
        ('pkt-6', 'Loose Packet', 6)
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO hardware_catalog_items (id, name, category, "sortOrder") VALUES
        ('hw-1', 'Gravity Hinge (Left)', 'Cubicle Hardware', 1),
        ('hw-2', 'Gravity Hinge (Right)', 'Cubicle Hardware', 2),
        ('hw-3', 'Adjustable Leg', 'Cubicle Hardware', 3),
        ('hw-4', 'Door Knob', 'Cubicle Hardware', 4),
        ('hw-5', 'Coathook', 'Cubicle Hardware', 5),
        ('hw-6', 'Thumbturn Lock', 'Cubicle Hardware', 6),
        ('hw-7', 'Latch Lock PD Door', 'Cubicle Hardware', 7),
        ('hw-8', 'U Channel', 'Aluminium Extrusions', 8),
        ('hw-9', 'Door Stopper Channel', 'Aluminium Extrusions', 9),
        ('hw-10', 'F Channel', 'Aluminium Extrusions', 10),
        ('hw-11', 'Toprail (Standard)', 'Aluminium Extrusions', 11),
        ('hw-12', 'Toprail (Athena Wings)', 'Aluminium Extrusions', 12),
        ('hw-13', 'Shoebox', 'Cubicle Hardware', 13),
        ('hw-14', 'Shoebox Side Cover 18mm', 'Cubicle Hardware', 14),
        ('hw-15', 'Shoebox Side Cover 12mm', 'Cubicle Hardware', 15),
        ('hw-16', 'Toprail Cover', 'Cubicle Hardware', 16),
        ('hw-17', 'Floor Anchor', 'Cubicle Hardware', 17),
        ('hw-18', 'Tabular Holder', 'Cubicle Hardware', 18),
        ('hw-19', 'Wall Bracket', 'Cubicle Hardware', 19),
        ('hw-20', 'UMP Bracket', 'Cubicle Hardware', 20),
        ('hw-21', 'Athena Wings Toprail Holder', 'Aluminium Extrusions', 21),
        ('hw-22', 'Rubber Lining', 'Accessories', 22),
        ('hw-23', 'Noise Tape', 'Accessories', 23),
        ('hw-24', 'D Pole', 'Aluminium Extrusions', 24),
        ('hw-25', 'Hinge Adaptor', 'Cubicle Hardware', 25),
        ('hw-26', 'D Pole Cover', 'Aluminium Extrusions', 26),
        ('hw-27', 'Locker Hinge', 'Locker Hardware', 27),
        ('hw-28', 'Locker Front', 'Locker Hardware', 28),
        ('hw-29', 'Locker Back', 'Locker Hardware', 29),
        ('hw-30', 'Locker Infill', 'Locker Hardware', 30),
        ('hw-31', 'Locker Lock', 'Locker Hardware', 31),
        ('hw-32', 'Locker Rubber', 'Locker Hardware', 32),
        ('hw-33', 'Locker Leg', 'Locker Hardware', 33),
        ('hw-34', 'Locker D Cap', 'Locker Hardware', 34),
        ('hw-35', 'Wall Screw (10x32 CSK)', 'Screws & Fasteners', 35),
        ('hw-36', 'Side Channel Screw (6x13 PAN)', 'Screws & Fasteners', 36),
        ('hw-37', 'Mid Channel Screw (6x9 PAN)', 'Screws & Fasteners', 37),
        ('hw-38', 'SS Hinge Screw (10x13 CSK)', 'Screws & Fasteners', 38),
        ('hw-39', 'Nylon Hinge Screw (10x19 CSK)', 'Screws & Fasteners', 39),
        ('hw-40', 'Door Stopper Screw (6x9 CSK)', 'Screws & Fasteners', 40),
        ('hw-41', 'Wall Plug', 'Screws & Fasteners', 41),
        ('hw-42', 'Indicator Lock SS-304', 'Cubicle Hardware', 42),
        ('hw-43', 'Nylon Black Hardware Set', 'Accessories', 43),
        ('hw-44', 'SS-304 Hardware Set', 'Accessories', 44)
      ON CONFLICT (name) DO NOTHING;
    `);

    // 16. Indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_quotations_ref ON sales_quotations("referenceNumber");
      CREATE INDEX IF NOT EXISTS idx_sales_quotations_customer ON sales_quotations("customerId");
      CREATE INDEX IF NOT EXISTS idx_sales_orders_number ON sales_orders("orderNumber");
      CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders("customerId");
      CREATE INDEX IF NOT EXISTS idx_packing_lists_number ON packing_lists("packingListNumber");
      CREATE INDEX IF NOT EXISTS idx_packing_lists_order ON packing_lists("orderId");
      CREATE INDEX IF NOT EXISTS idx_hardware_issue_lists_num ON hardware_issue_lists("issueNumber");
      CREATE INDEX IF NOT EXISTS idx_hardware_issue_lists_order ON hardware_issue_lists("orderId");
    `);

    // 11. Indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_business_parties_legal_name ON business_parties("legalName");
      CREATE INDEX IF NOT EXISTS idx_business_parties_gstin ON business_parties(gstin);
      CREATE INDEX IF NOT EXISTS idx_business_parties_email ON business_parties(email);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders("poNumber");
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders("vendorId");
      CREATE INDEX IF NOT EXISTS idx_proforma_invoices_pi_number ON proforma_invoices("piNumber");
      CREATE INDEX IF NOT EXISTS idx_proforma_invoices_customer ON proforma_invoices("customerId");
      CREATE INDEX IF NOT EXISTS idx_payments_party ON payments("partyId");
      CREATE INDEX IF NOT EXISTS idx_payments_date ON payments("paymentDate");
      CREATE INDEX IF NOT EXISTS idx_followups_customer ON payment_followups("customerId");
      CREATE INDEX IF NOT EXISTS idx_followups_due_date ON payment_followups("dueDate");
      CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON qr_codes(token);
      CREATE INDEX IF NOT EXISTS idx_doc_tokens_token ON document_verification_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs("entityType", "entityId");
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
    `);

    // 17. Quotation Follow-ups Table & Quotations extension
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotation_followups (
        id TEXT PRIMARY KEY,
        "quotationId" TEXT NOT NULL REFERENCES sales_quotations(id) ON DELETE CASCADE,
        channel TEXT NOT NULL DEFAULT 'CALL',
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        "discussionNotes" TEXT NOT NULL,
        "nextFollowupDate" TIMESTAMPTZ,
        "contactPerson" TEXT,
        "contactPhone" TEXT,
        "contactEmail" TEXT,
        "performedById" TEXT,
        "performedByName" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS "nextFollowupDate" TIMESTAMPTZ;
      ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS "followupStatus" TEXT DEFAULT 'PENDING';
      ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS "lastFollowupDate" TIMESTAMPTZ;
      ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS "followupCount" INT DEFAULT 0;

      CREATE INDEX IF NOT EXISTS idx_quotation_followups_quotationId ON quotation_followups("quotationId");
      CREATE INDEX IF NOT EXISTS idx_quotation_followups_next_date ON quotation_followups("nextFollowupDate");
      CREATE INDEX IF NOT EXISTS idx_sales_quotations_next_followup ON sales_quotations("nextFollowupDate");
      CREATE INDEX IF NOT EXISTS idx_sales_quotations_followup_status ON sales_quotations("followupStatus");
    `);

    // 18. Sales Order Follow-ups Table & Sales Orders extension
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_order_followups (
        id TEXT PRIMARY KEY,
        "orderId" TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        channel TEXT NOT NULL DEFAULT 'CALL',
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        "discussionNotes" TEXT NOT NULL,
        "nextFollowupDate" TIMESTAMPTZ,
        "contactPerson" TEXT,
        "contactPhone" TEXT,
        "contactEmail" TEXT,
        "performedById" TEXT,
        "performedByName" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS "nextFollowupDate" TIMESTAMPTZ;
      ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS "followupStatus" TEXT DEFAULT 'PENDING';
      ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS "lastFollowupDate" TIMESTAMPTZ;
      ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS "followupCount" INT DEFAULT 0;

      CREATE INDEX IF NOT EXISTS idx_sales_order_followups_orderId ON sales_order_followups("orderId");
      CREATE INDEX IF NOT EXISTS idx_sales_order_followups_next_date ON sales_order_followups("nextFollowupDate");
      CREATE INDEX IF NOT EXISTS idx_sales_orders_next_followup ON sales_orders("nextFollowupDate");
      CREATE INDEX IF NOT EXISTS idx_sales_orders_followup_status ON sales_orders("followupStatus");
    `);

    // 19. Add WAITING_FOR_ADVANCE to SalesOrderStatus enum if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'SalesOrderStatus' AND e.enumlabel = 'WAITING_FOR_ADVANCE'
        ) THEN
          ALTER TYPE "SalesOrderStatus" ADD VALUE 'WAITING_FOR_ADVANCE' AFTER 'PENDING_APPROVAL';
        END IF;
      END
      $$;
    `);

    // 20. 7-Stage Universal ERP Lifecycle & Advance Payment Tracking
    await client.query(`
      -- Quotation converted to PI
      ALTER TABLE sales_quotations ADD COLUMN IF NOT EXISTS "convertedPiId" TEXT;

      -- Proforma Invoices: Quotation links & Advance Payment Tracking
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "quotationId" TEXT;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "quotationRef" TEXT;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "advancePercentage" NUMERIC(5, 2) DEFAULT 50.00;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "advanceRequiredAmount" NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "advanceReceivedAmount" NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "advancePaymentStatus" TEXT DEFAULT 'PENDING';
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "advancePaymentDate" TIMESTAMPTZ;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "advancePaymentReference" TEXT;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "advancePaymentMode" TEXT;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "convertedOrderId" TEXT;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "installationCharge" NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "installationRatePerCubicle" NUMERIC(10, 2);
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "installationCubicleCount" INT;
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "installationOption" TEXT DEFAULT 'Included';
      ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS "installationCustomNote" TEXT;

      -- Sales Orders: Proforma links
      ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS "proformaInvoiceId" TEXT;
      ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS "piNumber" TEXT;

      -- Invoices: Order and Proforma links
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "orderId" TEXT REFERENCES sales_orders(id) ON DELETE SET NULL;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "proformaInvoiceId" TEXT;

      -- Add CONVERTED_PROFORMA to SalesOrderSource enum
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'SalesOrderSource' AND e.enumlabel = 'CONVERTED_PROFORMA'
        ) THEN
          ALTER TYPE "SalesOrderSource" ADD VALUE 'CONVERTED_PROFORMA';
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END
      $$;

      -- Dispatch Records Table
      CREATE TABLE IF NOT EXISTS dispatch_records (
        id TEXT PRIMARY KEY,
        "dispatchNumber" TEXT UNIQUE NOT NULL,
        "orderId" TEXT REFERENCES sales_orders(id) ON DELETE SET NULL,
        "packingListId" TEXT REFERENCES packing_lists(id) ON DELETE SET NULL,
        "customerId" TEXT REFERENCES business_parties(id) ON DELETE SET NULL,
        "transporterName" TEXT,
        "vehicleNumber" TEXT,
        "driverName" TEXT,
        "driverPhone" TEXT,
        "lrNumber" TEXT,
        "lrDate" TIMESTAMPTZ,
        "ewayBillNumber" TEXT,
        "dispatchDate" TIMESTAMPTZ DEFAULT now(),
        "totalPackages" INT,
        status TEXT DEFAULT 'DISPATCHED',
        "termsAndConditions" TEXT,
        notes TEXT,
        "createdById" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT now(),
        "updatedAt" TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_dispatch_records_orderId ON dispatch_records("orderId");
      CREATE INDEX IF NOT EXISTS idx_dispatch_records_packingListId ON dispatch_records("packingListId");
      CREATE INDEX IF NOT EXISTS idx_dispatch_records_number ON dispatch_records("dispatchNumber");
    `);

    console.log('[fix-db] Schema auto-heal complete.');
  } catch (err) {
    console.error('[fix-db] Error during schema auto-heal:', err);
    // Non-fatal — server will still start
  } finally {
    await client.end();
  }
}

run();
