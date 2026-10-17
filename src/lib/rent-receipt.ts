import { formatCurrency } from './invoice-calc';
import { formatDateForInput } from './invoice-form';
import { safeGetItem, safeSetItem, safeRemoveItem } from './invoice-storage';

export interface RentParty {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  pan?: string; // Optional Landlord PAN / Tax ID
}

export interface RentReceiptData {
  receiptNumber: string;
  paymentDate: string;
  currency: string;
  template: 'classic' | 'modern' | 'minimal' | 'compact';
  pageFormat: 'a4' | 'letter';
  landlord: RentParty;
  tenant: RentParty;
  propertyAddress: string;
  periodMonthYear: string;
  periodStart?: string;
  periodEnd?: string;
  rentAmount: number;
  maintenanceAmount?: number;
  paymentMode: string;
  transactionReference?: string;
  notes?: string;
  landlordSignature?: string;
}

export const RENT_RECEIPT_STORAGE_KEYS = {
  DRAFT: 'oic_rent_receipt_draft_v1',
  LAST_NUMBER: 'oic_rent_receipt_last_number',
} as const;

export function createDefaultRentReceipt(): RentReceiptData {
  const today = formatDateForInput(new Date());

  // Current month and year e.g. "October 2026"
  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const periodMonthYear = `${monthName} ${year}`;

  return {
    receiptNumber: `RENT-${year}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    paymentDate: today,
    currency: 'USD',
    template: 'modern',
    pageFormat: 'a4',
    landlord: {
      name: 'Robert Vance',
      email: 'robert.vance@propertygroup.com',
      phone: '+1 (555) 345-6789',
      address: '450 Oak Ridge Lane, Suite 2B\nSeattle, WA 98101',
      pan: '', // Optional Landlord PAN
    },
    tenant: {
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phone: '+1 (555) 987-6543',
    },
    propertyAddress: 'Apartment 4B, 128 Pine View Drive, Seattle, WA 98101',
    periodMonthYear,
    periodStart: `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    periodEnd: `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-31`,
    rentAmount: 1850,
    maintenanceAmount: 150,
    paymentMode: 'Bank Transfer',
    transactionReference: 'NEFT-REF-9928174',
    notes:
      'Received with thanks. Next monthly rent payment is due on or before the 1st of next month.',
    landlordSignature: 'Robert Vance (Authorized Landlord / Owner)',
  };
}

export function calculateRentGrandTotal(receipt: RentReceiptData): number {
  const rent =
    typeof receipt.rentAmount === 'number' && !isNaN(receipt.rentAmount) ? receipt.rentAmount : 0;
  const maintenance =
    typeof receipt.maintenanceAmount === 'number' && !isNaN(receipt.maintenanceAmount)
      ? receipt.maintenanceAmount
      : 0;
  return rent + maintenance;
}

export function saveRentReceiptDraft(receipt: RentReceiptData): boolean {
  try {
    const serialized = JSON.stringify(receipt);
    const success = safeSetItem(RENT_RECEIPT_STORAGE_KEYS.DRAFT, serialized);
    if (receipt.receiptNumber && receipt.receiptNumber.trim()) {
      safeSetItem(RENT_RECEIPT_STORAGE_KEYS.LAST_NUMBER, receipt.receiptNumber.trim());
    }
    return success;
  } catch (err) {
    console.warn('[RentReceipt] Failed to save draft:', err);
    return false;
  }
}

export function loadRentReceiptDraft(): RentReceiptData | null {
  const raw = safeGetItem(RENT_RECEIPT_STORAGE_KEYS.DRAFT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RentReceiptData;
  } catch (err) {
    console.warn('[RentReceipt] Failed to parse draft:', err);
    return null;
  }
}

export function clearRentReceiptDraft(): boolean {
  return safeRemoveItem(RENT_RECEIPT_STORAGE_KEYS.DRAFT);
}

export { formatCurrency };
