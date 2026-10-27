-- AlterTable proforma_invoices
ALTER TABLE "proforma_invoices" ADD COLUMN IF NOT EXISTS "revisionNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable proforma_invoice_revisions
CREATE TABLE IF NOT EXISTS "proforma_invoice_revisions" (
    "id" TEXT NOT NULL,
    "piId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CURRENT',
    "snapshotJson" JSONB NOT NULL,
    "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "pdfPath" TEXT,
    "pdfFileName" TEXT,
    "pdfUrl" TEXT,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proforma_invoice_revisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "proforma_invoice_revisions_piId_revisionNumber_key" UNIQUE ("piId", "revisionNumber")
);

-- AlterTable sales_quotation_revisions
ALTER TABLE "sales_quotation_revisions" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'CURRENT';
ALTER TABLE "sales_quotation_revisions" ADD COLUMN IF NOT EXISTS "grandTotal" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "sales_quotation_revisions" ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "sales_quotation_revisions" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "sales_quotation_revisions" ADD COLUMN IF NOT EXISTS "itemCount" INTEGER DEFAULT 0;
ALTER TABLE "sales_quotation_revisions" ADD COLUMN IF NOT EXISTS "pdfPath" TEXT;
ALTER TABLE "sales_quotation_revisions" ADD COLUMN IF NOT EXISTS "pdfFileName" TEXT;
ALTER TABLE "sales_quotation_revisions" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "sales_quotation_revisions" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "proforma_invoice_revisions_piId_idx" ON "proforma_invoice_revisions"("piId");
CREATE INDEX IF NOT EXISTS "proforma_invoice_revisions_createdAt_idx" ON "proforma_invoice_revisions"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "sales_quotation_revisions_quotationId_revisionNumber_key" ON "sales_quotation_revisions"("quotationId", "revisionNumber");
CREATE INDEX IF NOT EXISTS "sales_quotation_revisions_quotationId_idx" ON "sales_quotation_revisions"("quotationId");
CREATE INDEX IF NOT EXISTS "sales_quotation_revisions_createdAt_idx" ON "sales_quotation_revisions"("createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'proforma_invoice_revisions_piId_fkey'
    ) THEN
        ALTER TABLE "proforma_invoice_revisions" ADD CONSTRAINT "proforma_invoice_revisions_piId_fkey" FOREIGN KEY ("piId") REFERENCES "proforma_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'proforma_invoice_revisions_createdById_fkey'
    ) THEN
        ALTER TABLE "proforma_invoice_revisions" ADD CONSTRAINT "proforma_invoice_revisions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sales_quotation_revisions_createdById_fkey'
    ) THEN
        ALTER TABLE "sales_quotation_revisions" ADD CONSTRAINT "sales_quotation_revisions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
