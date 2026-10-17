import { describe, it, expect } from 'vitest';
import {
  incrementInvoiceNumber,
  addDaysToDate,
  formatDateForInput,
  isValidEmail,
  isValidUrl,
  validateInvoiceField,
  validateInvoiceData,
} from '../src/lib/invoice-form';
import { createDefaultInvoice } from '../src/lib/invoice';

describe('Invoice Form Helpers & Validation Suite', () => {
  // ==========================================================================
  // 1. AUTO-INCREMENT INVOICE NUMBER
  // ==========================================================================
  describe('incrementInvoiceNumber', () => {
    it('increments standard 3-digit padded numbers', () => {
      expect(incrementInvoiceNumber('INV-001')).toBe('INV-002');
      expect(incrementInvoiceNumber('INV-009')).toBe('INV-010');
      expect(incrementInvoiceNumber('INV-099')).toBe('INV-100');
    });

    it('increments numbers with years or complex prefixes', () => {
      expect(incrementInvoiceNumber('2026-0001')).toBe('2026-0002');
      expect(incrementInvoiceNumber('INV-2026-42')).toBe('INV-2026-43');
      expect(incrementInvoiceNumber('BILL-999')).toBe('BILL-1000');
    });

    it('increments numbers with trailing suffixes', () => {
      expect(incrementInvoiceNumber('INV-001-A')).toBe('INV-002-A');
      expect(incrementInvoiceNumber('PO#123-FINAL')).toBe('PO#124-FINAL');
    });

    it('increments single bare digits', () => {
      expect(incrementInvoiceNumber('1')).toBe('2');
      expect(incrementInvoiceNumber('99')).toBe('100');
    });

    it('handles empty, whitespace, or non-digit inputs gracefully', () => {
      expect(incrementInvoiceNumber('')).toBe('INV-001');
      expect(incrementInvoiceNumber('   ')).toBe('INV-001');
      expect(incrementInvoiceNumber('INV')).toBe('INV-001');
      expect(incrementInvoiceNumber('INVOICE-DRAFT')).toBe('INVOICE-DRAFT-001');
    });
  });

  // ==========================================================================
  // 2. DATE OFFSET & FORMATTING
  // ==========================================================================
  describe('Date Helpers', () => {
    it('formats a date to YYYY-MM-DD correctly', () => {
      const date = new Date(2026, 9, 17); // Note: month 9 is October (0-indexed)
      expect(formatDateForInput(date)).toBe('2026-10-17');
    });

    it('adds days to a valid date string accurately', () => {
      expect(addDaysToDate('2026-10-17', 7)).toBe('2026-10-24');
      expect(addDaysToDate('2026-10-17', 14)).toBe('2026-10-31');
      expect(addDaysToDate('2026-10-17', 30)).toBe('2026-11-16');
    });

    it('handles month and year rollover', () => {
      expect(addDaysToDate('2026-12-25', 10)).toBe('2027-01-04');
    });
  });

  // ==========================================================================
  // 3. FIELD LEVEL VALIDATION
  // ==========================================================================
  describe('validateInvoiceField', () => {
    it('validates sender name requirement', () => {
      expect(validateInvoiceField('senderName', '').valid).toBe(false);
      expect(validateInvoiceField('senderName', '   ').valid).toBe(false);
      expect(validateInvoiceField('senderName', 'Acme Corp').valid).toBe(true);
    });

    it('validates client name requirement', () => {
      expect(validateInvoiceField('clientName', '').valid).toBe(false);
      expect(validateInvoiceField('clientName', 'Globex LLC').valid).toBe(true);
    });

    it('validates invoice number requirement', () => {
      expect(validateInvoiceField('invoiceNumber', '').valid).toBe(false);
      expect(validateInvoiceField('invoiceNumber', 'INV-001').valid).toBe(true);
    });

    it('validates email addresses format (optional if empty)', () => {
      expect(isValidEmail('')).toBe(true);
      expect(isValidEmail('hello@example.com')).toBe(true);
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);

      expect(validateInvoiceField('senderEmail', 'valid@biz.com').valid).toBe(true);
      expect(validateInvoiceField('senderEmail', 'bad-email').valid).toBe(false);
    });

    it('validates payment URLs format (optional if empty)', () => {
      expect(isValidUrl('')).toBe(true);
      expect(isValidUrl('https://paypal.me/user')).toBe(true);
      expect(isValidUrl('http://stripe.com/pay/123')).toBe(true);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://invalidscheme.com')).toBe(false);
    });

    it('validates line item fields', () => {
      expect(validateInvoiceField('itemDescription', '').valid).toBe(false);
      expect(validateInvoiceField('itemDescription', 'Design Services').valid).toBe(true);

      expect(validateInvoiceField('itemQuantity', -1).valid).toBe(false);
      expect(validateInvoiceField('itemQuantity', 0).valid).toBe(true);
      expect(validateInvoiceField('itemQuantity', 5).valid).toBe(true);

      expect(validateInvoiceField('itemUnitPrice', -10).valid).toBe(false);
      expect(validateInvoiceField('itemUnitPrice', 0).valid).toBe(true);
      expect(validateInvoiceField('itemUnitPrice', 150).valid).toBe(true);

      expect(validateInvoiceField('itemTaxRate', -5).valid).toBe(false);
      expect(validateInvoiceField('itemTaxRate', 105).valid).toBe(false);
      expect(validateInvoiceField('itemTaxRate', 10).valid).toBe(true);
    });
  });

  // ==========================================================================
  // 4. FULL INVOICE DATA VALIDATION
  // ==========================================================================
  describe('validateInvoiceData', () => {
    it('validates a complete default invoice successfully', () => {
      const defaultInvoice = createDefaultInvoice();
      const result = validateInvoiceData(defaultInvoice);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('flags missing required fields and empty line items', () => {
      const invalidInvoice: any = {
        sender: { name: '' },
        client: { name: '' },
        invoiceNumber: '',
        issueDate: '',
        dueDate: '',
        lineItems: [],
      };

      const result = validateInvoiceData(invalidInvoice);
      expect(result.isValid).toBe(false);
      expect(result.errors['sender.name']).toBeDefined();
      expect(result.errors['client.name']).toBeDefined();
      expect(result.errors['invoiceNumber']).toBeDefined();
      expect(result.errors['lineItems']).toBe('At least one line item is required');
    });

    it('catches invalid items in lineItems array', () => {
      const invoice = createDefaultInvoice();
      invoice.lineItems[0].description = '';
      invoice.lineItems[0].quantity = -2;

      const result = validateInvoiceData(invoice);
      expect(result.isValid).toBe(false);
      expect(result.errors['lineItems.0.description']).toBeDefined();
      expect(result.errors['lineItems.0.quantity']).toBeDefined();
    });
  });

  // ==========================================================================
  // 5. TOP 30 CURRENCIES COVERAGE
  // ==========================================================================
  describe('Top 30 Currencies Configuration', () => {
    it('contains exactly 30 unique, valid currency entries', async () => {
      const { TOP_30_CURRENCIES } = await import('../src/data/currencies');
      expect(TOP_30_CURRENCIES).toHaveLength(30);

      const codes = new Set(TOP_30_CURRENCIES.map((c) => c.code));
      expect(codes.size).toBe(30);

      // Spot-check top global currencies
      expect(codes.has('USD')).toBe(true);
      expect(codes.has('EUR')).toBe(true);
      expect(codes.has('GBP')).toBe(true);
      expect(codes.has('JPY')).toBe(true);
      expect(codes.has('AUD')).toBe(true);
      expect(codes.has('CAD')).toBe(true);
      expect(codes.has('INR')).toBe(true);

      for (const curr of TOP_30_CURRENCIES) {
        expect(curr.code).toMatch(/^[A-Z]{3}$/);
        expect(curr.symbol.length).toBeGreaterThan(0);
        expect(curr.name.length).toBeGreaterThan(0);
        expect(typeof curr.decimals).toBe('number');
      }
    });
  });

  // ==========================================================================
  // 6. LOCAL STORAGE DRAFT SERIALIZATION
  // ==========================================================================
  describe('Local Storage Draft Helpers', () => {
    it('safely handles environments with or without window.localStorage', async () => {
      const origWindow = (globalThis as any).window;
      delete (globalThis as any).window;
      try {
        const { saveInvoiceDraft, loadInvoiceDraft, clearInvoiceDraft } =
          await import('../src/lib/invoice-form');
        const invoice = createDefaultInvoice();

        // In Node environment without window
        expect(saveInvoiceDraft(invoice)).toBe(false);
        expect(loadInvoiceDraft()).toBe(null);
        expect(() => clearInvoiceDraft()).not.toThrow();
      } finally {
        if (origWindow) (globalThis as any).window = origWindow;
      }
    });
  });
});
