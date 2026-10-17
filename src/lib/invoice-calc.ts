// ============================================================================
// 1. PURE TYPESCRIPT TYPES (Zero runtime dependencies)
// ============================================================================

export interface CustomField {
  label: string;
  value: string;
}

export interface InvoiceParty {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  customFields?: CustomField[];
}

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export type DiscountType = 'percentage' | 'fixed';

export interface Discount {
  type: DiscountType;
  value: number;
}

export interface PaymentDetails {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftBic?: string;
  iban?: string;
  paymentLink?: string;
  terms?: string;
  customInstructions?: string;
}

export type InvoiceTemplateId = 'modern' | 'classic' | 'minimal' | 'compact';
export type InvoicePageFormat = 'a4' | 'letter';

export interface Invoice {
  id?: string;
  template?: InvoiceTemplateId;
  pageFormat?: InvoicePageFormat;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  sender: InvoiceParty;
  client: InvoiceParty;
  lineItems: LineItem[];
  discount?: number | Discount;
  shipping: number;
  notes?: string;
  paymentDetails?: PaymentDetails;
  signature?: string;
  logo?: string;
}

export interface TaxBreakdownItem {
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface LineItemCalculated extends LineItem {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  netTaxableSubtotal: number;
  taxBreakdown: TaxBreakdownItem[];
  totalTax: number;
  shipping: number;
  grandTotal: number;
  lineItemsCalculated: LineItemCalculated[];
}

// ============================================================================
// 2. PURE CALCULATION & ROUNDING FUNCTIONS
// ============================================================================

/**
 * Rounds a floating point number to a given number of decimal places (default 2),
 * avoiding JavaScript precision glitches (e.g. 0.1 + 0.2 or 1.005 rounding).
 */
export function roundToDecimals(value: number, decimals = 2): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates line item subtotal, tax amount, and total with accurate 2-decimal rounding.
 */
export function calculateLineItem(item: LineItem): LineItemCalculated {
  const safeQty = Math.max(0, item.quantity || 0);
  const safePrice = Math.max(0, item.unitPrice || 0);
  const safeTaxRate = Math.max(0, item.taxRate || 0);

  const subtotal = roundToDecimals(safeQty * safePrice, 2);
  const taxAmount = roundToDecimals(subtotal * (safeTaxRate / 100), 2);
  const total = roundToDecimals(subtotal + taxAmount, 2);

  return {
    ...item,
    quantity: safeQty,
    unitPrice: safePrice,
    taxRate: safeTaxRate,
    subtotal,
    taxAmount,
    total,
  };
}

/**
 * Calculates complete invoice totals, discounts, multiple tax rates breakdown,
 * and shipping amounts with financial precision.
 */
export function calculateTotals(
  invoice: Pick<Invoice, 'lineItems'> & {
    discount?: number | Discount;
    shipping?: number;
  }
): InvoiceTotals {
  const items = invoice.lineItems || [];
  const lineItemsCalculated = items.map(calculateLineItem);

  // 1. Raw Subtotal (sum of all line item subtotals)
  const rawSubtotal = lineItemsCalculated.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotal = roundToDecimals(rawSubtotal, 2);

  // 2. Discount Calculation
  const discountConfig: Discount =
    typeof invoice.discount === 'number'
      ? { type: 'percentage', value: Math.max(0, invoice.discount) }
      : invoice.discount || { type: 'percentage', value: 0 };

  let discountAmount = 0;
  if (discountConfig.type === 'percentage') {
    discountAmount = roundToDecimals(subtotal * (Math.min(100, discountConfig.value) / 100), 2);
  } else {
    // Fixed amount discount cannot exceed subtotal
    discountAmount = roundToDecimals(Math.min(subtotal, Math.max(0, discountConfig.value)), 2);
  }

  const netTaxableSubtotal = roundToDecimals(Math.max(0, subtotal - discountAmount), 2);

  // 3. Tax Breakdown by Tax Rate
  // When an invoice-level discount exists, taxes are calculated on the net discounted taxable base
  const discountRatio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;

  const taxMap = new Map<number, { taxableAmount: number; taxAmount: number }>();

  for (const item of lineItemsCalculated) {
    if (item.taxRate === undefined || item.taxRate <= 0) continue;

    // Apply proportional discount ratio if discount exists
    const itemTaxable = roundToDecimals(item.subtotal * discountRatio, 2);
    const itemTax = roundToDecimals(itemTaxable * (item.taxRate / 100), 2);

    const existing = taxMap.get(item.taxRate);
    if (existing) {
      existing.taxableAmount = roundToDecimals(existing.taxableAmount + itemTaxable, 2);
      existing.taxAmount = roundToDecimals(existing.taxAmount + itemTax, 2);
    } else {
      taxMap.set(item.taxRate, {
        taxableAmount: itemTaxable,
        taxAmount: itemTax,
      });
    }
  }

  // Convert to sorted array by tax rate ascending
  const taxBreakdown: TaxBreakdownItem[] = Array.from(taxMap.entries())
    .map(([rate, data]) => ({
      rate,
      taxableAmount: data.taxableAmount,
      taxAmount: data.taxAmount,
    }))
    .sort((a, b) => a.rate - b.rate);

  const totalTax = roundToDecimals(
    taxBreakdown.reduce((sum, t) => sum + t.taxAmount, 0),
    2
  );

  // 4. Shipping
  const shipping = roundToDecimals(Math.max(0, invoice.shipping || 0), 2);

  // 5. Grand Total
  const grandTotal = roundToDecimals(netTaxableSubtotal + totalTax + shipping, 2);

  return {
    subtotal,
    discountAmount,
    netTaxableSubtotal,
    taxBreakdown,
    totalTax,
    shipping,
    grandTotal,
    lineItemsCalculated,
  };
}

// ============================================================================
// 3. INTL FORMATTING FUNCTIONS
// ============================================================================

/**
 * Formats a currency amount with correct symbol and decimal placement using Intl.NumberFormat.
 * Handles zero-decimal currencies (JPY, KRW) and standard 2-decimal currencies.
 */
export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  const safeAmount = roundToDecimals(amount, 2);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      currencyDisplay: 'narrowSymbol',
    }).format(safeAmount);
  } catch {
    // Fallback if currency code is unknown to Intl
    return `${currency.toUpperCase()} ${safeAmount.toFixed(2)}`;
  }
}

