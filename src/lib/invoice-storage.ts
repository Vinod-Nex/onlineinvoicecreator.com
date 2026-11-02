import type { Invoice, InvoiceParty, PaymentDetails } from './invoice-calc';
import { createDefaultInvoice } from './invoice-calc';
import { incrementInvoiceNumber, formatDateForInput, addDaysToDate } from './invoice-form';

/**
 * Storage keys for local-first persistence
 */
export const STORAGE_KEYS = {
  DRAFT: 'oic_invoice_draft_v1',
  LAST_NUMBER: 'oic_last_invoice_number',
  BUSINESS_PROFILE: 'oic_business_profile_v1',
  SAVED_CLIENTS: 'oic_saved_clients_v1',
  SAVED_TEMPLATES: 'oic_saved_templates_v1',
  SETTINGS: 'oic_invoice_settings',
} as const;

export interface BusinessProfile {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  taxId?: string;
  logo?: string;
  paymentDetails?: PaymentDetails;
  updatedAt: string;
}

export interface SavedClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  taxId?: string;
  lastUsedAt: string;
}

export interface SavedInvoiceTemplate {
  id: string;
  name: string;
  createdAt: string;
  invoice: Invoice;
}

export interface ExportedInvoiceJson {
  generator: string;
  schemaVersion: string;
  exportedAt: string;
  invoice: Invoice;
}

// In-memory fallback map in case localStorage is disabled, blocked, or in private browsing mode
const memoryStorage = new Map<string, string>();

/**
 * Safely tests whether localStorage is available and writable in the current browser context.
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const testKey = '__oic_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely retrieves an item from localStorage with in-memory fallback.
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    if (window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch (err) {
    console.warn(`[Storage] Failed to read "${key}" from localStorage:`, err);
  }
  return memoryStorage.get(key) ?? null;
}

/**
 * Safely writes an item to localStorage with in-memory fallback.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  // Always update memory storage as fallback
  memoryStorage.set(key, value);
  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
    return true;
  } catch (err) {
    console.warn(`[Storage] Failed to write "${key}" to localStorage:`, err);
    return false;
  }
}

/**
 * Safely removes an item from localStorage and in-memory fallback.
 */
export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  memoryStorage.delete(key);
  try {
    if (window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return true;
  } catch (err) {
    console.warn(`[Storage] Failed to remove "${key}" from localStorage:`, err);
    return false;
  }
}

/**
 * Saves current invoice draft safely to localStorage.
 */
export function saveInvoiceDraft(invoice: Invoice): boolean {
  try {
    const serialized = JSON.stringify(invoice);
    const success = safeSetItem(STORAGE_KEYS.DRAFT, serialized);
    if (invoice.invoiceNumber && invoice.invoiceNumber.trim()) {
      safeSetItem(STORAGE_KEYS.LAST_NUMBER, invoice.invoiceNumber.trim());
    }
    return success;
  } catch (err) {
    console.warn('[Storage] Could not serialize invoice draft:', err);
    return false;
  }
}

/**
 * Loads current invoice draft safely from localStorage.
 */
export function loadInvoiceDraft(): Invoice | null {
  const raw = safeGetItem(STORAGE_KEYS.DRAFT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Invoice;
  } catch (err) {
    console.warn('[Storage] Could not parse invoice draft from localStorage:', err);
    return null;
  }
}

/**
 * Clears current invoice draft from localStorage.
 */
export function clearInvoiceDraft(): boolean {
  return safeRemoveItem(STORAGE_KEYS.DRAFT);
}

/**
 * Saves or updates business profile (sender details, payment details, logo).
 */
export function saveBusinessProfile(profile: {
  sender: InvoiceParty;
  paymentDetails?: PaymentDetails;
  logo?: string;
}): boolean {
  try {
    const data: BusinessProfile = {
      name: profile.sender.name || '',
      email: profile.sender.email || '',
      phone: profile.sender.phone,
      address: profile.sender.address,
      taxId: profile.sender.taxId,
      logo: profile.logo,
      paymentDetails: profile.paymentDetails,
      updatedAt: new Date().toISOString(),
    };
    return safeSetItem(STORAGE_KEYS.BUSINESS_PROFILE, JSON.stringify(data));
  } catch (err) {
    console.warn('[Storage] Failed to save business profile:', err);
    return false;
  }
}

