import { describe, it, expect } from 'vitest';
import {
  InvoiceSchema,
  roundToDecimals,
  calculateLineItem,
  calculateTotals,
  formatCurrency,
  formatNumber,
  formatPercentage,
  createDefaultInvoice,
  type LineItem,
} from '../src/lib/invoice';

describe('Invoice Data Model & Calculation Suite', () => {
  // ==========================================================================
  // 1. ROUNDING & PRECISION TESTS
  // ==========================================================================
  describe('roundToDecimals Precision', () => {
    it('accurately rounds half-up cents', () => {
      expect(roundToDecimals(10.005, 2)).toBe(10.01);
      expect(roundToDecimals(10.004, 2)).toBe(10.0);
      expect(roundToDecimals(10.0049, 2)).toBe(10.0);
      expect(roundToDecimals(10.0051, 2)).toBe(10.01);
    });

    it('resolves common JavaScript floating point math errors', () => {
      expect(0.1 + 0.2).not.toBe(0.3); // standard JS IEEE-754 quirk
      expect(roundToDecimals(0.1 + 0.2, 2)).toBe(0.3);
      expect(roundToDecimals(33.33333333, 2)).toBe(33.33);
      expect(roundToDecimals(1.000000001, 2)).toBe(1.0);
    });

    it('handles negative numbers, zeros, and NaN safely', () => {
      expect(roundToDecimals(0, 2)).toBe(0);
      expect(roundToDecimals(-0, 2)).toBe(0);
      expect(roundToDecimals(-10.005, 2)).toBe(-10.01);
      expect(roundToDecimals(NaN, 2)).toBe(0);
      expect(roundToDecimals(Infinity, 2)).toBe(0);
    });

    it('supports custom decimal precision', () => {
      expect(roundToDecimals(10.12345, 4)).toBe(10.1235);
      expect(roundToDecimals(10.12345, 0)).toBe(10);
    });
  });

  // ==========================================================================
  // 2. ZERO VALUES & EDGE CASES
  // ==========================================================================
  describe('Zero Values & Boundary Conditions', () => {
    it('handles line items with zero quantity', () => {
      const item: LineItem = {
        description: 'Draft item',
        quantity: 0,
        unitPrice: 150,
        taxRate: 10,
      };
      const result = calculateLineItem(item);
      expect(result.subtotal).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(0);
    });

    it('handles complimentary/free line items with zero unit price', () => {
      const item: LineItem = {
        description: 'Free onboarding session',
        quantity: 5,
        unitPrice: 0,
        taxRate: 20,
      };
      const result = calculateLineItem(item);
      expect(result.subtotal).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(0);
    });

    it('handles line items with zero tax rate (tax-exempt)', () => {
      const item: LineItem = {
        description: 'Exempt supply',
        quantity: 3,
        unitPrice: 50,
        taxRate: 0,
      };
      const result = calculateLineItem(item);
      expect(result.subtotal).toBe(150);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(150);
    });

    it('handles an invoice with all zero values', () => {
      const totals = calculateTotals({
        lineItems: [{ description: 'Zero item', quantity: 0, unitPrice: 0, taxRate: 0 }],
        discount: 0,
        shipping: 0,
      });

      expect(totals.subtotal).toBe(0);
      expect(totals.discountAmount).toBe(0);
      expect(totals.netTaxableSubtotal).toBe(0);
      expect(totals.totalTax).toBe(0);
      expect(totals.shipping).toBe(0);
      expect(totals.grandTotal).toBe(0);
      expect(totals.taxBreakdown).toEqual([]);
    });

    it('handles empty line items array gracefully', () => {
      const totals = calculateTotals({
        lineItems: [],
        discount: 0,
        shipping: 0,
      });

      expect(totals.subtotal).toBe(0);
      expect(totals.grandTotal).toBe(0);
      expect(totals.taxBreakdown).toEqual([]);
    });
  });

  // ==========================================================================
  // 3. MULTIPLE TAX RATES & BREAKDOWNS
  // ==========================================================================
  describe('Multiple Tax Rates Calculations', () => {
    it('correctly aggregates multiple tax rates into separate breakdown buckets', () => {
      const invoice = {
        lineItems: [
          { description: 'Exempt Goods (0%)', quantity: 1, unitPrice: 100, taxRate: 0 },
          { description: 'Reduced Rate Goods (5%)', quantity: 2, unitPrice: 100, taxRate: 5 },
          { description: 'Standard Services (10%)', quantity: 1, unitPrice: 300, taxRate: 10 },
          { description: 'Luxury Items (20%)', quantity: 2, unitPrice: 200, taxRate: 20 },
        ],
        discount: 0,
        shipping: 25,
      };

      const totals = calculateTotals(invoice);

      // Subtotals:
      // Item 1: 100 * 1 = 100
      // Item 2: 200 (5% tax = 10)
      // Item 3: 300 (10% tax = 30)
      // Item 4: 400 (20% tax = 80)
      // Total Subtotal = 100 + 200 + 300 + 400 = 1000
      expect(totals.subtotal).toBe(1000);
      expect(totals.discountAmount).toBe(0);
      expect(totals.netTaxableSubtotal).toBe(1000);

      // Breakdown: 0% is excluded from active tax breakdown
      expect(totals.taxBreakdown).toHaveLength(3);
      expect(totals.taxBreakdown).toEqual([
        { rate: 5, taxableAmount: 200, taxAmount: 10 },
        { rate: 10, taxableAmount: 300, taxAmount: 30 },
        { rate: 20, taxableAmount: 400, taxAmount: 80 },
      ]);

      // Total Tax = 10 + 30 + 80 = 120
      expect(totals.totalTax).toBe(120);
      expect(totals.shipping).toBe(25);

      // Grand Total = 1000 - 0 + 120 + 25 = 1145
      expect(totals.grandTotal).toBe(1145);
    });

    it('correctly calculates multiple tax rates when a percentage discount is applied', () => {
      const invoice = {
        lineItems: [
          { description: 'Consulting (10% GST)', quantity: 1, unitPrice: 400, taxRate: 10 },
          { description: 'Software License (20% VAT)', quantity: 1, unitPrice: 600, taxRate: 20 },
        ],
        discount: { type: 'percentage' as const, value: 10 }, // 10% discount on total
        shipping: 0,
      };

      const totals = calculateTotals(invoice);

      expect(totals.subtotal).toBe(1000);
      expect(totals.discountAmount).toBe(100);
      expect(totals.netTaxableSubtotal).toBe(900);

      // Proportional discount ratio = 900 / 1000 = 0.9
      // Consulting taxable = 400 * 0.9 = 360 -> 10% tax = 36.00
      // Software taxable = 600 * 0.9 = 540 -> 20% tax = 108.00
      expect(totals.taxBreakdown).toEqual([
        { rate: 10, taxableAmount: 360, taxAmount: 36 },
        { rate: 20, taxableAmount: 540, taxAmount: 108 },
      ]);

      expect(totals.totalTax).toBe(144);
      expect(totals.grandTotal).toBe(1044); // 900 + 144
    });

    it('correctly calculates fixed monetary discount and caps at subtotal', () => {
      const invoice = {
        lineItems: [
          { description: 'Design Service', quantity: 2, unitPrice: 75, taxRate: 10 }, // subtotal = 150
        ],
        discount: { type: 'fixed' as const, value: 50 },
        shipping: 10,
      };

      const totals = calculateTotals(invoice);
      expect(totals.subtotal).toBe(150);
      expect(totals.discountAmount).toBe(50);
      expect(totals.netTaxableSubtotal).toBe(100);

      // Discount ratio = 100 / 150 = 0.66666...
      // Taxable = 150 * (100 / 150) = 100 -> 10% tax = 10
      expect(totals.totalTax).toBe(10);
      expect(totals.shipping).toBe(10);
      expect(totals.grandTotal).toBe(120); // 100 + 10 + 10
    });

    it('caps fixed discount at 100% of subtotal so total cannot be negative', () => {
      const invoice = {
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 50, taxRate: 0 }],
        discount: { type: 'fixed' as const, value: 200 }, // exceeds subtotal
        shipping: 5,
      };

      const totals = calculateTotals(invoice);
      expect(totals.subtotal).toBe(50);
      expect(totals.discountAmount).toBe(50); // capped at subtotal
      expect(totals.netTaxableSubtotal).toBe(0);
      expect(totals.grandTotal).toBe(5); // 0 + 0 + 5 shipping
    });
  });

  // ==========================================================================
  // 4. INTL FORMATTING TESTS
  // ==========================================================================
  describe('Intl Currency and Number Formatting', () => {
    it('formats USD currency correctly', () => {
      const formatted = formatCurrency(1234.56, 'USD', 'en-US');
      expect(formatted).toBe('$1,234.56');
    });

    it('formats EUR currency with standard euro symbol', () => {
      const formatted = formatCurrency(1234.56, 'EUR', 'en-US');
      expect(formatted).toBe('€1,234.56');
    });

    it('formats GBP currency with pound symbol', () => {
      const formatted = formatCurrency(1234.56, 'GBP', 'en-US');
      expect(formatted).toBe('£1,234.56');
    });

    it('formats zero-decimal currencies like JPY correctly', () => {
      const formatted = formatCurrency(1500, 'JPY', 'en-US');
      expect(formatted).toBe('¥1,500');
    });

    it('formats generic numbers with precision and thousand separators', () => {
      expect(formatNumber(1234567.89, 2, 'en-US')).toBe('1,234,567.89');
      expect(formatNumber(0, 2, 'en-US')).toBe('0.00');
    });

    it('formats percentages cleanly', () => {
      expect(formatPercentage(10)).toBe('10%');
      expect(formatPercentage(7.5)).toBe('7.5%');
      expect(formatPercentage(0)).toBe('0%');
    });
  });

  // ==========================================================================
  // 5. ZOD SCHEMA & VALIDATION TESTS
  // ==========================================================================
  describe('Zod Invoice Schema Validation', () => {
    it('validates a complete valid invoice object', () => {
      const validData = {
        invoiceNumber: 'INV-2026-001',
        issueDate: '2026-10-17',
        dueDate: '2026-10-31',
        currency: 'USD',
        sender: {
          name: 'Acme Studio Ltd',
          email: 'billing@acmestudio.com',
          phone: '+1 555-0199',
          address: '123 Market St, San Francisco, CA',
          taxId: 'US-987654321',
        },
        client: {
          name: 'Global Tech Corp',
          email: 'accounts@globaltech.com',
          address: '456 Tech Blvd, Austin, TX',
        },
        lineItems: [
          {
            description: 'Brand Identity Design',
            quantity: 1,
            unitPrice: 2500,
            taxRate: 10,
          },
        ],
        discount: { type: 'percentage', value: 5 },
        shipping: 0,
        notes: 'Net 14 payment terms.',
      };

      const parsed = InvoiceSchema.parse(validData);
      expect(parsed.invoiceNumber).toBe('INV-2026-001');
      expect(parsed.sender.name).toBe('Acme Studio Ltd');
      expect(parsed.discount).toEqual({ type: 'percentage', value: 5 });
    });

    it('transforms numeric discount into a structured Discount object', () => {
      const data = {
        invoiceNumber: 'INV-002',
        issueDate: '2026-10-17',
        dueDate: '2026-10-31',
        sender: { name: 'Freelancer' },
        client: { name: 'Client' },
        lineItems: [{ description: 'Writing', quantity: 1, unitPrice: 100 }],
        discount: 15, // number
      };

      const parsed = InvoiceSchema.parse(data);
      expect(parsed.discount).toEqual({ type: 'percentage', value: 15 });
    });

    it('rejects an invoice with empty line items array', () => {
      const invalidData = {
        invoiceNumber: 'INV-003',
        issueDate: '2026-10-17',
        dueDate: '2026-10-31',
        sender: { name: 'Sender' },
        client: { name: 'Client' },
        lineItems: [], // empty violates min(1)
      };

      expect(() => InvoiceSchema.parse(invalidData)).toThrow();
    });

    it('creates a valid default invoice template', () => {
      const defaultInv = createDefaultInvoice();
      const parsed = InvoiceSchema.parse(defaultInv);
      expect(parsed.invoiceNumber).toBe('INV-001');
      expect(parsed.currency).toBe('USD');
      expect(parsed.lineItems).toHaveLength(1);
    });
  });
});
