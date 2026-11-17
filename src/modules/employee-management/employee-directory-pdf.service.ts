import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfmake = require('pdfmake');
import type { TDocumentDefinitions, TableCell, Alignment } from 'pdfmake/interfaces';
import { PACIFIC_RESTROOM_LOGO_DATA_URL } from '../../assets/logo.base64';

// ─── Font Configuration ───────────────────────────────────────────────────────
try {
  const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
  pdfmake.addFonts({
    Roboto: {
      normal: path.join(pdfmakeDir, 'fonts/Roboto/Roboto-Regular.ttf'),
      bold: path.join(pdfmakeDir, 'fonts/Roboto/Roboto-Medium.ttf'),
      italics: path.join(pdfmakeDir, 'fonts/Roboto/Roboto-Italic.ttf'),
      bolditalics: path.join(pdfmakeDir, 'fonts/Roboto/Roboto-MediumItalic.ttf'),
    },
  });
} catch (e: any) {
  console.warn('[Employee Directory PDF Service] Font initialization warning:', e?.message || e);
}

// ─── Design Palette ───────────────────────────────────────────────────────────
const NAVY = '#0f172a';
const NAVY_DARK = '#0b1e38';
const EMERALD = '#047857';
const BLUE = '#2563eb';
const INDIGO = '#4f46e5';
const AMBER = '#d97706';
const GRAY = '#64748b';
const DARK_GRAY = '#1e293b';
const LIGHT_BG = '#f8fafc';
const BORDER_COLOR = '#cbd5e1';

export interface EmployeeDirectoryPdfItem {
  id: string;
  employeeId: string;
  name: string;
  gender?: string | null;
  phone: string;
  whatsappNo?: string | null;
  email?: string | null;
  designation: string;
  department: string;
  joiningDate: Date | string;
  status: string;
  governmentIdType: string;
  governmentIdNumber: string;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankAccountHolder?: string | null;
  monthlyCtc: number;
  clBalance?: number;
  elBalance?: number;
  address?: string | null;
  emergencyContact?: string | null;
}

export interface EmployeeDirectoryPdfOptions {
  title?: string;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  isUpFactory?: boolean;
  filterLabel?: string;
  generatedByName?: string;
  items: EmployeeDirectoryPdfItem[];
}

