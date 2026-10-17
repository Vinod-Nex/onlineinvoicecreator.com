import { z } from 'zod';
export * from './invoice-calc';

// ============================================================================
// 1. ZOD SCHEMAS (Validation & Parsing)
// ============================================================================

export const InvoicePartySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email().or(z.literal('')).optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  taxId: z.string().optional().default(''), // ABN, VAT, GST, Tax ID
  customFields: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .optional()
    .default([]),
});

export const LineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().min(0, 'Quantity must be greater than or equal to 0').default(1),
  unitPrice: z.number().min(0, 'Unit price must be greater than or equal to 0').default(0),
  taxRate: z
    .number()
    .min(0, 'Tax rate must be >= 0%')
    .max(100, 'Tax rate cannot exceed 100%')
    .default(0),
});

export const DiscountTypeSchema = z.enum(['percentage', 'fixed']);

export const DiscountSchema = z.object({
  type: DiscountTypeSchema.default('percentage'),
  value: z.number().min(0, 'Discount must be >= 0').default(0),
});

export const PaymentDetailsSchema = z.object({
  bankName: z.string().optional().default(''),
  accountName: z.string().optional().default(''),
  accountNumber: z.string().optional().default(''),
  routingNumber: z.string().optional().default(''), // BSB, Sort Code, Routing No.
  swiftBic: z.string().optional().default(''),
  iban: z.string().optional().default(''),
  paymentLink: z.url().or(z.literal('')).optional().default(''),
  terms: z.string().optional().default(''),
  customInstructions: z.string().optional().default(''),
});

export const InvoiceSchema = z.object({
  id: z.string().optional(),
  invoiceNumber: z.string().min(1, 'Invoice number is required').default('INV-001'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.string().min(3).max(3).default('USD'),
  sender: InvoicePartySchema,
  client: InvoicePartySchema,
  lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required'),
  discount: z
    .union([z.number().min(0), DiscountSchema])
    .default(0)
    .transform((val) =>
      typeof val === 'number' ? { type: 'percentage' as const, value: val } : val
    ),
  shipping: z.number().min(0, 'Shipping cost cannot be negative').default(0),
  notes: z.string().optional().default(''),
  paymentDetails: PaymentDetailsSchema.optional(),
  signature: z.string().optional().default(''),
  logo: z.string().optional().default(''),
  template: z.enum(['modern', 'classic', 'minimal', 'compact']).optional().default('modern'),
  pageFormat: z.enum(['a4', 'letter']).optional().default('a4'),
});
