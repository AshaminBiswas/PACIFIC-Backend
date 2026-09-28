"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../../config/database");
const email_service_1 = require("../../utils/email.service");
const audit_service_1 = require("../audit/audit.service");
const numberToWords_1 = require("../utils/numberToWords");
let cachedLogoBase64 = null;
function resolveCompanyLogoDataUri(providedUrl) {
    if (providedUrl && (providedUrl.startsWith('data:') || providedUrl.startsWith('http://') || providedUrl.startsWith('https://'))) {
        return providedUrl;
    }
    if (cachedLogoBase64)
        return cachedLogoBase64;
    try {
        const candidatePaths = [
            path_1.default.resolve(process.cwd(), '../PACIFIC-Admin/public/pacific_logo.png'),
            'd:/PACIFIC-Admin/public/pacific_logo.png',
            path_1.default.resolve(__dirname, '../../../../PACIFIC-Admin/public/pacific_logo.png'),
        ];
        for (const p of candidatePaths) {
            if (fs_1.default.existsSync(p)) {
                const buffer = fs_1.default.readFileSync(p);
                cachedLogoBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
                return cachedLogoBase64;
            }
        }
    }
    catch {
        // fallback
    }
    return providedUrl || '';
}
exports.ledgerService = {
    /**
     * Calculates comprehensive chronological customer ledger with running balance,
     * de-duplicating Sales Orders when Proforma Invoices already exist.
     */
    async getCustomerLedger(customerId, options) {
        const [customer, company] = await Promise.all([
            database_1.prisma.businessParty.findUnique({
                where: { id: customerId },
                include: {
                    customerProfile: true,
                    contacts: true,
                    addresses: true,
                    proformaInvoices: {
                        where: { status: { notIn: ['CANCELLED'] } },
                        include: { order: true },
                        orderBy: { piDate: 'asc' },
                    },
                    salesOrders: {
                        where: { status: { notIn: ['CANCELLED'] } },
                        orderBy: { orderDate: 'asc' },
                    },
                    payments: {
                        where: { status: 'CONFIRMED' },
                        orderBy: { paymentDate: 'asc' },
                    },
                    followups: {
                        include: {
                            logs: {
                                include: { user: { select: { id: true, firstName: true, lastName: true } } },
                                orderBy: { createdAt: 'desc' },
                            },
                            reminders: true,
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
            }),
            database_1.prisma.companyProfile.findFirst({
                where: { status: 'ACTIVE' },
                include: {
                    bankAccounts: true,
                    signatories: true,
                    addresses: true,
                },
            }).then(async (c) => c || database_1.prisma.companyProfile.findFirst({
                include: {
                    bankAccounts: true,
                    signatories: true,
                    addresses: true,
                },
            })),
        ]);
        if (!customer) {
            throw Object.assign(new Error('Customer not found'), { status: 404 });
        }
        const paymentTermsDays = customer.customerProfile?.paymentTermsDays ?? 30;
        const now = new Date();
        // Set of linked order IDs to prevent double-billing when PI already exists
        const linkedOrderIds = new Set();
        customer.proformaInvoices.forEach((pi) => {
            if (pi.orderId)
                linkedOrderIds.add(pi.orderId);
        });
        const rawEntries = [];
        // 1. Collect Proforma Invoices (Primary Debits)
        for (const pi of customer.proformaInvoices) {
            const piDueDate = new Date(new Date(pi.piDate).getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);
            rawEntries.push({
                id: pi.id,
                date: new Date(pi.piDate),
                docType: 'PI',
                docRef: pi.piNumber,
                description: `Proforma Invoice ${pi.quotationRef ? `(Quotation: ${pi.quotationRef})` : ''}${pi.order?.orderNumber ? ` [Order: ${pi.order.orderNumber}]` : ''}`.trim(),
                dueDate: piDueDate,
                debit: Number(pi.grandTotal || 0),
                credit: 0,
                status: pi.status,
            });
        }
        // 2. Collect Independent Sales Orders (Debits only if no preceding PI exists)
        for (const so of customer.salesOrders) {
            if (!linkedOrderIds.has(so.id) && !so.proformaInvoiceId) {
                const orderDueDate = new Date(new Date(so.orderDate).getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);
                rawEntries.push({
                    id: so.id,
                    date: new Date(so.orderDate),
                    docType: 'SALES_ORDER',
                    docRef: so.orderNumber,
                    description: `Direct Sales Order ${so.customerPoNumber ? `(PO: ${so.customerPoNumber})` : ''}`.trim(),
                    dueDate: orderDueDate,
                    debit: Number(so.grandTotal || 0),
                    credit: 0,
                    status: so.status,
                });
            }
        }
        // 3. Collect Confirmed Payments (Credits)
        for (const pay of customer.payments) {
            rawEntries.push({
                id: pay.id,
                date: new Date(pay.paymentDate),
                docType: 'PAYMENT',
                docRef: pay.referenceNumber || `PAY-${pay.id.substring(0, 8).toUpperCase()}`,
                description: `Payment received via ${pay.paymentMethod || 'NEFT_RTGS'} ${pay.referenceNumber ? `(Ref: ${pay.referenceNumber})` : ''}`.trim(),
                dueDate: null,
                debit: 0,
                credit: Number(pay.amount || 0),
                status: pay.status,
            });
        }
        // 4. Sort all transactions chronologically (Date ASC, then debits before credits if same timestamp)
        rawEntries.sort((a, b) => {
            const timeDiff = a.date.getTime() - b.date.getTime();
            if (timeDiff !== 0)
                return timeDiff;
            return a.credit - b.credit; // Debits (credit=0) first
        });
        // 5. Calculate cumulative running balance
        let runningBalance = 0;
        const computedEntries = rawEntries.map((item, index) => {
            runningBalance = Math.round((runningBalance + item.debit - item.credit) * 100) / 100;
            let daysOverdue = 0;
            if (item.dueDate && item.debit > 0 && item.dueDate < now) {
                daysOverdue = Math.max(0, Math.floor((now.getTime() - item.dueDate.getTime()) / (24 * 60 * 60 * 1000)));
            }
            return {
                id: item.id,
                serialNo: index + 1,
                date: item.date.toISOString(),
                docType: item.docType,
                docRef: item.docRef,
                description: item.description,
                dueDate: item.dueDate ? item.dueDate.toISOString() : null,
                daysOverdue,
                debit: item.debit,
                credit: item.credit,
                runningBalance,
                status: item.status,
            };
        });
        // 6. Handle optional Date Range Filtering
        const from = options?.fromDate ? new Date(options.fromDate) : null;
        const to = options?.toDate ? new Date(options.toDate) : null;
        let openingBalance = 0;
        let filteredEntries = [];
        if (from || to) {
            if (from) {
                const priorEntries = computedEntries.filter((e) => new Date(e.date) < from);
                openingBalance = priorEntries.length > 0 ? priorEntries[priorEntries.length - 1].runningBalance : 0;
            }
            filteredEntries = computedEntries.filter((e) => {
                const d = new Date(e.date);
                if (from && d < from)
                    return false;
                if (to && d > to)
                    return false;
                return true;
            });
        }
        else {
            filteredEntries = computedEntries;
        }
        // 7. Calculate overall financial summary
        const totalDebits = Math.round(computedEntries.reduce((sum, e) => sum + e.debit, 0) * 100) / 100;
        const totalCredits = Math.round(computedEntries.reduce((sum, e) => sum + e.credit, 0) * 100) / 100;
        const closingBalance = Math.round((totalDebits - totalCredits) * 100) / 100;
        const periodDebits = Math.round(filteredEntries.reduce((sum, e) => sum + e.debit, 0) * 100) / 100;
        const periodCredits = Math.round(filteredEntries.reduce((sum, e) => sum + e.credit, 0) * 100) / 100;
        // Calculate overdue metrics (FIFO: apply credits to oldest debits)
        let remainingCreditToAllocate = totalCredits;
        let overdueAmount = 0;
        let maxDaysOverdue = 0;
        let earliestDueDate = null;
        for (const entry of computedEntries) {
            if (entry.debit > 0 && entry.dueDate) {
                const debitAmt = entry.debit;
                if (remainingCreditToAllocate >= debitAmt) {
                    remainingCreditToAllocate -= debitAmt;
                }
                else {
                    const unpaidPortion = debitAmt - remainingCreditToAllocate;
                    remainingCreditToAllocate = 0;
                    const entryDue = new Date(entry.dueDate);
                    if (entryDue < now) {
                        overdueAmount += unpaidPortion;
                        if (!earliestDueDate || entryDue < earliestDueDate) {
                            earliestDueDate = entryDue;
                        }
                        const days = Math.floor((now.getTime() - entryDue.getTime()) / (24 * 60 * 60 * 1000));
                        if (days > maxDaysOverdue)
                            maxDaysOverdue = days;
                    }
                }
            }
        }
        overdueAmount = Math.round(Math.min(overdueAmount, Math.max(0, closingBalance)) * 100) / 100;
        // 8. Follow-up & Overdue Cadence Status
        const existingFollowup = customer.followups[0] || null;
        let currentStage = 'CURRENT';
        if (closingBalance > 0 && overdueAmount > 0 && maxDaysOverdue >= 1) {
            // Find the last stage from logs or existing followup
            const lastStageLog = existingFollowup?.logs.find((l) => l.notes.includes('[AUTO_REMINDER_') ||
                l.notes.includes('[FINAL_NOTICE]') ||
                l.notes.includes('[MANUAL_FOLLOWUP]'));
            if (lastStageLog) {
                if (lastStageLog.notes.includes('[MANUAL_FOLLOWUP]'))
                    currentStage = 'MANUAL_FOLLOWUP';
                else if (lastStageLog.notes.includes('[FINAL_NOTICE]'))
                    currentStage = 'FINAL_NOTICE';
                else if (lastStageLog.notes.includes('[AUTO_REMINDER_3]'))
                    currentStage = 'REMINDER_3';
                else if (lastStageLog.notes.includes('[AUTO_REMINDER_2]'))
                    currentStage = 'REMINDER_2';
                else if (lastStageLog.notes.includes('[AUTO_REMINDER_1]'))
                    currentStage = 'REMINDER_1';
            }
            else {
                // If overdue but no reminder recorded yet, stage 1 is pending/ready
                currentStage = 'REMINDER_1';
            }
        }
        const primaryContact = customer.contacts.find((c) => c.isPrimary) || customer.contacts[0] || null;
        const billingAddress = customer.addresses.find((a) => a.isDefaultBilling) || customer.addresses[0] || null;
        const defaultBank = company?.bankAccounts?.find((b) => b.isDefault) || company?.bankAccounts?.[0] || null;
        const defaultSignatory = company?.signatories?.find((s) => s.isDefault) || company?.signatories?.[0] || null;
        const defaultAddress = company?.addresses?.find((a) => a.isDefaultBilling) || company?.addresses?.[0] || null;
        const companyFormattedAddress = defaultAddress
            ? `${defaultAddress.addressLine1}${defaultAddress.addressLine2 ? ', ' + defaultAddress.addressLine2 : ''}, ${defaultAddress.city}, ${defaultAddress.state} - ${defaultAddress.postalCode}`
            : 'B-20, Ganga Vihar, Gokalpuri, Delhi - 110094';
        const companyData = {
            legalName: company?.legalName || 'Pacific Products & Solutions',
            tradeName: company?.tradeName || 'Pacific Restroom Cubicle',
            gstin: company?.gstin || defaultAddress?.gstin || '19AAHFP8823J1Z8',
            pan: company?.pan || defaultAddress?.pan || 'AAHFP8823J',
            email: company?.email || 'info@pacificproduct.in',
            phone: company?.phone || '011 4118 3600',
            address: companyFormattedAddress,
            bankAccount: defaultBank
                ? {
                    bankName: defaultBank.bankName,
                    accountNumber: defaultBank.accountNumber,
                    ifscCode: defaultBank.ifscCode,
                    swiftCode: defaultBank.swiftCode,
                    branch: defaultBank.branch,
                }
                : {
                    bankName: 'Central Bank Of India',
                    accountNumber: '3466708013',
                    ifscCode: 'CBIN0283809',
                    swiftCode: 'CBININBBCFD',
                    branch: 'B-20, Ganga Vihar, Gokalpuri, Delhi - 110094',
                },
            signatory: defaultSignatory
                ? {
                    name: defaultSignatory.name,
                    designation: defaultSignatory.designation,
                    signatureUrl: defaultSignatory.signatureUrl,
                }
                : {
                    name: 'Ejajul Shaikh',
                    designation: 'Company Head',
                    signatureUrl: null,
                },
        };
        return {
            customer: {
                id: customer.id,
                legalName: customer.legalName,
                tradeName: customer.tradeName,
                gstin: customer.gstin,
                pan: customer.pan,
                email: customer.email,
                phone: customer.phone,
                paymentTermsDays,
                creditLimit: customer.customerProfile?.creditLimit ? Number(customer.customerProfile.creditLimit) : null,
                customerType: customer.customerProfile?.customerType,
                status: customer.status,
                billingAddress,
                primaryContact,
            },
            company: companyData,
            summary: {
                openingBalance,
                periodDebits,
                periodCredits,
                closingBalance,
                overdueAmount,
                daysOverdue: maxDaysOverdue,
                earliestDueDate: earliestDueDate ? earliestDueDate.toISOString() : null,
                paymentTermsDays,
                currency: 'INR',
                totalTransactions: filteredEntries.length,
            },
            cadence: {
                currentStage,
                lastReminderDate: existingFollowup?.nextFollowupDate ? existingFollowup.nextFollowupDate.toISOString() : null,
                nextReminderDate: existingFollowup?.nextFollowupDate ? existingFollowup.nextFollowupDate.toISOString() : null,
                followupStatus: existingFollowup?.followupStatus || (closingBalance > 0 && overdueAmount > 0 ? 'PENDING' : 'RESOLVED'),
                priority: existingFollowup?.priority || (overdueAmount > 50000 ? 'HIGH' : 'MEDIUM'),
                promisedPaymentDate: existingFollowup?.promisedPaymentDate ? existingFollowup.promisedPaymentDate.toISOString() : null,
                promisedAmount: existingFollowup?.promisedAmount ? Number(existingFollowup.promisedAmount) : null,
                notes: existingFollowup?.notes || null,
            },
            entries: filteredEntries,
            logs: existingFollowup?.logs || [],
        };
    },
    /**
     * Records a manual historical transaction (Debit or Credit) to update customer ledger balance.
     * Useful when migrating historical accounts and transactions before system rollout.
     */
    async recordManualEntry(customerId, data, userId) {
        const customer = await database_1.prisma.businessParty.findUnique({
            where: { id: customerId },
            include: { customerProfile: true },
        });
        if (!customer)
            throw Object.assign(new Error('Customer not found'), { status: 404 });
        const activeCompany = (await database_1.prisma.companyProfile.findFirst({ where: { status: 'ACTIVE' } })) ||
            (await database_1.prisma.companyProfile.findFirst());
        if (!activeCompany)
            throw new Error('No company profile configured');
        const amount = Math.abs(Number(data.amount) || 0);
        if (amount <= 0)
            throw Object.assign(new Error('Amount must be greater than zero'), { status: 400 });
        const txnDate = data.date ? new Date(data.date) : new Date();
        if (data.entryType === 'CREDIT') {
            const payment = await database_1.prisma.payment.create({
                data: {
                    companyProfileId: activeCompany.id,
                    partyId: customerId,
                    paymentType: 'CUSTOMER_PAYMENT',
                    paymentMethod: data.paymentMethod || 'NEFT_RTGS',
                    referenceNumber: data.docRef || `PAY-${Date.now().toString().slice(-6)}`,
                    paymentDate: txnDate,
                    amount,
                    unallocatedAmount: amount,
                    currency: 'INR',
                    notes: data.description || 'Manual payment entry',
                    status: 'CONFIRMED',
                },
            });
            await audit_service_1.auditService.log({
                userId,
                action: 'PAYMENT_RECORDED',
                module: 'Finance',
                entityType: 'PAYMENT',
                entityId: payment.id,
                newData: { manual: true, customerId, amount, docRef: data.docRef },
            });
            return { type: 'CREDIT', record: payment };
        }
        else {
            const piNumber = data.docRef || `DB-${Date.now().toString().slice(-6)}`;
            const pi = await database_1.prisma.proformaInvoice.create({
                data: {
                    companyProfileId: activeCompany.id,
                    customerId,
                    piNumber,
                    piDate: txnDate,
                    placeOfSupply: 'Delhi',
                    placeOfSupplyStateCode: '07',
                    currency: 'INR',
                    subtotal: amount,
                    taxableAmount: amount,
                    grandTotal: amount,
                    status: 'ISSUED',
                    items: {
                        create: [
                            {
                                serialNumber: 1,
                                description: data.description || 'Historical transaction / opening debit',
                                quantity: 1,
                                rate: amount,
                                amount,
                                taxableAmount: amount,
                                totalAmount: amount,
                            },
                        ],
                    },
                },
            });
            await audit_service_1.auditService.log({
                userId,
                action: 'PROFORMA_INVOICE_CREATED',
                module: 'Finance',
                entityType: 'PROFORMA_INVOICE',
                entityId: pi.id,
                newData: { manual: true, customerId, amount, docRef: piNumber },
            });
            return { type: 'DEBIT', record: pi };
        }
    },
    /**
     * Generates a formal, executive monochrome Statement of Account PDF/HTML
     * designed identically to the Sales Quotation PDF.
     */
    generateLedgerHtml(data, options) {
        const { customer, summary, entries, company } = data;
        const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const logoSrc = resolveCompanyLogoDataUri();
        const bankAccount = company?.bankAccount || {
            bankName: 'Central Bank Of India',
            accountNumber: '3466708013',
            ifscCode: 'CBIN0283809',
            swiftCode: 'CBININBBCFD',
            branch: 'B-20, Ganga Vihar, Gokalpuri, Delhi - 110094',
        };
        const signatory = company?.signatory || {
            name: 'Ejajul Shaikh',
            designation: 'Company Head',
            signatureUrl: null,
        };
        const companyLegalName = company?.legalName || 'Pacific Products & Solutions';
        const companyAddress = company?.address || 'B-20, Ganga Vihar, Gokalpuri, Delhi - 110094';
        const companyPhone = company?.phone || '011 4118 3600';
        const companyGstin = company?.gstin || '19AAHFP8823J1Z8';
        const companyPan = company?.pan || 'AAHFP8823J';
        let balanceInWords = '';
        try {
            const absBal = Math.abs(summary.closingBalance);
            if (absBal > 0) {
                const words = (0, numberToWords_1.numberToWords)(absBal, 'INR');
                balanceInWords = summary.closingBalance > 0
                    ? `${words} (Debit Due)`
                    : `${words} (Credit / Advance Balance)`;
            }
            else {
                balanceInWords = 'Zero (Account Fully Reconciled)';
            }
        }
        catch {
            balanceInWords = `INR ${Math.abs(summary.closingBalance).toLocaleString('en-IN')}`;
        }
        const rowsHtml = entries
            .map((e) => `
        <tr>
          <td style="text-align: center; border: 1px solid #000000; padding: 4px 6px;">${e.serialNo}</td>
          <td style="text-align: center; border: 1px solid #000000; padding: 4px 6px; white-space: nowrap;">${new Date(e.date).toLocaleDateString('en-IN')}</td>
          <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold; font-family: monospace;">${e.docRef}</td>
          <td style="border: 1px solid #000000; padding: 4px 6px;">${e.description}</td>
          <td style="text-align: center; border: 1px solid #000000; padding: 4px 6px; font-size: 8.5px;">${e.dueDate ? new Date(e.dueDate).toLocaleDateString('en-IN') : '-'}</td>
          <td style="text-align: right; border: 1px solid #000000; padding: 4px 6px; font-family: monospace;">${e.debit > 0 ? e.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
          <td style="text-align: right; border: 1px solid #000000; padding: 4px 6px; font-family: monospace;">${e.credit > 0 ? e.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
          <td style="text-align: right; border: 1px solid #000000; padding: 4px 6px; font-weight: bold; font-family: monospace;">₹ ${e.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `)
            .join('');
        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Statement of Account — ${customer.legalName}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #000000;
      margin: 0;
      padding: 10px;
      font-size: 9.5px;
      line-height: 1.35;
      background: #ffffff;
    }
    .container {
      border: 1px solid #000000;
      padding: 14px;
      box-sizing: border-box;
      min-height: 275mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border-bottom: 1px solid #000000; padding-bottom: 8px; }
    .header-table td { vertical-align: top; }
    .title-badge { font-size: 15px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; color: #000000; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000000; }
    .info-table td { padding: 6px 8px; vertical-align: top; font-size: 9px; }
    .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000000; }
    .kpi-table th { background: #f4f4f5; color: #000000; font-size: 8px; text-transform: uppercase; padding: 5px 6px; border: 1px solid #000000; font-weight: bold; }
    .kpi-table td { padding: 5px 6px; font-size: 10px; font-weight: bold; text-align: center; border: 1px solid #000000; font-family: monospace; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000000; }
    .items-table th {
      background: #f4f4f5;
      color: #000000;
      font-size: 8.5px;
      text-transform: uppercase;
      padding: 5px 6px;
      border: 1px solid #000000;
      font-weight: bold;
    }
    .bank-table { width: 100%; border-collapse: collapse; margin-top: 8px; border: 1px solid #000000; }
    .bank-table th { background: #f4f4f5; font-size: 8.5px; text-transform: uppercase; padding: 4px 6px; border: 1px solid #000000; text-align: left; font-weight: bold; }
    .bank-table td { padding: 4px 6px; font-size: 8.5px; border: 1px solid #000000; }
    .sign-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .sign-table td { vertical-align: bottom; padding: 2px 4px; }
    @media print {
      body { padding: 0; }
      .container { border: 1px solid #000000; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div>
      <!-- Header -->
      <table class="header-table">
        <tr>
          <td style="width: 55%; vertical-align: top;">
            ${logoSrc ? `<img src="${logoSrc}" height="56" alt="Logo" style="margin-bottom: 4px; display: block; object-fit: contain; max-width: 200px;" />` : ''}
            <div style="font-size: 14px; letter-spacing: 0.3px; font-weight: bold;">${companyLegalName}</div>
            <div style="font-size: 9px; margin: 1px 0;">${companyAddress}</div>
            <div style="font-size: 9px;">Phone: ${companyPhone} | GSTIN: ${companyGstin} | PAN: ${companyPan}</div>
          </td>
          <td style="width: 45%; vertical-align: top; text-align: right;">
            <div class="title-badge">STATEMENT OF ACCOUNT</div>
            <div style="margin: 4px 0 2px 0; font-size: 10.5px; font-weight: bold;">Date: ${formattedDate}</div>
            <div style="font-size: 9px; color: #333333;">Terms: ${customer.paymentTermsDays} Days Net</div>
            ${summary.overdueAmount > 0
            ? `<div style="display: inline-block; margin-top: 4px; padding: 2px 8px; border: 1px solid #000000; font-size: 9px; font-weight: bold; background: #fee2e2;">OVERDUE: ₹ ${summary.overdueAmount.toLocaleString('en-IN')}</div>`
            : `<div style="display: inline-block; margin-top: 4px; padding: 2px 8px; border: 1px solid #000000; font-size: 9px; font-weight: bold; background: #f0fdf4;">ACCOUNT IN GOOD STANDING</div>`}
          </td>
        </tr>
      </table>

      <!-- Statement Recipient & Commercial Terms -->
      <table class="info-table">
        <tr>
          <td style="width: 55%; border-right: 1px solid #000000;">
            <div style="font-size: 8px; text-transform: uppercase; color: #555555; font-weight: bold;">Statement Issued To:</div>
            <div style="font-size: 12px; font-weight: bold; margin: 1px 0;">${customer.legalName}</div>
            ${customer.tradeName ? `<div style="font-size: 9px; color: #333333;">(${customer.tradeName})</div>` : ''}
            <div style="font-size: 8.5px; margin-top: 2px;">
              ${customer.gstin ? `<strong>GSTIN:</strong> ${customer.gstin} | ` : ''}
              ${customer.pan ? `<strong>PAN:</strong> ${customer.pan}` : ''}
            </div>
            ${customer.billingAddress
            ? `
              <div style="font-size: 8.5px; margin-top: 2px;">
                ${customer.billingAddress.addressLine1 || ''}${customer.billingAddress.addressLine2 ? ', ' + customer.billingAddress.addressLine2 : ''}, 
                ${customer.billingAddress.city || ''} ${customer.billingAddress.state || ''} ${customer.billingAddress.postalCode ? '- ' + customer.billingAddress.postalCode : ''}
              </div>
            `
            : ''}
            ${customer.phone || customer.email
            ? `
              <div style="font-size: 8.5px; margin-top: 1px;">
                ${customer.phone ? `Phone: ${customer.phone} ` : ''}
                ${customer.email ? `| Email: ${customer.email}` : ''}
              </div>
            `
            : ''}
          </td>
          <td style="width: 45%;">
            <div style="font-size: 8px; text-transform: uppercase; color: #555555; font-weight: bold;">Account Summary Details:</div>
            <div style="margin-top: 2px;">Credit Terms: <strong>${customer.paymentTermsDays} Days Net</strong></div>
            <div>Approved Credit Limit: <strong>${customer.creditLimit ? `₹ ${customer.creditLimit.toLocaleString('en-IN')}` : 'Standard / Open'}</strong></div>
            <div>Total Transactions: <strong>${summary.totalTransactions} Records</strong></div>
            ${summary.daysOverdue > 0 ? `<div style="color: #b91c1c; font-weight: bold; margin-top: 2px;">Oldest Overdue: ${summary.daysOverdue} Days Matured</div>` : ''}
            ${options?.customNotes ? `<div style="margin-top: 4px; padding: 4px; background: #fffbeb; border: 1px solid #000000; font-size: 8.5px;"><strong>Note:</strong> ${options.customNotes}</div>` : ''}
          </td>
        </tr>
      </table>

      <!-- Executive Financial KPI Summary Box -->
      <table class="kpi-table">
        <thead>
          <tr>
            <th style="width: 20%;">Opening Balance</th>
            <th style="width: 20%;">Total Invoiced (Debits)</th>
            <th style="width: 20%;">Total Received (Credits)</th>
            <th style="width: 20%;">Net Closing Balance</th>
            <th style="width: 20%;">Matured Overdue Dues</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>₹ ${summary.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>₹ ${summary.periodDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="color: #15803d;">₹ ${summary.periodCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="color: ${summary.closingBalance > 0 ? '#b45309' : '#15803d'};">
              ₹ ${summary.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <span style="font-size: 8.5px; font-weight: normal;">${summary.closingBalance > 0 ? 'Dr' : summary.closingBalance < 0 ? 'Cr' : ''}</span>
            </td>
            <td style="color: ${summary.overdueAmount > 0 ? '#b91c1c' : '#000000'};">₹ ${summary.overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <!-- Chronological Ledger Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 28px; text-align: center;">#</th>
            <th style="width: 68px; text-align: center;">Date</th>
            <th style="width: 120px;">Voucher / Ref #</th>
            <th>Particulars / Transaction Description</th>
            <th style="width: 68px; text-align: center;">Due Date</th>
            <th style="width: 78px; text-align: right;">Debit (₹)</th>
            <th style="width: 78px; text-align: right;">Credit (₹)</th>
            <th style="width: 88px; text-align: right;">Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="8" style="text-align: center; padding: 16px; color: #555555;">No transactions recorded for this period.</td></tr>`}
          <!-- Summary Totals Row -->
          <tr style="background: #f4f4f5; font-weight: bold; border-top: 1.5px solid #000000;">
            <td colspan="5" style="text-align: right; text-transform: uppercase; font-size: 9px; padding: 5px 6px;">Closing Net Balance:</td>
            <td style="text-align: right; font-family: monospace;">₹ ${summary.periodDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: right; font-family: monospace; color: #15803d;">₹ ${summary.periodCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: right; font-family: monospace; font-size: 10px; color: ${summary.closingBalance > 0 ? '#b45309' : '#15803d'};">
              ₹ ${summary.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      ${balanceInWords ? `<p style="margin: 2px 0 6px 0; font-size: 8.5px; font-style: italic;">Closing Balance in Words: <strong>${balanceInWords}</strong></p>` : ''}

      <!-- Entity Bank Accounts & Remittance Info (Company Settings) -->
      <table class="bank-table">
        <thead>
          <tr>
            <th colspan="4">Official Corporate Remittance Coordinates (From Company Settings)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="width: 25%;"><strong>Beneficiary Name:</strong><br/>${companyLegalName}</td>
            <td style="width: 25%;"><strong>Bank Name:</strong><br/>${bankAccount.bankName}</td>
            <td style="width: 25%;"><strong>Account Number:</strong><br/><span style="font-family: monospace; font-size: 10.5px; font-weight: bold;">${bankAccount.accountNumber}</span></td>
            <td style="width: 25%;"><strong>IFSC Code:</strong><br/><span style="font-family: monospace; font-size: 10.5px; font-weight: bold;">${bankAccount.ifscCode || '-'}</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>Branch &amp; Depot Address:</strong><br/>${bankAccount.branch || '-'}</td>
            <td><strong>SWIFT Code:</strong><br/>${bankAccount.swiftCode || '-'}</td>
            <td><strong>Payment Advice Email:</strong><br/>accounts@pacificproduct.in</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sign-off Block -->
    <table class="sign-table">
      <tr>
        <td style="width: 55%; font-size: 8px; color: #444444; vertical-align: bottom;">
          <div>• Please remit payments via RTGS/NEFT to the verified corporate bank account above.</div>
          <div>• Quote the Customer Name / Statement Date on payment transaction advice.</div>
          <div>• Email transaction UTR slip to accounts@pacificproduct.in for immediate allocation.</div>
          <div style="margin-top: 4px; font-style: italic;">Certified system-generated Statement of Account issued by Pacific Restroom Cubicle Enterprise ERP.</div>
        </td>
        <td style="width: 45%; text-align: right; vertical-align: bottom;">
          <div style="font-size: 9px; font-weight: bold;">For ${companyLegalName}</div>
          <div style="height: 50px; display: flex; align-items: flex-end; justify-content: flex-end;">
            ${signatory?.signatureUrl ? `<img src="${signatory.signatureUrl}" height="46" alt="Signature" style="object-fit: contain;" />` : '<div style="height: 35px;"></div>'}
          </div>
          <div style="font-size: 9.5px; font-weight: bold; border-top: 1px solid #000000; display: inline-block; padding-top: 2px;">
            ${signatory?.name || 'Ejajul Shaikh'}
          </div>
          <div style="font-size: 8px; color: #444444;">${signatory?.designation || 'Company Head / Authorized Signatory'}</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`.trim();
    },
    /**
     * Dispatches the Statement of Account / Ledger to the customer via Email
     * and records an audit log entry.
     */
    async sendCustomerLedgerEmail(customerId, options, userId) {
        const ledger = await this.getCustomerLedger(customerId);
        const { customer, summary } = ledger;
        // Resolve recipients
        const toRecipients = [];
        if (options.to) {
            if (Array.isArray(options.to))
                toRecipients.push(...options.to);
            else
                toRecipients.push(options.to);
        }
        else {
            if (customer.email)
                toRecipients.push(customer.email);
            if (customer.primaryContact?.email && !toRecipients.includes(customer.primaryContact.email)) {
                toRecipients.push(customer.primaryContact.email);
            }
        }
        if (toRecipients.length === 0) {
            throw new Error(`Customer "${customer.legalName}" does not have an email address registered.`);
        }
        const stage = options.stage || (summary.overdueAmount > 0 ? 'REMINDER_1' : 'STATEMENT');
        // Build stage-specific subject and narrative
        let subject = options.subject;
        let stageTitle = 'Statement of Account';
        let defaultNote = options.notes;
        if (!subject) {
            switch (stage) {
                case 'REMINDER_1':
                    subject = `[Payment Reminder] Outstanding Account Statement — ${customer.legalName}`;
                    stageTitle = '1st Payment Reminder';
                    defaultNote = defaultNote || `Dear Customer, this is a friendly reminder that invoices totaling ₹ ${summary.overdueAmount.toLocaleString('en-IN')} have matured under your ${customer.paymentTermsDays}-day payment terms. Kindly review the attached statement and arrange payment.`;
                    break;
                case 'REMINDER_2':
                    subject = `[2nd Follow-up] Urgent: Pending Payment Statement — ${customer.legalName}`;
                    stageTitle = '2nd Payment Reminder';
                    defaultNote = defaultNote || `Dear Customer, following up on our previous communication, your overdue balance of ₹ ${summary.overdueAmount.toLocaleString('en-IN')} remains unpaid. We request you to share the expected remittance date or transaction UTR.`;
                    break;
                case 'REMINDER_3':
                    subject = `[3rd Notice] Critical: Overdue Account Follow-up — ${customer.legalName}`;
                    stageTitle = '3rd Overdue Notice';
                    defaultNote = defaultNote || `Dear Customer, despite prior reminders, invoices totaling ₹ ${summary.overdueAmount.toLocaleString('en-IN')} are critically overdue. Please settle this amount immediately to ensure uninterrupted dispatches and project coordination.`;
                    break;
                case 'FINAL_NOTICE':
                    subject = `[FINAL DEMAND NOTICE] Immediate Settlement Required — ${customer.legalName}`;
                    stageTitle = 'Final Demand Notice';
                    defaultNote = defaultNote || `DEMAND NOTICE: Your account with Pacific Products & Solutions has an outstanding overdue balance of ₹ ${summary.overdueAmount.toLocaleString('en-IN')}. Please arrange payment within 24 hours to avoid suspension of credit facilities and administrative escalation.`;
                    break;
                default:
                    subject = `Statement of Account — ${customer.legalName} [Pacific Products & Solutions]`;
                    stageTitle = 'Statement of Account';
                    defaultNote = defaultNote || `Please find attached your updated Statement of Account with all credit, debit, and running balance records to date.`;
                    break;
            }
        }
        const htmlContent = this.generateLedgerHtml(ledger, {
            customNotes: defaultNote,
            stageTitle,
        });
        // Send email via resilient curl/Resend service
        const emailResult = await email_service_1.emailService.sendEmail({
            to: toRecipients,
            subject,
            html: htmlContent,
            replyTo: 'info@pacificproduct.in',
        });
        if (!emailResult.success) {
            throw new Error(`Failed to send email: ${emailResult.error}`);
        }
        // Upsert or retrieve PaymentFollowup
        let followup = await database_1.prisma.paymentFollowup.findFirst({
            where: { customerId },
        });
        if (!followup) {
            followup = await database_1.prisma.paymentFollowup.create({
                data: {
                    customerId,
                    outstandingAmount: summary.closingBalance,
                    dueDate: summary.earliestDueDate ? new Date(summary.earliestDueDate) : undefined,
                    followupStatus: summary.closingBalance > 0 ? (stage === 'FINAL_NOTICE' ? 'DISPUTED' : 'PENDING') : 'RESOLVED',
                    priority: summary.overdueAmount > 50000 ? 'HIGH' : 'MEDIUM',
                    communicationChannel: 'EMAIL',
                    notes: defaultNote,
                },
            });
        }
        else {
            await database_1.prisma.paymentFollowup.update({
                where: { id: followup.id },
                data: {
                    outstandingAmount: summary.closingBalance,
                    dueDate: summary.earliestDueDate ? new Date(summary.earliestDueDate) : undefined,
                    followupStatus: stage === 'FINAL_NOTICE' ? 'DISPUTED' : followup.followupStatus,
                    notes: defaultNote,
                },
            });
        }
        // Record immutable Follow-up Log entry
        const log = await database_1.prisma.paymentFollowupLog.create({
            data: {
                followupId: followup.id,
                userId: userId || undefined,
                notes: `[${stage}] Sent Statement to ${toRecipients.join(', ')}. Subject: "${subject}". Outstanding: ₹ ${summary.closingBalance.toLocaleString('en-IN')}. Note: ${defaultNote}`,
                response: `Email delivered via Resend (ID: ${emailResult.id || 'ok'})`,
            },
        });
        await audit_service_1.auditService.log({
            userId,
            action: 'UPDATE',
            module: 'Finance',
            entityType: 'PaymentFollowup',
            entityId: followup.id,
            newData: { stage, toRecipients, subject, closingBalance: summary.closingBalance },
        });
        return {
            success: true,
            emailId: emailResult.id,
            recipients: toRecipients,
            stage,
            log,
            followup,
        };
    },
    /**
     * Automated Overdue Cadence Engine:
     * Evaluates all customers with overdue balances.
     * Cadence:
     * - Day 1 Overdue -> Auto-Reminder 1
     * - 3 Consecutive Days after Reminder 1 -> Auto-Reminder 2
     * - 3 Consecutive Days after Reminder 2 -> Auto-Reminder 3
     * - 3 Consecutive Days after Reminder 3 -> Final Notice
     * - 3 Consecutive Days after Final Notice -> Flag for Manual Executive Follow-up
     */
    async runPaymentOverdueCadence() {
        const customers = await database_1.prisma.businessParty.findMany({
            where: {
                partyType: 'CUSTOMER',
                status: 'ACTIVE',
            },
            select: { id: true, legalName: true, email: true },
        });
        const results = {
            evaluatedCount: customers.length,
            remindersSent: 0,
            escalatedCount: 0,
            skippedCount: 0,
            details: [],
        };
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        for (const cust of customers) {
            try {
                const ledger = await this.getCustomerLedger(cust.id);
                const { summary, cadence } = ledger;
                // Skip if no balance or not overdue
                if (summary.closingBalance <= 0 || summary.overdueAmount <= 0 || summary.daysOverdue < 1) {
                    results.skippedCount++;
                    continue;
                }
                // Check last follow-up log timestamps
                const logs = ledger.logs || [];
                const reminderLogs = logs.filter((l) => l.notes.includes('[AUTO_REMINDER_') ||
                    l.notes.includes('[FINAL_NOTICE]') ||
                    l.notes.includes('[REMINDER_'));
                const lastLog = reminderLogs[0] || null; // ordered by createdAt desc
                const lastLogTime = lastLog ? new Date(lastLog.createdAt).getTime() : 0;
                const daysSinceLastReminder = lastLogTime > 0 ? (now - lastLogTime) / (24 * 60 * 60 * 1000) : 999;
                // Determine appropriate stage
                if (!lastLog) {
                    // Never sent a reminder -> Send Auto-Reminder 1
                    await this.sendCustomerLedgerEmail(cust.id, {
                        stage: 'REMINDER_1',
                    });
                    results.remindersSent++;
                    results.details.push({ customer: cust.legalName, action: 'SENT', stage: 'REMINDER_1' });
                }
                else if (lastLog.notes.includes('REMINDER_1') && daysSinceLastReminder >= 3) {
                    // 3 consecutive days after Reminder 1 -> Send Auto-Reminder 2
                    await this.sendCustomerLedgerEmail(cust.id, {
                        stage: 'REMINDER_2',
                    });
                    results.remindersSent++;
                    results.details.push({ customer: cust.legalName, action: 'SENT', stage: 'REMINDER_2' });
                }
                else if (lastLog.notes.includes('REMINDER_2') && daysSinceLastReminder >= 3) {
                    // 3 consecutive days after Reminder 2 -> Send Auto-Reminder 3
                    await this.sendCustomerLedgerEmail(cust.id, {
                        stage: 'REMINDER_3',
                    });
                    results.remindersSent++;
                    results.details.push({ customer: cust.legalName, action: 'SENT', stage: 'REMINDER_3' });
                }
                else if (lastLog.notes.includes('REMINDER_3') && daysSinceLastReminder >= 3) {
                    // 3 consecutive days after Reminder 3 -> Send Final Notice
                    await this.sendCustomerLedgerEmail(cust.id, {
                        stage: 'FINAL_NOTICE',
                    });
                    results.remindersSent++;
                    results.details.push({ customer: cust.legalName, action: 'SENT', stage: 'FINAL_NOTICE' });
                }
                else if (lastLog.notes.includes('FINAL_NOTICE') && daysSinceLastReminder >= 3) {
                    // 3 consecutive days after Final Notice -> Transition to Manual Follow-up
                    let followup = await database_1.prisma.paymentFollowup.findFirst({ where: { customerId: cust.id } });
                    if (followup) {
                        await database_1.prisma.paymentFollowup.update({
                            where: { id: followup.id },
                            data: {
                                priority: 'URGENT',
                                followupStatus: 'CONTACTED',
                                communicationChannel: 'PHONE',
                            },
                        });
                        await database_1.prisma.paymentFollowupLog.create({
                            data: {
                                followupId: followup.id,
                                notes: `[MANUAL_FOLLOWUP] Account escalated to executive manual follow-up after completing all 4 automated reminder intervals. Direct phone call or site visit required.`,
                                response: 'Pending Executive Touchpoint',
                            },
                        });
                    }
                    results.escalatedCount++;
                    results.details.push({
                        customer: cust.legalName,
                        action: 'ESCALATED',
                        stage: 'MANUAL_FOLLOWUP',
                        note: 'All 4 reminders exhausted; manual follow-up required',
                    });
                }
                else {
                    results.skippedCount++;
                    results.details.push({
                        customer: cust.legalName,
                        action: 'WAITING_CADENCE',
                        note: `Waiting for 3-day interval (${daysSinceLastReminder.toFixed(1)} days elapsed)`,
                    });
                }
            }
            catch (err) {
                console.error(`Cadence error for customer ${cust.legalName}:`, err.message);
                results.details.push({
                    customer: cust.legalName,
                    action: 'ERROR',
                    note: err.message,
                });
            }
        }
        return results;
    },
    /**
     * Logs a manual follow-up touchpoint (Phone call, WhatsApp, in-person visit, promise to pay).
     */
    async logFollowupTouchpoint(customerId, data, userId) {
        let followup = await database_1.prisma.paymentFollowup.findFirst({
            where: { customerId },
        });
        const ledger = await this.getCustomerLedger(customerId);
        if (!followup) {
            followup = await database_1.prisma.paymentFollowup.create({
                data: {
                    customerId,
                    outstandingAmount: ledger.summary.closingBalance,
                    dueDate: ledger.summary.earliestDueDate ? new Date(ledger.summary.earliestDueDate) : undefined,
                    followupStatus: data.followupStatus || (data.promisedAmount ? 'PROMISED_TO_PAY' : 'CONTACTED'),
                    priority: data.promisedAmount ? 'MEDIUM' : 'HIGH',
                    communicationChannel: data.channel,
                    promisedPaymentDate: data.promisedPaymentDate ? new Date(data.promisedPaymentDate) : undefined,
                    promisedAmount: data.promisedAmount !== undefined ? Number(data.promisedAmount) : undefined,
                    nextFollowupDate: data.nextFollowupDate ? new Date(data.nextFollowupDate) : undefined,
                    notes: data.notes,
                },
            });
        }
        else {
            followup = await database_1.prisma.paymentFollowup.update({
                where: { id: followup.id },
                data: {
                    outstandingAmount: ledger.summary.closingBalance,
                    dueDate: ledger.summary.earliestDueDate ? new Date(ledger.summary.earliestDueDate) : undefined,
                    followupStatus: data.followupStatus || (data.promisedAmount ? 'PROMISED_TO_PAY' : 'CONTACTED'),
                    communicationChannel: data.channel,
                    promisedPaymentDate: data.promisedPaymentDate ? new Date(data.promisedPaymentDate) : followup.promisedPaymentDate,
                    promisedAmount: data.promisedAmount !== undefined ? Number(data.promisedAmount) : followup.promisedAmount,
                    nextFollowupDate: data.nextFollowupDate ? new Date(data.nextFollowupDate) : followup.nextFollowupDate,
                    notes: data.notes,
                },
            });
        }
        const log = await database_1.prisma.paymentFollowupLog.create({
            data: {
                followupId: followup.id,
                userId,
                notes: `[${data.channel}] ${data.notes}${data.promisedAmount ? ` | Promised: ₹ ${Number(data.promisedAmount).toLocaleString('en-IN')} on ${data.promisedPaymentDate || 'N/A'}` : ''}`,
                response: data.customerResponse || 'Logged',
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        return {
            followup,
            log,
        };
    },
};
//# sourceMappingURL=ledger.service.js.map