/**
 * Formats numeric values with decimal precision and locale thousands separators.
 */
export function formatNumber(value: number, decimals = 2, locale = 'en-US'): string {
  const safeValue = roundToDecimals(value, decimals);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeValue);
}

/**
 * Formats a percentage (e.g. 10 -> "10%" or 7.5 -> "7.5%").
 */
export function formatPercentage(rate: number): string {
  return `${roundToDecimals(rate, 2)}%`;
}

// ============================================================================
// 4. DEFAULT FACTORY & BLANK TEMPLATES
// ============================================================================

/**
 * Generates a clean, blank invoice with sensible defaults for quick start.
 */
export function createDefaultInvoice(): Invoice {
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 14);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    id: `inv_${Date.now()}`,
    invoiceNumber: 'INV-001',
    issueDate: formatDate(today),
    dueDate: formatDate(dueDate),
    currency: 'USD',
    sender: {
      name: 'Your Business Name',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      customFields: [],
    },
    client: {
      name: 'Client Name',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      customFields: [],
    },
    lineItems: [
      {
        id: 'item_1',
        description: 'Professional Services',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ],
    discount: {
      type: 'percentage',
      value: 0,
    },
    shipping: 0,
    notes: 'Thank you for your business. Please remit payment by the due date.',
    paymentDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      routingNumber: '',
      swiftBic: '',
      iban: '',
      paymentLink: '',
      terms: 'Payment due within 14 days of invoice date.',
      customInstructions: '',
    },
    signature: '',
    logo: '',
    template: 'modern',
    pageFormat: 'a4',
  };
}
