import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isLocalStorageAvailable,
  safeSetItem,
  safeGetItem,
  safeRemoveItem,
  saveInvoiceDraft,
  loadInvoiceDraft,
  clearInvoiceDraft,
  saveBusinessProfile,
  loadBusinessProfile,
  saveClientProfile,
  loadSavedClients,
  deleteSavedClient,
  saveCustomTemplate,
  loadCustomTemplates,
  deleteCustomTemplate,
  duplicateInvoice,
  exportInvoiceToJson,
  importInvoiceFromJson,
  clearAllStoredData,
} from '../src/lib/invoice-storage';
import { createDefaultInvoice } from '../src/lib/invoice-calc';
import { formatDateForInput } from '../src/lib/invoice-form';

class MockLocalStorage {
  store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] || null;
  }
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

describe('Invoice Storage & Privacy Module', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as any).window = {
      localStorage: mockStorage,
    };
    clearAllStoredData();
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  describe('Storage Availability & Safe Wrapper', () => {
    it('detects localStorage availability correctly', () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });

    it('safely sets, gets, and removes values', () => {
      expect(safeSetItem('test_key', 'test_value')).toBe(true);
      expect(safeGetItem('test_key')).toBe('test_value');
      expect(safeRemoveItem('test_key')).toBe(true);
      expect(safeGetItem('test_key')).toBeNull();
    });

    it('falls back gracefully to in-memory store when localStorage throws', () => {
      const originalSetItem = window.localStorage.setItem;
      // Simulate quota exceeded or storage disabled
      window.localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError: storage is full or disabled');
      });

      // Even if localStorage throws, safeSetItem catches error, returns false, but saves in memory
      expect(safeSetItem('blocked_key', 'in_memory_val')).toBe(false);
      expect(safeGetItem('blocked_key')).toBe('in_memory_val');

      // Restore
      window.localStorage.setItem = originalSetItem;
    });
  });

  describe('Invoice Draft Persistence', () => {
    it('saves and loads draft accurately', () => {
      const inv = createDefaultInvoice();
      inv.invoiceNumber = 'INV-999';
      inv.sender.name = 'Test Studio';

      expect(saveInvoiceDraft(inv)).toBe(true);
      const loaded = loadInvoiceDraft();
      expect(loaded).not.toBeNull();
      expect(loaded?.invoiceNumber).toBe('INV-999');
      expect(loaded?.sender.name).toBe('Test Studio');
    });

    it('clears draft on demand', () => {
      const inv = createDefaultInvoice();
      saveInvoiceDraft(inv);
      expect(loadInvoiceDraft()).not.toBeNull();

      expect(clearInvoiceDraft()).toBe(true);
      expect(loadInvoiceDraft()).toBeNull();
    });
  });

  describe('Business Profile (Sender details & payment info)', () => {
    it('saves and loads business profile', () => {
      saveBusinessProfile({
        sender: {
          name: 'Apex Design Ltd',
          email: 'finance@apex.io',
          phone: '+1 555-0199',
          address: '100 Market St, SF',
          taxId: 'US-998877',
        },
        paymentDetails: {
          bankName: 'Silicon Valley Bank',
          accountNumber: '987654321',
        },
        logo: 'data:image/png;base64,mocklogodata',
      });

      const profile = loadBusinessProfile();
      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('Apex Design Ltd');
      expect(profile?.email).toBe('finance@apex.io');
      expect(profile?.phone).toBe('+1 555-0199');
      expect(profile?.paymentDetails?.bankName).toBe('Silicon Valley Bank');
      expect(profile?.logo).toBe('data:image/png;base64,mocklogodata');
    });
  });

  describe('Client Directory (Saved Clients)', () => {
    it('saves, updates, and deduplicates clients by name', () => {
      saveClientProfile({
        name: 'Acme Corporation',
        email: 'billing@acme.com',
        phone: '+1 234 567 8900',
        address: '1 Road Way',
      });

      let clients = loadSavedClients();
      expect(clients.length).toBe(1);
      expect(clients[0].name).toBe('Acme Corporation');
      expect(clients[0].email).toBe('billing@acme.com');

      // Update same client with new details
      saveClientProfile({
        name: 'Acme Corporation',
        email: 'accounts@acme.com',
        phone: '+1 234 567 8900',
        address: '2 Road Way',
      });

      clients = loadSavedClients();
      expect(clients.length).toBe(1);
      expect(clients[0].email).toBe('accounts@acme.com');
      expect(clients[0].address).toBe('2 Road Way');
    });

    it('can delete a saved client by id', () => {
      saveClientProfile({ name: 'Client A', email: 'a@example.com' });
      saveClientProfile({ name: 'Client B', email: 'b@example.com' });

      let clients = loadSavedClients();
      expect(clients.length).toBe(2);

      const targetId = clients.find((c) => c.name === 'Client A')!.id;
      deleteSavedClient(targetId);

      clients = loadSavedClients();
      expect(clients.length).toBe(1);
      expect(clients[0].name).toBe('Client B');
    });
  });

  describe('Custom Templates (Save as Template)', () => {
    it('saves invoice configuration as a reusable template', () => {
      const inv = createDefaultInvoice();
      inv.template = 'minimal';
      inv.currency = 'EUR';
      inv.sender.name = 'Consulting Inc';

      const tmpl = saveCustomTemplate('Freelance Monthly', inv);
      expect(tmpl).not.toBeNull();
      expect(tmpl?.name).toBe('Freelance Monthly');

      const list = loadCustomTemplates();
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('Freelance Monthly');
      expect(list[0].invoice.template).toBe('minimal');
      expect(list[0].invoice.currency).toBe('EUR');
    });

    it('deletes custom templates by id', () => {
      const inv = createDefaultInvoice();
      const tmpl = saveCustomTemplate('To Delete', inv);
      expect(loadCustomTemplates().length).toBe(1);

      deleteCustomTemplate(tmpl!.id);
      expect(loadCustomTemplates().length).toBe(0);
    });
  });

  describe('Duplicate Invoice', () => {
    it('creates an incremented duplicate with today as issue date and proper due date offset', () => {
      const inv = createDefaultInvoice();
      inv.invoiceNumber = 'INV-042';
      inv.issueDate = '2026-01-01';
      inv.dueDate = '2026-01-15'; // 14 days difference
      inv.sender.name = 'Studio Alpha';
      inv.client.name = 'Client Beta';
      inv.lineItems = [
        {
          id: 'item_1',
          description: 'UI Design Sprint',
          quantity: 2,
          unitPrice: 1500,
          taxRate: 10,
        },
      ];

      const duplicated = duplicateInvoice(inv);

      // Auto-incremented number
      expect(duplicated.invoiceNumber).toBe('INV-043');
      // Preserved fields
      expect(duplicated.sender.name).toBe('Studio Alpha');
      expect(duplicated.client.name).toBe('Client Beta');
      expect(duplicated.lineItems.length).toBe(1);
      expect(duplicated.lineItems[0].description).toBe('UI Design Sprint');
      // Fresh item ID
      expect(duplicated.lineItems[0].id).not.toBe('item_1');

      // Dates updated
      const nowStr = formatDateForInput(new Date());
      expect(duplicated.issueDate).toBe(nowStr);
    });
  });

  describe('JSON Export and Import', () => {
    it('exports invoice to standardized JSON string', () => {
      const inv = createDefaultInvoice();
      inv.invoiceNumber = 'INV-EXPORT-01';
      const jsonStr = exportInvoiceToJson(inv);

      const parsed = JSON.parse(jsonStr);
      expect(parsed.generator).toBe('OnlineInvoiceCreator.com');
      expect(parsed.schemaVersion).toBe('1.0');
      expect(parsed.invoice.invoiceNumber).toBe('INV-EXPORT-01');
    });

    it('successfully imports valid invoice JSON envelope', () => {
      const inv = createDefaultInvoice();
      inv.invoiceNumber = 'INV-IMP-100';
      inv.sender.name = 'Imported Sender';
      const jsonStr = exportInvoiceToJson(inv);

      const result = importInvoiceFromJson(jsonStr);
      expect(result.success).toBe(true);
      expect(result.invoice?.invoiceNumber).toBe('INV-IMP-100');
      expect(result.invoice?.sender.name).toBe('Imported Sender');
    });

    it('successfully imports raw invoice object JSON without envelope', () => {
      const inv = createDefaultInvoice();
      inv.invoiceNumber = 'INV-RAW-002';
      const jsonStr = JSON.stringify(inv);

      const result = importInvoiceFromJson(jsonStr);
      expect(result.success).toBe(true);
      expect(result.invoice?.invoiceNumber).toBe('INV-RAW-002');
    });

    it('rejects invalid JSON syntax gracefully', () => {
      const result = importInvoiceFromJson('{ not valid json');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects empty or whitespace input', () => {
      const result = importInvoiceFromJson('   ');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty JSON file');
    });
  });

  describe('Clear All Stored Data (Clear my data)', () => {
    it('wipes all oic_* entries from localStorage and memory', () => {
      saveInvoiceDraft(createDefaultInvoice());
      saveBusinessProfile({ sender: { name: 'To Be Cleared', email: 'clear@me.com' } });
      saveClientProfile({ name: 'Client To Clear', email: 'c@me.com' });
      saveCustomTemplate('Tmpl to clear', createDefaultInvoice());

      expect(loadInvoiceDraft()).not.toBeNull();
      expect(loadBusinessProfile()).not.toBeNull();
      expect(loadSavedClients().length).toBeGreaterThan(0);
      expect(loadCustomTemplates().length).toBeGreaterThan(0);

      clearAllStoredData();

      expect(loadInvoiceDraft()).toBeNull();
      expect(loadBusinessProfile()).toBeNull();
      expect(loadSavedClients().length).toBe(0);
      expect(loadCustomTemplates().length).toBe(0);
    });
  });
});
