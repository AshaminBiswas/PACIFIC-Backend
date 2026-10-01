import { prisma } from '../../config/database';
import { pdfService } from '../pdf/pdf.service';
import { qrService } from '../qr/qr.service';

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const nextYear = (parseInt(year) + 1).toString();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PPS/INV/${year}-${nextYear}/${rand}`;
}

export const invoicesService = {
  async list(query: { page: number; limit: number; status?: string; orderId?: string }) {
    const { page, limit, status, orderId } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (orderId) where.orderId = orderId;

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          quotation: { include: { lead: true } },
          project: true,
          order: { include: { customer: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        quotation: { include: { items: true, lead: true } },
        project: true,
        order: {
          include: {
            customer: { include: { addresses: true, contacts: true } },
            companyProfile: { include: { bankAccounts: true, addresses: true, signatories: true } },
            items: true,
          },
        },
      },
    });
    if (!invoice) throw Object.assign(new Error('Invoice not found'), { status: 404 });
    return invoice;
  },

  async create(data: any) {
    return prisma.invoice.create({
      data: { ...data, invoiceNumber: data.invoiceNumber || generateInvoiceNumber(), status: data.status || 'DRAFT' },
    });
  },

  /**
   * Generates a formal GST Tax Invoice / Bill from an approved Sales Order.
   * If an invoice already exists for this order, returns it instead of creating a duplicate.
   */
  async createFromOrder(orderId: string, userId?: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: { customer: true, items: true },
    });
    if (!order) throw Object.assign(new Error('Sales Order not found'), { status: 404 });

    // Return existing invoice if one already exists for this order
    const existing = await prisma.invoice.findFirst({ where: { orderId: order.id } });
    if (existing) return existing;

    const invoiceNumber = generateInvoiceNumber();

    // Do NOT set quotationId here — it has a @unique constraint and may already be used
    // by a legacy invoice created directly from the quotation. orderId is the correct link.
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: order.id,
        proformaInvoiceId: order.proformaInvoiceId || null,
        // quotationId intentionally omitted to avoid @unique constraint conflicts
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        totalAmount: order.grandTotal,
        currency: order.currency || 'INR',
        status: 'DRAFT',
        notes: `Tax invoice generated from Sales Order ${order.orderNumber}`,
      },
      include: {
        order: {
          include: { customer: true, companyProfile: true, items: true },
        },
      },
    });

    return invoice;
  },


  /**
   * Generates vector A4 GST Tax Invoice PDF HTML with statutory compliance and distinct Tax Invoice T&Cs
   */
  async getPdfHtml(id: string): Promise<string> {
    const invoice = await this.getById(id);
    const order = invoice.order as any;
    const company = order?.companyProfile as any;
    const customer = order?.customer as any;
    const billingSnapshot = (order?.billingAddressSnapshot as any) || {};
    const shippingSnapshot = (order?.shippingAddressSnapshot as any) || {};
    const shippingAddr = customer?.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping);
    const deliveryAddress = order?.siteAddress || shippingSnapshot?.address || (shippingAddr ? [shippingAddr.addressLine1, shippingAddr.addressLine2, shippingAddr.city, shippingAddr.state, shippingAddr.postalCode].filter(Boolean).join(', ') : undefined);

    const qr = await qrService.getOrCreateDocumentQr({
      documentType: 'INVOICE',
      documentId: invoice.id,
      documentNumber: invoice.invoiceNumber,
      companyName: company?.companyName || 'Pacific Restroom Cubicle',
      partyName: customer?.legalName || 'Valued Customer',
      date: invoice.issueDate.toISOString(),
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency || 'INR',
      status: invoice.status,
    });

    const primaryBank = company?.bankAccounts?.find((b: any) => b.isDefault) || company?.bankAccounts?.[0];
    const signatories = company?.signatories || [];
    const authSignatory = signatories.find((s: any) => s.isDefault && s.signatureUrl) || signatories[0];

    const items = order?.items?.length
      ? order.items.map((it: any, idx: number) => ({
          serialNumber: it.serialNumber || idx + 1,
          description: it.description,
          hsnSac: '9403',
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0,
          amount: Number(it.amount) || (Number(it.quantity) * Number(it.rate)),
          gstRate: 18,
        }))
      : [
          {
            serialNumber: 1,
            description: invoice.notes || 'Restroom Cubicle Supply & Installation',
            hsnSac: '9403',
            quantity: 1,
            rate: Number(invoice.subtotal),
            amount: Number(invoice.subtotal),
            gstRate: 18,
          },
        ];

    return pdfService.generateTaxInvoicePdfHtml({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : undefined,
      companyName: company?.companyName || 'Pacific Panels Systems Pvt. Ltd.',
      companyAddress: company?.addresses?.[0]?.addressLine1 || 'H-3, JR Complex, Mandoli, New Delhi - 110093',
      companyPhone: company?.phone || '+91-98100-XXXXX',
      companyEmail: company?.email || 'accounts@pacificcubicles.com',
      companyGstin: company?.gstin || '07CIJPS1392A2Z9',
      companyPan: company?.pan || 'CIJPS1392A',
      logoUrl: company?.logoUrl || undefined,
      qrDataUrl: qr?.qrDataUrl || undefined,
      customerName: customer?.legalName || billingSnapshot?.partyName || 'Customer Consignee',
      customerGstin: customer?.gstin || billingSnapshot?.gstin || undefined,
      customerAddress: billingSnapshot?.address || customer?.addresses?.[0]?.addressLine1 || undefined,
      consigneeName: customer?.legalName || billingSnapshot?.partyName || 'Customer Consignee',
      deliveryAddress,
      placeOfSupply: billingSnapshot?.state || customer?.addresses?.[0]?.state || 'Delhi (07)',
      orderNumber: order?.orderNumber || undefined,
      piNumber: order?.piNumber || undefined,
      installationCharge: (invoice as any).installationCharge ? Number((invoice as any).installationCharge) : (order?.installationCharge ? Number(order.installationCharge) : undefined),
      installationRatePerCubicle: (invoice as any).installationRatePerCubicle ? Number((invoice as any).installationRatePerCubicle) : (order?.installationRatePerCubicle ? Number(order.installationRatePerCubicle) : undefined),
      installationCubicleCount: (invoice as any).installationCubicleCount ? Number((invoice as any).installationCubicleCount) : (order?.installationCubicleCount ? Number(order.installationCubicleCount) : undefined),
      items,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      grandTotal: Number(invoice.totalAmount),
      currency: invoice.currency || 'INR',
      status: invoice.status,
      bankDetails: primaryBank
        ? {
            bankName: primaryBank.bankName,
            accountNumber: primaryBank.accountNumber,
            ifscCode: primaryBank.ifscCode,
            branchName: primaryBank.branchName || undefined,
          }
        : undefined,
      signatureUrl: authSignatory?.signatureUrl || company?.signatureUrl || undefined,
      signatoryName: authSignatory?.name || undefined,
    });
  },

  async update(id: string, data: any) {
    return prisma.invoice.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.invoice.delete({ where: { id } });
  },
};
