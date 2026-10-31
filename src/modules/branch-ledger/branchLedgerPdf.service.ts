import { prisma } from '../../config/database';
import { branchLedgerService } from './branchLedger.service';

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
  '#e11d48', // Rose
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
];

/**
 * Generates pure vector SVG Pie/Donut Chart for Category Distribution.
 */
function generateSvgPieChart(categories: CategoryItem[]): string {
  if (!categories || categories.length === 0) {
    return `
      <div style="height: 180px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 11px; background: #f8fafc; border-radius: 8px;">
        No transaction breakdown available for this period.
      </div>
    `;
  }

  const validCategories = categories.filter((c) => c.amount > 0);
  if (validCategories.length === 0) {
    return `
      <div style="height: 180px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 11px; background: #f8fafc; border-radius: 8px;">
        No category amounts recorded.
      </div>
    `;
  }

  if (validCategories.length === 1) {
    const cat = validCategories[0];
    return `
      <svg width="200" height="200" viewBox="0 0 200 200" style="display: block; margin: 0 auto;">
        <circle cx="100" cy="100" r="85" fill="${cat.color}" />
        <circle cx="100" cy="100" r="42" fill="#ffffff" />
        <text x="100" y="105" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">100%</text>
      </svg>
    `;
  }

  const total = validCategories.reduce((acc, c) => acc + c.amount, 0);
  let cumulativeAngle = -Math.PI / 2;

  const paths = validCategories.map((c) => {
    const fraction = c.amount / total;
    const angle = fraction * 2 * Math.PI;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1 = 100 + 85 * Math.cos(startAngle);
    const y1 = 100 + 85 * Math.sin(startAngle);
    const x2 = 100 + 85 * Math.cos(endAngle);
    const y2 = 100 + 85 * Math.sin(endAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    return `
      <path d="M 100 100 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 85 85 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" 
            fill="${c.color}" stroke="#ffffff" stroke-width="2">
        <title>${c.name}: ${c.percentage}% (₹${c.amount.toLocaleString('en-IN')})</title>
      </path>
    `;
  });

  return `
    <svg width="200" height="200" viewBox="0 0 200 200" style="display: block; margin: 0 auto;">
      ${paths.join('')}
      <circle cx="100" cy="100" r="42" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <text x="100" y="97" text-anchor="middle" font-size="10" font-weight="bold" fill="#64748b">BRANCH</text>
      <text x="100" y="112" text-anchor="middle" font-size="11" font-weight="black" fill="#0f172a">VOLUME</text>
    </svg>
  `;
}

/**
 * Generates pure vector SVG Bar Chart comparing Daily Credits vs Daily Debits.
 */
function generateSvgBarChart(dailyTimeline: Array<{ date: string; credit: number; debit: number }>): string {
  if (!dailyTimeline || dailyTimeline.length === 0) {
    return `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 11px;">No daily timeline activity recorded.</div>`;
  }

  const slice = dailyTimeline.slice(-14);
  const maxVal = Math.max(...slice.map((d) => Math.max(d.credit, d.debit)), 1000);

  const width = 480;
  const height = 180;
  const padLeft = 45;
  const padBottom = 30;
  const padTop = 15;
  const chartHeight = height - padTop - padBottom;
  const chartWidth = width - padLeft - 15;

  const groupWidth = chartWidth / slice.length;
  const barWidth = Math.min(16, Math.max(6, groupWidth * 0.35));

  const bars = slice.map((d, idx) => {
    const xGroup = padLeft + idx * groupWidth;
    const credHeight = (d.credit / maxVal) * chartHeight;
    const debHeight = (d.debit / maxVal) * chartHeight;

    const credY = padTop + (chartHeight - credHeight);
    const debY = padTop + (chartHeight - debHeight);

    const xCred = xGroup + groupWidth * 0.1;
    const xDeb = xCred + barWidth + 2;

    const labelDate = d.date.slice(5);

    return `
      <g class="bar-group">
        <!-- Credit Bar (Green) -->
        <rect x="${xCred.toFixed(1)}" y="${credY.toFixed(1)}" width="${barWidth}" height="${Math.max(2, credHeight).toFixed(1)}" rx="2" fill="#16a34a" />
        <!-- Debit Bar (Rose / Red) -->
        <rect x="${xDeb.toFixed(1)}" y="${debY.toFixed(1)}" width="${barWidth}" height="${Math.max(2, debHeight).toFixed(1)}" rx="2" fill="#e11d48" />
        <!-- Date Label -->
        <text x="${(xGroup + groupWidth / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle" font-size="9" fill="#64748b" font-family="sans-serif">${labelDate}</text>
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

export const branchLedgerPdfService = {
  /**
   * Builds the complete, presentation-grade vector A4 HTML document
   * featuring Executive Branch Summary, SVG Pie Chart, SVG Bar Chart,
   * Flow Diagram, and Distinctly Color-Coded Credit & Debit Ledger Table.
   */
  async generateBranchLedgerHtml(params: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
    companyProfileId?: string;
  }): Promise<string> {
    const [summary, company, branch, transactions] = await Promise.all([
      branchLedgerService.getSummary(params),
      prisma.companyProfile.findFirst({
        where: { status: 'ACTIVE' },
        include: { addresses: true, bankAccounts: true },
      }),
      params.branchId && params.branchId !== 'ALL'
        ? prisma.branch.findUnique({ where: { id: params.branchId } })
        : null,
      prisma.branchTransaction.findMany({
        where: {
          deletedAt: null,
          ...(params.branchId && params.branchId !== 'ALL' ? { branchId: params.branchId } : {}),
          ...(params.date
            ? { entryDate: new Date(params.date) }
            : params.startDate && params.endDate
            ? { entryDate: { gte: new Date(params.startDate), lte: new Date(params.endDate) } }
            : {}),
        },
        include: {
          branch: { select: { code: true, name: true, city: true } },
        },
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
        take: 1000,
      }),
    ]);

    const companyName = company?.companyName || company?.legalName || 'PACIFIC PRODUCTS & SOLUTIONS';
    const companyGstin = company?.gstin || '27AAECP1234F1Z5';
    const branchName = branch ? `${branch.name} (${branch.code})` : 'All Branches (Consolidated Ledger)';
    const branchLocation = branch ? `${branch.city}, ${branch.state}` : 'National Operations';

    const periodLabel = params.date
      ? `Date: ${new Date(params.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : params.startDate && params.endDate
      ? `${new Date(params.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(params.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : 'Complete Financial Ledger';

    const generatedAt = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Categories for Pie Chart
    const combinedCategories: CategoryItem[] = [
      ...summary.creditCategories.slice(0, 4).map((c, idx) => ({
        name: `(Cr) ${c.name}`,
        amount: c.amount,
        percentage: c.percentage,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      })),
      ...summary.debitCategories.slice(0, 4).map((c, idx) => ({
        name: `(Dr) ${c.name}`,
        amount: c.amount,
        percentage: c.percentage,
        color: CATEGORY_COLORS[(idx + 4) % CATEGORY_COLORS.length],
      })),
    ];

    const svgPieChart = generateSvgPieChart(combinedCategories);
    const svgBarChart = generateSvgBarChart(summary.dailyTimeline);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Branch Debit & Credit Ledger — ${branchName}</title>
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

    /* Print toolbar */
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
    .btn-primary { background: #10b981; color: #030213; }
    .btn-secondary { background: #334155; color: #ffffff; margin-right: 8px; }

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
      font-size: 10.5px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 600;
    }
    .report-badge {
      display: inline-block;
      background: #1e1b4b;
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

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 18px;
    }
    .kpi-card {
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-card.opening { border-left: 3.5px solid #6366f1; background: #eef2ff; }
    .kpi-card.credit { border-left: 3.5px solid #16a34a; background: #f0fdf4; }
    .kpi-card.debit { border-left: 3.5px solid #e11d48; background: #fff1f2; }
    .kpi-card.net { border-left: 3.5px solid #0284c7; background: #f0f9ff; }
    .kpi-card.closing { border-left: 3.5px solid #0f172a; background: #f1f5f9; }

    .kpi-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; }
    .kpi-val { font-size: 13.5px; font-weight: 900; margin-top: 4px; color: #0f172a; }

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
      gap: 6px;
    }
    .flow-step {
      text-align: center;
      flex: 1;
      padding: 6px;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .flow-arrow { font-size: 13px; font-weight: 900; color: #94a3b8; }

    /* Visual Charts Section */
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 12px;
      margin-bottom: 18px;
    }
    .chart-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #ffffff;
    }
    .chart-title {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .chart-legend {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed #e2e8f0;
    }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 9px; color: #334155; }
    .legend-color { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

    /* Color-Coded Ledger Table */
    .section-title {
      font-size: 12px;
      font-weight: 900;
      background: #0f172a;
      color: #ffffff;
      padding: 7px 10px;
      border-radius: 4px;
      margin-top: 14px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }

    table.ledger-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin-bottom: 14px;
    }
    table.ledger-table th {
      padding: 6px 8px;
      text-align: left;
      font-weight: 800;
      background: #1e293b;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.ledger-table td {
      padding: 5.5px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    table.ledger-table tr.row-credit { background: #f0fdf4; }
    table.ledger-table tr.row-credit:nth-child(even) { background: #dcfce7; }
    table.ledger-table tr.row-debit { background: #fff1f2; }
    table.ledger-table tr.row-debit:nth-child(even) { background: #ffe4e6; }

    .badge-credit {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: 800;
      background: #166534;
      color: #ffffff;
    }
    .badge-debit {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: 800;
      background: #991b1b;
      color: #ffffff;
    }

    .amount-credit { font-weight: 800; color: #166534; }
    .amount-debit { font-weight: 800; color: #991b1b; }
    .amount-balance { font-weight: 800; color: #0f172a; font-family: Consolas, monospace; }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: Consolas, monospace; }

    tr.total-footer td {
      font-weight: 900;
      font-size: 10px;
      border-top: 2.5px solid #0f172a;
      border-bottom: 2.5px solid #0f172a;
      background: #f1f5f9 !important;
    }

    .report-footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 9px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Web / Print Toolbar -->
    <div class="no-print">
      <div>
        <strong>Branch Debit & Credit Ledger</strong>
        <span style="opacity: 0.8; margin-left: 8px; font-size: 11px;">${branchName}</span>
      </div>
      <div>
        <button class="btn btn-secondary" onclick="window.print()">Print / Save as PDF</button>
        <a class="btn btn-primary" href="?dl=1&${params.branchId ? `branchId=${params.branchId}&` : ''}${params.startDate ? `startDate=${params.startDate}&` : ''}${params.endDate ? `endDate=${params.endDate}&` : ''}${params.date ? `date=${params.date}` : ''}">Download PDF</a>
      </div>
    </div>

    <!-- Header Box -->
    <div class="header-box">
      <div>
        <div class="brand-title">${companyName}</div>
        <div class="brand-subtitle">Branch Financial Operations & Ledger System · GSTIN: ${companyGstin}</div>
        <div style="margin-top: 4px; font-size: 11px; font-weight: 800; color: #1e1b4b;">
          📍 Branch: ${branchName} · <span style="font-weight: 500; color: #475569;">${branchLocation}</span>
        </div>
      </div>
      <div>
        <div class="report-badge">Debit / Credit Ledger</div>
        <div class="period-text">${periodLabel}</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 2px; text-align: right;">Generated: ${generatedAt}</div>
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <div class="kpi-card opening">
        <div class="kpi-label">Opening Balance</div>
        <div class="kpi-val">₹${summary.openingBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card credit">
        <div class="kpi-label">+ Total Credits (Inflow)</div>
        <div class="kpi-val" style="color: #166534;">₹${summary.totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card debit">
        <div class="kpi-label">- Total Debits (Outflow)</div>
        <div class="kpi-val" style="color: #991b1b;">₹${summary.totalDebits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card net">
        <div class="kpi-label">Net Period Flow</div>
        <div class="kpi-val" style="color: ${summary.netCashFlow >= 0 ? '#0284c7' : '#e11d48'};">
          ${summary.netCashFlow >= 0 ? '+' : ''}₹${summary.netCashFlow.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </div>
      </div>
      <div class="kpi-card closing">
        <div class="kpi-label">Closing Book Balance</div>
        <div class="kpi-val">₹${summary.closingBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
      </div>
    </div>

    <!-- Financial Realization Flow Diagram -->
    <div class="flow-diagram">
      <div class="flow-step">
        <div style="font-size: 8.5px; font-weight: 800; color: #6366f1;">OPENING BOOK POSITION</div>
        <div style="font-size: 11px; font-weight: 900; margin-top: 2px;">₹${summary.openingBalance.toLocaleString('en-IN')}</div>
      </div>
      <div class="flow-arrow">＋</div>
      <div class="flow-step" style="border-color: #86efac; background: #f0fdf4;">
        <div style="font-size: 8.5px; font-weight: 800; color: #166534;">TOTAL CREDITS (INFLOWS)</div>
        <div style="font-size: 11px; font-weight: 900; color: #166534; margin-top: 2px;">₹${summary.totalCredits.toLocaleString('en-IN')}</div>
      </div>
      <div class="flow-arrow">－</div>
      <div class="flow-step" style="border-color: #fca5a5; background: #fff1f2;">
        <div style="font-size: 8.5px; font-weight: 800; color: #991b1b;">TOTAL DEBITS (OUTFLOWS)</div>
        <div style="font-size: 11px; font-weight: 900; color: #991b1b; margin-top: 2px;">₹${summary.totalDebits.toLocaleString('en-IN')}</div>
      </div>
      <div class="flow-arrow">＝</div>
      <div class="flow-step" style="border-color: #0f172a; background: #f1f5f9;">
        <div style="font-size: 8.5px; font-weight: 800; color: #0f172a;">CLOSING BOOK BALANCE</div>
        <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-top: 2px;">₹${summary.closingBalance.toLocaleString('en-IN')}</div>
      </div>
    </div>

    <!-- Visual Charts Grid -->
    <div class="charts-grid avoid-break">
      <!-- Chart 1: PIChart Category Volume -->
      <div class="chart-box">
        <div class="chart-title">
          <span>Inflow & Expense Category Distribution</span>
          <span style="font-size: 9px; color: #64748b;">Top Volume</span>
        </div>
        ${svgPieChart}
        <div class="chart-legend">
          ${combinedCategories.slice(0, 6).map((c) => `
            <div class="legend-item">
              <span class="legend-color" style="background: ${c.color};"></span>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name}: ₹${c.amount.toLocaleString('en-IN')}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Chart 2: Daily Credit vs Debit Timeline -->
      <div class="chart-box">
        <div class="chart-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Daily Credit vs Debit Comparison</span>
          <div style="display: flex; gap: 8px; font-size: 9px;">
            <span style="color: #16a34a; font-weight: 700;">■ Credits (Inflow)</span>
            <span style="color: #e11d48; font-weight: 700;">■ Debits (Outflow)</span>
          </div>
        </div>
        ${svgBarChart}
        <div style="font-size: 8.5px; color: #64748b; margin-top: 6px; text-align: center;">
          Showing up to 14 days of cash & digital bank transactions.
        </div>
      </div>
    </div>

    <!-- Ledger Transaction Table (Green for Credit, Red for Debit) -->
    <div class="section-title">
      <span>Branch Financial Transactions Ledger</span>
      <span>${transactions.length} Entries Recorded</span>
    </div>

    <table class="ledger-table">
      <thead>
        <tr>
          <th style="width: 75px;">Date</th>
          <th style="width: 65px;">Type</th>
          <th>Particulars / Narration</th>
          <th style="width: 130px;">Party / Payee</th>
          <th style="width: 90px;">Category</th>
          <th style="width: 75px;">Ref #</th>
          <th style="width: 65px;">Mode</th>
          <th style="width: 90px;" class="text-right">Credit (+)</th>
          <th style="width: 90px;" class="text-right">Debit (-)</th>
          <th style="width: 100px;" class="text-right">Running Bal.</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.length === 0 ? `
          <tr>
            <td colspan="10" style="text-align: center; padding: 25px; color: #64748b; font-size: 11px;">
              No debit or credit transactions recorded for this branch in the selected period.
            </td>
          </tr>
        ` : transactions.map((t) => {
          const isCredit = t.type === 'CREDIT';
          const amt = Number(t.amount);
          const running = Number(t.runningBalance);
          const dateStr = t.entryDate.toISOString().slice(0, 10);

          return `
            <tr class="${isCredit ? 'row-credit' : 'row-debit'}">
              <td class="font-mono">${dateStr}</td>
              <td>
                <span class="${isCredit ? 'badge-credit' : 'badge-debit'}">${t.type}</span>
              </td>
              <td>
                <div style="font-weight: 700; color: #0f172a;">${t.description || t.category}</div>
                ${!params.branchId || params.branchId === 'ALL' ? `<span style="font-size: 8px; color: #64748b;">[${t.branch?.name || 'Branch'}]</span>` : ''}
              </td>
              <td>${t.partyName}</td>
              <td><span style="font-size: 8.5px; font-weight: 600; color: #475569;">${t.category}</span></td>
              <td class="font-mono">${t.referenceNo || '—'}</td>
              <td><span style="font-size: 8px; font-weight: 700; padding: 1.5px 4px; background: #e2e8f0; border-radius: 3px;">${t.paymentMode}</span></td>
              <td class="text-right amount-credit">${isCredit ? `+₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
              <td class="text-right amount-debit">${!isCredit ? `-₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
              <td class="text-right amount-balance font-mono">₹${running.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          `;
        }).join('')}

        <!-- Total Summary Footer Row -->
        <tr class="total-footer">
          <td colspan="7" style="text-align: right; padding-right: 12px;">PERIOD TOTALS & CLOSING BALANCE:</td>
          <td class="text-right amount-credit">+₹${summary.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right amount-debit">-₹${summary.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right amount-balance font-mono">₹${summary.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <!-- Footer Information -->
    <div class="report-footer">
      <div>Pacific Restroom Cubicle Enterprise ERP · Branch Debit & Credit Accounting System</div>
      <div>Confidential & Authorised Branch Financial Report · Page 1 of 1</div>
    </div>
  </div>
</body>
</html>
    `;
  },
};