/**
 * Loads business profile from localStorage.
 */
export function loadBusinessProfile(): BusinessProfile | null {
  const raw = safeGetItem(STORAGE_KEYS.BUSINESS_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BusinessProfile;
  } catch (err) {
    console.warn('[Storage] Failed to parse business profile:', err);
    return null;
  }
}

/**
 * Saves or updates a client profile into the saved clients list.
 * Deduplicates by client name (case-insensitive) or email, keeps top 50 recent clients.
 */
export function saveClientProfile(client: Partial<InvoiceParty>): boolean {
  if (!client.name || !client.name.trim()) return false;
  try {
    const clients = loadSavedClients();
    const trimmedName = client.name.trim();
    const trimmedEmail = (client.email || '').trim().toLowerCase();

    // Check if client already exists
    const existingIndex = clients.findIndex(
      (c) =>
        c.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
        (trimmedEmail && c.email.trim().toLowerCase() === trimmedEmail)
    );

    const now = new Date().toISOString();
    const updatedClient: SavedClient = {
      id:
        existingIndex >= 0
          ? clients[existingIndex].id
          : `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      email: client.email?.trim() || '',
      phone: client.phone?.trim() || '',
      address: client.address?.trim() || '',
      taxId: client.taxId?.trim() || '',
      lastUsedAt: now,
    };

    if (existingIndex >= 0) {
      clients[existingIndex] = updatedClient;
    } else {
      clients.unshift(updatedClient);
    }

    // Limit to 50 most recent clients
    const pruned = clients.slice(0, 50);
    return safeSetItem(STORAGE_KEYS.SAVED_CLIENTS, JSON.stringify(pruned));
  } catch (err) {
    console.warn('[Storage] Failed to save client profile:', err);
    return false;
  }
}

/**
 * Loads list of saved clients from localStorage, sorted by most recently used.
 */
export function loadSavedClients(): SavedClient[] {
  const raw = safeGetItem(STORAGE_KEYS.SAVED_CLIENTS);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.sort(
      (a, b) => new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime()
    );
  } catch (err) {
    console.warn('[Storage] Failed to parse saved clients:', err);
    return [];
  }
}

/**
 * Deletes a client profile by ID.
 */
export function deleteSavedClient(id: string): boolean {
  try {
    const clients = loadSavedClients().filter((c) => c.id !== id);
    return safeSetItem(STORAGE_KEYS.SAVED_CLIENTS, JSON.stringify(clients));
  } catch (err) {
    console.warn('[Storage] Failed to delete client:', err);
    return false;
  }
}

/**
 * Saves current invoice configuration as a reusable custom template.
 */
export function saveCustomTemplate(name: string, invoice: Invoice): SavedInvoiceTemplate | null {
  const trimmedName = name.trim() || `Template ${new Date().toLocaleDateString()}`;
  try {
    const templates = loadCustomTemplates();
    const newTemplate: SavedInvoiceTemplate = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      createdAt: new Date().toISOString(),
      invoice: JSON.parse(JSON.stringify(invoice)), // deep copy
    };

    templates.unshift(newTemplate);
    // Limit to 20 custom templates
    const pruned = templates.slice(0, 20);
    safeSetItem(STORAGE_KEYS.SAVED_TEMPLATES, JSON.stringify(pruned));
    return newTemplate;
  } catch (err) {
    console.warn('[Storage] Failed to save custom template:', err);
    return null;
  }
}

/**
 * Loads all saved custom templates from localStorage.
 */
export function loadCustomTemplates(): SavedInvoiceTemplate[] {
  const raw = safeGetItem(STORAGE_KEYS.SAVED_TEMPLATES);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[Storage] Failed to parse saved templates:', err);
    return [];
  }
}

/**
 * Deletes a custom template by ID.
 */
export function deleteCustomTemplate(id: string): boolean {
  try {
    const templates = loadCustomTemplates().filter((t) => t.id !== id);
    return safeSetItem(STORAGE_KEYS.SAVED_TEMPLATES, JSON.stringify(templates));
  } catch (err) {
    console.warn('[Storage] Failed to delete custom template:', err);
    return false;
  }
}

/**
 * Duplicates an invoice by incrementing the invoice number and setting dates to today.
 * Preserves sender details, client details, line items, notes, terms, discount, and template.
 */
export function duplicateInvoice(current: Invoice): Invoice {
  const duplicated: Invoice = JSON.parse(JSON.stringify(current));

  // Auto-increment invoice number
  duplicated.invoiceNumber = incrementInvoiceNumber(current.invoiceNumber || 'INV-001');

  // Set issue date to today
  const today = new Date();
  duplicated.issueDate = formatDateForInput(today);

  // Compute days difference between original issueDate and dueDate (default 14 days)
  let dayOffset = 14;
  if (current.issueDate && current.dueDate) {
    const origIssue = new Date(current.issueDate).getTime();
    const origDue = new Date(current.dueDate).getTime();
    if (!isNaN(origIssue) && !isNaN(origDue) && origDue >= origIssue) {
      dayOffset = Math.round((origDue - origIssue) / (1000 * 60 * 60 * 24));
    }
  }
  duplicated.dueDate = addDaysToDate(duplicated.issueDate, dayOffset);

  // Assign fresh unique IDs to line items
  if (Array.isArray(duplicated.lineItems)) {
    duplicated.lineItems = duplicated.lineItems.map((item, idx) => ({
      ...item,
      id: `item_${Date.now()}_${idx}`,
    }));
  }

  return duplicated;
}

/**
 * Formats an invoice as a clean, standardized JSON export string.
 */
export function exportInvoiceToJson(invoice: Invoice): string {
  const exportPayload: ExportedInvoiceJson = {
    generator: 'OnlineInvoiceCreator.com',
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    invoice,
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Initiates a browser JSON file download for the current invoice.
 */
export function triggerJsonDownload(invoice: Invoice, filename?: string): void {
  if (typeof document === 'undefined') return;

  const jsonStr = exportInvoiceToJson(invoice);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const safeNumber = (invoice.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9-_]/g, '_');
  link.href = url;
  link.download = filename || `${safeNumber}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Safely parses and validates an imported JSON file string into an Invoice object.
 * Returns either { success: true, invoice } or { success: false, error }.
 */
export function importInvoiceFromJson(jsonString: string): {
  success: boolean;
  invoice?: Invoice;
  error?: string;
} {
  if (!jsonString || !jsonString.trim()) {
    return { success: false, error: 'Empty JSON file provided' };
  }

  try {
    const parsed = JSON.parse(jsonString);

    // Support both direct Invoice objects and wrapped { generator, invoice } envelopes
    const rawInvoice =
      parsed.invoice && typeof parsed.invoice === 'object' ? parsed.invoice : parsed;

    if (!rawInvoice || typeof rawInvoice !== 'object') {
      return { success: false, error: 'JSON does not contain a valid invoice object' };
    }

    // Merge onto default invoice to ensure complete shape and zero undefined crashes
    const defaultInv = createDefaultInvoice();

    const merged: Invoice = {
      invoiceNumber:
        typeof rawInvoice.invoiceNumber === 'string' && rawInvoice.invoiceNumber.trim()
          ? rawInvoice.invoiceNumber.trim()
          : defaultInv.invoiceNumber,
      issueDate:
        typeof rawInvoice.issueDate === 'string' && rawInvoice.issueDate.trim()
          ? rawInvoice.issueDate.trim()
          : defaultInv.issueDate,
      dueDate:
        typeof rawInvoice.dueDate === 'string' && rawInvoice.dueDate.trim()
          ? rawInvoice.dueDate.trim()
          : defaultInv.dueDate,
      currency:
        typeof rawInvoice.currency === 'string' && rawInvoice.currency.trim()
          ? rawInvoice.currency.trim()
          : defaultInv.currency,
      template: ['classic', 'modern', 'minimal', 'compact'].includes(rawInvoice.template)
        ? rawInvoice.template
        : defaultInv.template,
      pageFormat: ['a4', 'letter'].includes(rawInvoice.pageFormat)
        ? rawInvoice.pageFormat
        : defaultInv.pageFormat,
      logo:
        typeof rawInvoice.logo === 'string'
          ? rawInvoice.logo
          : rawInvoice.sender?.logo || undefined,
      sender: {
        name: rawInvoice.sender?.name || '',
        email: rawInvoice.sender?.email || '',
        phone: rawInvoice.sender?.phone || '',
        address: rawInvoice.sender?.address || '',
        taxId: rawInvoice.sender?.taxId || '',
      },
      client: {
        name: rawInvoice.client?.name || '',
        email: rawInvoice.client?.email || '',
        phone: rawInvoice.client?.phone || '',
        address: rawInvoice.client?.address || '',
        taxId: rawInvoice.client?.taxId || '',
      },
      lineItems:
        Array.isArray(rawInvoice.lineItems) && rawInvoice.lineItems.length > 0
          ? rawInvoice.lineItems.map((item: any, idx: number) => ({
              id: item.id || `item_${Date.now()}_${idx}`,
              description: String(item.description || ''),
              quantity: Number(item.quantity) || 0,
              unitPrice: Number(item.unitPrice) || 0,
              taxRate: Number(item.taxRate) || 0,
            }))
          : defaultInv.lineItems,
      discount: rawInvoice.discount
        ? {
            type: rawInvoice.discount.type === 'percentage' ? 'percentage' : 'fixed',
            value: Number(rawInvoice.discount.value) || 0,
          }
        : undefined,
      shipping: typeof rawInvoice.shipping === 'number' ? rawInvoice.shipping : undefined,
      documentTitle:
        typeof rawInvoice.documentTitle === 'string' && rawInvoice.documentTitle.trim()
          ? rawInvoice.documentTitle.trim()
          : defaultInv.documentTitle || 'INVOICE',
      poNumber: typeof rawInvoice.poNumber === 'string' ? rawInvoice.poNumber.trim() : '',
      shipTo: rawInvoice.shipTo
        ? {
            name: rawInvoice.shipTo.name || '',
            email: rawInvoice.shipTo.email || '',
            phone: rawInvoice.shipTo.phone || '',
            address: rawInvoice.shipTo.address || '',
            taxId: rawInvoice.shipTo.taxId || '',
          }
        : undefined,
      amountPaid: typeof rawInvoice.amountPaid === 'number' ? rawInvoice.amountPaid : 0,
      paymentQrType: ['upi', 'paypal', 'link', 'sepa', 'none'].includes(rawInvoice.paymentQrType)
        ? rawInvoice.paymentQrType
        : 'none',
      paymentQrValue: typeof rawInvoice.paymentQrValue === 'string' ? rawInvoice.paymentQrValue : '',
      customLabels:
        rawInvoice.customLabels && typeof rawInvoice.customLabels === 'object'
          ? rawInvoice.customLabels
          : {},
      paymentDetails: rawInvoice.paymentDetails
        ? {
            bankName: rawInvoice.paymentDetails.bankName || '',
            accountName: rawInvoice.paymentDetails.accountName || '',
            accountNumber: rawInvoice.paymentDetails.accountNumber || '',
            routingNumber: rawInvoice.paymentDetails.routingNumber || '',
            swiftBic: rawInvoice.paymentDetails.swiftBic || '',
            iban: rawInvoice.paymentDetails.iban || '',
            paymentLink: rawInvoice.paymentDetails.paymentLink || '',
            terms: rawInvoice.paymentDetails.terms || rawInvoice.paymentDetails.paymentTerms || '',
            customInstructions: rawInvoice.paymentDetails.customInstructions || '',
          }
        : undefined,
      notes: typeof rawInvoice.notes === 'string' ? rawInvoice.notes : '',
      signature: typeof rawInvoice.signature === 'string' ? rawInvoice.signature : '',
    };

    return { success: true, invoice: merged };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid JSON syntax';
    return { success: false, error: message };
  }
}

/**
 * Completely clears all application data from localStorage and memory storage.
 * Removes all oic_* keys: drafts, saved profiles, clients, templates, and history.
 */
export function clearAllStoredData(): boolean {
  memoryStorage.clear();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Find all keys starting with 'oic_'
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('oic_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
      return true;
    }
    return true;
  } catch (err) {
    console.warn('[Storage] Failed to clear all stored data:', err);
    return false;
  }
}
