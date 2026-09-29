"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crmService = void 0;
const database_1 = require("../../config/database");
const audit_service_1 = require("../audit/audit.service");
exports.crmService = {
    async listCustomers(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const where = {
            partyType: { in: ['CUSTOMER', 'BOTH'] },
            exportCustomerProfile: null, // Strictly domestic B2B customers
            status: { not: 'DELETED' },
        };
        if (query.status && query.status !== 'ALL')
            where.status = query.status;
        if (query.search) {
            where.OR = [
                { legalName: { contains: query.search, mode: 'insensitive' } },
                { tradeName: { contains: query.search, mode: 'insensitive' } },
                { gstin: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        try {
            const [items, total] = await Promise.all([
                database_1.prisma.businessParty.findMany({
                    where,
                    include: {
                        customerProfile: true,
                        contacts: true,
                        addresses: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                database_1.prisma.businessParty.count({ where }),
            ]);
            return {
                items,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (err) {
            console.warn(`[crmService.listCustomers] Query failed, retrying once: ${err.message}`);
            await new Promise((resolve) => setTimeout(resolve, 500));
            const [items, total] = await Promise.all([
                database_1.prisma.businessParty.findMany({
                    where,
                    include: {
                        customerProfile: true,
                        contacts: true,
                        addresses: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                database_1.prisma.businessParty.count({ where }),
            ]);
            return {
                items,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }
    },
    async getCustomerById(id) {
        const customer = await database_1.prisma.businessParty.findUnique({
            where: { id },
            include: {
                customerProfile: true,
                contacts: true,
                addresses: true,
                proformaInvoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 10,
                },
                followups: {
                    orderBy: { nextFollowupDate: 'asc' },
                },
            },
        });
        if (!customer)
            throw Object.assign(new Error('Customer not found'), { status: 404 });
        return customer;
    },
    /**
     * Customer 360: Aggregates real-time financial balances, orders, quotations,
     * packing lists, and builds a unified chronological timeline across all 5 modules.
     */
    async getCustomer360(id) {
        const customer = await this.getCustomerById(id);
        // 1. Proforma Invoices
        const pis = await database_1.prisma.proformaInvoice.findMany({
            where: { customerId: id },
            include: { paymentAllocations: true },
            orderBy: { piDate: 'desc' },
        });
        // 2. Sales Quotations
        const quotations = await database_1.prisma.salesQuotation.findMany({
            where: { customerId: id },
            orderBy: { date: 'desc' },
        });
        // 3. Central Sales Orders
        const orders = await database_1.prisma.salesOrder.findMany({
            where: { customerId: id },
            include: { items: true },
            orderBy: { orderDate: 'desc' },
        });
        // 4. Packing Lists
        const packingLists = await database_1.prisma.packingList.findMany({
            where: { customerId: id },
            orderBy: { date: 'desc' },
        });
        // 5. Hardware Issue Lists
        const hardwareIssues = await database_1.prisma.hardwareIssueList.findMany({
            where: { customerId: id },
            orderBy: { date: 'desc' },
        });
        // 6. Payments
        const payments = await database_1.prisma.payment.findMany({
            where: { partyId: id, paymentType: { in: ['CUSTOMER_PAYMENT', 'ADVANCE'] } },
            orderBy: { paymentDate: 'desc' },
        });
        // 7. Active Followups
        const followups = await database_1.prisma.paymentFollowup.findMany({
            where: { customerId: id },
            include: { logs: true, reminders: true },
            orderBy: { nextFollowupDate: 'asc' },
        });
        // Compute aggregate KPIs synchronized with Ledger Service
        const linkedOrderIds = new Set();
        pis.forEach((pi) => {
            if (pi.orderId)
                linkedOrderIds.add(pi.orderId);
        });
        let totalInvoiced = 0;
        let openInvoicesCount = 0;
        pis.forEach((pi) => {
            if (pi.status !== 'CANCELLED') {
                const grandTotal = Number(pi.grandTotal) || 0;
                totalInvoiced += grandTotal;
                if (['ISSUED', 'DRAFT'].includes(pi.status)) {
                    openInvoicesCount++;
                }
            }
        });
        // Also include direct sales orders that do not have a preceding PI
        orders.forEach((so) => {
            if (so.status !== 'CANCELLED' && !linkedOrderIds.has(so.id) && !so.proformaInvoiceId) {
                totalInvoiced += Number(so.grandTotal) || 0;
            }
        });
        let totalPaid = 0;
        payments.forEach((p) => {
            totalPaid += Number(p.amount) || 0;
        });
        const totalQuotedValue = quotations.reduce((sum, q) => sum + Number(q.grandTotal), 0);
        const totalOrderedValue = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
        const totalDispatchedValue = packingLists.reduce((sum, pl) => sum + Number(pl.totalQuantity), 0);
        const convertedQuotes = quotations.filter((q) => q.status === 'CONVERTED').length;
        const conversionRatePercent = quotations.length > 0
            ? Math.round((convertedQuotes / quotations.length) * 100)
            : 0;
        const outstandingBalance = Math.max(0, totalInvoiced - totalPaid);
        const advanceBalance = Math.max(0, totalPaid - totalInvoiced);
        const netBalance = Math.round((totalInvoiced - totalPaid) * 100) / 100;
        // Build Unified Cross-Module Chronological Timeline
        const timeline = [];
        quotations.forEach((q) => {
            timeline.push({
                type: 'QUOTATION',
                id: q.id,
                referenceNumber: q.referenceNumber,
                title: `Quotation: ${q.projectName}`,
                date: q.date.toISOString(),
                status: q.status,
                amount: Number(q.grandTotal),
            });
        });
        orders.forEach((o) => {
            timeline.push({
                type: 'ORDER',
                id: o.id,
                referenceNumber: o.orderNumber,
                title: `Sales Order (${o.source})`,
                date: o.orderDate.toISOString(),
                status: o.status,
                amount: Number(o.grandTotal),
            });
        });
        pis.forEach((pi) => {
            timeline.push({
                type: 'PI',
                id: pi.id,
                referenceNumber: pi.piNumber,
                title: `Proforma Invoice`,
                date: pi.piDate.toISOString(),
                status: pi.status,
                amount: Number(pi.grandTotal),
            });
        });
        packingLists.forEach((pl) => {
            timeline.push({
                type: 'PACKING_LIST',
                id: pl.id,
                referenceNumber: pl.packingListNumber,
                title: `Dispatch Packing List`,
                date: pl.date.toISOString(),
                status: pl.receiptStatus,
            });
        });
        hardwareIssues.forEach((hi) => {
            timeline.push({
                type: 'HARDWARE_ISSUE',
                id: hi.id,
                referenceNumber: hi.issueNumber,
                title: `Hardware Store Issue`,
                date: hi.date.toISOString(),
                status: hi.status,
            });
        });
        payments.forEach((p) => {
            timeline.push({
                type: 'PAYMENT',
                id: p.id,
                referenceNumber: p.referenceNumber || 'PAYMENT',
                title: `Payment Receipt (${p.paymentMethod})`,
                date: p.paymentDate.toISOString(),
                status: p.status,
                amount: Number(p.amount),
            });
        });
        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
            customer,
            kpis: {
                totalQuotedValue,
                totalOrderedValue,
                totalDispatchedValue,
                totalInvoiced,
                totalPaid,
                outstandingBalance,
                advanceBalance,
                netBalance,
                overdueBalance: outstandingBalance,
                openInvoicesCount,
                conversionRatePercent,
                lastPurchaseDate: pis[0]?.piDate || orders[0]?.orderDate || null,
                lastPaymentDate: payments[0]?.paymentDate || null,
            },
            recentProformaInvoices: pis.slice(0, 5),
            recentOrders: orders.slice(0, 5),
            recentQuotations: quotations.slice(0, 5),
            recentPackingLists: packingLists.slice(0, 5),
            recentPayments: payments.slice(0, 5),
            activeFollowups: followups,
            timeline,
        };
    },
    /**
     * Deduplication check on customer creation/edit
     */
    async checkDuplicates(data) {
        const conditions = [];
        if (data.gstin && data.gstin.trim()) {
            conditions.push({ gstin: { equals: data.gstin.trim(), mode: 'insensitive' } });
        }
        if (data.phone && data.phone.trim()) {
            conditions.push({ phone: { contains: data.phone.trim() } });
        }
        if (data.legalName && data.legalName.trim().length >= 4) {
            conditions.push({ legalName: { contains: data.legalName.trim(), mode: 'insensitive' } });
        }
        if (conditions.length === 0)
            return [];
        const where = {
            partyType: { in: ['CUSTOMER', 'BOTH'] },
            exportCustomerProfile: null,
            OR: conditions,
        };
        if (data.excludeId) {
            where.id = { not: data.excludeId };
        }
        const matches = await database_1.prisma.businessParty.findMany({
            where,
            include: { addresses: true, contacts: true },
            take: 5,
        });
        return matches;
    },
    /**
     * Merge tool: Consolidates duplicate customer records into a canonical record,
     * re-pointing all Quotations, Orders, PIs, Packing Lists, Hardware Issues, Payments,
     * and Contacts.
     */
    async mergeCustomers(canonicalCustomerId, mergedCustomerId, reason, userId) {
        if (canonicalCustomerId === mergedCustomerId) {
            throw new Error('Canonical customer and duplicate customer cannot be the same record.');
        }
        const canonical = await database_1.prisma.businessParty.findUnique({ where: { id: canonicalCustomerId } });
        const duplicate = await database_1.prisma.businessParty.findUnique({
            where: { id: mergedCustomerId },
            include: { contacts: true, addresses: true },
        });
        if (!canonical || !duplicate) {
            throw new Error('Both canonical and duplicate customer records must exist.');
        }
        return database_1.prisma.$transaction(async (tx) => {
            // 1. Re-link Sales Quotations
            await tx.salesQuotation.updateMany({
                where: { customerId: mergedCustomerId },
                data: { customerId: canonicalCustomerId },
            });
            // 2. Re-link Sales Orders
            await tx.salesOrder.updateMany({
                where: { customerId: mergedCustomerId },
                data: { customerId: canonicalCustomerId },
            });
            // 3. Re-link Proforma Invoices
            await tx.proformaInvoice.updateMany({
                where: { customerId: mergedCustomerId },
                data: { customerId: canonicalCustomerId },
            });
            // 4. Re-link Packing Lists
            await tx.packingList.updateMany({
                where: { customerId: mergedCustomerId },
                data: { customerId: canonicalCustomerId },
            });
            // 5. Re-link Hardware Issues
            await tx.hardwareIssueList.updateMany({
                where: { customerId: mergedCustomerId },
                data: { customerId: canonicalCustomerId },
            });
            // 6. Re-link Payments & Followups
            await tx.payment.updateMany({
                where: { partyId: mergedCustomerId },
                data: { partyId: canonicalCustomerId },
            });
            await tx.paymentFollowup.updateMany({
                where: { customerId: mergedCustomerId },
                data: { customerId: canonicalCustomerId },
            });
            // 7. Re-link Contacts and Addresses
            await tx.partyContact.updateMany({
                where: { partyId: mergedCustomerId },
                data: { partyId: canonicalCustomerId },
            });
            await tx.partyAddress.updateMany({
                where: { partyId: mergedCustomerId },
                data: { partyId: canonicalCustomerId },
            });
            // 8. Log the merge in customer_merge_logs
            await tx.customerMergeLog.create({
                data: {
                    canonicalCustomerId,
                    mergedCustomerId,
                    mergedCustomerData: duplicate,
                    performedByUserId: userId || null,
                    reason: reason || 'Consolidated duplicate customer profile',
                },
            });
            // 9. Mark merged party as INACTIVE / MERGED
            await tx.businessParty.update({
                where: { id: mergedCustomerId },
                data: {
                    status: 'MERGED',
                    notes: `Merged into canonical customer ${canonical.legalName} (${canonicalCustomerId}) on ${new Date().toISOString()}`,
                },
            });
            if (userId) {
                await audit_service_1.auditService.logMutation({
                    userId,
                    action: 'UPDATE',
                    module: 'CRM',
                    entityType: 'Customer',
                    entityId: canonicalCustomerId,
                    newData: { mergedCustomerId, canonicalCustomerId, reason },
                });
            }
            return {
                success: true,
                canonicalId: canonicalCustomerId,
                mergedId: mergedCustomerId,
            };
        });
    },
    async createCustomer(data, userId) {
        if (!data.legalName || !data.legalName.trim()) {
            throw Object.assign(new Error('Company Legal Name is required'), { status: 400 });
        }
        // 1. Resolve default companyProfileId if not provided
        let companyProfileId = data.companyProfileId;
        if (!companyProfileId) {
            const defaultCompany = await database_1.prisma.companyProfile.findFirst({ select: { id: true } });
            if (defaultCompany)
                companyProfileId = defaultCompany.id;
        }
        // 2. Auto-derive PAN from GSTIN if missing
        const gstin = data.gstin ? data.gstin.toUpperCase().trim() : null;
        let pan = data.pan ? data.pan.toUpperCase().trim() : null;
        if (!pan && gstin && gstin.length === 15) {
            pan = gstin.substring(2, 12);
        }
        // 3. Sanitize creditLimit & paymentTermsDays
        const creditLimit = data.creditLimit !== undefined && data.creditLimit !== null && !isNaN(Number(data.creditLimit))
            ? Number(data.creditLimit)
            : null;
        const paymentTermsDays = data.paymentTermsDays !== undefined && !isNaN(Number(data.paymentTermsDays))
            ? Math.round(Number(data.paymentTermsDays))
            : 30;
        // 4. Sanitize contacts
        const contactsData = [];
        if (Array.isArray(data.contacts)) {
            for (const c of data.contacts) {
                if (!c.name || !c.name.trim())
                    continue;
                contactsData.push({
                    name: c.name.trim(),
                    designation: c.designation || null,
                    department: c.department || null,
                    phone: c.phone || null,
                    email: c.email || null,
                    isPrimary: Boolean(c.isPrimary),
                });
            }
        }
        // 5. Sanitize addresses
        const addressesData = [];
        if (Array.isArray(data.addresses)) {
            for (const a of data.addresses) {
                if (!a.addressLine1 || !a.addressLine1.trim())
                    continue;
                addressesData.push({
                    addressType: a.addressType || 'BILLING',
                    addressLine1: a.addressLine1.trim(),
                    addressLine2: a.addressLine2 || null,
                    city: (a.city && a.city.trim()) || 'Delhi',
                    state: (a.state && a.state.trim()) || 'Delhi',
                    stateCode: a.stateCode || '07',
                    country: a.country || 'India',
                    postalCode: a.postalCode || a.pincode || null,
                    gstin: a.gstin ? a.gstin.toUpperCase().trim() : null,
                    isDefaultBilling: Boolean(a.isDefaultBilling),
                    isDefaultShipping: Boolean(a.isDefaultShipping),
                });
            }
        }
        // 6. Execute atomic single-statement nested write (works with Supabase pgBouncer)
        const party = await database_1.prisma.businessParty.create({
            data: {
                companyProfileId: companyProfileId || null,
                partyType: data.partyType || 'CUSTOMER',
                legalName: data.legalName.trim(),
                tradeName: data.tradeName ? data.tradeName.trim() : data.legalName.trim(),
                gstin: gstin || null,
                pan: pan || null,
                email: data.email ? data.email.trim() : null,
                phone: data.phone ? data.phone.trim() : null,
                status: data.status || 'ACTIVE',
                notes: data.notes || null,
                customerProfile: {
                    create: {
                        customerType: data.customerType || 'CONTRACTOR',
                        creditLimit,
                        paymentTermsDays,
                        status: 'ACTIVE',
                    },
                },
                contacts: contactsData.length > 0 ? { create: contactsData } : undefined,
                addresses: addressesData.length > 0 ? { create: addressesData } : undefined,
            },
            include: {
                customerProfile: true,
                contacts: true,
                addresses: true,
            },
        });
        // 7. Non-blocking audit log
        if (userId) {
            audit_service_1.auditService.logMutation({
                userId,
                action: 'CREATE',
                module: 'CRM',
                entityType: 'Customer',
                entityId: party.id,
                newData: { party },
            }).catch((e) => console.warn('[CRM] Audit log error ignored:', e?.message));
        }
        return party;
    },
    async updateCustomer(id, data, userId) {
        const old = await database_1.prisma.businessParty.findUnique({
            where: { id },
            include: { customerProfile: true, contacts: true, addresses: true },
        });
        if (!old) {
            throw Object.assign(new Error('Customer not found'), { status: 404 });
        }
        const gstin = data.gstin !== undefined ? (data.gstin ? data.gstin.toUpperCase().trim() : null) : old.gstin;
        let pan = data.pan !== undefined ? (data.pan ? data.pan.toUpperCase().trim() : null) : old.pan;
        if (!pan && gstin && gstin.length === 15) {
            pan = gstin.substring(2, 12);
        }
        const party = await database_1.prisma.businessParty.update({
            where: { id },
            data: {
                legalName: data.legalName !== undefined ? data.legalName.trim() : old.legalName,
                tradeName: data.tradeName !== undefined ? data.tradeName.trim() : old.tradeName,
                gstin,
                pan,
                email: data.email !== undefined ? (data.email ? data.email.trim() : null) : old.email,
                phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : old.phone,
                status: data.status !== undefined ? data.status : old.status,
                notes: data.notes !== undefined ? data.notes : old.notes,
            },
        });
        // Update customer profile
        const profileData = {};
        if (data.customerType !== undefined)
            profileData.customerType = data.customerType;
        if (data.creditLimit !== undefined) {
            profileData.creditLimit =
                data.creditLimit !== null && !isNaN(Number(data.creditLimit)) ? Number(data.creditLimit) : null;
        }
        if (data.paymentTermsDays !== undefined) {
            profileData.paymentTermsDays = !isNaN(Number(data.paymentTermsDays)) ? Math.round(Number(data.paymentTermsDays)) : 30;
        }
        if (Object.keys(profileData).length > 0) {
            await database_1.prisma.customerProfile.upsert({
                where: { partyId: id },
                create: {
                    partyId: id,
                    customerType: profileData.customerType || 'CONTRACTOR',
                    creditLimit: profileData.creditLimit,
                    paymentTermsDays: profileData.paymentTermsDays || 30,
                    status: 'ACTIVE',
                },
                update: profileData,
            });
        }
        // Update contacts if provided
        if (Array.isArray(data.contacts)) {
            await database_1.prisma.partyContact.deleteMany({ where: { partyId: id } });
            const contactsToCreate = data.contacts
                .filter((c) => c.name && c.name.trim())
                .map((c) => ({
                partyId: id,
                name: c.name.trim(),
                designation: c.designation || null,
                phone: c.phone || null,
                email: c.email || null,
                isPrimary: Boolean(c.isPrimary),
            }));
            if (contactsToCreate.length > 0) {
                await database_1.prisma.partyContact.createMany({ data: contactsToCreate });
            }
        }
        // Update addresses if provided
        if (Array.isArray(data.addresses)) {
            await database_1.prisma.partyAddress.deleteMany({ where: { partyId: id } });
            const addressesToCreate = data.addresses
                .filter((a) => a.addressLine1 && a.addressLine1.trim())
                .map((a) => ({
                partyId: id,
                addressType: a.addressType || 'BILLING',
                addressLine1: a.addressLine1.trim(),
                addressLine2: a.addressLine2 || null,
                city: (a.city && a.city.trim()) || 'Delhi',
                state: (a.state && a.state.trim()) || 'Delhi',
                stateCode: a.stateCode || '07',
                country: a.country || 'India',
                postalCode: a.postalCode || a.pincode || null,
                gstin: a.gstin ? a.gstin.toUpperCase().trim() : null,
                isDefaultBilling: Boolean(a.isDefaultBilling),
                isDefaultShipping: Boolean(a.isDefaultShipping),
            }));
            if (addressesToCreate.length > 0) {
                await database_1.prisma.partyAddress.createMany({ data: addressesToCreate });
            }
        }
        if (userId) {
            audit_service_1.auditService.logMutation({
                userId,
                action: 'UPDATE',
                module: 'CRM',
                entityType: 'Customer',
                entityId: id,
                oldData: old,
                newData: party,
            }).catch((e) => console.warn('[CRM] Audit log error ignored:', e?.message));
        }
        return database_1.prisma.businessParty.findUnique({
            where: { id },
            include: { customerProfile: true, contacts: true, addresses: true },
        });
    },
    async deleteCustomer(id, userId) {
        const customer = await database_1.prisma.businessParty.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        salesQuotations: true,
                        salesOrders: true,
                        proformaInvoices: true,
                        packingLists: true,
                        hardwareIssues: true,
                        payments: true,
                        followups: true,
                        exportOrders: true,
                        exportQuotations: true,
                    },
                },
            },
        });
        if (!customer) {
            throw Object.assign(new Error('Customer not found'), { status: 404 });
        }
        const counts = customer._count;
        const hasTransactions = (counts?.salesQuotations || 0) > 0 ||
            (counts?.salesOrders || 0) > 0 ||
            (counts?.proformaInvoices || 0) > 0 ||
            (counts?.packingLists || 0) > 0 ||
            (counts?.hardwareIssues || 0) > 0 ||
            (counts?.payments || 0) > 0 ||
            (counts?.followups || 0) > 0 ||
            (counts?.exportOrders || 0) > 0 ||
            (counts?.exportQuotations || 0) > 0;
        if (hasTransactions) {
            // Soft-delete to preserve audit logs and avoid relational RESTRICT errors
            const updated = await database_1.prisma.businessParty.update({
                where: { id },
                data: {
                    status: 'DELETED',
                    notes: `${customer.notes ? customer.notes + ' | ' : ''}Deleted on ${new Date().toISOString()}`,
                },
            });
            if (userId) {
                await audit_service_1.auditService.logMutation({
                    userId,
                    action: 'DELETE',
                    module: 'CRM',
                    entityType: 'Customer',
                    entityId: id,
                    oldData: customer,
                    newData: updated,
                });
            }
            return { success: true, message: 'Customer archived and removed from active list' };
        }
        // Clean delete all child records then parent
        return database_1.prisma.$transaction(async (tx) => {
            await tx.customerMergeLog.deleteMany({
                where: { OR: [{ canonicalCustomerId: id }, { mergedCustomerId: id }] },
            });
            await tx.exportCustomerBankAccount.deleteMany({
                where: { partyId: id },
            });
            await tx.exportCustomerProfile.deleteMany({
                where: { partyId: id },
            });
            await tx.partyContact.deleteMany({
                where: { partyId: id },
            });
            await tx.partyAddress.deleteMany({
                where: { partyId: id },
            });
            await tx.customerProfile.deleteMany({
                where: { partyId: id },
            });
            const deleted = await tx.businessParty.delete({ where: { id } });
            if (userId) {
                await audit_service_1.auditService.logMutation({
                    userId,
                    action: 'DELETE',
                    module: 'CRM',
                    entityType: 'Customer',
                    entityId: id,
                    oldData: customer,
                });
            }
            return deleted;
        });
    },
    async addContact(partyId, contactData) {
        return database_1.prisma.partyContact.create({
            data: { ...contactData, partyId },
        });
    },
    async addAddress(partyId, addressData) {
        return database_1.prisma.partyAddress.create({
            data: { ...addressData, partyId },
        });
    },
};
//# sourceMappingURL=crm.service.js.map