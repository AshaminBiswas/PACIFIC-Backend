import { z } from 'zod';

export const CreateUpExpenseBodySchema = z.object({
  expenseDate: z.string().min(1, 'Expense date is required'),
  amount: z.coerce.number().positive('Expense amount must be greater than 0'),
  categoryId: z.string().uuid('Valid Category ID is required'),
  paymentMode: z.string().default('cash'),
  paidTo: z.string().trim().min(1, 'Paid-to/Vendor name is required').max(255),
  note: z.string().max(1000).optional().nullable(),
  receiptPath: z.string().optional().nullable(),
});

export const CreateUpExpenseSchema = z.object({
  body: CreateUpExpenseBodySchema,
});

export type CreateUpExpenseInput = z.infer<typeof CreateUpExpenseBodySchema>;

export const UpdateUpExpenseBodySchema = z.object({
  expenseDate: z.string().optional(),
  amount: z.coerce.number().positive('Expense amount must be greater than 0').optional(),
  categoryId: z.string().uuid().optional(),
  paymentMode: z.string().optional(),
  paidTo: z.string().trim().min(1).max(255).optional(),
  note: z.string().max(1000).optional().nullable(),
  receiptPath: z.string().optional().nullable(),
});

export const UpdateUpExpenseSchema = z.object({
  body: UpdateUpExpenseBodySchema,
  params: z.object({ id: z.string() }).optional(),
});

export type UpdateUpExpenseInput = z.infer<typeof UpdateUpExpenseBodySchema>;

export const ListUpExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  month: z.string().optional(),
  categoryId: z.string().optional(),
  paymentMode: z.string().optional(),
  verified: z.string().optional(), // 'true', 'false', 'all'
  search: z.string().optional(),
});

export type ListUpExpensesQuery = z.infer<typeof ListUpExpensesQuerySchema>;

export const CreateUpCategoryBodySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  sortOrder: z.coerce.number().int().default(0),
});

export const CreateUpCategorySchema = z.object({
  body: CreateUpCategoryBodySchema,
});

export type CreateUpCategoryInput = z.infer<typeof CreateUpCategoryBodySchema>;

export const UpdateUpCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const UpdateUpCategorySchema = z.object({
  body: UpdateUpCategoryBodySchema,
  params: z.object({ id: z.string() }).optional(),
});

export type UpdateUpCategoryInput = z.infer<typeof UpdateUpCategoryBodySchema>;

export const ReconcileCashBodySchema = z.object({
  cashDate: z.string().min(1, 'Cash date is required'),
  openingBalance: z.coerce.number().min(0, 'Opening balance cannot be negative').optional(),
  actualClosing: z.coerce.number().min(0, 'Actual closing balance cannot be negative').optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  closed: z.boolean().optional(),
});

export const ReconcileCashSchema = z.object({
  body: ReconcileCashBodySchema,
});

export type ReconcileCashInput = z.infer<typeof ReconcileCashBodySchema>;
