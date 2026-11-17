export interface PermissionDefinition {
  code: string;
  module: string;
  submodule: string;
  action: 'read' | 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'publish' | 'export' | 'import' | 'manage' | 'configure' | 'other';
  category: 'Level 1 - Module Access' | 'Level 2 - Submodule Access' | 'Level 3 - CRUD' | 'Level 4 - Advanced';
  description: string;
}

export const COMPLETE_PERMISSION_CATALOG: PermissionDefinition[] = [
  // ─── 1. Dashboard ──────────────────────────────────────────────────────────
  { code: 'dashboard.view', module: 'Dashboard', submodule: 'Overview', action: 'read', category: 'Level 1 - Module Access', description: 'View executive admin dashboard overview' },
  { code: 'dashboard.sales_overview', module: 'Dashboard', submodule: 'Widgets', action: 'read', category: 'Level 2 - Submodule Access', description: 'View sales pipeline overview widget' },
  { code: 'dashboard.revenue', module: 'Dashboard', submodule: 'Widgets', action: 'read', category: 'Level 2 - Submodule Access', description: 'View gross revenue and financial totals' },
  { code: 'dashboard.orders_summary', module: 'Dashboard', submodule: 'Widgets', action: 'read', category: 'Level 2 - Submodule Access', description: 'View order pipeline summaries' },
  { code: 'dashboard.inventory_summary', module: 'Dashboard', submodule: 'Widgets', action: 'read', category: 'Level 2 - Submodule Access', description: 'View stock levels and reorder alerts' },
  { code: 'dashboard.customer_stats', module: 'Dashboard', submodule: 'Widgets', action: 'read', category: 'Level 2 - Submodule Access', description: 'View customer statistics and retention' },
  { code: 'dashboard.analytics', module: 'Dashboard', submodule: 'Analytics', action: 'read', category: 'Level 2 - Submodule Access', description: 'View quick chart analytics' },
  { code: 'dashboard.export', module: 'Dashboard', submodule: 'Operations', action: 'export', category: 'Level 4 - Advanced', description: 'Export executive dashboard reports' },

  // ─── 2. Orders ─────────────────────────────────────────────────────────────
  { code: 'orders.read', module: 'Orders', submodule: 'Order Management', action: 'read', category: 'Level 3 - CRUD', description: 'View central sales orders' },
  { code: 'orders.details', module: 'Orders', submodule: 'Order Management', action: 'read', category: 'Level 2 - Submodule Access', description: 'View order timeline and item breakdown' },
  { code: 'orders.create', module: 'Orders', submodule: 'Order Management', action: 'create', category: 'Level 3 - CRUD', description: 'Create sales orders manually or convert from quote' },
  { code: 'orders.update', module: 'Orders', submodule: 'Order Management', action: 'update', category: 'Level 3 - CRUD', description: 'Edit sales order details and specs' },
  { code: 'orders.cancel', module: 'Orders', submodule: 'Workflow', action: 'other', category: 'Level 4 - Advanced', description: 'Cancel existing sales orders' },
  { code: 'orders.approve', module: 'Orders', submodule: 'Workflow', action: 'approve', category: 'Level 4 - Advanced', description: 'Approve sales orders for production' },
  { code: 'orders.status_update', module: 'Orders', submodule: 'Workflow', action: 'update', category: 'Level 4 - Advanced', description: 'Update lifecycle status of orders' },
  { code: 'orders.manage_shipping', module: 'Orders', submodule: 'Shipping', action: 'manage', category: 'Level 4 - Advanced', description: 'Assign transporters, LR, and dispatch' },
  { code: 'orders.manage_refunds', module: 'Orders', submodule: 'Finance', action: 'manage', category: 'Level 4 - Advanced', description: 'Manage credit notes and refunds' },
  { code: 'orders.export', module: 'Orders', submodule: 'Data Operations', action: 'export', category: 'Level 4 - Advanced', description: 'Export orders directory to Excel' },

  // ─── 3. Products ───────────────────────────────────────────────────────────
  { code: 'products.read', module: 'Products', submodule: 'Product Catalog', action: 'read', category: 'Level 3 - CRUD', description: 'View product catalog and specifications' },
  { code: 'products.create', module: 'Products', submodule: 'Product Catalog', action: 'create', category: 'Level 3 - CRUD', description: 'Add new products and cubicle models' },
  { code: 'products.update', module: 'Products', submodule: 'Product Catalog', action: 'update', category: 'Level 3 - CRUD', description: 'Edit product details, BOM and dimensions' },
  { code: 'products.delete', module: 'Products', submodule: 'Product Catalog', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete catalog products' },
  { code: 'products.publish', module: 'Products', submodule: 'Publishing', action: 'publish', category: 'Level 4 - Advanced', description: 'Publish product to live catalog and web' },
  { code: 'products.unpublish', module: 'Products', submodule: 'Publishing', action: 'publish', category: 'Level 4 - Advanced', description: 'Unpublish or archive product' },
  { code: 'products.manage_pricing', module: 'Products', submodule: 'Pricing', action: 'manage', category: 'Level 4 - Advanced', description: 'Manage base prices and tier discounts' },
  { code: 'products.manage_images', module: 'Products', submodule: 'Media', action: 'manage', category: 'Level 4 - Advanced', description: 'Upload and manage product 2D/3D renders' },
  { code: 'products.manage_variants', module: 'Products', submodule: 'Variants', action: 'manage', category: 'Level 4 - Advanced', description: 'Configure board thickness and color variants' },
  { code: 'products.manage_seo', module: 'Products', submodule: 'SEO', action: 'manage', category: 'Level 4 - Advanced', description: 'Configure product meta tags and schema' },
  { code: 'products.import', module: 'Products', submodule: 'Data Operations', action: 'import', category: 'Level 4 - Advanced', description: 'Bulk import products via spreadsheet' },
  { code: 'products.export', module: 'Products', submodule: 'Data Operations', action: 'export', category: 'Level 4 - Advanced', description: 'Export product catalog with specs' },

  // ─── 4. Categories ─────────────────────────────────────────────────────────
  { code: 'categories.read', module: 'Categories', submodule: 'Category Hierarchy', action: 'read', category: 'Level 3 - CRUD', description: 'View product and hardware categories' },
  { code: 'categories.create', module: 'Categories', submodule: 'Category Hierarchy', action: 'create', category: 'Level 3 - CRUD', description: 'Create product categories and subcategories' },
  { code: 'categories.update', module: 'Categories', submodule: 'Category Hierarchy', action: 'update', category: 'Level 3 - CRUD', description: 'Edit category names, slugs and parents' },
  { code: 'categories.delete', module: 'Categories', submodule: 'Category Hierarchy', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete unused product categories' },
  { code: 'categories.reorder', module: 'Categories', submodule: 'Arrangement', action: 'manage', category: 'Level 4 - Advanced', description: 'Reorder categories on navigation menu' },
  { code: 'categories.publish', module: 'Categories', submodule: 'Publishing', action: 'publish', category: 'Level 4 - Advanced', description: 'Publish or hide category from public catalog' },

  // ─── 5. Brands ─────────────────────────────────────────────────────────────
  { code: 'brands.read', module: 'Brands', submodule: 'Brand Master', action: 'read', category: 'Level 3 - CRUD', description: 'View authorized laminate and hardware brands' },
  { code: 'brands.create', module: 'Brands', submodule: 'Brand Master', action: 'create', category: 'Level 3 - CRUD', description: 'Add new brand partners' },
  { code: 'brands.update', module: 'Brands', submodule: 'Brand Master', action: 'update', category: 'Level 3 - CRUD', description: 'Edit brand names, logos and descriptions' },
  { code: 'brands.delete', module: 'Brands', submodule: 'Brand Master', action: 'delete', category: 'Level 3 - CRUD', description: 'Remove brand records' },
  { code: 'brands.publish', module: 'Brands', submodule: 'Publishing', action: 'publish', category: 'Level 4 - Advanced', description: 'Toggle brand visibility on website' },

  // ─── 6. Collections ────────────────────────────────────────────────────────
  { code: 'collections.read', module: 'Collections', submodule: 'Curated Sets', action: 'read', category: 'Level 3 - CRUD', description: 'View cubicle series and curated collections' },
  { code: 'collections.create', module: 'Collections', submodule: 'Curated Sets', action: 'create', category: 'Level 3 - CRUD', description: 'Create new curated collection sets' },
  { code: 'collections.update', module: 'Collections', submodule: 'Curated Sets', action: 'update', category: 'Level 3 - CRUD', description: 'Edit collection details and imagery' },
  { code: 'collections.delete', module: 'Collections', submodule: 'Curated Sets', action: 'delete', category: 'Level 3 - CRUD', description: 'Remove collections' },
  { code: 'collections.manage_products', module: 'Collections', submodule: 'Items', action: 'manage', category: 'Level 4 - Advanced', description: 'Assign or remove products from collection' },
  { code: 'collections.publish', module: 'Collections', submodule: 'Publishing', action: 'publish', category: 'Level 4 - Advanced', description: 'Publish collection to public catalog' },

  // ─── 7. Banner Manager ─────────────────────────────────────────────────────
  { code: 'banners.read', module: 'Banner Manager', submodule: 'Display Media', action: 'read', category: 'Level 3 - CRUD', description: 'View homepage sliders and page banners' },
  { code: 'banners.create', module: 'Banner Manager', submodule: 'Display Media', action: 'create', category: 'Level 3 - CRUD', description: 'Upload and configure promotional banners' },
  { code: 'banners.update', module: 'Banner Manager', submodule: 'Display Media', action: 'update', category: 'Level 3 - CRUD', description: 'Edit banner call-to-actions and graphics' },
  { code: 'banners.delete', module: 'Banner Manager', submodule: 'Display Media', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete promotional banners' },
  { code: 'banners.schedule', module: 'Banner Manager', submodule: 'Scheduling', action: 'manage', category: 'Level 4 - Advanced', description: 'Schedule banner launch and expiry dates' },
  { code: 'banners.publish', module: 'Banner Manager', submodule: 'Publishing', action: 'publish', category: 'Level 4 - Advanced', description: 'Toggle banner display on live pages' },

  // ─── 8. Offers & Discounts ─────────────────────────────────────────────────
  { code: 'offers.read', module: 'Offers & Discounts', submodule: 'Promotions', action: 'read', category: 'Level 3 - CRUD', description: 'View seasonal campaign offers and rules' },
  { code: 'offers.create', module: 'Offers & Discounts', submodule: 'Promotions', action: 'create', category: 'Level 3 - CRUD', description: 'Create promotional volume discounts' },
  { code: 'offers.update', module: 'Offers & Discounts', submodule: 'Promotions', action: 'update', category: 'Level 3 - CRUD', description: 'Edit offer terms and percentage cuts' },
  { code: 'offers.delete', module: 'Offers & Discounts', submodule: 'Promotions', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete promotional offers' },
  { code: 'offers.activate', module: 'Offers & Discounts', submodule: 'Lifecycle', action: 'manage', category: 'Level 4 - Advanced', description: 'Activate or pause promotional campaigns' },
  { code: 'offers.approve', module: 'Offers & Discounts', submodule: 'Governance', action: 'approve', category: 'Level 4 - Advanced', description: 'Authorize commercial discount structures' },

  // ─── 9. Coupons ────────────────────────────────────────────────────────────
  { code: 'coupons.read', module: 'Coupons', submodule: 'Coupon Codes', action: 'read', category: 'Level 3 - CRUD', description: 'View corporate coupon codes and redemptions' },
  { code: 'coupons.create', module: 'Coupons', submodule: 'Coupon Codes', action: 'create', category: 'Level 3 - CRUD', description: 'Generate B2B discount vouchers and codes' },
  { code: 'coupons.update', module: 'Coupons', submodule: 'Coupon Codes', action: 'update', category: 'Level 3 - CRUD', description: 'Edit validity and limits of coupon codes' },
  { code: 'coupons.delete', module: 'Coupons', submodule: 'Coupon Codes', action: 'delete', category: 'Level 3 - CRUD', description: 'Revoke and delete coupons' },
  { code: 'coupons.activate', module: 'Coupons', submodule: 'Lifecycle', action: 'manage', category: 'Level 4 - Advanced', description: 'Enable or disable coupon redemption' },
  { code: 'coupons.view_usage', module: 'Coupons', submodule: 'Analytics', action: 'read', category: 'Level 4 - Advanced', description: 'View redemptions and usage history' },
  { code: 'coupons.export', module: 'Coupons', submodule: 'Data Operations', action: 'export', category: 'Level 4 - Advanced', description: 'Export coupon usage audit logs' },

  // ─── 10. Customers ─────────────────────────────────────────────────────────
  { code: 'customers.read', module: 'Customers', submodule: 'Client Directory', action: 'read', category: 'Level 3 - CRUD', description: 'View customer accounts and company names' },
  { code: 'customers.create', module: 'Customers', submodule: 'Client Directory', action: 'create', category: 'Level 3 - CRUD', description: 'Add new client records and billing profiles' },
  { code: 'customers.update', module: 'Customers', submodule: 'Client Directory', action: 'update', category: 'Level 3 - CRUD', description: 'Edit client contacts, GST, and addresses' },
  { code: 'customers.delete', module: 'Customers', submodule: 'Client Directory', action: 'delete', category: 'Level 3 - CRUD', description: 'Deactivate or delete customer accounts' },
  { code: 'customers.view_details', module: 'Customers', submodule: 'Profile 360', action: 'read', category: 'Level 2 - Submodule Access', description: 'View client 360 overview and relationships' },
  { code: 'customers.view_orders', module: 'Customers', submodule: 'History', action: 'read', category: 'Level 2 - Submodule Access', description: 'View past orders and quotations for client' },
  { code: 'customers.view_payments', module: 'Customers', submodule: 'Ledger', action: 'read', category: 'Level 2 - Submodule Access', description: 'View client receipts and payment history' },
  { code: 'customers.export', module: 'Customers', submodule: 'Data Operations', action: 'export', category: 'Level 4 - Advanced', description: 'Export customer directory to Excel/CSV' },
  { code: 'customers.view_sensitive', module: 'Customers', submodule: 'Compliance', action: 'read', category: 'Level 4 - Advanced', description: 'View credit limits, PAN, bank accounts, and debts' },

  // ─── 11. Reviews ───────────────────────────────────────────────────────────
  { code: 'reviews.read', module: 'Reviews', submodule: 'Feedback', action: 'read', category: 'Level 3 - CRUD', description: 'View customer project testimonials and reviews' },
  { code: 'reviews.approve', module: 'Reviews', submodule: 'Moderation', action: 'approve', category: 'Level 4 - Advanced', description: 'Approve client reviews for website display' },
  { code: 'reviews.reject', module: 'Reviews', submodule: 'Moderation', action: 'reject', category: 'Level 4 - Advanced', description: 'Reject and moderate inappropriate reviews' },
  { code: 'reviews.delete', module: 'Reviews', submodule: 'Moderation', action: 'delete', category: 'Level 3 - CRUD', description: 'Permanently remove reviews' },
  { code: 'reviews.publish', module: 'Reviews', submodule: 'Publishing', action: 'publish', category: 'Level 4 - Advanced', description: 'Toggle review display on testimonial carousel' },
  { code: 'reviews.reply', module: 'Reviews', submodule: 'Engagement', action: 'create', category: 'Level 4 - Advanced', description: 'Post official brand response to reviews' },

  // ─── 12. Inventory ─────────────────────────────────────────────────────────
  { code: 'inventory.read', module: 'Inventory', submodule: 'Stock Registry', action: 'read', category: 'Level 3 - CRUD', description: 'View board and hardware inventory stock' },
  { code: 'inventory.add_stock', module: 'Inventory', submodule: 'Inward', action: 'create', category: 'Level 3 - CRUD', description: 'Record inward factory stock consignments' },
  { code: 'inventory.update_stock', module: 'Inventory', submodule: 'Stock Registry', action: 'update', category: 'Level 3 - CRUD', description: 'Edit inventory item specs, rates, and racks' },
  { code: 'inventory.remove_stock', module: 'Inventory', submodule: 'Outward', action: 'delete', category: 'Level 3 - CRUD', description: 'Record outward stock issuance to jobs' },
  { code: 'inventory.manage_warehouses', module: 'Inventory', submodule: 'Warehouses', action: 'manage', category: 'Level 4 - Advanced', description: 'Configure factory and branch warehouse locations' },
  { code: 'inventory.manage_suppliers', module: 'Inventory', submodule: 'Vendors', action: 'manage', category: 'Level 4 - Advanced', description: 'Manage raw material vendor master' },
  { code: 'inventory.stock_adjust', module: 'Inventory', submodule: 'Audit', action: 'update', category: 'Level 4 - Advanced', description: 'Perform manual physical stock adjustments' },
  { code: 'inventory.view_history', module: 'Inventory', submodule: 'Movements', action: 'read', category: 'Level 2 - Submodule Access', description: 'View stock ledger and movement history' },
  { code: 'inventory.export', module: 'Inventory', submodule: 'Data Operations', action: 'export', category: 'Level 4 - Advanced', description: 'Export full stock balance reports' },

  // ─── 13. Media Library ─────────────────────────────────────────────────────
  { code: 'media.read', module: 'Media Library', submodule: 'Assets', action: 'read', category: 'Level 3 - CRUD', description: 'Browse CDN images, drawings, and brochures' },
  { code: 'media.upload', module: 'Media Library', submodule: 'Assets', action: 'create', category: 'Level 3 - CRUD', description: 'Upload CAD files, product photos, and PDFs' },
  { code: 'media.update', module: 'Media Library', submodule: 'Assets', action: 'update', category: 'Level 3 - CRUD', description: 'Edit media titles, alt tags, and metadata' },
  { code: 'media.delete', module: 'Media Library', submodule: 'Assets', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete assets from ImageKit / Supabase CDN' },
  { code: 'media.organise_folders', module: 'Media Library', submodule: 'Organization', action: 'manage', category: 'Level 4 - Advanced', description: 'Create and organize asset folder hierarchies' },
  { code: 'media.manage_access', module: 'Media Library', submodule: 'Security', action: 'configure', category: 'Level 4 - Advanced', description: 'Configure public vs private file access' },

  // ─── 14. Sales Reports ─────────────────────────────────────────────────────
  { code: 'reports.read', module: 'Sales Reports', submodule: 'Reporting', action: 'read', category: 'Level 1 - Module Access', description: 'View central sales reports dashboard' },
  { code: 'reports.generate', module: 'Sales Reports', submodule: 'Reporting', action: 'create', category: 'Level 4 - Advanced', description: 'Generate custom date-range business reports' },
  { code: 'reports.export', module: 'Sales Reports', submodule: 'Reporting', action: 'export', category: 'Level 4 - Advanced', description: 'Export sales reports to Excel and PDF' },
  { code: 'reports.view_revenue', module: 'Sales Reports', submodule: 'Financial', action: 'read', category: 'Level 2 - Submodule Access', description: 'View detailed turnover, margins, and taxes' },
  { code: 'reports.view_orders', module: 'Sales Reports', submodule: 'Orders', action: 'read', category: 'Level 2 - Submodule Access', description: 'View fulfilled and pending order reports' },
  { code: 'reports.view_customers', module: 'Sales Reports', submodule: 'Clients', action: 'read', category: 'Level 2 - Submodule Access', description: 'View customer revenue and dues reports' },
  { code: 'reports.view_product_performance', module: 'Sales Reports', submodule: 'Products', action: 'read', category: 'Level 2 - Submodule Access', description: 'Analyze top-selling models and hardware' },

  // ─── 15. Analytics ─────────────────────────────────────────────────────────
  { code: 'analytics.read', module: 'Analytics', submodule: 'Metrics', action: 'read', category: 'Level 1 - Module Access', description: 'Access marketing and conversion analytics' },
  { code: 'analytics.traffic', module: 'Analytics', submodule: 'Web Traffic', action: 'read', category: 'Level 2 - Submodule Access', description: 'View website visitor traffic and geography' },
  { code: 'analytics.conversion_rates', module: 'Analytics', submodule: 'Funnels', action: 'read', category: 'Level 2 - Submodule Access', description: 'Analyze quotation to order win rates' },
  { code: 'analytics.product_analytics', module: 'Analytics', submodule: 'Products', action: 'read', category: 'Level 2 - Submodule Access', description: 'View 3D configurator design analytics' },
  { code: 'analytics.customer_analytics', module: 'Analytics', submodule: 'Clients', action: 'read', category: 'Level 2 - Submodule Access', description: 'View customer lifetime value calculations' },
  { code: 'analytics.export', module: 'Analytics', submodule: 'Data Operations', action: 'export', category: 'Level 4 - Advanced', description: 'Export aggregated analytics datasets' },

  // ─── 16. Website CMS ───────────────────────────────────────────────────────
  { code: 'cms.read', module: 'Website CMS', submodule: 'Pages', action: 'read', category: 'Level 3 - CRUD', description: 'View website pages, solutions, and components' },
  { code: 'cms.edit_pages', module: 'Website CMS', submodule: 'Pages', action: 'update', category: 'Level 3 - CRUD', description: 'Edit copy, hero sections, and layout blocks' },
  { code: 'cms.create_pages', module: 'Website CMS', submodule: 'Pages', action: 'create', category: 'Level 3 - CRUD', description: 'Create new landing pages and location pages' },
  { code: 'cms.delete_pages', module: 'Website CMS', submodule: 'Pages', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete landing pages' },
  { code: 'cms.publish_pages', module: 'Website CMS', submodule: 'Publishing', action: 'publish', category: 'Level 4 - Advanced', description: 'Publish page updates to live domain' },
  { code: 'cms.manage_homepage', module: 'Website CMS', submodule: 'Homepage', action: 'manage', category: 'Level 4 - Advanced', description: 'Configure homepage sections and hero carousel' },
  { code: 'cms.manage_navigation', module: 'Website CMS', submodule: 'Navigation', action: 'manage', category: 'Level 4 - Advanced', description: 'Update header mega menu and quick links' },
  { code: 'cms.manage_footer', module: 'Website CMS', submodule: 'Footer', action: 'manage', category: 'Level 4 - Advanced', description: 'Edit footer addresses, links, and disclaimers' },
  { code: 'cms.manage_content', module: 'Website CMS', submodule: 'General Content', action: 'manage', category: 'Level 4 - Advanced', description: 'Manage corporate FAQs and company history' },

  // ─── 17. Blog ──────────────────────────────────────────────────────────────
  { code: 'blogs.read', module: 'Blog', submodule: 'Articles', action: 'read', category: 'Level 3 - CRUD', description: 'View blog articles, drafts, and categories' },
  { code: 'blogs.create', module: 'Blog', submodule: 'Articles', action: 'create', category: 'Level 3 - CRUD', description: 'Write and draft educational articles' },
  { code: 'blogs.update', module: 'Blog', submodule: 'Articles', action: 'update', category: 'Level 3 - CRUD', description: 'Edit blog content, excerpts, and tags' },
  { code: 'blogs.delete', module: 'Blog', submodule: 'Articles', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete blog articles' },
  { code: 'blogs.publish', module: 'Blog', submodule: 'Publishing', action: 'publish', category: 'Level 4 - Advanced', description: 'Publish articles to the live blog' },
  { code: 'blogs.schedule', module: 'Blog', submodule: 'Scheduling', action: 'manage', category: 'Level 4 - Advanced', description: 'Schedule article publication dates' },
  { code: 'blogs.manage_categories', module: 'Blog', submodule: 'Taxonomy', action: 'manage', category: 'Level 4 - Advanced', description: 'Manage blog categories and tags' },
  { code: 'blogs.manage_images', module: 'Blog', submodule: 'Media', action: 'manage', category: 'Level 4 - Advanced', description: 'Manage featured thumbnails and banners' },
  { code: 'blogs.manage_seo', module: 'Blog', submodule: 'SEO', action: 'manage', category: 'Level 4 - Advanced', description: 'Configure blog schema, open graph, and meta' },

  // ─── 18. SEO ───────────────────────────────────────────────────────────────
  { code: 'seo.read', module: 'SEO', submodule: 'Configuration', action: 'read', category: 'Level 1 - Module Access', description: 'View sitewide SEO audit and meta settings' },
  { code: 'seo.edit_meta_titles', module: 'SEO', submodule: 'Meta', action: 'update', category: 'Level 4 - Advanced', description: 'Edit page title tags across routes' },
  { code: 'seo.edit_meta_descriptions', module: 'SEO', submodule: 'Meta', action: 'update', category: 'Level 4 - Advanced', description: 'Edit meta descriptions and social cards' },
  { code: 'seo.manage_canonical_urls', module: 'SEO', submodule: 'Canonical', action: 'configure', category: 'Level 4 - Advanced', description: 'Configure canonical tag preferences' },
  { code: 'seo.manage_redirects', module: 'SEO', submodule: 'Redirects', action: 'manage', category: 'Level 4 - Advanced', description: 'Create and manage 301 URL redirects' },
  { code: 'seo.manage_sitemaps', module: 'SEO', submodule: 'Sitemap', action: 'manage', category: 'Level 4 - Advanced', description: 'Regenerate and ping XML sitemaps' },
  { code: 'seo.manage_robots', module: 'SEO', submodule: 'Robots', action: 'configure', category: 'Level 4 - Advanced', description: 'Edit robots.txt crawler directives' },
  { code: 'seo.configure_defaults', module: 'SEO', submodule: 'Defaults', action: 'configure', category: 'Level 4 - Advanced', description: 'Configure default structured schema data' },

  // ─── 19. Notifications ─────────────────────────────────────────────────────
  { code: 'notifications.read', module: 'Notifications', submodule: 'Center', action: 'read', category: 'Level 1 - Module Access', description: 'View system broadcast notifications' },
  { code: 'notifications.create', module: 'Notifications', submodule: 'Alerts', action: 'create', category: 'Level 3 - CRUD', description: 'Create internal admin notices' },
  { code: 'notifications.update', module: 'Notifications', submodule: 'Alerts', action: 'update', category: 'Level 3 - CRUD', description: 'Update notification content and priority' },
  { code: 'notifications.delete', module: 'Notifications', submodule: 'Alerts', action: 'delete', category: 'Level 3 - CRUD', description: 'Dismiss and delete notification items' },
  { code: 'notifications.send', module: 'Notifications', submodule: 'Delivery', action: 'manage', category: 'Level 4 - Advanced', description: 'Broadcast instant alerts across admin users' },
  { code: 'notifications.manage_templates', module: 'Notifications', submodule: 'Templates', action: 'configure', category: 'Level 4 - Advanced', description: 'Configure WhatsApp & Email alert templates' },

  // ─── 20. Admin Users (Super Admin Only by default) ─────────────────────────
  { code: 'admins.read', module: 'Admin Users', submodule: 'Directory', action: 'read', category: 'Level 3 - CRUD', description: 'View list of admin users and profile cards' },
  { code: 'admins.create', module: 'Admin Users', submodule: 'Provisioning', action: 'create', category: 'Level 3 - CRUD', description: 'Manually create new admin accounts' },
  { code: 'admins.update', module: 'Admin Users', submodule: 'Directory', action: 'update', category: 'Level 3 - CRUD', description: 'Edit admin personal info, department, and role' },
  { code: 'admins.deactivate', module: 'Admin Users', submodule: 'Security', action: 'manage', category: 'Level 4 - Advanced', description: 'Activate, deactivate, or suspend admin accounts' },
  { code: 'admins.reset_passwords', module: 'Admin Users', submodule: 'Security', action: 'manage', category: 'Level 4 - Advanced', description: 'Trigger password resets and temporary tokens' },
  { code: 'admins.manage_sessions', module: 'Admin Users', submodule: 'Security', action: 'manage', category: 'Level 4 - Advanced', description: 'Inspect and terminate active admin sessions' },
  { code: 'admins.assign_roles', module: 'Admin Users', submodule: 'RBAC', action: 'manage', category: 'Level 4 - Advanced', description: 'Assign and change admin roles' },
  { code: 'admins.view_activity', module: 'Admin Users', submodule: 'Audit', action: 'read', category: 'Level 4 - Advanced', description: 'View comprehensive individual admin action logs' },

  // ─── 21. Roles & Permissions (Super Admin Only by default) ─────────────────
  { code: 'roles.read', module: 'Roles & Permissions', submodule: 'Role Directory', action: 'read', category: 'Level 3 - CRUD', description: 'View role templates and configured permission sets' },
  { code: 'roles.create', module: 'Roles & Permissions', submodule: 'Role Directory', action: 'create', category: 'Level 3 - CRUD', description: 'Create custom roles' },
  { code: 'roles.update', module: 'Roles & Permissions', submodule: 'Role Directory', action: 'update', category: 'Level 3 - CRUD', description: 'Edit custom role names and descriptions' },
  { code: 'roles.delete', module: 'Roles & Permissions', submodule: 'Role Directory', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete unused custom roles' },
  { code: 'roles.duplicate', module: 'Roles & Permissions', submodule: 'Templates', action: 'create', category: 'Level 4 - Advanced', description: 'Clone existing roles into new templates' },
  { code: 'roles.assign_permissions', module: 'Roles & Permissions', submodule: 'Matrix', action: 'manage', category: 'Level 4 - Advanced', description: 'Grant granular module permissions to roles' },
  { code: 'roles.revoke_permissions', module: 'Roles & Permissions', submodule: 'Matrix', action: 'manage', category: 'Level 4 - Advanced', description: 'Revoke permissions from roles' },
  { code: 'roles.assign_admins', module: 'Roles & Permissions', submodule: 'Assignments', action: 'manage', category: 'Level 4 - Advanced', description: 'Assign roles to administrator accounts' },
  { code: 'roles.view_history', module: 'Roles & Permissions', submodule: 'Audit', action: 'read', category: 'Level 4 - Advanced', description: 'View chronological permission change history' },

  // ─── 22. Activity Logs ─────────────────────────────────────────────────────
  { code: 'activity_logs.read', module: 'Activity Logs', submodule: 'Audit Trail', action: 'read', category: 'Level 1 - Module Access', description: 'View centralized immutable audit log stream' },
  { code: 'activity_logs.login_history', module: 'Activity Logs', submodule: 'Authentication', action: 'read', category: 'Level 2 - Submodule Access', description: 'View login, logout, and IP address history' },
  { code: 'activity_logs.admin_actions', module: 'Activity Logs', submodule: 'Operations', action: 'read', category: 'Level 2 - Submodule Access', description: 'View privileged create, edit, and delete operations' },
  { code: 'activity_logs.permission_changes', module: 'Activity Logs', submodule: 'Security', action: 'read', category: 'Level 2 - Submodule Access', description: 'View role assignment and permission diff logs' },
  { code: 'activity_logs.export', module: 'Activity Logs', submodule: 'Compliance', action: 'export', category: 'Level 4 - Advanced', description: 'Export compliance audit logs for regulatory review' },

  // ─── 23. Settings ──────────────────────────────────────────────────────────
  { code: 'settings.read', module: 'Settings', submodule: 'System Config', action: 'read', category: 'Level 1 - Module Access', description: 'View company settings and configuration' },
  { code: 'settings.update_general', module: 'Settings', submodule: 'Company', action: 'configure', category: 'Level 4 - Advanced', description: 'Update company legal name, GSTIN, and branch addresses' },
  { code: 'settings.update_website', module: 'Settings', submodule: 'Website', action: 'configure', category: 'Level 4 - Advanced', description: 'Configure website phone numbers and contact emails' },
  { code: 'settings.manage_payment', module: 'Settings', submodule: 'Banking', action: 'configure', category: 'Level 4 - Advanced', description: 'Configure bank accounts and UPI QR parameters' },
  { code: 'settings.manage_shipping', module: 'Settings', submodule: 'Logistics', action: 'configure', category: 'Level 4 - Advanced', description: 'Configure transport hubs and freight matrices' },
  { code: 'settings.manage_email', module: 'Settings', submodule: 'Mail Server', action: 'configure', category: 'Level 4 - Advanced', description: 'Configure SMTP and IMAP mailbox credentials' },
  { code: 'settings.manage_integrations', module: 'Settings', submodule: 'Integrations', action: 'configure', category: 'Level 4 - Advanced', description: 'Manage WhatsApp Business API, CDN, and webhooks' },
  { code: 'settings.manage_security', module: 'Settings', submodule: 'Security', action: 'configure', category: 'Level 4 - Advanced', description: 'Manage 2FA enforcement, IP whitelist, and session limits' },
  { code: 'settings.manage_system', module: 'Settings', submodule: 'System', action: 'configure', category: 'Level 4 - Advanced', description: 'Configure system-wide operational parameters' },

  // ─── 24. Commercial Quotations & Proposals ─────────────────────────────────
  { code: 'quotations.read', module: 'Quotations', submodule: 'Proposals', action: 'read', category: 'Level 3 - CRUD', description: 'View formal sales quotations' },
  { code: 'quotations.create', module: 'Quotations', submodule: 'Proposals', action: 'create', category: 'Level 3 - CRUD', description: 'Draft new sales quotations with BOM calculations' },
  { code: 'quotations.update', module: 'Quotations', submodule: 'Proposals', action: 'update', category: 'Level 3 - CRUD', description: 'Edit quotation items, rates, and revision numbers' },
  { code: 'quotations.delete', module: 'Quotations', submodule: 'Proposals', action: 'delete', category: 'Level 3 - CRUD', description: 'Permanently remove quotation drafts' },
  { code: 'quotations.approve', module: 'Quotations', submodule: 'Workflow', action: 'approve', category: 'Level 4 - Advanced', description: 'Approve and issue signed quotation letters' },
  { code: 'quotations.export', module: 'Quotations', submodule: 'Output', action: 'export', category: 'Level 4 - Advanced', description: 'Download client-ready PDF quotation letters' },

  // ─── 25. Proforma Invoices (PI) ────────────────────────────────────────────
  { code: 'pi.read', module: 'Proforma Invoices', submodule: 'PI Registry', action: 'read', category: 'Level 3 - CRUD', description: 'View proforma invoices and payment milestones' },
  { code: 'pi.create', module: 'Proforma Invoices', submodule: 'PI Registry', action: 'create', category: 'Level 3 - CRUD', description: 'Generate proforma invoices with GST splits' },
  { code: 'pi.update', module: 'Proforma Invoices', submodule: 'PI Registry', action: 'update', category: 'Level 3 - CRUD', description: 'Edit proforma terms, bank accounts, and transport' },
  { code: 'pi.delete', module: 'Proforma Invoices', submodule: 'PI Registry', action: 'delete', category: 'Level 3 - CRUD', description: 'Permanently remove draft proforma invoices' },
  { code: 'pi.issue', module: 'Proforma Invoices', submodule: 'Workflow', action: 'approve', category: 'Level 4 - Advanced', description: 'Formally issue PI to B2B customer' },
  { code: 'pi.export', module: 'Proforma Invoices', submodule: 'Output', action: 'export', category: 'Level 4 - Advanced', description: 'Generate authoritative PDF invoices with QR codes' },

  // ─── 26. Procurement & Purchase Orders ─────────────────────────────────────
  { code: 'procurement.read', module: 'Purchase Orders', submodule: 'PO Registry', action: 'read', category: 'Level 3 - CRUD', description: 'View vendor purchase orders' },
  { code: 'procurement.create', module: 'Purchase Orders', submodule: 'PO Registry', action: 'create', category: 'Level 3 - CRUD', description: 'Generate purchase orders for raw materials & hardware' },
  { code: 'procurement.update', module: 'Purchase Orders', submodule: 'PO Registry', action: 'update', category: 'Level 3 - CRUD', description: 'Modify PO items, quantities, and promised dates' },
  { code: 'procurement.delete', module: 'Purchase Orders', submodule: 'PO Registry', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete draft purchase orders' },
  { code: 'procurement.approve', module: 'Purchase Orders', submodule: 'Authorization', action: 'approve', category: 'Level 4 - Advanced', description: 'Authorize and approve vendor purchase orders' },

  // ─── 27. Finance & Daily Branch Expenses ───────────────────────────────────
  { code: 'expenses.read', module: 'Daily Expenses', submodule: 'Ledger', action: 'read', category: 'Level 3 - CRUD', description: 'View daily petty cash vouchers and branch ledgers' },
  { code: 'expenses.create', module: 'Daily Expenses', submodule: 'Vouchers', action: 'create', category: 'Level 3 - CRUD', description: 'Submit branch cash expense vouchers' },
  { code: 'expenses.update', module: 'Daily Expenses', submodule: 'Vouchers', action: 'update', category: 'Level 3 - CRUD', description: 'Edit unapproved expense details and receipts' },
  { code: 'expenses.delete', module: 'Daily Expenses', submodule: 'Vouchers', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete draft expense vouchers' },
  { code: 'expenses.approve', module: 'Daily Expenses', submodule: 'Authorization', action: 'approve', category: 'Level 4 - Advanced', description: 'Authorize and approve cash expenses, debiting ledger' },
  { code: 'expenses.reject', module: 'Daily Expenses', submodule: 'Authorization', action: 'reject', category: 'Level 4 - Advanced', description: 'Reject submitted expense claims with reason' },
  { code: 'expenses.void', module: 'Daily Expenses', submodule: 'Super Admin', action: 'manage', category: 'Level 4 - Advanced', description: 'Void approved expense vouchers with financial reversal' },

  // ─── 28. UP Factory Employees & Payroll ────────────────────────────────────
  { code: 'up_employees.read', module: 'UP Factory Staff', submodule: 'Directory', action: 'read', category: 'Level 3 - CRUD', description: 'View UP Factory employee profiles' },
  { code: 'up_employees.create', module: 'UP Factory Staff', submodule: 'Directory', action: 'create', category: 'Level 3 - CRUD', description: 'Onboard new factory workers and staff' },
  { code: 'up_employees.update', module: 'UP Factory Staff', submodule: 'Directory', action: 'update', category: 'Level 3 - CRUD', description: 'Update worker details, photos, and WhatsApp numbers' },
  { code: 'up_employees.delete', module: 'UP Factory Staff', submodule: 'Directory', action: 'delete', category: 'Level 3 - CRUD', description: 'Deactivate or terminate UP worker profiles' },
  { code: 'up_employees.payroll', module: 'UP Factory Staff', submodule: 'Salary', action: 'manage', category: 'Level 4 - Advanced', description: 'Calculate monthly payroll and generate salary slips' },
  { code: 'up_employees.advances', module: 'UP Factory Staff', submodule: 'Advances', action: 'manage', category: 'Level 4 - Advanced', description: 'Record and recover salary advances' },

  // ─── 29. Packing Lists & Hardware Issues ───────────────────────────────────
  { code: 'packing_lists.read', module: 'Packing Lists', submodule: 'Consignments', action: 'read', category: 'Level 3 - CRUD', description: 'View warehouse dispatch packing lists' },
  { code: 'packing_lists.create', module: 'Packing Lists', submodule: 'Consignments', action: 'create', category: 'Level 3 - CRUD', description: 'Create packing lists with packet breakdown' },
  { code: 'packing_lists.update', module: 'Packing Lists', submodule: 'Consignments', action: 'update', category: 'Level 3 - CRUD', description: 'Edit packing quantities, seal numbers, and notes' },
  { code: 'packing_lists.delete', module: 'Packing Lists', submodule: 'Consignments', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete draft packing lists' },

  { code: 'hardware_issues.read', module: 'Hardware Issues', submodule: 'Store Issuance', action: 'read', category: 'Level 3 - CRUD', description: 'View hardware store issue checklists' },
  { code: 'hardware_issues.create', module: 'Hardware Issues', submodule: 'Store Issuance', action: 'create', category: 'Level 3 - CRUD', description: 'Issue hardware sets for production jobs' },
  { code: 'hardware_issues.update', module: 'Hardware Issues', submodule: 'Store Issuance', action: 'update', category: 'Level 3 - CRUD', description: 'Update issued piece counts and materials' },
  { code: 'hardware_issues.sign', module: 'Hardware Issues', submodule: 'Verification', action: 'approve', category: 'Level 4 - Advanced', description: 'Complete verified signatory steps' },
  { code: 'hardware_issues.delete', module: 'Hardware Issues', submodule: 'Store Issuance', action: 'delete', category: 'Level 3 - CRUD', description: 'Cancel and delete hardware store issues' },

  // ─── 30. Export & Global Trade ─────────────────────────────────────────────
  { code: 'export.read', module: 'Export & Trade', submodule: 'Shipments', action: 'read', category: 'Level 3 - CRUD', description: 'View international export shipments and tracking' },
  { code: 'export.create', module: 'Export & Trade', submodule: 'Shipments', action: 'create', category: 'Level 3 - CRUD', description: 'Create export quotations, orders, and commercial bills' },
  { code: 'export.update', module: 'Export & Trade', submodule: 'Shipments', action: 'update', category: 'Level 3 - CRUD', description: 'Edit container numbers, vessels, and customs entries' },
  { code: 'export.delete', module: 'Export & Trade', submodule: 'Shipments', action: 'delete', category: 'Level 3 - CRUD', description: 'Delete export shipment records' },
  { code: 'export.realization', module: 'Export & Trade', submodule: 'Realization', action: 'manage', category: 'Level 4 - Advanced', description: 'Record IRM and eBRC export remittances' },
];
