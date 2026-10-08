import { prisma } from '../../config/database';
import { auditService } from '../audit/audit.service';

export const financeService = {
  async listPayments(query: { page?: number; limit?: number; partyId?: string; paymentType?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.partyId) where.partyId = query.partyId;
    if (query.paymentType) where.paymentType = query.paymentType as any;

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          party: true,
          companyProfile: true,
          allocations: {
            include: { proformaInvoice: true },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        party: true,
        companyProfile: true,
        allocations: {
          include: { proformaInvoice: true },
        },
        transactions: true,
      },
    });

    if (!payment) throw Object.assign(new Error('Payment not found'), { status: 404 });
    return payment;
  },

  /**
   * Records an immutable payment and allocates it across specified invoices/documents.
   */
  async recordPayment(data: any, userId?: string) {
    return prisma.$transaction(async (tx) => {
      let companyProfileId = data.companyProfileId;
      if (!companyProfileId) {
        const defaultCompany = await tx.companyProfile.findFirst({ where: { status: 'ACTIVE' } });
        if (!defaultCompany) throw new Error('No active company profile configured');
        companyProfileId = defaultCompany.id;
      }

      const totalAmount = Math.max(0, Number(data.amount) || 0);
      let remainingUnallocated = totalAmount;

      const allocationsToCreate: any[] = [];

      // Process allocations if provided
      if (Array.isArray(data.allocations)) {
        for (const alloc of data.allocations) {
          const allocAmount = Math.min(remainingUnallocated, Math.max(0, Number(alloc.allocatedAmount) || 0));
          if (allocAmount > 0) {
            remainingUnallocated = Math.round((remainingUnallocated - allocAmount) * 100) / 100;

            allocationsToCreate.push({
              documentType: alloc.documentType || 'PI',
              documentId: alloc.documentId,
              proformaInvoiceId: alloc.documentType === 'PI' ? alloc.documentId : undefined,
              allocatedAmount: allocAmount,
            });

            // Update receivable entry if PI
            if (alloc.documentType === 'PI') {
              const rec = await tx.receivableEntry.findFirst({
                where: { proformaInvoiceId: alloc.documentId },
              });
              if (rec) {
                const newPaid = Math.round((Number(rec.paidAmount) + allocAmount) * 100) / 100;
                const newBal = Math.max(0, Math.round((Number(rec.totalAmount) - newPaid) * 100) / 100);
                await tx.receivableEntry.update({
                  where: { id: rec.id },
                  data: {
                    paidAmount: newPaid,
                    balanceAmount: newBal,
                    status: newBal === 0 ? 'PAID' : 'PARTIALLY_PAID',
                  },
                });
              }
            }
          }
        }
      }

      // Create Payment Record
      const payment = await tx.payment.create({
        data: {
          companyProfileId,
          partyId: data.partyId,
          paymentType: data.paymentType || 'CUSTOMER_PAYMENT',
          paymentMethod: data.paymentMethod || 'NEFT_RTGS',
          referenceNumber: data.referenceNumber,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          amount: totalAmount,
          unallocatedAmount: remainingUnallocated,
          currency: data.currency || 'INR',
          notes: data.notes,
          status: 'CONFIRMED',
          allocations: {
            create: allocationsToCreate,
          },
          transactions: {
            create: [
              {
                accountType: 'ASSET',
                transactionType: 'DEBIT',
                amount: totalAmount,
                description: `Payment received via ${data.paymentMethod || 'NEFT_RTGS'} - Ref: ${data.referenceNumber || 'N/A'}`,
              },
            ],
          },
        },
        include: {
          allocations: true,
          party: true,
        },
      });

      await auditService.log({
        userId,
        action: 'ALLOCATE',
        module: 'Finance',
        entityType: 'Payment',
        entityId: payment.id,
        newData: payment,
      });

      return payment;
    });
  },

  async getReceivables(query: { status?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status as any;

    return prisma.receivableEntry.findMany({
      where,
      include: {
        customer: {
          include: { party: true },
        },
        proformaInvoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getPayables(query: { status?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status as any;

    return prisma.payableEntry.findMany({
      where,
      include: {
        vendor: {
          include: { party: true },
        },
        purchaseOrder: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getLedgerSummary() {
    const [totalReceivables, totalPayables, paymentsThisMonth] = await Promise.all([
      prisma.receivableEntry.aggregate({
        _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
      }),
      prisma.payableEntry.aggregate({
        _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      receivables: {
        total: Number(totalReceivables._sum.totalAmount || 0),
        collected: Number(totalReceivables._sum.paidAmount || 0),
        outstanding: Number(totalReceivables._sum.balanceAmount || 0),
      },
      payables: {
        total: Number(totalPayables._sum.totalAmount || 0),
        paid: Number(totalPayables._sum.paidAmount || 0),
        outstanding: Number(totalPayables._sum.balanceAmount || 0),
      },
      monthlyCollections: Number(paymentsThisMonth._sum.amount || 0),
    };
  },

  async updatePayment(id: string, data: any, userId?: string) {
    const existing = await prisma.payment.findUnique({
      where: { id },
      include: {
        allocations: {
          include: { proformaInvoice: true },
        },
        transactions: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Payment not found'), { status: 404 });
    }

    const oldAmount = Number(existing.amount);
    const newAmount = data.amount !== undefined ? Math.max(0, Number(data.amount)) : oldAmount;
    const diff = newAmount - oldAmount;

    let remainingUnallocated = Number(existing.unallocatedAmount);

    if (diff !== 0) {
      if (existing.allocations.length > 0) {
        if (existing.allocations.length === 1) {
          const singleAlloc = existing.allocations[0];
          const newAllocAmt = Math.max(0, Number(singleAlloc.allocatedAmount) + diff);
          await prisma.paymentAllocation.update({
            where: { id: singleAlloc.id },
            data: { allocatedAmount: newAllocAmt },
          });
          remainingUnallocated = Math.max(0, newAmount - newAllocAmt);

          const piId = singleAlloc.proformaInvoiceId || (singleAlloc.documentType === 'PI' ? singleAlloc.documentId : null);
          if (piId) {
            const pi = await prisma.proformaInvoice.findUnique({ where: { id: piId } });
            if (pi) {
              const piTotal = Number(pi.grandTotal);
              const otherAllocations = await prisma.paymentAllocation.findMany({
                where: {
                  id: { not: singleAlloc.id },
                  OR: [
                    { proformaInvoiceId: piId },
                    { documentType: 'PI', documentId: piId },
                  ],
                },
              });
              const otherTotal = otherAllocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
              const totalPiReceived = otherTotal + newAllocAmt;
              const newPiStatus = totalPiReceived >= piTotal ? 'FULLY_RECEIVED' : totalPiReceived > 0 ? 'PARTIAL' : 'PENDING';

              await prisma.proformaInvoice.update({
                where: { id: piId },
                data: {
                  advanceReceivedAmount: totalPiReceived,
                  advancePaymentStatus: newPiStatus,
                  ...(data.referenceNumber ? { advancePaymentReference: data.referenceNumber } : {}),
                  ...(data.paymentDate ? { advancePaymentDate: new Date(data.paymentDate) } : {}),
                  ...(data.paymentMethod ? { advancePaymentMode: data.paymentMethod } : {}),
                },
              });

              const rec = await prisma.receivableEntry.findFirst({ where: { proformaInvoiceId: piId } });
              if (rec) {
                const newPaid = Math.max(0, Number(rec.paidAmount) + diff);
                const recTotal = Number(rec.totalAmount);
                const newBal = Math.max(0, recTotal - newPaid);
                await prisma.receivableEntry.update({
                  where: { id: rec.id },
                  data: {
                    paidAmount: newPaid,
                    balanceAmount: newBal,
                    status: newBal === 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'OPEN',
                  },
                });
              }
            }
          }
        } else {
          const totalAllocated = existing.allocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
          remainingUnallocated = Math.max(0, newAmount - totalAllocated);
        }
      } else {
        remainingUnallocated = newAmount;
      }

      if (existing.transactions.length > 0) {
        await prisma.financialTransaction.updateMany({
          where: { paymentId: existing.id },
          data: { amount: newAmount },
        }).catch(() => {});
      }
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        amount: newAmount,
        unallocatedAmount: remainingUnallocated,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
        paymentMethod: data.paymentMethod || undefined,
        referenceNumber: data.referenceNumber !== undefined ? data.referenceNumber : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        paymentType: data.paymentType || undefined,
        status: data.status || undefined,
      },
      include: {
        party: true,
        companyProfile: true,
        allocations: {
          include: { proformaInvoice: true },
        },
      },
    });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'UPDATE',
        module: 'Finance',
        entityType: 'Payment',
        entityId: id,
        oldData: { amount: oldAmount, referenceNumber: existing.referenceNumber },
        newData: { amount: newAmount, referenceNumber: updated.referenceNumber },
      }).catch(() => {});
    }

    return updated;
  },

  async deletePayment(id: string, userId?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        allocations: true,
        transactions: true,
      },
    });

    if (!payment) {
      return { success: true };
    }

    // Revert allocations from linked PIs & receivables
    for (const alloc of payment.allocations) {
      const piId = alloc.proformaInvoiceId || (alloc.documentType === 'PI' ? alloc.documentId : null);
      if (piId) {
        const pi = await prisma.proformaInvoice.findUnique({ where: { id: piId } });
        if (pi) {
          const currentReceived = Number(pi.advanceReceivedAmount || 0);
          const allocAmt = Number(alloc.allocatedAmount || 0);
          const newReceived = Math.max(0, currentReceived - allocAmt);
          const piTotal = Number(pi.grandTotal);
          const newStatus = newReceived >= piTotal ? 'FULLY_RECEIVED' : newReceived > 0 ? 'PARTIAL' : 'PENDING';

          await prisma.proformaInvoice.update({
            where: { id: piId },
            data: {
              advanceReceivedAmount: newReceived,
              advancePaymentStatus: newStatus,
              ...(newReceived === 0 ? {
                advancePaymentReference: null,
                advancePaymentDate: null,
                advancePaymentMode: null,
              } : {}),
            },
          }).catch(() => {});

          const rec = await prisma.receivableEntry.findFirst({ where: { proformaInvoiceId: piId } });
          if (rec) {
            const newPaid = Math.max(0, Number(rec.paidAmount) - allocAmt);
            const total = Number(rec.totalAmount);
            const newBal = Math.max(0, total - newPaid);
            await prisma.receivableEntry.update({
              where: { id: rec.id },
              data: {
                paidAmount: newPaid,
                balanceAmount: newBal,
                status: newPaid >= total ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'OPEN',
              },
            }).catch(() => {});
          }
        }
      }
    }

    // Delete financial transactions
    await prisma.financialTransaction.deleteMany({ where: { paymentId: id } }).catch(() => {});

    // Delete allocations
    await prisma.paymentAllocation.deleteMany({ where: { paymentId: id } }).catch(() => {});

    // Delete payment record
    await prisma.payment.delete({ where: { id } });

    if (userId) {
      await auditService.logMutation({
        userId,
        action: 'DELETE',
        module: 'Finance',
        entityType: 'Payment',
        entityId: id,
        oldData: { amount: Number(payment.amount), referenceNumber: payment.referenceNumber, partyId: payment.partyId },
      }).catch(() => {});
    }

    return { success: true };
  },
};
