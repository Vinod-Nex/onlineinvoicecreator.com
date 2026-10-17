import type { Invoice } from './invoice-calc';

// Re-export storage constants and functions from invoice-storage
export {
  STORAGE_KEYS,
  saveInvoiceDraft,
  loadInvoiceDraft,
  clearInvoiceDraft,
} from './invoice-storage';

/**
 * Intelligent Invoice Number Auto-Incrementer
 * Handles patterns:
 * - "INV-001" -> "INV-002"
 * - "INV-099" -> "INV-100"
 * - "2026-0042" -> "2026-0043"
 * - "BILL-10" -> "BILL-11"
 * - "1" -> "2"
 * - "INV-001-A" -> "INV-002-A"
 * - Empty string or non-numeric -> "INV-001"
 */
export function incrementInvoiceNumber(current: string): string {
  if (!current || !current.trim()) {
    return 'INV-001';
  }

  const trimmed = current.trim();
  // Match the last sequence of digits in the string
  const match = trimmed.match(/^(.*?)(\d+)([^\d]*)$/);

  if (!match) {
    return `${trimmed}-001`;
  }

  const [, prefix, digits, suffix] = match;
  const num = parseInt(digits, 10);
  const nextNum = num + 1;
  // Preserve leading zero padding
  const padded = String(nextNum).padStart(digits.length, '0');

  return `${prefix}${padded}${suffix}`;
}

/**
 * Offsets a YYYY-MM-DD date string by a specific number of days.
 */
export function addDaysToDate(dateString: string, days: number): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      const now = new Date();
      now.setDate(now.getDate() + days);
      return formatDateForInput(now);
    }
    date.setDate(date.getDate() + days);
    return formatDateForInput(date);
  } catch {
    const now = new Date();
    now.setDate(now.getDate() + days);
    return formatDateForInput(now);
  }
}

/**
 * Formats a JavaScript Date object as YYYY-MM-DD for standard HTML <input type="date">.
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates email format with simple RFC-compliant regex.
 */
export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return true; // empty allowed unless field is required
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates web URL format.
 */
export function isValidUrl(url: string): boolean {
  if (!url || !url.trim()) return true; // empty allowed unless field is required
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Field-level validation returning boolean and optional error message.
 */
export function validateInvoiceField(
  field: string,
  value: any
): { valid: boolean; error?: string } {
  switch (field) {
    case 'senderName':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return { valid: false, error: 'Business or sender name is required' };
      }
      return { valid: true };

    case 'senderEmail':
      if (value && !isValidEmail(value)) {
        return { valid: false, error: 'Please enter a valid email address' };
      }
      return { valid: true };

    case 'clientName':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return { valid: false, error: 'Client name is required' };
      }
      return { valid: true };

    case 'clientEmail':
      if (value && !isValidEmail(value)) {
        return { valid: false, error: 'Please enter a valid email address' };
      }
      return { valid: true };

    case 'invoiceNumber':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return { valid: false, error: 'Invoice number is required' };
      }
      return { valid: true };

    case 'issueDate':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return { valid: false, error: 'Issue date is required' };
      }
      return { valid: true };

    case 'dueDate':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return { valid: false, error: 'Due date is required' };
      }
      return { valid: true };

    case 'paymentLink':
      if (value && !isValidUrl(value)) {
        return { valid: false, error: 'Please enter a valid URL (e.g. https://...)' };
      }
      return { valid: true };

    case 'itemDescription':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return { valid: false, error: 'Description is required' };
      }
      return { valid: true };

    case 'itemQuantity':
      if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
        return { valid: false, error: 'Quantity is required' };
      }
      if (Number(value) < 0) {
        return { valid: false, error: 'Quantity must be 0 or greater' };
      }
      return { valid: true };

    case 'itemUnitPrice':
      if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
        return { valid: false, error: 'Unit price is required' };
      }
      if (Number(value) < 0) {
        return { valid: false, error: 'Price must be 0 or greater' };
      }
      return { valid: true };

    case 'itemTaxRate':
      if (value !== undefined && value !== null && value !== '') {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 100) {
          return { valid: false, error: 'Tax rate must be between 0% and 100%' };
        }
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

/**
 * Validates the complete invoice state before export or submission.
 */
export function validateInvoiceData(invoice: Partial<Invoice>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Sender
  const senderNameVal = validateInvoiceField('senderName', invoice.sender?.name);
  if (!senderNameVal.valid && senderNameVal.error) errors['sender.name'] = senderNameVal.error;

  const senderEmailVal = validateInvoiceField('senderEmail', invoice.sender?.email);
  if (!senderEmailVal.valid && senderEmailVal.error) errors['sender.email'] = senderEmailVal.error;

  // Client
  const clientNameVal = validateInvoiceField('clientName', invoice.client?.name);
  if (!clientNameVal.valid && clientNameVal.error) errors['client.name'] = clientNameVal.error;

  const clientEmailVal = validateInvoiceField('clientEmail', invoice.client?.email);
  if (!clientEmailVal.valid && clientEmailVal.error) errors['client.email'] = clientEmailVal.error;

  // Invoice Meta
  const invNumVal = validateInvoiceField('invoiceNumber', invoice.invoiceNumber);
  if (!invNumVal.valid && invNumVal.error) errors['invoiceNumber'] = invNumVal.error;

  const issueDateVal = validateInvoiceField('issueDate', invoice.issueDate);
  if (!issueDateVal.valid && issueDateVal.error) errors['issueDate'] = issueDateVal.error;

  const dueDateVal = validateInvoiceField('dueDate', invoice.dueDate);
  if (!dueDateVal.valid && dueDateVal.error) errors['dueDate'] = dueDateVal.error;

  // Payment Link
  const paymentLinkVal = validateInvoiceField('paymentLink', invoice.paymentDetails?.paymentLink);
  if (!paymentLinkVal.valid && paymentLinkVal.error)
    errors['paymentDetails.paymentLink'] = paymentLinkVal.error;

  // Line items
  const items = invoice.lineItems || [];
  if (items.length === 0) {
    errors['lineItems'] = 'At least one line item is required';
  } else {
    items.forEach((item, index) => {
      const descVal = validateInvoiceField('itemDescription', item.description);
      if (!descVal.valid && descVal.error) {
        errors[`lineItems.${index}.description`] = descVal.error;
      }

      const qtyVal = validateInvoiceField('itemQuantity', item.quantity);
      if (!qtyVal.valid && qtyVal.error) {
        errors[`lineItems.${index}.quantity`] = qtyVal.error;
      }

      const priceVal = validateInvoiceField('itemUnitPrice', item.unitPrice);
      if (!priceVal.valid && priceVal.error) {
        errors[`lineItems.${index}.unitPrice`] = priceVal.error;
      }

      const taxVal = validateInvoiceField('itemTaxRate', item.taxRate);
      if (!taxVal.valid && taxVal.error) {
        errors[`lineItems.${index}.taxRate`] = taxVal.error;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