function formatINR(value: number | string | null | undefined): string {
  const n = Number(value || 0);
  return `\u20B9${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function makeCell(
  text: any,
  options: {
    bold?: boolean;
    align?: Alignment;
    color?: string;
    fillColor?: string;
    fontSize?: number;
    colSpan?: number;
    margin?: [number, number, number, number];
  } = {}
): TableCell {
  return {
    text,
    bold: options.bold ?? false,
    alignment: options.align || 'left',
    color: options.color || DARK_GRAY,
    fillColor: options.fillColor,
    fontSize: options.fontSize ?? 6.5,
    colSpan: options.colSpan,
    margin: options.margin || [2, 3, 2, 3],
  };
}

export async function generateEmployeeDirectoryPdf(options: EmployeeDirectoryPdfOptions): Promise<Buffer> {
  const items = options.items || [];
  const isUp = Boolean(options.isUpFactory);

  const companyName =
    options.companyName ||
    (isUp ? 'PACIFIC PRODUCTS & SOLUTIONS (UP FACTORY UNIT)' : 'PACIFIC PRODUCTS & SOLUTIONS');
  const companyAddress =
    options.companyAddress ||
    (isUp
      ? 'Industrial Area, Uttar Pradesh Manufacturing Hub, India'
      : 'Plot No. 42, Sector 8, IMT Manesar, Gurugram, Haryana - 122051, India');
  const companyContact =
    options.companyContact || 'Email: info@pacificrestroom.com • Web: www.pacificrestroom.com';

  const totalEmployees = items.length;
  const activeCount = items.filter((i) => i.status === 'ACTIVE').length;
  const inactiveCount = totalEmployees - activeCount;
  const totalMonthlyCtc = items.reduce((acc, curr) => acc + (Number(curr.monthlyCtc) || 0), 0);
  const avgMonthlyCtc = totalEmployees > 0 ? Math.round(totalMonthlyCtc / totalEmployees) : 0;

  // Count unique departments
  const departmentsSet = new Set(items.map((i) => i.department).filter(Boolean));

  // Build Table Header
  // Columns:
  // 0: # (15)
  // 1: ID (38)
  // 2: Name & Gender (75)
  // 3: Designation & Dept (75)
  // 4: Contact (Phone/WA) (65)
  // 5: Email & Address (85)
  // 6: Joining & Status (55)
  // 7: Govt ID (55)
  // 8: Bank Details (80)
  // 9: Monthly CTC (52)
  // 10: Leaves CL/EL (35)
  // Total widths = ~630 pt (A4 Landscape available width is ~792 - 40 = 752 pt)

  const widths = [16, 42, 85, 85, 75, 95, 60, 65, 95, 55, 40];

  const tableHeaderRow: TableCell[] = [
    makeCell('#', { bold: true, align: 'center', fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
    makeCell('EMP ID', { bold: true, align: 'center', fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
    makeCell('NAME & GENDER', { bold: true, fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
    makeCell('DESIGNATION / DEPT', { bold: true, fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
    makeCell('CONTACT (MOBILE/WA)', { bold: true, fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
    makeCell('EMAIL & RESIDENCE', { bold: true, fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
    makeCell('JOINING / STATUS', { bold: true, align: 'center', fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
    makeCell('GOVT ID DETAILS', { bold: true, fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
    makeCell('BANK ACCOUNT & IFSC', { bold: true, fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
    makeCell('MONTHLY CTC', { bold: true, align: 'right', fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
    makeCell('LEAVES (CL/EL)', { bold: true, align: 'center', fillColor: NAVY_DARK, color: '#ffffff', fontSize: 6.5 }),
  ];

  const tableBody: TableCell[][] = [tableHeaderRow];

  items.forEach((emp, index) => {
    const isEven = index % 2 === 0;
    const rowBg = isEven ? '#ffffff' : LIGHT_BG;
    const statusColor = emp.status === 'ACTIVE' ? EMERALD : GRAY;

    // Contact stack
    const contactText = [
      { text: emp.phone || 'N/A', bold: true, fontSize: 6.5, color: NAVY },
      emp.whatsappNo && emp.whatsappNo !== emp.phone
        ? { text: `\nWA: ${emp.whatsappNo}`, fontSize: 6, color: GRAY }
        : '',
      emp.emergencyContact ? { text: `\nEmerg: ${emp.emergencyContact}`, fontSize: 5.5, color: GRAY } : '',
    ];

    // Name & Gender stack
    const nameText = [
      { text: emp.name || 'Unnamed', bold: true, fontSize: 7, color: NAVY },
      emp.gender ? { text: ` • ${emp.gender}`, fontSize: 6, color: GRAY } : '',
    ];

    // Designation & Dept
    const roleText = [
      { text: emp.designation || 'Staff', bold: true, fontSize: 6.5, color: DARK_GRAY },
      { text: `\n${emp.department || 'General'}`, fontSize: 6, color: GRAY },
    ];

    // Email & Address
    const addressText = [
      emp.email ? { text: emp.email, fontSize: 6, color: BLUE } : '',
      emp.address ? { text: `${emp.email ? '\n' : ''}${emp.address}`, fontSize: 5.5, color: GRAY } : '',
    ];

    // Joining & Status
    const joinStatusText = [
      { text: formatDate(emp.joiningDate), fontSize: 6, color: DARK_GRAY },
      { text: `\n${emp.status}`, bold: true, fontSize: 6, color: statusColor },
    ];

    // Govt ID Details
    const govtIdText = [
      { text: `${emp.governmentIdType || 'ID'}:`, bold: true, fontSize: 6, color: DARK_GRAY },
      { text: `\n${emp.governmentIdNumber || 'N/A'}`, fontSize: 6, color: GRAY },
    ];

    // Bank Account Details
    const bankDetails = emp.bankAccountNumber
      ? [
          { text: emp.bankName || 'Bank', bold: true, fontSize: 6, color: NAVY },
          { text: `\nA/C: ${emp.bankAccountNumber}`, fontSize: 6, color: DARK_GRAY },
          emp.bankIfsc ? { text: `\nIFSC: ${emp.bankIfsc}`, fontSize: 5.5, color: GRAY } : '',
        ]
      : [{ text: 'No Bank Recorded', fontSize: 6, color: GRAY, italics: true }];

    // Leaves
    const leavesText = [
      { text: `CL: ${Number(emp.clBalance || 0).toFixed(1)}`, fontSize: 6, color: DARK_GRAY },
      { text: `\nEL: ${Number(emp.elBalance || 0).toFixed(1)}`, fontSize: 6, color: DARK_GRAY },
    ];

    tableBody.push([
      makeCell(String(index + 1), { align: 'center', fillColor: rowBg, color: GRAY, fontSize: 6 }),
      makeCell(emp.employeeId || 'N/A', { bold: true, align: 'center', fillColor: rowBg, color: INDIGO, fontSize: 6.5 }),
      makeCell(nameText, { fillColor: rowBg }),
      makeCell(roleText, { fillColor: rowBg }),
      makeCell(contactText, { fillColor: rowBg }),
      makeCell(addressText, { fillColor: rowBg }),
      makeCell(joinStatusText, { align: 'center', fillColor: rowBg }),
      makeCell(govtIdText, { fillColor: rowBg }),
      makeCell(bankDetails, { fillColor: rowBg }),
      makeCell(formatINR(emp.monthlyCtc), { bold: true, align: 'right', fillColor: rowBg, color: NAVY, fontSize: 7 }),
      makeCell(leavesText, { align: 'center', fillColor: rowBg }),
    ]);
  });

  // Total Summary Row
  tableBody.push([
    makeCell('TOTAL', { bold: true, align: 'center', colSpan: 9, fillColor: '#e2e8f0', color: NAVY, fontSize: 7 }),
    makeCell('', { fillColor: '#e2e8f0' }),
    makeCell('', { fillColor: '#e2e8f0' }),
    makeCell('', { fillColor: '#e2e8f0' }),
    makeCell('', { fillColor: '#e2e8f0' }),
    makeCell('', { fillColor: '#e2e8f0' }),
    makeCell('', { fillColor: '#e2e8f0' }),
    makeCell('', { fillColor: '#e2e8f0' }),
    makeCell('', { fillColor: '#e2e8f0' }),
    makeCell(formatINR(totalMonthlyCtc), { bold: true, align: 'right', fillColor: '#e2e8f0', color: NAVY, fontSize: 7.5 }),
    makeCell('', { fillColor: '#e2e8f0' }),
  ]);

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [20, 20, 20, 25],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [20, 0, 20, 0],
      columns: [
        {
          text: `Pacific HR System • Confidential Employee Master Record • Generated on ${new Date().toLocaleString('en-IN')}`,
          fontSize: 6,
          color: GRAY,
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'right',
          fontSize: 6,
          color: GRAY,
        },
      ],
    }),
    content: [
      // Header Section
      {
        columns: [
          // Logo if available
          PACIFIC_RESTROOM_LOGO_DATA_URL
            ? {
                image: PACIFIC_RESTROOM_LOGO_DATA_URL,
                width: 90,
              }
            : {
                text: 'PACIFIC',
                bold: true,
                fontSize: 16,
                color: NAVY,
                width: 90,
              },
          // Company details & Title
          {
            width: '*',
            margin: [10, 0, 0, 0],
            stack: [
              { text: companyName, bold: true, fontSize: 13, color: NAVY },
              { text: companyAddress, fontSize: 6.5, color: GRAY, margin: [0, 1, 0, 0] },
              { text: companyContact, fontSize: 6.5, color: GRAY, margin: [0, 1, 0, 0] },
            ],
          },
          // Document Title badge
          {
            width: 'auto',
            alignment: 'right',
            stack: [
              {
                text: options.title || 'OFFICIAL EMPLOYEE MASTER DIRECTORY',
                bold: true,
                fontSize: 11,
                color: NAVY,
              },
              {
                text: 'Human Resources & Payroll Database',
                fontSize: 7,
                color: EMERALD,
                bold: true,
                margin: [0, 2, 0, 0],
              },
              {
                text: `Date: ${formatDate(new Date())} • ${options.filterLabel || 'All Active & Registered Staff'}`,
                fontSize: 6.5,
                color: GRAY,
                margin: [0, 2, 0, 0],
              },
            ],
          },
        ],
      },

      // Divider line
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 6,
            x2: 752,
            y2: 6,
            lineWidth: 1.5,
            lineColor: INDIGO,
          },
        ],
        margin: [0, 4, 0, 8],
      },

      // KPI Executive Summary Cards Strip
      {
        margin: [0, 0, 0, 8],
        columns: [
          {
            width: '20%',
            stack: [
              { text: 'TOTAL EMPLOYEES', fontSize: 6, color: GRAY, bold: true },
              { text: String(totalEmployees), fontSize: 11, bold: true, color: NAVY, margin: [0, 1, 0, 0] },
            ],
          },
          {
            width: '20%',
            stack: [
              { text: 'ACTIVE STAFF', fontSize: 6, color: GRAY, bold: true },
              { text: `${activeCount} Active`, fontSize: 11, bold: true, color: EMERALD, margin: [0, 1, 0, 0] },
            ],
          },
          {
            width: '20%',
            stack: [
              { text: 'DEPARTMENTS COVERED', fontSize: 6, color: GRAY, bold: true },
              { text: `${departmentsSet.size} Units`, fontSize: 11, bold: true, color: BLUE, margin: [0, 1, 0, 0] },
            ],
          },
          {
            width: '20%',
            stack: [
              { text: 'AVERAGE MONTHLY CTC', fontSize: 6, color: GRAY, bold: true },
              { text: formatINR(avgMonthlyCtc), fontSize: 11, bold: true, color: DARK_GRAY, margin: [0, 1, 0, 0] },
            ],
          },
          {
            width: '20%',
            stack: [
              { text: 'TOTAL MONTHLY PAYROLL CTC', fontSize: 6, color: GRAY, bold: true },
              { text: formatINR(totalMonthlyCtc), fontSize: 11, bold: true, color: NAVY_DARK, margin: [0, 1, 0, 0] },
            ],
          },
        ],
      },

      // Master Employee Table
      {
        table: {
          headerRows: 1,
          widths,
          body: tableBody,
        },
        layout: {
          hLineWidth: (i, node) =>
            i === 0 || i === 1 || i === node.table.body.length - 1 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i, node) =>
            i === 0 || i === 1 || i === node.table.body.length - 1 ? NAVY_DARK : BORDER_COLOR,
          vLineColor: () => BORDER_COLOR,
        },
      },

      // Tripartite Signatory Block
      {
        margin: [0, 14, 0, 0],
        columns: [
          {
            width: '33%',
            stack: [
              { text: 'Prepared By:', bold: true, fontSize: 7, color: NAVY },
              { text: options.generatedByName || 'HR Operations Manager', fontSize: 6.5, color: GRAY, margin: [0, 16, 0, 0] },
              { text: 'Signature & Stamp', fontSize: 6, color: GRAY },
            ],
          },
          {
            width: '34%',
            alignment: 'center',
            stack: [
              { text: 'Verified By:', bold: true, fontSize: 7, color: NAVY },
              { text: 'Finance & Compliance Head', fontSize: 6.5, color: GRAY, margin: [0, 16, 0, 0] },
              { text: 'Signature & Date', fontSize: 6, color: GRAY },
            ],
          },
          {
            width: '33%',
            alignment: 'right',
            stack: [
              { text: 'Authorized Signatory:', bold: true, fontSize: 7, color: NAVY },
              { text: 'Managing Director / Super Admin', fontSize: 6.5, color: GRAY, margin: [0, 16, 0, 0] },
              { text: 'PACIFIC PRODUCTS & SOLUTIONS', fontSize: 6, color: GRAY },
            ],
          },
        ],
      },
    ],
  };

  const doc = pdfmake.createPdf(docDefinition);
  return await doc.getBuffer();
}
