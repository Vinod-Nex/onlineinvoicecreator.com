import { type LineItem, type Discount, calculateTotals, formatCurrency } from './invoice-calc';
import { formatDateForInput } from './invoice-form';
import { safeGetItem, safeSetItem, safeRemoveItem } from './invoice-storage';

export type ReceiptType = 'itemized' | 'cash' | 'payment';

export interface ReceiptParty {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

export interface ReceiptData {
  receiptType: ReceiptType;
  receiptNumber: string;
  paymentDate: string;
  currency: string;
  template: 'classic' | 'modern' | 'minimal' | 'compact';
  pageFormat: 'a4' | 'letter';
  logo?: string;
  merchant: ReceiptParty;
  customer: ReceiptParty;
  paymentMethod: string;
  transactionReference?: string;
  lineItems: LineItem[];
  discount?: Discount;
  taxRate?: number;
  notes?: string;
  signature?: string;
}

export const RECEIPT_STORAGE_KEYS = {
  DRAFT: 'oic_receipt_draft_v1',
  LAST_NUMBER: 'oic_receipt_last_number',
} as const;

export function createDefaultReceipt(): ReceiptData {
  const today = formatDateForInput(new Date());

  return {
    receiptType: 'itemized',
    receiptNumber: 'REC-001',
    paymentDate: today,
    currency: 'USD',
    template: 'modern',
    pageFormat: 'a4',
    merchant: {
      name: 'Northstar Studio LLC',
      email: 'billing@northstar.io',
      phone: '+1 (555) 234-5678',
      address: '742 Evergreen Terrace, Suite 100\nSpringfield, OR 97477',
      taxId: 'US-987654321',
    },
    customer: {
      name: 'Acme Technologies',
      email: 'finance@acme.com',
      phone: '+1 (555) 876-5432',
      address: '1200 Innovation Way\nAustin, TX 78701',
    },
    paymentMethod: 'Credit Card',
    transactionReference: 'TXN-8849201',
    lineItems: [
      {
        id: 'rec_item_1',
        description: 'Brand Identity & Design System',
        quantity: 1,
        unitPrice: 1850,
        taxRate: 0,
      },
      {
        id: 'rec_item_2',
        description: 'Frontend Implementation Sprint',
        quantity: 1,
        unitPrice: 1200,
        taxRate: 0,
      },
    ],
    notes:
      'Thank you for your prompt payment! This receipt confirms full settlement of the invoice.',
    signature: 'Authorized Signatory',
  };
}

export function saveReceiptDraft(receipt: ReceiptData): boolean {
  try {
    const serialized = JSON.stringify(receipt);
    const success = safeSetItem(RECEIPT_STORAGE_KEYS.DRAFT, serialized);
    if (receipt.receiptNumber && receipt.receiptNumber.trim()) {
      safeSetItem(RECEIPT_STORAGE_KEYS.LAST_NUMBER, receipt.receiptNumber.trim());
    }
    return success;
  } catch (err) {
    console.warn('[Receipt] Failed to save draft:', err);
    return false;
  }
}

export function loadReceiptDraft(): ReceiptData | null {
  const raw = safeGetItem(RECEIPT_STORAGE_KEYS.DRAFT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReceiptData;
  } catch (err) {
    console.warn('[Receipt] Failed to parse draft:', err);
    return null;
  }
}

export function clearReceiptDraft(): boolean {
  return safeRemoveItem(RECEIPT_STORAGE_KEYS.DRAFT);
}

export { calculateTotals, formatCurrency };
