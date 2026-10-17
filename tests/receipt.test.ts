import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createDefaultReceipt,
  saveReceiptDraft,
  loadReceiptDraft,
  clearReceiptDraft,
  calculateTotals,
} from '../src/lib/receipt';
import {
  createDefaultRentReceipt,
  calculateRentGrandTotal,
  saveRentReceiptDraft,
  loadRentReceiptDraft,
  clearRentReceiptDraft,
} from '../src/lib/rent-receipt';

class MockLocalStorage {
  store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

describe('Receipt Tools Engine Suite', () => {
  beforeEach(() => {
    (globalThis as any).window = {
      localStorage: new MockLocalStorage(),
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  describe('General Receipt Engine', () => {
    it('creates default receipt with valid initial shape', () => {
      const receipt = createDefaultReceipt();
      expect(receipt.receiptNumber).toBe('REC-001');
      expect(receipt.receiptType).toBe('itemized');
      expect(receipt.merchant.name).toBe('Northstar Studio LLC');
      expect(receipt.customer.name).toBe('Acme Technologies');
      expect(receipt.paymentMethod).toBe('Credit Card');
      expect(receipt.lineItems.length).toBeGreaterThan(0);
    });

    it('calculates totals correctly for receipt line items', () => {
      const receipt = createDefaultReceipt();
      const totals = calculateTotals({ lineItems: receipt.lineItems });
      expect(totals.subtotal).toBe(3050); // 1850 + 1200
      expect(totals.grandTotal).toBe(3050);
    });

    it('saves, loads, and clears receipt draft safely', () => {
      const receipt = createDefaultReceipt();
      receipt.receiptNumber = 'REC-2026-99';
      receipt.merchant.name = 'Custom Merchant Corp';

      expect(saveReceiptDraft(receipt)).toBe(true);
      const loaded = loadReceiptDraft();
      expect(loaded).not.toBeNull();
      expect(loaded?.receiptNumber).toBe('REC-2026-99');
      expect(loaded?.merchant.name).toBe('Custom Merchant Corp');

      expect(clearReceiptDraft()).toBe(true);
      expect(loadReceiptDraft()).toBeNull();
    });
  });

  describe('Rent Receipt Engine', () => {
    it('creates default rent receipt with landlord, tenant, and property details', () => {
      const rentReceipt = createDefaultRentReceipt();
      expect(rentReceipt.receiptNumber).toMatch(/^RENT-\d{4}-\d{2}$/);
      expect(rentReceipt.landlord.name).toBe('Robert Vance');
      expect(rentReceipt.tenant.name).toBe('Elena Rostova');
      expect(rentReceipt.propertyAddress).toContain('Seattle');
      expect(rentReceipt.rentAmount).toBe(1850);
      expect(rentReceipt.maintenanceAmount).toBe(150);
      expect(rentReceipt.paymentMode).toBe('Bank Transfer');
      expect(rentReceipt.periodMonthYear).toBeDefined();
    });

    it('calculates rent grand total with optional maintenance correctly', () => {
      const rentReceipt = createDefaultRentReceipt();
      expect(calculateRentGrandTotal(rentReceipt)).toBe(2000); // 1850 + 150

      rentReceipt.maintenanceAmount = undefined;
      expect(calculateRentGrandTotal(rentReceipt)).toBe(1850);

      rentReceipt.rentAmount = 2500;
      rentReceipt.maintenanceAmount = 300;
      expect(calculateRentGrandTotal(rentReceipt)).toBe(2800);
    });

    it('saves, loads, and clears rent receipt draft safely', () => {
      const rentReceipt = createDefaultRentReceipt();
      rentReceipt.receiptNumber = 'RENT-CUSTOM-01';
      rentReceipt.landlord.pan = 'ABCDE1234F';

      expect(saveRentReceiptDraft(rentReceipt)).toBe(true);
      const loaded = loadRentReceiptDraft();
      expect(loaded).not.toBeNull();
      expect(loaded?.receiptNumber).toBe('RENT-CUSTOM-01');
      expect(loaded?.landlord.pan).toBe('ABCDE1234F');

      expect(clearRentReceiptDraft()).toBe(true);
      expect(loadRentReceiptDraft()).toBeNull();
    });
  });
});
