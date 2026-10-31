import { prisma } from '../../config/database';

interface CategoryItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

const CATEGORY_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
];

/**
 * Generates pure vector SVG Pie Chart for category revenue breakdown.
 */
function generateSvgPieChart(categories: CategoryItem[]): string {
  if (!categories || categories.length === 0) {
    return `
      <div style="height: 200px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 8px;">
        No category revenue recorded in this period.
      </div>
    `;
  }

  const validCategories = categories.filter((c) => c.amount > 0);
  if (validCategories.length === 0) {
    return `
      <div style="height: 200px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 8px;">
        No sales volume to chart.
      </div>
    `;
  }

  // If only 1 category, draw full circle
  if (validCategories.length === 1) {
    const cat = validCategories[0];
    return `
      <svg width="220" height="220" viewBox="0 0 220 220" style="display: block; margin: 0 auto;">
        <circle cx="110" cy="110" r="95" fill="${cat.color}" />
        <circle cx="110" cy="110" r="45" fill="#ffffff" />
        <text x="110" y="115" text-anchor="middle" font-size="14" font-weight="bold" fill="#0f172a">100%</text>
      </svg>
    `;
  }

  const total = validCategories.reduce((acc, c) => acc + c.amount, 0);
  let cumulativeAngle = -Math.PI / 2; // Start from 12 o'clock

  const paths = validCategories.map((c) => {
    const fraction = c.amount / total;
    const angle = fraction * 2 * Math.PI;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1 = 110 + 95 * Math.cos(startAngle);
    const y1 = 110 + 95 * Math.sin(startAngle);
    const x2 = 110 + 95 * Math.cos(endAngle);
    const y2 = 110 + 95 * Math.sin(endAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    return `
      <path d="M 110 110 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 95 95 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" 
            fill="${c.color}" stroke="#ffffff" stroke-width="2">
        <title>${c.name}: ${c.percentage}% (₹${c.amount.toLocaleString('en-IN')})</title>
      </path>
    `;
  });

  return `
    <svg width="220" height="220" viewBox="0 0 220 220" style="display: block; margin: 0 auto;">
      ${paths.join('')}
      <!-- Donut cutout center -->
      <circle cx="110" cy="110" r="45" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <text x="110" y="107" text-anchor="middle" font-size="11" font-weight="bold" fill="#64748b">SALES</text>
      <text x="110" y="122" text-anchor="middle" font-size="12" font-weight="black" fill="#0f172a">SHARE</text>
    </svg>
  `;
}

/**
 * Generates pure vector SVG Bar Chart comparing Daily Sales vs Daily Purchases.
 */
function generateSvgBarChart(dailyBreakdown: Array<{ date: string; sales: number; purchases: number }>): string {
  if (!dailyBreakdown || dailyBreakdown.length === 0) {
    return `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 11px;">No trend timeline data available.</div>`;
  }

  // Display at most last 14 days for clean printable layout
  const slice = dailyBreakdown.slice(-14);
  const maxVal = Math.max(...slice.map((d) => Math.max(d.sales, d.purchases)), 1000);

  const width = 500;
  const height = 180;
  const padLeft = 45;
  const padBottom = 30;
  const padTop = 15;
  const chartHeight = height - padTop - padBottom;
  const chartWidth = width - padLeft - 15;

  const groupWidth = chartWidth / slice.length;
  const barWidth = Math.min(18, Math.max(6, groupWidth * 0.35));

  const bars = slice.map((d, idx) => {
    const xGroup = padLeft + idx * groupWidth;
    const salesHeight = (d.sales / maxVal) * chartHeight;
    const purchHeight = (d.purchases / maxVal) * chartHeight;

    const salesY = padTop + (chartHeight - salesHeight);
    const purchY = padTop + (chartHeight - purchHeight);

    const xSales = xGroup + groupWidth * 0.1;
    const xPurch = xSales + barWidth + 2;

    const labelDate = d.date.slice(5); // MM-DD

    return `
      <g class="bar-group">
        <!-- Sales Bar (Green) -->
        <rect x="${xSales.toFixed(1)}" y="${salesY.toFixed(1)}" width="${barWidth}" height="${Math.max(2, salesHeight).toFixed(1)}" rx="2" fill="#16a34a" />
        <!-- Purchase Bar (Amber) -->
        <rect x="${xPurch.toFixed(1)}" y="${purchY.toFixed(1)}" width="${barWidth}" height="${Math.max(2, purchHeight).toFixed(1)}" rx="2" fill="#f59e0b" />
        <!-- Date Label -->
        <text x="${(xGroup + groupWidth / 2).toFixed(1)}" y="${(height - 10)}" text-anchor="middle" font-size="9" fill="#64748b" font-family="sans-serif">${labelDate}</text>
      </g>
    `;
  });

  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="display: block;">
      <!-- Grid lines -->
      <line x1="${padLeft}" y1="${padTop}" x2="${width - 15}" y2="${padTop}" stroke="#e2e8f0" stroke-dasharray="3,3" />
      <line x1="${padLeft}" y1="${padTop + chartHeight / 2}" x2="${width - 15}" y2="${padTop + chartHeight / 2}" stroke="#e2e8f0" stroke-dasharray="3,3" />
      <line x1="${padLeft}" y1="${padTop + chartHeight}" x2="${width - 15}" y2="${padTop + chartHeight}" stroke="#94a3b8" stroke-width="1.5" />
      
      <!-- Y-Axis labels -->
      <text x="${padLeft - 5}" y="${padTop + 4}" text-anchor="end" font-size="9" fill="#94a3b8">₹${(maxVal / 1000).toFixed(0)}k</text>
      <text x="${padLeft - 5}" y="${padTop + chartHeight / 2 + 4}" text-anchor="end" font-size="9" fill="#94a3b8">₹${(maxVal / 2000).toFixed(0)}k</text>
      <text x="${padLeft - 5}" y="${padTop + chartHeight + 4}" text-anchor="end" font-size="9" fill="#94a3b8">₹0</text>

      ${bars.join('')}
    </svg>
  `;
}

export const dailySalesPurchasesPdfService = {
  /**
   * Builds the complete, presentation-grade vector A4 HTML document
   * featuring executive KPI summary, SVG Pie Chart, SVG Bar Chart,
   * Financial Flow Diagram, and brightly color-coded Sales and Purchase tables.
   */
  async generateDailyReportHtml(params: {
    startDate: string;
    endDate: string;
    date?: string;
    companyProfileId?: string;
  }): Promise<string> {
    const where: any = {
      deletedAt: null,
    };

    if (params.date) {
      where.entryDate = new Date(params.date);
    } else if (params.startDate && params.endDate) {
      where.entryDate = {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      };
    }

    if (params.companyProfileId) {
      where.companyProfileId = params.companyProfileId;
    }

    // Fetch entries and company profile
    const [salesEntries, purchaseEntries, company] = await Promise.all([
      prisma.dailySalesPurchase.findMany({
        where: { ...where, type: 'SALES' },
        include: { customer: { include: { party: true } } },
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
        take: 1000,
      }),
      prisma.dailySalesPurchase.findMany({
        where: { ...where, type: 'PURCHASE' },
        include: { vendor: { include: { party: true } } },
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
        take: 1000,
      }),
      prisma.companyProfile.findFirst({
        where: { status: 'ACTIVE' },
        include: { addresses: true, bankAccounts: true },
      }),
    ]);

    // Financial totals
    const totalSales = salesEntries.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const totalPurchases = purchaseEntries.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
    const grossProfit = totalSales - totalPurchases;
    const marginPct = totalSales > 0 ? Math.round((grossProfit / totalSales) * 1000) / 10 : 0;

    // Category distribution for PIChart
    const catMap = new Map<string, number>();
    salesEntries.forEach((s) => {
      const cat = s.category || 'General';
      catMap.set(cat, (catMap.get(cat) || 0) + Number(s.totalAmount || 0));
    });

    const categoryBreakdown: CategoryItem[] = Array.from(catMap.entries()).map(([name, amount], idx) => ({
      name,
      amount,
      percentage: totalSales > 0 ? Math.round((amount / totalSales) * 100) : 0,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));

    // Daily breakdown for timeline graph
    const dailyMap = new Map<string, { date: string; sales: number; purchases: number }>();
    [...salesEntries, ...purchaseEntries].forEach((e) => {
      const dStr = new Date(e.entryDate).toISOString().slice(0, 10);
      const cur = dailyMap.get(dStr) || { date: dStr, sales: 0, purchases: 0 };
      const amt = Number(e.totalAmount || 0);
      if (e.type === 'SALES') cur.sales += amt;
      else cur.purchases += amt;
      dailyMap.set(dStr, cur);
    });

    const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Render SVGs
    const svgPieChart = generateSvgPieChart(categoryBreakdown);
    const svgBarChart = generateSvgBarChart(dailyBreakdown);

    // Formatted strings
    const periodLabel = params.date
      ? `Date: ${new Date(params.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : `${new Date(params.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(params.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    const generatedAt = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const companyName = company?.companyName || company?.legalName || 'PACIFIC PRODUCTS & SOLUTIONS';
    const companyGstin = company?.gstin || '27AAECP1234F1Z5';
    const companyEmail = company?.email || 'info@pacificcubicles.com';
    const companyPhone = company?.phone || '+91 98200 00000';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Daily Sales & Purchase Report — ${periodLabel}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 10px 0;
    }

    /* Print toolbar (hidden when printing) */
    .no-print {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      margin-bottom: 20px;
      border-radius: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #10b981;
      color: #030213;
    }
    .btn-primary:hover {
      background: #059669;
    }
    .btn-secondary {
      background: #334155;
      color: #ffffff;
      margin-right: 8px;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    @media print {
      .no-print { display: none !important; }
      body { background: transparent; padding: 0; }
      .page-break { page-break-after: always; }
      .avoid-break { page-break-inside: avoid; }
    }

    /* Header Bar */
    .header-box {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 500;
    }
    .report-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .period-text {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 4px;
      text-align: right;
    }

    /* KPI Summary Cards Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi-card {
      border-radius: 8px;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      position: relative;
      overflow: hidden;
    }
    .kpi-sales {
      background: #f0fdf4;
      border-color: #86efac;
      border-top: 3.5px solid #16a34a;
    }
    .kpi-purchase {
      background: #fffbeb;
      border-color: #fde68a;
      border-top: 3.5px solid #d97706;
    }
    .kpi-profit {
      background: #ecfdf5;
      border-color: #a7f3d0;
      border-top: 3.5px solid #059669;
    }
    .kpi-volume {
      background: #f8fafc;
      border-color: #cbd5e1;
      border-top: 3.5px solid #475569;
    }
    .kpi-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.5px;
    }
    .kpi-value {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 4px;
      font-family: Consolas, monospace;
    }
    .kpi-sub {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Visual Charts & Diagram Grid */
    .charts-grid {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }
    .chart-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .chart-title {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .chart-legend {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #e2e8f0;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 9.5px;
      color: #334155;
    }
    .legend-color {
      width: 9px;
      height: 9px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    /* Flow Diagram */
    .flow-diagram {
      margin-bottom: 18px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .flow-step {
      text-align: center;
      flex: 1;
      padding: 6px;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .flow-arrow {
      font-size: 14px;
      font-weight: 900;
      color: #94a3b8;
    }

    /* Tables Styling */
    .section-header {
      font-size: 12px;
      font-weight: 800;
      padding: 6px 10px;
      margin-top: 16px;
      margin-bottom: 8px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #ffffff;
    }
    .header-sales {
      background: linear-gradient(90deg, #166534, #15803d);
    }
    .header-purchase {
      background: linear-gradient(90deg, #9a3412, #c2410c);
    }
    .header-category {
      background: linear-gradient(90deg, #3730a3, #4338ca);
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin-bottom: 14px;
    }
    table.data-table th {
      padding: 6px 8px;
      text-align: left;
      font-weight: 800;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.table-sales th {
      background: #14532d;
    }
    table.table-purchase th {
      background: #7c2d12;
    }
    table.table-category th {
      background: #312e81;
    }
    table.data-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    table.table-sales tr:nth-child(even) td {
      background: #f0fdf4;
    }
    table.table-purchase tr:nth-child(even) td {
      background: #fffbeb;
    }
    table.table-category tr:nth-child(even) td {
      background: #eef2ff;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8.5px;
      font-weight: 800;
    }
    .badge-paid { background: #dcfce7; color: #166534; }
    .badge-partial { background: #fef3c7; color: #92400e; }
    .badge-unpaid { background: #fee2e2; color: #991b1b; }

    /* Total Footer Row */
    tr.total-row td {
      font-weight: 900;
      font-size: 10.5px;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      background: #f8fafc !important;
    }

    /* Footer Info */
    .report-footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 8.5px;
    }
  </style>
</head>
<body>

  <!-- No-Print Toolbar for direct browser preview -->
  <div class="no-print">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 16px; font-weight: 900; color: #10b981;">PACIFIC ERP</span>
      <span style="font-size: 12px; color: #94a3b8;">Daily Sales & Purchase Intelligence Report</span>
    </div>
    <div>
      <button onclick="window.print()" class="btn btn-secondary">🖨️ Print / Save as PDF</button>
      <a href="?dl=1" class="btn btn-primary">⬇️ Download PDF File</a>
    </div>
  </div>

  <div class="report-container">
    <!-- Header -->
    <div class="header-box">
      <div>
        <div class="brand-title">${companyName}</div>
        <div class="brand-subtitle">
          Architectural Cubicle Partitions, Modular Lockers & Restroom Hardware | GSTIN: ${companyGstin}
        </div>
        <div class="brand-subtitle" style="margin-top: 1px;">
          Email: ${companyEmail} | Phone: ${companyPhone}
        </div>
      </div>
      <div>
        <div class="report-badge">Daily Sales & Purchase Report</div>
        <div class="period-text">${periodLabel}</div>
        <div style="font-size: 9px; color: #64748b; text-align: right; margin-top: 2px;">
          Generated: ${generatedAt} IST (Delinked from PI)
        </div>
      </div>
    </div>

    <!-- Executive KPI Cards -->
    <div class="kpi-grid avoid-break">
      <div class="kpi-card kpi-sales">
        <div class="kpi-label">Gross Sales Revenue</div>
        <div class="kpi-value" style="color: #15803d;">₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">${salesEntries.length} verified customer sales</div>
      </div>

      <div class="kpi-card kpi-purchase">
        <div class="kpi-label">Direct Procurement</div>
        <div class="kpi-value" style="color: #b45309;">₹${totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">${purchaseEntries.length} vendor purchase orders</div>
      </div>

      <div class="kpi-card kpi-profit">
        <div class="kpi-label">Gross Margin & Profit</div>
        <div class="kpi-value" style="color: #059669;">₹${grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">${marginPct}% Operating Margin</div>
      </div>

      <div class="kpi-card kpi-volume">
        <div class="kpi-label">Total Volume</div>
        <div class="kpi-value" style="color: #334155;">${salesEntries.length + purchaseEntries.length} Entries</div>
        <div class="kpi-sub">Direct Customer & Vendor Records</div>
      </div>
    </div>

    <!-- Financial Realization Flow Diagram -->
    <div class="flow-diagram avoid-break">
      <div class="flow-step" style="border-left: 3px solid #16a34a;">
        <div style="font-size: 9px; color: #64748b; font-weight: 700;">GROSS CUSTOMER SALES</div>
        <div style="font-size: 12px; font-weight: 900; color: #16a34a; font-family: monospace;">₹${totalSales.toLocaleString('en-IN')}</div>
      </div>
      <div class="flow-arrow">➖</div>
      <div class="flow-step" style="border-left: 3px solid #f59e0b;">
        <div style="font-size: 9px; color: #64748b; font-weight: 700;">PROCUREMENT COSTS</div>
        <div style="font-size: 12px; font-weight: 900; color: #d97706; font-family: monospace;">₹${totalPurchases.toLocaleString('en-IN')}</div>
      </div>
      <div class="flow-arrow">🟰</div>
      <div class="flow-step" style="border-left: 3px solid #059669; background: #ecfdf5;">
        <div style="font-size: 9px; color: #047857; font-weight: 700;">NET MARGIN (PROFIT)</div>
        <div style="font-size: 12px; font-weight: 900; color: #059669; font-family: monospace;">₹${grossProfit.toLocaleString('en-IN')} (${marginPct}%)</div>
      </div>
    </div>

    <!-- Visual Graphs Grid (PIChart & Bar Graph) -->
    <div class="charts-grid avoid-break">
      <!-- PIChart (Pie Chart) -->
      <div class="chart-box">
        <div class="chart-title">
          <span>Sales Category Share (PIChart)</span>
          <span style="font-size: 9px; color: #10b981; font-weight: 700;">${categoryBreakdown.length} Product Categories</span>
        </div>
        ${svgPieChart}
        <div class="chart-legend">
          ${categoryBreakdown
            .map(
              (c) => `
            <div class="legend-item">
              <span class="legend-color" style="background: ${c.color};"></span>
              <span style="font-weight: 600;">${c.name}:</span>
              <span style="color: #64748b;">${c.percentage}%</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Bar Graph -->
      <div class="chart-box">
        <div class="chart-title">
          <span>Sales vs Purchase Daily Comparison (Graph)</span>
          <span style="font-size: 9px; color: #64748b;">Timeline Breakdown</span>
        </div>
        ${svgBarChart}
        <div style="display: flex; justify-content: center; gap: 16px; margin-top: 10px; font-size: 9px;">
          <span style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 10px; height: 10px; background: #16a34a; border-radius: 2px;"></span>
            <span>Daily Sales</span>
          </span>
          <span style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 10px; height: 10px; background: #f59e0b; border-radius: 2px;"></span>
            <span>Daily Purchases</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 1. Daily Sales Table (Green Palette) -->
    <div class="section-header header-sales avoid-break">
      <span>1. Verified Daily Sales (Direct Customers)</span>
      <span style="font-size: 10.5px;">Total: ₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    </div>
    <table class="data-table table-sales avoid-break">
      <thead>
        <tr>
          <th style="width: 75px;">Date</th>
          <th style="width: 90px;">Invoice / Ref</th>
          <th>Customer Name</th>
          <th style="width: 110px;">Category</th>
          <th style="width: 60px;">Mode</th>
          <th style="width: 60px;" class="text-center">Status</th>
          <th style="width: 80px;" class="text-right">Taxable (₹)</th>
          <th style="width: 70px;" class="text-right">GST (₹)</th>
          <th style="width: 90px;" class="text-right">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${
          salesEntries.length > 0
            ? salesEntries
                .map((s) => {
                  const party =
                    s.partyName ||
                    s.customer?.party?.tradeName ||
                    s.customer?.party?.legalName ||
                    'Customer';
                  const dStr = s.entryDate ? new Date(s.entryDate).toISOString().slice(0, 10) : '';
                  return `
            <tr>
              <td class="font-mono">${dStr}</td>
              <td class="font-mono font-bold" style="color: #15803d;">${s.referenceNo || '—'}</td>
              <td class="font-bold">${party}</td>
              <td>${s.category || 'General'}</td>
              <td class="font-mono">${s.paymentMode || 'CASH'}</td>
              <td class="text-center"><span class="badge badge-paid">${s.paymentStatus || 'PAID'}</span></td>
              <td class="text-right font-mono">₹${Number(s.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td class="text-right font-mono">₹${Number(s.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td class="text-right font-mono font-bold" style="color: #15803d;">₹${Number(s.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          `;
                })
                .join('')
            : `<tr><td colspan="9" class="text-center" style="padding: 12px; color: #94a3b8;">No customer sales recorded for this period.</td></tr>`
        }
        <tr class="total-row">
          <td colspan="6" class="text-right font-bold">TOTAL SALES REVENUE:</td>
          <td class="text-right font-mono">₹${salesEntries.reduce((acc, s) => acc + Number(s.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-mono">₹${salesEntries.reduce((acc, s) => acc + Number(s.taxAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-mono font-bold" style="color: #15803d;">₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <!-- 2. Daily Purchases Table (Warm Amber / Orange Palette) -->
    <div class="section-header header-purchase avoid-break" style="margin-top: 20px;">
      <span>2. Direct Procurement & Purchases (Vendors / Suppliers)</span>
      <span style="font-size: 10.5px;">Total: ₹${totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    </div>
    <table class="data-table table-purchase avoid-break">
      <thead>
        <tr>
          <th style="width: 75px;">Date</th>
          <th style="width: 90px;">Bill / Ref</th>
          <th>Vendor / Supplier Name</th>
          <th style="width: 110px;">Category</th>
          <th style="width: 60px;">Mode</th>
          <th style="width: 60px;" class="text-center">Status</th>
          <th style="width: 80px;" class="text-right">Taxable (₹)</th>
          <th style="width: 70px;" class="text-right">GST (₹)</th>
          <th style="width: 90px;" class="text-right">Total Spend (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${
          purchaseEntries.length > 0
            ? purchaseEntries
                .map((p) => {
                  const party =
                    p.partyName ||
                    p.vendor?.party?.tradeName ||
                    p.vendor?.party?.legalName ||
                    'Supplier';
                  const dStr = p.entryDate ? new Date(p.entryDate).toISOString().slice(0, 10) : '';
                  return `
            <tr>
              <td class="font-mono">${dStr}</td>
              <td class="font-mono font-bold" style="color: #c2410c;">${p.referenceNo || '—'}</td>
              <td class="font-bold">${party}</td>
              <td>${p.category || 'General'}</td>
              <td class="font-mono">${p.paymentMode || 'CASH'}</td>
              <td class="text-center"><span class="badge badge-partial">${p.paymentStatus || 'PAID'}</span></td>
              <td class="text-right font-mono">₹${Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td class="text-right font-mono">₹${Number(p.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td class="text-right font-mono font-bold" style="color: #c2410c;">₹${Number(p.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          `;
                })
                .join('')
            : `<tr><td colspan="9" class="text-center" style="padding: 12px; color: #94a3b8;">No vendor purchases recorded for this period.</td></tr>`
        }
        <tr class="total-row">
          <td colspan="6" class="text-right font-bold">TOTAL PROCUREMENT SPEND:</td>
          <td class="text-right font-mono">₹${purchaseEntries.reduce((acc, p) => acc + Number(p.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-mono">₹${purchaseEntries.reduce((acc, p) => acc + Number(p.taxAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-mono font-bold" style="color: #c2410c;">₹${totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <!-- 3. Category Breakdown Table (Indigo Palette) -->
    <div class="section-header header-category avoid-break" style="margin-top: 20px;">
      <span>3. Product Category Distribution</span>
      <span style="font-size: 10.5px;">${categoryBreakdown.length} Categories</span>
    </div>
    <table class="data-table table-category avoid-break">
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Product / Service Category</th>
          <th style="width: 100px;" class="text-right">Revenue Share</th>
          <th style="width: 130px;" class="text-right">Total Revenue (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${
          categoryBreakdown.length > 0
            ? categoryBreakdown
                .map((cat, idx) => `
            <tr>
              <td class="text-center font-mono">${idx + 1}</td>
              <td class="font-bold">
                <span style="display: inline-block; width: 8px; height: 8px; background: ${cat.color}; border-radius: 50%; margin-right: 6px;"></span>
                ${cat.name}
              </td>
              <td class="text-right font-bold font-mono">${cat.percentage}%</td>
              <td class="text-right font-mono font-bold">₹${cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          `)
                .join('')
            : `<tr><td colspan="4" class="text-center" style="padding: 12px; color: #94a3b8;">No category data available.</td></tr>`
        }
      </tbody>
    </table>

    <!-- Footer -->
    <div class="report-footer avoid-break">
      <div>
        <strong>${companyName}</strong> — Enterprise ERP & Daily Operations Console
      </div>
      <div>
        Generated on ${generatedAt} | Page 1 of 1 | Confidential & Proprietary
      </div>
    </div>
  </div>

</body>
</html>
    `.trim();
  },
};
