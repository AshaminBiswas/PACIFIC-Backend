-- Migration: 2026102402_operational_rls_policies
-- Description: Grant full access to anon and authenticated roles on operational tables for Admin Panel

DO $$
DECLARE
  tbl text;
  policy_name text;
  tables text[] := ARRAY[
    'hardware_inventory_items',
    'hardware_stock_movements',
    'hardware_branches',
    'hardware_vendors',
    'hardware_issue_lists',
    'hardware_issue_list_items',
    'hardware_catalog_items',
    'board_inventory_items',
    'board_stock_movements',
    'quotation_followups',
    'quotations',
    'leads',
    'commercial_projects',
    'configurator_designs',
    'location_customizations',
    'products',
    'erp_products',
    'blogs',
    'catalogs',
    'core_services',
    'faqs',
    'gallery_images',
    'hero_images',
    'hero_slides',
    'page_banners',
    'solutions',
    'testimonials',
    'cubicle_models',
    'cubicle_installers',
    'installer_bills',
    'installer_bill_items',
    'installer_bill_payments',
    'installer_bill_sequences',
    'company_profiles',
    'company_addresses',
    'company_bank_accounts',
    'company_signatories',
    'company_terms',
    'customer_profiles',
    'customer_merge_logs',
    'invoices',
    'dispatch_records',
    'packing_lists',
    'packing_list_items',
    'financial_transactions',
    'payable_entries',
    'payment_allocations',
    'business_parties',
    'party_addresses',
    'party_contacts'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      policy_name := 'Allow full access on ' || tbl;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = tbl AND policyname = policy_name
      ) THEN
        EXECUTE format('
          CREATE POLICY %I ON public.%I 
          FOR ALL 
          TO anon, authenticated 
          USING (true) 
          WITH CHECK (true)
        ', policy_name, tbl);
      END IF;
    END IF;
  END LOOP;
END
$$;
