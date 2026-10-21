import ExcelJS from 'exceljs';
import { Response } from 'express';
import { listExpenses } from './up.service';
import type { ListUpExpensesQuery } from './up.schema';

export const exportExpensesToExcel = async (query: ListUpExpensesQuery, res: Response) => {
  // Fetch up to 10,000 records for the export matching active filters
  const result = await listExpenses({ ...query, page: 1, limit: 10000 });
  const items = result.items;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Pacific Products & Solutions';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('UP Daily Expenses', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  // Header Title Row
  worksheet.mergeCells('A1:J1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'PACIFIC PRODUCTS & SOLUTIONS — UP DAILY EXPENSE LEDGER';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFB5F823' } }; // Pacific Vibrant Lime
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF030213' }, // Pacific Obsidian Dark
  };
  worksheet.getRow(1).height = 32;

  // Subtitle / Date Filter Info
  worksheet.mergeCells('A2:J2');
  const subCell = worksheet.getCell('A2');
  const dateInfo = query.startDate && query.endDate
    ? `Period: ${query.startDate} to ${query.endDate}`
    : `Exported on: ${new Date().toLocaleDateString('en-IN')}`;
  subCell.value = `${dateInfo} | Total Records: ${items.length} | Total Amount: ₹${result.pagination.totalAmount.toLocaleString('en-IN')}`;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F0E26' }, // Pacific Container Surface
  };
  worksheet.getRow(2).height = 22;

  // Table Column Headers
  const headerRow = worksheet.addRow([
    'Expense Date',
    'Expense ID',
    'Category',
    'Amount (₹)',
    'Payment Mode',
    'Paid To / Vendor',
    'Short Note',
    'Verification Status',
    'Created By',
    'Created At',
  ]);
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7FB706' }, // Pacific Forest Green
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF030213' } },
    };
  });

  // Data Rows
  items.forEach((item, idx) => {
    const row = worksheet.addRow([
      item.expenseDate,
      item.id,
      item.categoryName,
      Number(item.amount),
      (item.paymentMode || 'cash').toUpperCase(),
      item.paidTo,
      item.note || '—',
      item.verified ? 'VERIFIED' : 'UNVERIFIED',
      item.createdByName || 'Super Admin',
      item.createdAt instanceof Date ? item.createdAt.toLocaleString('en-IN') : String(item.createdAt),
    ]);

    row.height = 20;
    const isEven = idx % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 4 ? 'right' : colNumber === 1 || colNumber === 8 ? 'center' : 'left',
      };
      if (colNumber === 4) {
        cell.numFmt = '#,##0.00';
      }
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
      if (colNumber === 8) {
        cell.font = {
          name: 'Arial',
          size: 9,
          bold: true,
          color: { argb: item.verified ? 'FF059669' : 'FFD97706' },
        };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Total Summary Footer Row
  const totalRow = worksheet.addRow([
    'TOTAL',
    '',
    '',
    result.pagination.totalAmount,
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  totalRow.height = 26;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: colNumber === 4 ? 'FFB5F823' : 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF030213' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 4 ? 'right' : 'center',
    };
    if (colNumber === 4) {
      cell.numFmt = '#,##0.00';
    }
  });

  worksheet.columns = [
    { width: 14 }, // Date
    { width: 36 }, // ID
    { width: 22 }, // Category
    { width: 16 }, // Amount
    { width: 15 }, // Payment Mode
    { width: 28 }, // Paid To
    { width: 32 }, // Note
    { width: 16 }, // Status
    { width: 20 }, // Created By
    { width: 22 }, // Created At
  ];

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="UP_Expenses_Export_${Date.now()}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
};
