import {
  type Invoice,
  type LineItem,
  calculateTotals,
  formatCurrency,
  createDefaultInvoice,
} from '../lib/invoice-calc';
import {
  incrementInvoiceNumber,
  addDaysToDate,
  formatDateForInput,
  validateInvoiceField,
} from '../lib/invoice-form';
import {
  isLocalStorageAvailable,
  safeGetItem,
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
  duplicateInvoice,
  triggerJsonDownload,
  importInvoiceFromJson,
  clearAllStoredData,
  STORAGE_KEYS,
} from '../lib/invoice-storage';
import { validateImageFile, resizeImageFile, LOGO_CONFIG } from '../lib/image-utils';
import {
  exportInvoiceToPdf,
  exportInvoiceToPng,
  generateExportFilename,
  printInvoice,
} from '../lib/invoice-export';
import { TOP_30_CURRENCIES } from '../data/currencies';

export function setupInvoiceForm() {
  const formEl = document.getElementById('invoice-form') as HTMLFormElement | null;
  if (!formEl) return;

  // 1. Initial State Initialization
  const storedDraft = loadInvoiceDraft();
  let invoice: Invoice = storedDraft || createDefaultInvoice();

  // If no draft exists, but we have a saved business profile, prefill sender & banking
  if (!storedDraft) {
    const businessProfile = loadBusinessProfile();
    if (businessProfile) {
      if (businessProfile.name) invoice.sender.name = businessProfile.name;
      if (businessProfile.email) invoice.sender.email = businessProfile.email;
      if (businessProfile.phone) invoice.sender.phone = businessProfile.phone;
      if (businessProfile.address) invoice.sender.address = businessProfile.address;
      if (businessProfile.taxId) invoice.sender.taxId = businessProfile.taxId;
      if (businessProfile.logo) {
        invoice.logo = businessProfile.logo;
      }
      if (businessProfile.paymentDetails) {
        invoice.paymentDetails = { ...businessProfile.paymentDetails };
      }
    }
  }

  // If there's a stored last invoice number, check if we should auto-increment
  const lastNumber = safeGetItem(STORAGE_KEYS.LAST_NUMBER);
  if (!storedDraft && lastNumber) {
    invoice.invoiceNumber = incrementInvoiceNumber(lastNumber);
  }

  // Ensure line items have at least 1 item
  if (!invoice.lineItems || invoice.lineItems.length === 0) {
    invoice.lineItems = [
      {
        id: `item_${Date.now()}`,
        description: 'Professional Services',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ];
  }

  // 2. DOM Elements Selection
  const invoiceNumberInput = document.getElementById('field-invoice-number') as HTMLInputElement;
  const btnAutoIncrement = document.getElementById('btn-auto-increment') as HTMLButtonElement;
  const autoIncrementBadge = document.getElementById('auto-increment-badge') as HTMLElement;
  const issueDateInput = document.getElementById('field-issue-date') as HTMLInputElement;
  const dueDateInput = document.getElementById('field-due-date') as HTMLInputElement;
  const currencySelect = document.getElementById('field-currency') as HTMLSelectElement;

  // Sender elements
  const senderNameInput = document.getElementById('field-sender-name') as HTMLInputElement;
  const senderEmailInput = document.getElementById('field-sender-email') as HTMLInputElement;
  const senderPhoneInput = document.getElementById('field-sender-phone') as HTMLInputElement;
  const senderAddressInput = document.getElementById('field-sender-address') as HTMLTextAreaElement;
  const senderTaxIdInput = document.getElementById('field-sender-tax-id') as HTMLInputElement;

  // Client elements
  const clientNameInput = document.getElementById('field-client-name') as HTMLInputElement;
  const clientEmailInput = document.getElementById('field-client-email') as HTMLInputElement;
  const clientPhoneInput = document.getElementById('field-client-phone') as HTMLInputElement;
  const clientAddressInput = document.getElementById('field-client-address') as HTMLTextAreaElement;
  const clientTaxIdInput = document.getElementById('field-client-tax-id') as HTMLInputElement;

  // Line items container
  const lineItemsContainer = document.getElementById('line-items-container') as HTMLElement;
  const btnAddItem = document.getElementById('btn-add-item') as HTMLButtonElement;

  // Tax, discount & shipping
  const discountTypeSelect = document.getElementById('field-discount-type') as HTMLSelectElement;
  const discountValueInput = document.getElementById('field-discount-value') as HTMLInputElement;
  const shippingInput = document.getElementById('field-shipping') as HTMLInputElement;

  // Totals elements
  const subtotalDisplay = document.getElementById('display-subtotal') as HTMLElement;
  const discountRow = document.getElementById('row-discount') as HTMLElement;
  const discountDisplay = document.getElementById('display-discount') as HTMLElement;
  const taxBreakdownContainer = document.getElementById('tax-breakdown-container') as HTMLElement;
  const shippingRow = document.getElementById('row-shipping') as HTMLElement;
  const shippingDisplay = document.getElementById('display-shipping') as HTMLElement;
  const grandTotalDisplay = document.getElementById('display-grand-total') as HTMLElement;

  // Payment elements
  const bankNameInput = document.getElementById('field-bank-name') as HTMLInputElement;
  const accountNameInput = document.getElementById('field-account-name') as HTMLInputElement;
  const accountNumberInput = document.getElementById('field-account-number') as HTMLInputElement;
  const routingNumberInput = document.getElementById('field-routing-number') as HTMLInputElement;
  const swiftBicInput = document.getElementById('field-swift-bic') as HTMLInputElement;
  const ibanInput = document.getElementById('field-iban') as HTMLInputElement;
  const paymentLinkInput = document.getElementById('field-payment-link') as HTMLInputElement;
  const paymentTermsInput = document.getElementById('field-payment-terms') as HTMLInputElement;
  const customInstructionsInput = document.getElementById(
    'field-custom-instructions'
  ) as HTMLTextAreaElement;

  // Notes & Signatures
  const notesInput = document.getElementById('field-notes') as HTMLTextAreaElement;
  const signatureInput = document.getElementById('field-signature') as HTMLInputElement;

  // Logo upload
  const logoInput = document.getElementById('field-logo-file') as HTMLInputElement;
  const logoPreview = document.getElementById('logo-preview-img') as HTMLImageElement;
  const logoPlaceholder = document.getElementById('logo-placeholder') as HTMLElement;
  const btnRemoveLogo = document.getElementById('btn-remove-logo') as HTMLButtonElement;

  // Top/Bottom action bars
  const saveStatusIndicator = document.getElementById('save-status-indicator') as HTMLElement;
  const btnResetForm = document.getElementById('btn-reset-form') as HTMLButtonElement | null;
  const btnPrintInvoice = document.getElementById('btn-print-invoice') as HTMLButtonElement | null;
  const btnPrintPreview = document.getElementById('btn-print-preview') as HTMLButtonElement | null;
  const btnDownloadPdfForm = document.getElementById(
    'btn-download-pdf-form'
  ) as HTMLButtonElement | null;
  const btnDownloadPdfPreview = document.getElementById(
    'btn-download-pdf-preview'
  ) as HTMLButtonElement | null;
  const btnDownloadPngForm = document.getElementById(
    'btn-download-png-form'
  ) as HTMLButtonElement | null;
  const btnDownloadPngPreview = document.getElementById(
    'btn-download-png-preview'
  ) as HTMLButtonElement | null;
  const btnCloseToast = document.getElementById('btn-close-toast') as HTMLButtonElement | null;
  const errLogoFile = document.getElementById('err-logo-file') as HTMLElement | null;

  // Live Preview Document & Field DOM Elements
  const previewDocument = document.getElementById('invoice-preview-document') as HTMLElement | null;
  const previewLogoWrapper = document.getElementById('preview-logo-wrapper') as HTMLElement | null;
  const previewLogoImg = document.getElementById('preview-logo-img') as HTMLImageElement | null;
  const previewSenderName = document.getElementById('preview-sender-name') as HTMLElement | null;
  const previewSenderAddress = document.getElementById(
    'preview-sender-address'
  ) as HTMLElement | null;
  const previewSenderEmail = document.getElementById('preview-sender-email') as HTMLElement | null;
  const previewSenderPhone = document.getElementById('preview-sender-phone') as HTMLElement | null;
  const previewSenderTaxId = document.getElementById('preview-sender-tax-id') as HTMLElement | null;

  const previewInvoiceNumber = document.getElementById(
    'preview-invoice-number'
  ) as HTMLElement | null;
  const previewIssueDate = document.getElementById('preview-issue-date') as HTMLElement | null;
  const previewDueDate = document.getElementById('preview-due-date') as HTMLElement | null;
  const previewHeaderGrandTotal = document.getElementById(
    'preview-header-grand-total'
  ) as HTMLElement | null;
  const previewTermsPill = document.getElementById('preview-terms-pill') as HTMLElement | null;

  const previewClientName = document.getElementById('preview-client-name') as HTMLElement | null;
  const previewClientAddress = document.getElementById(
    'preview-client-address'
  ) as HTMLElement | null;
  const previewClientEmail = document.getElementById('preview-client-email') as HTMLElement | null;
  const previewClientPhone = document.getElementById('preview-client-phone') as HTMLElement | null;
  const previewClientTaxId = document.getElementById('preview-client-tax-id') as HTMLElement | null;

  const previewLineItemsTbody = document.getElementById(
    'preview-line-items-tbody'
  ) as HTMLElement | null;
  const previewNotesBlock = document.getElementById('preview-notes-block') as HTMLElement | null;
  const previewNotes = document.getElementById('preview-notes') as HTMLElement | null;
  const previewSignatureBlock = document.getElementById(
    'preview-signature-block'
  ) as HTMLElement | null;
  const previewSignature = document.getElementById('preview-signature') as HTMLElement | null;

  const previewSubtotal = document.getElementById('preview-subtotal') as HTMLElement | null;
  const previewRowDiscount = document.getElementById('preview-row-discount') as HTMLElement | null;
  const previewDiscountLabel = document.getElementById(
    'preview-discount-label'
  ) as HTMLElement | null;
  const previewDiscount = document.getElementById('preview-discount') as HTMLElement | null;
  const previewTaxBreakdown = document.getElementById(
    'preview-tax-breakdown'
  ) as HTMLElement | null;
  const previewRowShipping = document.getElementById('preview-row-shipping') as HTMLElement | null;
  const previewShipping = document.getElementById('preview-shipping') as HTMLElement | null;
  const previewGrandTotal = document.getElementById('preview-grand-total') as HTMLElement | null;

  const previewPaymentBlock = document.getElementById(
    'preview-payment-block'
  ) as HTMLElement | null;
  const previewBankItem = document.getElementById('preview-bank-item') as HTMLElement | null;
  const previewBankName = document.getElementById('preview-bank-name') as HTMLElement | null;
  const previewAccountItem = document.getElementById('preview-account-item') as HTMLElement | null;
  const previewAccountName = document.getElementById('preview-account-name') as HTMLElement | null;
  const previewAccNumItem = document.getElementById('preview-acc-num-item') as HTMLElement | null;
  const previewAccountNumber = document.getElementById(
    'preview-account-number'
  ) as HTMLElement | null;
  const previewRoutingItem = document.getElementById('preview-routing-item') as HTMLElement | null;
  const previewRoutingNumber = document.getElementById(
    'preview-routing-number'
  ) as HTMLElement | null;
  const previewIbanItem = document.getElementById('preview-iban-item') as HTMLElement | null;
  const previewIban = document.getElementById('preview-iban') as HTMLElement | null;
  const previewSwiftItem = document.getElementById('preview-swift-item') as HTMLElement | null;
  const previewSwiftBic = document.getElementById('preview-swift-bic') as HTMLElement | null;
  const previewLinkItem = document.getElementById('preview-link-item') as HTMLElement | null;
  const previewPaymentLink = document.getElementById(
    'preview-payment-link'
  ) as HTMLAnchorElement | null;
  const previewInstructionsItem = document.getElementById(
    'preview-instructions-item'
  ) as HTMLElement | null;
  const previewCustomInstructions = document.getElementById(
    'preview-custom-instructions'
  ) as HTMLElement | null;

  // Helper for debounce auto-saving
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  function triggerAutoSave() {
    if (saveStatusIndicator) {
      saveStatusIndicator.textContent = 'Saving...';
      saveStatusIndicator.classList.remove('opacity-0');
    }
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveInvoiceDraft(invoice);

      // Save business profile if sender name or email is entered
      if (invoice.sender && (invoice.sender.name || invoice.sender.email)) {
        saveBusinessProfile({
          sender: invoice.sender,
          paymentDetails: invoice.paymentDetails,
          logo: invoice.logo,
        });
      }

      // Save client profile if client name is entered
      if (invoice.client && invoice.client.name && invoice.client.name.trim()) {
        saveClientProfile(invoice.client);
        refreshSavedClientsDropdown();
      }

      if (saveStatusIndicator) {
        saveStatusIndicator.textContent = 'Saved locally';
        setTimeout(() => {
          saveStatusIndicator.classList.add('opacity-0');
        }, 1800);
      }
    }, 400);
  }

  // 3. Populate Initial Values into Form Inputs
  function populateFormInputs() {
    if (invoiceNumberInput) invoiceNumberInput.value = invoice.invoiceNumber || 'INV-001';
    if (issueDateInput) issueDateInput.value = invoice.issueDate || formatDateForInput(new Date());
    if (dueDateInput) dueDateInput.value = invoice.dueDate || addDaysToDate(invoice.issueDate, 14);
    if (currencySelect) currencySelect.value = invoice.currency || 'USD';

    // Sender
    if (senderNameInput) senderNameInput.value = invoice.sender.name || '';
    if (senderEmailInput) senderEmailInput.value = invoice.sender.email || '';
    if (senderPhoneInput) senderPhoneInput.value = invoice.sender.phone || '';
    if (senderAddressInput) senderAddressInput.value = invoice.sender.address || '';
    if (senderTaxIdInput) senderTaxIdInput.value = invoice.sender.taxId || '';

    // Client
    if (clientNameInput) clientNameInput.value = invoice.client.name || '';
    if (clientEmailInput) clientEmailInput.value = invoice.client.email || '';
    if (clientPhoneInput) clientPhoneInput.value = invoice.client.phone || '';
    if (clientAddressInput) clientAddressInput.value = invoice.client.address || '';
    if (clientTaxIdInput) clientTaxIdInput.value = invoice.client.taxId || '';

    // Discount & Shipping
    const discountVal =
      typeof invoice.discount === 'number' ? invoice.discount : invoice.discount?.value || 0;
    const discountType =
      typeof invoice.discount === 'object' && invoice.discount?.type
        ? invoice.discount.type
        : 'percentage';

    if (discountTypeSelect) discountTypeSelect.value = discountType;
    if (discountValueInput) discountValueInput.value = discountVal > 0 ? String(discountVal) : '';
    if (shippingInput) shippingInput.value = invoice.shipping > 0 ? String(invoice.shipping) : '';

    // Payment details
    if (invoice.paymentDetails) {
      if (bankNameInput) bankNameInput.value = invoice.paymentDetails.bankName || '';
      if (accountNameInput) accountNameInput.value = invoice.paymentDetails.accountName || '';
      if (accountNumberInput) accountNumberInput.value = invoice.paymentDetails.accountNumber || '';
      if (routingNumberInput) routingNumberInput.value = invoice.paymentDetails.routingNumber || '';
      if (swiftBicInput) swiftBicInput.value = invoice.paymentDetails.swiftBic || '';
      if (ibanInput) ibanInput.value = invoice.paymentDetails.iban || '';
      if (paymentLinkInput) paymentLinkInput.value = invoice.paymentDetails.paymentLink || '';
      if (paymentTermsInput) paymentTermsInput.value = invoice.paymentDetails.terms || '';
      if (customInstructionsInput)
        customInstructionsInput.value = invoice.paymentDetails.customInstructions || '';
    }

    // Notes & Signature
    if (notesInput) notesInput.value = invoice.notes || '';
    if (signatureInput) signatureInput.value = invoice.signature || '';

    // Logo
    renderLogoPreview();
  }

  function renderLogoPreview() {
    if (invoice.logo && invoice.logo.trim()) {
      if (logoPreview) {
        logoPreview.src = invoice.logo;
        logoPreview.classList.remove('hidden');
      }
      if (logoPlaceholder) logoPlaceholder.classList.add('hidden');
      if (btnRemoveLogo) btnRemoveLogo.classList.remove('hidden');
    } else {
      if (logoPreview) {
        logoPreview.src = '';
        logoPreview.classList.add('hidden');
      }
      if (logoPlaceholder) logoPlaceholder.classList.remove('hidden');
      if (btnRemoveLogo) btnRemoveLogo.classList.add('hidden');
    }
  }

  // 4. Render Line Items Dynamically
  function renderLineItems() {
    if (!lineItemsContainer) return;
    lineItemsContainer.innerHTML = '';

    const currencyCode = invoice.currency || 'USD';
    const currencyInfo = TOP_30_CURRENCIES.find((c) => c.code === currencyCode);
    const currencySymbol = currencyInfo ? currencyInfo.symbol : '$';

    invoice.lineItems.forEach((item, index) => {
      const isOnlyItem = invoice.lineItems.length === 1;
      const rowId = `item-row-${item.id || index}`;

      const rowEl = document.createElement('div');
      rowEl.className =
        'line-item-row group rounded-2xl bg-surface-card border border-hairline p-4 sm:p-5 transition-all hover:border-hairline-strong/60 shadow-xs';
      rowEl.id = rowId;
      rowEl.dataset.index = String(index);

      // Safe numeric line calculation
      const safeQty = Math.max(0, item.quantity || 0);
      const safePrice = Math.max(0, item.unitPrice || 0);
      const lineSubtotal = safeQty * safePrice;
      const formattedTotal = formatCurrency(lineSubtotal, currencyCode);

      rowEl.innerHTML = `
        <div class="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-hairline/40">
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-surface-soft text-xs font-semibold text-charcoal">
              ${index + 1}
            </span>
            <span class="text-xs font-medium uppercase tracking-wider text-mute">Item #${index + 1}</span>
          </div>

          <div class="flex items-center gap-3">
            <div class="text-right">
              <span class="text-xs text-mute mr-1">Total:</span>
              <span class="font-semibold text-ink text-sm sm:text-base tabular-nums line-total-display">
                ${formattedTotal}
              </span>
            </div>

            <button
              type="button"
              class="btn-remove-item flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-stone hover:text-accent-danger hover:bg-accent-danger/10 transition-colors focus-visible:ring-2 focus-visible:ring-accent-danger focus-visible:outline-none"
              data-index="${index}"
              title="Remove item"
              aria-label="Remove item ${index + 1}"
              ${isOnlyItem ? 'disabled aria-disabled="true"' : ''}
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3.5 md:grid-cols-12 md:gap-4 items-start">
          <!-- Description: Spans full on mobile, 6 cols on desktop -->
          <div class="md:col-span-6">
            <label for="item-desc-${index}" class="block text-xs font-semibold text-charcoal mb-1.5">
              Description <span class="text-accent-danger">*</span>
            </label>
            <input
              type="text"
              id="item-desc-${index}"
              class="item-field-desc text-input h-12 text-sm"
              placeholder="e.g. Website Design & Development"
              value="${escapeHtml(item.description || '')}"
              data-field="description"
              data-index="${index}"
              required
              aria-required="true"
            />
            <p id="err-item-desc-${index}" class="hidden text-xs text-accent-danger mt-1 items-center gap-1 font-medium">
              <svg class="h-3.5 w-3.5 inline-block shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>Description is required</span>
            </p>
          </div>

          <!-- Quantity: 2 cols on desktop -->
          <div class="grid grid-cols-3 gap-3 md:col-span-6 md:grid-cols-3">
            <div>
              <label for="item-qty-${index}" class="block text-xs font-semibold text-charcoal mb-1.5">
                Qty <span class="text-accent-danger">*</span>
              </label>
              <input
                type="number"
                id="item-qty-${index}"
                class="item-field-qty text-input h-12 text-sm tabular-nums text-center"
                min="0"
                step="any"
                value="${item.quantity}"
                data-field="quantity"
                data-index="${index}"
                required
                aria-required="true"
              />
              <p id="err-item-qty-${index}" class="hidden text-xs text-accent-danger mt-1 items-center gap-1 font-medium">
                <span>Must be ≥ 0</span>
              </p>
            </div>

            <!-- Unit Price: with currency prefix -->
            <div>
              <label for="item-price-${index}" class="block text-xs font-semibold text-charcoal mb-1.5">
                Rate (${currencySymbol}) <span class="text-accent-danger">*</span>
              </label>
              <input
                type="number"
                id="item-price-${index}"
                class="item-field-price text-input h-12 text-sm tabular-nums text-right"
                min="0"
                step="any"
                placeholder="0.00"
                value="${item.unitPrice}"
                data-field="unitPrice"
                data-index="${index}"
                required
                aria-required="true"
              />
              <p id="err-item-price-${index}" class="hidden text-xs text-accent-danger mt-1 items-center gap-1 font-medium">
                <span>Must be ≥ 0</span>
              </p>
            </div>

            <!-- Tax Rate % -->
            <div>
              <label for="item-tax-${index}" class="block text-xs font-semibold text-charcoal mb-1.5">
                Tax (%)
              </label>
              <input
                type="number"
                id="item-tax-${index}"
                class="item-field-tax text-input h-12 text-sm tabular-nums text-right"
                min="0"
                max="100"
                step="any"
                placeholder="0"
                value="${item.taxRate || 0}"
                data-field="taxRate"
                data-index="${index}"
              />
              <p id="err-item-tax-${index}" class="hidden text-xs text-accent-danger mt-1 items-center gap-1 font-medium">
                <span>0-100%</span>
              </p>
            </div>
          </div>
        </div>
      `;

      lineItemsContainer.appendChild(rowEl);
    });

    updateTotals();
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 5. Update Totals and Live Numerical Displays
  function updateTotals() {
    const totals = calculateTotals(invoice);
    const currency = invoice.currency || 'USD';

    // Subtotal
    if (subtotalDisplay) {
      subtotalDisplay.textContent = formatCurrency(totals.subtotal, currency);
    }

    // Discount
    if (totals.discountAmount > 0) {
      if (discountRow) discountRow.classList.remove('hidden');
      if (discountDisplay) {
        const discountType =
          typeof invoice.discount === 'object' && invoice.discount?.type
            ? invoice.discount.type
            : 'percentage';
        const discountVal =
          typeof invoice.discount === 'number' ? invoice.discount : invoice.discount?.value || 0;
        const discountLabel = discountType === 'percentage' ? `-${discountVal}%` : 'Discount';
        discountDisplay.textContent = `-${formatCurrency(totals.discountAmount, currency)} (${discountLabel})`;
      }
    } else {
      if (discountRow) discountRow.classList.add('hidden');
    }

    // Tax Breakdown
    if (taxBreakdownContainer) {
      taxBreakdownContainer.innerHTML = '';
      if (totals.taxBreakdown && totals.taxBreakdown.length > 0) {
        totals.taxBreakdown.forEach((taxItem) => {
          const row = document.createElement('div');
          row.className = 'flex items-center justify-between text-sm text-mute py-1';
          row.innerHTML = `
            <span>Tax (${taxItem.rate}%):</span>
            <span class="font-medium text-ink tabular-nums">${formatCurrency(taxItem.taxAmount, currency)}</span>
          `;
          taxBreakdownContainer.appendChild(row);
        });
      }
    }

    // Shipping
    if (totals.shipping > 0) {
      if (shippingRow) shippingRow.classList.remove('hidden');
      if (shippingDisplay) {
        shippingDisplay.textContent = formatCurrency(totals.shipping, currency);
      }
    } else {
      if (shippingRow) shippingRow.classList.add('hidden');
    }

    // Grand Total
    if (grandTotalDisplay) {
      grandTotalDisplay.textContent = formatCurrency(totals.grandTotal, currency);
    }

    // Update each line item row's subtotal display
    const rows = lineItemsContainer.querySelectorAll('.line-item-row');
    rows.forEach((row) => {
      const idx = parseInt((row as HTMLElement).dataset.index || '0', 10);
      const item = invoice.lineItems[idx];
      const displayEl = row.querySelector('.line-total-display');
      if (item && displayEl) {
        const itemSubtotal = Math.max(0, item.quantity || 0) * Math.max(0, item.unitPrice || 0);
        displayEl.textContent = formatCurrency(itemSubtotal, currency);
      }
    });

    updateLivePreview();
    triggerAutoSave();
  }

  // 5b. Live Invoice Preview Synchronization
  function updateLivePreview() {
    if (!previewDocument) return;

    const currency = invoice.currency || 'USD';
    const totals = calculateTotals(invoice);

    // Sender Information
    if (previewSenderName) {
      previewSenderName.textContent = invoice.sender.name || 'Your Business Name';
    }
    if (previewSenderAddress) {
      previewSenderAddress.textContent = invoice.sender.address || '';
      previewSenderAddress.style.display = invoice.sender.address ? '' : 'none';
    }
    if (previewSenderEmail) {
      previewSenderEmail.textContent = invoice.sender.email || '';
      previewSenderEmail.style.display = invoice.sender.email ? '' : 'none';
    }
    if (previewSenderPhone) {
      previewSenderPhone.textContent = invoice.sender.phone || '';
      previewSenderPhone.style.display = invoice.sender.phone ? '' : 'none';
    }
    if (previewSenderTaxId) {
      previewSenderTaxId.textContent = invoice.sender.taxId
        ? `Tax ID: ${invoice.sender.taxId}`
        : '';
      previewSenderTaxId.style.display = invoice.sender.taxId ? '' : 'none';
    }

    // Invoice Meta
    if (previewInvoiceNumber) {
      previewInvoiceNumber.textContent = invoice.invoiceNumber || 'INV-001';
    }
    if (previewIssueDate) {
      previewIssueDate.textContent = invoice.issueDate || '';
    }
    if (previewDueDate) {
      previewDueDate.textContent = invoice.dueDate || '';
    }

    // Client Information
    if (previewClientName) {
      previewClientName.textContent = invoice.client.name || 'Client Name';
    }
    if (previewClientAddress) {
      previewClientAddress.textContent = invoice.client.address || '';
      previewClientAddress.style.display = invoice.client.address ? '' : 'none';
    }
    if (previewClientEmail) {
      previewClientEmail.textContent = invoice.client.email || '';
      previewClientEmail.style.display = invoice.client.email ? '' : 'none';
    }
    if (previewClientPhone) {
      previewClientPhone.textContent = invoice.client.phone || '';
      previewClientPhone.style.display = invoice.client.phone ? '' : 'none';
    }
    if (previewClientTaxId) {
      previewClientTaxId.textContent = invoice.client.taxId
        ? `Tax ID: ${invoice.client.taxId}`
        : '';
      previewClientTaxId.style.display = invoice.client.taxId ? '' : 'none';
    }

    // Terms Pill & Header Grand Total Callout
    if (previewHeaderGrandTotal) {
      previewHeaderGrandTotal.textContent = formatCurrency(totals.grandTotal, currency);
    }
    if (previewTermsPill) {
      if (invoice.paymentDetails?.terms && invoice.paymentDetails.terms.trim()) {
        previewTermsPill.textContent = invoice.paymentDetails.terms;
        previewTermsPill.classList.remove('hidden');
      } else if (invoice.dueDate) {
        previewTermsPill.textContent = `Due ${invoice.dueDate}`;
        previewTermsPill.classList.remove('hidden');
      } else {
        previewTermsPill.classList.add('hidden');
      }
    }

    // Logo
    if (previewLogoImg && previewLogoWrapper) {
      if (invoice.logo && invoice.logo.trim()) {
        previewLogoImg.src = invoice.logo;
        previewLogoWrapper.classList.remove('hidden');
      } else {
        previewLogoImg.src = '';
        previewLogoWrapper.classList.add('hidden');
      }
    }

    // Line Items Table
    if (previewLineItemsTbody) {
      previewLineItemsTbody.innerHTML = '';
      if (!invoice.lineItems || invoice.lineItems.length === 0) {
        const tr = document.createElement('tr');
        tr.className = 'tmpl-table-row';
        tr.innerHTML = `
          <td colspan="5" class="py-3 px-3 text-center text-gray-400 italic">No line items entered</td>
        `;
        previewLineItemsTbody.appendChild(tr);
      } else {
        invoice.lineItems.forEach((item) => {
          const qty = Math.max(0, item.quantity || 0);
          const price = Math.max(0, item.unitPrice || 0);
          const lineSubtotal = qty * price;
          const tr = document.createElement('tr');
          tr.className = 'tmpl-table-row';
          tr.innerHTML = `
            <td class="py-2.5 sm:py-3 px-3 font-medium text-gray-900 break-words">${escapeHtml(item.description || 'Item description')}</td>
            <td class="py-2.5 sm:py-3 px-3 text-center tabular-nums text-gray-700">${item.quantity ?? 0}</td>
            <td class="py-2.5 sm:py-3 px-3 text-right tabular-nums text-gray-700">${formatCurrency(price, currency)}</td>
            <td class="py-2.5 sm:py-3 px-3 text-right tabular-nums text-gray-600">${(item.taxRate || 0) > 0 ? `${item.taxRate}%` : '—'}</td>
            <td class="py-2.5 sm:py-3 px-3 text-right font-semibold text-gray-900 tabular-nums">${formatCurrency(lineSubtotal, currency)}</td>
          `;
          previewLineItemsTbody.appendChild(tr);
        });
      }
    }

    // Financial Totals
    if (previewSubtotal) {
      previewSubtotal.textContent = formatCurrency(totals.subtotal, currency);
    }

    if (previewRowDiscount && previewDiscount && previewDiscountLabel) {
      if (totals.discountAmount > 0) {
        previewRowDiscount.classList.remove('hidden');
        previewRowDiscount.classList.add('flex');
        const discountType =
          typeof invoice.discount === 'object' && invoice.discount?.type
            ? invoice.discount.type
            : 'percentage';
        const discountVal =
          typeof invoice.discount === 'number' ? invoice.discount : invoice.discount?.value || 0;
        previewDiscountLabel.textContent =
          discountType === 'percentage' ? `Discount (${discountVal}%):` : 'Discount:';
        previewDiscount.textContent = `-${formatCurrency(totals.discountAmount, currency)}`;
      } else {
        previewRowDiscount.classList.add('hidden');
        previewRowDiscount.classList.remove('flex');
      }
    }

    // Dynamic Tax Breakdown
    if (previewTaxBreakdown) {
      previewTaxBreakdown.innerHTML = '';
      if (totals.taxBreakdown && totals.taxBreakdown.length > 0) {
        totals.taxBreakdown.forEach((taxItem) => {
          if (taxItem.taxAmount > 0) {
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between text-gray-600';
            row.innerHTML = `
              <span>Tax (${taxItem.rate}%):</span>
              <span class="font-medium text-gray-900 tabular-nums">${formatCurrency(taxItem.taxAmount, currency)}</span>
            `;
            previewTaxBreakdown.appendChild(row);
          }
        });
      }
    }

    if (previewRowShipping && previewShipping) {
      if (totals.shipping > 0) {
        previewRowShipping.classList.remove('hidden');
        previewRowShipping.classList.add('flex');
        previewShipping.textContent = formatCurrency(totals.shipping, currency);
      } else {
        previewRowShipping.classList.add('hidden');
        previewRowShipping.classList.remove('flex');
      }
    }

    if (previewGrandTotal) {
      previewGrandTotal.textContent = formatCurrency(totals.grandTotal, currency);
    }

    // Notes
    if (previewNotesBlock && previewNotes) {
      if (invoice.notes && invoice.notes.trim()) {
        previewNotes.textContent = invoice.notes;
        previewNotesBlock.classList.remove('hidden');
      } else {
        previewNotesBlock.classList.add('hidden');
      }
    }

    // Signature
    if (previewSignatureBlock && previewSignature) {
      if (invoice.signature && invoice.signature.trim()) {
        previewSignature.textContent = invoice.signature;
        previewSignatureBlock.classList.remove('hidden');
      } else {
        previewSignatureBlock.classList.add('hidden');
      }
    }

    // Payment Methods Breakdown
    let hasPaymentInfo = false;
    function syncPaymentRow(itemEl: HTMLElement | null, textEl: HTMLElement | null, val?: string) {
      if (!itemEl || !textEl) return;
      if (val && val.trim()) {
        textEl.textContent = val.trim();
        itemEl.classList.remove('hidden');
        hasPaymentInfo = true;
      } else {
        textEl.textContent = '';
        itemEl.classList.add('hidden');
      }
    }

    syncPaymentRow(previewBankItem, previewBankName, invoice.paymentDetails?.bankName);
    syncPaymentRow(previewAccountItem, previewAccountName, invoice.paymentDetails?.accountName);
    syncPaymentRow(previewAccNumItem, previewAccountNumber, invoice.paymentDetails?.accountNumber);
    syncPaymentRow(previewRoutingItem, previewRoutingNumber, invoice.paymentDetails?.routingNumber);
    syncPaymentRow(previewIbanItem, previewIban, invoice.paymentDetails?.iban);
    syncPaymentRow(previewSwiftItem, previewSwiftBic, invoice.paymentDetails?.swiftBic);

    if (previewLinkItem && previewPaymentLink) {
      if (invoice.paymentDetails?.paymentLink && invoice.paymentDetails.paymentLink.trim()) {
        previewPaymentLink.href = invoice.paymentDetails.paymentLink.trim();
        previewPaymentLink.textContent = invoice.paymentDetails.paymentLink.trim();
        previewLinkItem.classList.remove('hidden');
        hasPaymentInfo = true;
      } else {
        previewPaymentLink.href = '#';
        previewPaymentLink.textContent = '';
        previewLinkItem.classList.add('hidden');
      }
    }

    if (previewInstructionsItem && previewCustomInstructions) {
      if (
        invoice.paymentDetails?.customInstructions &&
        invoice.paymentDetails.customInstructions.trim()
      ) {
        previewCustomInstructions.textContent = invoice.paymentDetails.customInstructions.trim();
        previewInstructionsItem.classList.remove('hidden');
        hasPaymentInfo = true;
      } else {
        previewCustomInstructions.textContent = '';
        previewInstructionsItem.classList.add('hidden');
      }
    }

    if (previewPaymentBlock) {
      if (hasPaymentInfo) {
        previewPaymentBlock.classList.remove('hidden');
      } else {
        previewPaymentBlock.classList.add('hidden');
      }
    }
  }

  // 6. Inline Validation UI Helper
  function setFieldValidationUI(
    inputEl: HTMLElement | null,
    errorEl: HTMLElement | null,
    valid: boolean,
    errorMsg?: string
  ) {
    if (!inputEl) return;
    if (!valid) {
      inputEl.classList.add('text-input-error');
      inputEl.setAttribute('aria-invalid', 'true');
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.classList.add('flex');
        const span = errorEl.querySelector('span');
        if (span && errorMsg) span.textContent = errorMsg;
        inputEl.setAttribute('aria-describedby', errorEl.id);
      }
    } else {
      inputEl.classList.remove('text-input-error');
      inputEl.removeAttribute('aria-invalid');
      if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.classList.remove('flex');
        inputEl.removeAttribute('aria-describedby');
      }
    }
  }

  // 7. Event Listeners Setup

  // Auto-increment button handler
  if (btnAutoIncrement) {
    btnAutoIncrement.addEventListener('click', () => {
      const current = invoiceNumberInput?.value || invoice.invoiceNumber || 'INV-001';
      const nextNum = incrementInvoiceNumber(current);
      invoice.invoiceNumber = nextNum;
      if (invoiceNumberInput) invoiceNumberInput.value = nextNum;

      // Visual feedback badge
      if (autoIncrementBadge) {
        autoIncrementBadge.textContent = `Auto-incremented to ${nextNum}`;
        autoIncrementBadge.classList.remove('opacity-0', '-translate-y-1');
        setTimeout(() => {
          autoIncrementBadge.classList.add('opacity-0', '-translate-y-1');
        }, 2200);
      }

      setFieldValidationUI(invoiceNumberInput, document.getElementById('err-invoice-number'), true);
      updateLivePreview();
      triggerAutoSave();
    });
  }

  // Currency select handler
  if (currencySelect) {
    currencySelect.addEventListener('change', () => {
      invoice.currency = currencySelect.value;
      renderLineItems(); // Re-render to update currency symbols on rate inputs and totals
    });
  }

  // Due date presets (Today, +7d, +14d, +30d)
  const presetButtons = document.querySelectorAll('.btn-date-preset');
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const days = parseInt((btn as HTMLElement).dataset.days || '0', 10);
      const baseDate = issueDateInput?.value || formatDateForInput(new Date());
      const newDueDate = addDaysToDate(baseDate, days);
      invoice.dueDate = newDueDate;
      if (dueDateInput) dueDateInput.value = newDueDate;

      // Highlight active preset
      presetButtons.forEach((b) => b.classList.remove('bg-primary', 'text-white'));
      btn.classList.add('bg-primary', 'text-white');

      setFieldValidationUI(dueDateInput, document.getElementById('err-due-date'), true);
      updateLivePreview();
      triggerAutoSave();
    });
  });

  // Logo upload with proportional client-side resize and 5MB limit
  async function processLogoFile(file: File) {
    if (errLogoFile) {
      errLogoFile.classList.add('hidden');
      errLogoFile.textContent = '';
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      if (errLogoFile) {
        errLogoFile.textContent = validation.error || 'Invalid image file.';
        errLogoFile.classList.remove('hidden');
      } else {
        alert(validation.error);
      }
      return;
    }

    try {
      const res = await resizeImageFile(file, LOGO_CONFIG.MAX_WIDTH, LOGO_CONFIG.MAX_HEIGHT);
      if (res.success && res.dataUrl) {
        invoice.logo = res.dataUrl;
        renderLogoPreview();
        updateLivePreview();
        triggerAutoSave();
      } else {
        if (errLogoFile) {
          errLogoFile.textContent = res.error || 'Could not process image.';
          errLogoFile.classList.remove('hidden');
        }
      }
    } catch {
      if (errLogoFile) {
        errLogoFile.textContent = 'Failed to process logo image.';
        errLogoFile.classList.remove('hidden');
      }
    }
  }

  if (logoInput) {
    logoInput.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await processLogoFile(file);
      }
    });

    const dropZone = logoInput.closest('.group');
    if (dropZone) {
      ['dragenter', 'dragover'].forEach((type) => {
        dropZone.addEventListener(type, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.add('border-primary', 'bg-primary/5');
        });
      });
      ['dragleave', 'drop'].forEach((type) => {
        dropZone.addEventListener(type, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('border-primary', 'bg-primary/5');
        });
      });
      dropZone.addEventListener('drop', async (e: Event) => {
        const dragEvent = e as DragEvent;
        const file = dragEvent.dataTransfer?.files?.[0];
        if (file) {
          await processLogoFile(file);
        }
      });
    }
  }

  if (btnRemoveLogo) {
    btnRemoveLogo.addEventListener('click', (e) => {
      e.preventDefault();
      invoice.logo = '';
      if (logoInput) logoInput.value = '';
      if (errLogoFile) {
        errLogoFile.textContent = '';
        errLogoFile.classList.add('hidden');
      }
      renderLogoPreview();
      updateLivePreview();
      triggerAutoSave();
    });
  }

  // Add line item button handler
  if (btnAddItem) {
    btnAddItem.addEventListener('click', () => {
      const newItem: LineItem = {
        id: `item_${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      };
      invoice.lineItems.push(newItem);
      renderLineItems();

      // Keyboard friendly: Focus into the description input of the newly added item
      const newIndex = invoice.lineItems.length - 1;
      const newDescInput = document.getElementById(`item-desc-${newIndex}`) as HTMLInputElement;
      if (newDescInput) {
        newDescInput.focus();
      }
    });
  }

  // Line items event delegation (input, change, click for remove)
  if (lineItemsContainer) {
    // Input / Change delegation for live recalculation
    lineItemsContainer.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const field = target.dataset.field;
      const indexStr = target.dataset.index;
      if (!field || indexStr === undefined) return;

      const index = parseInt(indexStr, 10);
      const item = invoice.lineItems[index];
      if (!item) return;

      if (field === 'description') {
        item.description = target.value;
        const val = validateInvoiceField('itemDescription', target.value);
        setFieldValidationUI(
          target,
          document.getElementById(`err-item-desc-${index}`),
          val.valid,
          val.error
        );
      } else if (field === 'quantity') {
        const num = parseFloat(target.value);
        item.quantity = isNaN(num) ? 0 : num;
        const val = validateInvoiceField('itemQuantity', target.value);
        setFieldValidationUI(
          target,
          document.getElementById(`err-item-qty-${index}`),
          val.valid,
          val.error
        );
      } else if (field === 'unitPrice') {
        const num = parseFloat(target.value);
        item.unitPrice = isNaN(num) ? 0 : num;
        const val = validateInvoiceField('itemUnitPrice', target.value);
        setFieldValidationUI(
          target,
          document.getElementById(`err-item-price-${index}`),
          val.valid,
          val.error
        );
      } else if (field === 'taxRate') {
        const num = parseFloat(target.value);
        item.taxRate = isNaN(num) ? 0 : num;
        const val = validateInvoiceField('itemTaxRate', target.value);
        setFieldValidationUI(
          target,
          document.getElementById(`err-item-tax-${index}`),
          val.valid,
          val.error
        );
      }

      updateTotals();
    });

    // Remove row button click delegation
    lineItemsContainer.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.btn-remove-item') as HTMLButtonElement | null;
      if (!btn) return;

      if (invoice.lineItems.length <= 1) {
        alert('An invoice must have at least one line item.');
        return;
      }

      const index = parseInt(btn.dataset.index || '0', 10);
      invoice.lineItems.splice(index, 1);
      renderLineItems();

      // Return focus to add item button for keyboard accessibility
      btnAddItem?.focus();
    });
  }

  // Discount & Shipping input handlers
  function updateDiscountState() {
    const type = (discountTypeSelect?.value as 'percentage' | 'fixed') || 'percentage';
    const rawVal = parseFloat(discountValueInput?.value || '0');
    const val = isNaN(rawVal) ? 0 : Math.max(0, rawVal);
    invoice.discount = { type, value: val };
    updateTotals();
  }

  if (discountTypeSelect) discountTypeSelect.addEventListener('change', updateDiscountState);
  if (discountValueInput) discountValueInput.addEventListener('input', updateDiscountState);

  if (shippingInput) {
    shippingInput.addEventListener('input', () => {
      const raw = parseFloat(shippingInput.value || '0');
      invoice.shipping = isNaN(raw) ? 0 : Math.max(0, raw);
      updateTotals();
    });
  }

  function ensurePaymentDetails(): NonNullable<Invoice['paymentDetails']> {
    if (!invoice.paymentDetails) {
      invoice.paymentDetails = {
        bankName: '',
        accountName: '',
        accountNumber: '',
        routingNumber: '',
        swiftBic: '',
        iban: '',
        paymentLink: '',
        terms: '',
        customInstructions: '',
      };
    }
    return invoice.paymentDetails;
  }

  // Top/Global Inputs Listeners & Inline Validation
  const fieldValidationMappings: Array<{
    input: HTMLInputElement | HTMLTextAreaElement | null;
    errId: string;
    field: string;
    updateState: (val: string) => void;
  }> = [
    {
      input: invoiceNumberInput,
      errId: 'err-invoice-number',
      field: 'invoiceNumber',
      updateState: (v) => (invoice.invoiceNumber = v),
    },
    {
      input: issueDateInput,
      errId: 'err-issue-date',
      field: 'issueDate',
      updateState: (v) => (invoice.issueDate = v),
    },
    {
      input: dueDateInput,
      errId: 'err-due-date',
      field: 'dueDate',
      updateState: (v) => (invoice.dueDate = v),
    },
    {
      input: senderNameInput,
      errId: 'err-sender-name',
      field: 'senderName',
      updateState: (v) => (invoice.sender.name = v),
    },
    {
      input: senderEmailInput,
      errId: 'err-sender-email',
      field: 'senderEmail',
      updateState: (v) => (invoice.sender.email = v),
    },
    {
      input: senderPhoneInput,
      errId: 'err-sender-phone',
      field: 'senderPhone',
      updateState: (v) => (invoice.sender.phone = v),
    },
    {
      input: senderAddressInput,
      errId: 'err-sender-address',
      field: 'senderAddress',
      updateState: (v) => (invoice.sender.address = v),
    },
    {
      input: senderTaxIdInput,
      errId: 'err-sender-tax-id',
      field: 'senderTaxId',
      updateState: (v) => (invoice.sender.taxId = v),
    },
    {
      input: clientNameInput,
      errId: 'err-client-name',
      field: 'clientName',
      updateState: (v) => (invoice.client.name = v),
    },
    {
      input: clientEmailInput,
      errId: 'err-client-email',
      field: 'clientEmail',
      updateState: (v) => (invoice.client.email = v),
    },
    {
      input: clientPhoneInput,
      errId: 'err-client-phone',
      field: 'clientPhone',
      updateState: (v) => (invoice.client.phone = v),
    },
    {
      input: clientAddressInput,
      errId: 'err-client-address',
      field: 'clientAddress',
      updateState: (v) => (invoice.client.address = v),
    },
    {
      input: clientTaxIdInput,
      errId: 'err-client-tax-id',
      field: 'clientTaxId',
      updateState: (v) => (invoice.client.taxId = v),
    },
    {
      input: paymentLinkInput,
      errId: 'err-payment-link',
      field: 'paymentLink',
      updateState: (v) => {
        ensurePaymentDetails().paymentLink = v;
      },
    },
  ];

  fieldValidationMappings.forEach(({ input, errId, field, updateState }) => {
    if (!input) return;

    // Blur triggers full validation display
    input.addEventListener('blur', () => {
      const res = validateInvoiceField(field, input.value);
      setFieldValidationUI(input, document.getElementById(errId), res.valid, res.error);
    });

    // Input updates state and removes error immediately if valid
    input.addEventListener('input', () => {
      updateState(input.value);
      const res = validateInvoiceField(field, input.value);
      if (res.valid) {
        setFieldValidationUI(input, document.getElementById(errId), true);
      }
      updateLivePreview();
      triggerAutoSave();
    });
  });

  // Remaining payment details updates
  const paymentInputs: Array<{
    input: HTMLInputElement | HTMLTextAreaElement | null;
    setter: (val: string) => void;
  }> = [
    {
      input: bankNameInput,
      setter: (v) => {
        ensurePaymentDetails().bankName = v;
      },
    },
    {
      input: accountNameInput,
      setter: (v) => {
        ensurePaymentDetails().accountName = v;
      },
    },
    {
      input: accountNumberInput,
      setter: (v) => {
        ensurePaymentDetails().accountNumber = v;
      },
    },
    {
      input: routingNumberInput,
      setter: (v) => {
        ensurePaymentDetails().routingNumber = v;
      },
    },
    {
      input: swiftBicInput,
      setter: (v) => {
        ensurePaymentDetails().swiftBic = v;
      },
    },
    {
      input: ibanInput,
      setter: (v) => {
        ensurePaymentDetails().iban = v;
      },
    },
    {
      input: paymentTermsInput,
      setter: (v) => {
        ensurePaymentDetails().terms = v;
      },
    },
    {
      input: customInstructionsInput,
      setter: (v) => {
        ensurePaymentDetails().customInstructions = v;
      },
    },
    {
      input: notesInput,
      setter: (v) => (invoice.notes = v),
    },
    {
      input: signatureInput,
      setter: (v) => (invoice.signature = v),
    },
  ];

  paymentInputs.forEach(({ input, setter }) => {
    if (!input) return;
    input.addEventListener('input', () => {
      setter(input.value);
      updateLivePreview();
      triggerAutoSave();
    });
  });

  // 8. Template Switcher Controller (4 clean variants: modern, classic, minimal, compact)
  function applyTemplate(tmpl: 'modern' | 'classic' | 'minimal' | 'compact') {
    if (previewDocument) {
      previewDocument.setAttribute('data-template', tmpl);
    }
    const buttons = document.querySelectorAll<HTMLButtonElement>('.btn-template-select');
    buttons.forEach((btn) => {
      const isActive = btn.dataset.template === tmpl;
      btn.setAttribute('aria-pressed', String(isActive));
      if (isActive) {
        btn.className =
          'btn-template-select px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer bg-primary text-white shadow-2xs';
      } else {
        btn.className =
          'btn-template-select px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer text-charcoal hover:bg-surface-soft hover:text-ink';
      }
    });
  }

  function setupTemplateSwitcher() {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.btn-template-select');
    if (!previewDocument || buttons.length === 0) return;

    const currentTemplate = invoice.template || 'modern';
    applyTemplate(currentTemplate);

    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tmpl =
          (btn.dataset.template as 'modern' | 'classic' | 'minimal' | 'compact') || 'modern';
        invoice.template = tmpl;
        applyTemplate(tmpl);
        triggerAutoSave();
      });
    });
  }

  // 9. Mobile Segmented Form / Preview Toggle Controller
  function setupMobileViewToggle() {
    const btnForm = document.getElementById('btn-toggle-form') as HTMLButtonElement | null;
    const btnPreview = document.getElementById('btn-toggle-preview') as HTMLButtonElement | null;
    const formCol = document.getElementById('invoice-form-column');
    const previewCol = document.getElementById('invoice-preview-column');
    const mobileToggle = document.getElementById('mobile-view-toggle');

    if (!btnForm || !btnPreview || !formCol || !previewCol) return;

    let activeTab: 'form' | 'preview' = 'form';

    function setMobileView(tab: 'form' | 'preview') {
      activeTab = tab;
      if (tab === 'form') {
        formCol?.classList.remove('hidden');
        formCol?.classList.add('block');
        previewCol?.classList.add('hidden');
        previewCol?.classList.remove('block');

        btnForm?.classList.add('bg-primary', 'text-white', 'shadow-2xs');
        btnForm?.classList.remove('text-charcoal', 'hover:bg-surface-soft');
        btnForm?.setAttribute('aria-pressed', 'true');

        btnPreview?.classList.remove('bg-primary', 'text-white', 'shadow-2xs');
        btnPreview?.classList.add('text-charcoal', 'hover:bg-surface-soft');
        btnPreview?.setAttribute('aria-pressed', 'false');
      } else {
        formCol?.classList.add('hidden');
        formCol?.classList.remove('block');
        previewCol?.classList.remove('hidden');
        previewCol?.classList.add('block');

        btnPreview?.classList.add('bg-primary', 'text-white', 'shadow-2xs');
        btnPreview?.classList.remove('text-charcoal', 'hover:bg-surface-soft');
        btnPreview?.setAttribute('aria-pressed', 'true');

        btnForm?.classList.remove('bg-primary', 'text-white', 'shadow-2xs');
        btnForm?.classList.add('text-charcoal', 'hover:bg-surface-soft');
        btnForm?.setAttribute('aria-pressed', 'false');

        updateLivePreview();
        mobileToggle?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    btnForm.addEventListener('click', (e) => {
      e.preventDefault();
      setMobileView('form');
    });

    btnPreview.addEventListener('click', (e) => {
      e.preventDefault();
      setMobileView('preview');
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        formCol.classList.remove('hidden');
        previewCol.classList.remove('hidden');
      } else {
        setMobileView(activeTab);
      }
    });
  }

  // 10. Paper Format Selector (A4 vs US Letter)
  function applyFormat(format: 'a4' | 'letter') {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.btn-format-select');
    buttons.forEach((btn) => {
      const isActive = btn.dataset.format === format;
      btn.setAttribute('aria-pressed', String(isActive));
      if (isActive) {
        btn.className =
          'btn-format-select px-2.5 py-0.5 rounded-full transition-all cursor-pointer bg-white text-ink shadow-2xs font-semibold';
      } else {
        btn.className =
          'btn-format-select px-2.5 py-0.5 rounded-full transition-all cursor-pointer text-charcoal hover:text-ink font-semibold';
      }
    });
  }

  function setupFormatSelector() {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.btn-format-select');
    if (buttons.length === 0) return;

    const currentFormat = invoice.pageFormat || 'a4';
    applyFormat(currentFormat);

    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const format = (btn.dataset.format as 'a4' | 'letter') || 'a4';
        invoice.pageFormat = format;
        applyFormat(format);
        triggerAutoSave();
      });
    });
  }

  // 11. Toast Notifications for Export Status & Errors
  let toastTimeout: ReturnType<typeof setTimeout> | null = null;
  function showToast(
    type: 'success' | 'error' | 'info',
    title: string,
    message: string,
    autoDismissMs = 4500
  ) {
    const toast = document.getElementById('export-toast');
    const toastIcon = document.getElementById('export-toast-icon');
    const toastTitle = document.getElementById('export-toast-title');
    const toastMessage = document.getElementById('export-toast-message');
    if (!toast || !toastIcon || !toastTitle || !toastMessage) return;

    if (toastTimeout) clearTimeout(toastTimeout);

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.className =
      'fixed bottom-6 right-6 z-50 max-w-md w-full px-4 py-3 rounded-2xl shadow-xl border transition-all duration-300 pointer-events-auto flex items-start gap-3 no-print';

    if (type === 'success') {
      toast.classList.add('bg-white', 'text-emerald-950', 'border-emerald-200');
      toastIcon.innerHTML = `
        <svg class="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
      `;
    } else if (type === 'error') {
      toast.classList.add('bg-white', 'text-red-950', 'border-red-200');
      toastIcon.innerHTML = `
        <svg class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
      `;
    } else {
      toast.classList.add('bg-white', 'text-slate-900', 'border-slate-200');
      toastIcon.innerHTML = `
        <svg class="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
        </svg>
      `;
    }

    // Slide in
    toast.classList.remove('translate-y-24', 'opacity-0');

    if (autoDismissMs > 0) {
      toastTimeout = setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
        toast.classList.add('pointer-events-none');
      }, autoDismissMs);
    }
  }

  if (btnCloseToast) {
    btnCloseToast.addEventListener('click', () => {
      const toast = document.getElementById('export-toast');
      if (toast) {
        toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
      }
    });
  }

  // 12. Button Loading State Utility
  function setButtonsLoading(buttons: HTMLButtonElement[], loading: boolean, loadingText: string) {
    buttons.forEach((btn) => {
      btn.disabled = loading;
      const textSpan = btn.querySelector('.btn-pdf-text') || btn.querySelector('span');
      const icon = btn.querySelector('.btn-pdf-icon') || btn.querySelector('svg');
      if (textSpan) {
        textSpan.textContent = loadingText;
      }
      if (loading) {
        btn.classList.add('opacity-80', 'cursor-wait');
        if (icon) {
          icon.classList.add('animate-spin');
        }
      } else {
        btn.classList.remove('opacity-80', 'cursor-wait');
        if (icon) {
          icon.classList.remove('animate-spin');
        }
      }
    });
  }

  // 13. PDF Export Handler (Lazy-loads PDF library only on click, no watermark, never loses form data)
  async function handleDownloadPdf() {
    const previewDoc = document.getElementById('invoice-preview-document');
    if (!previewDoc) {
      showToast('error', 'Export Failed', 'Invoice document preview element was not found.');
      return;
    }

    const pdfButtons = [btnDownloadPdfForm, btnDownloadPdfPreview].filter(
      Boolean
    ) as HTMLButtonElement[];

    setButtonsLoading(pdfButtons, true, 'Generating PDF...');

    try {
      const format = invoice.pageFormat || 'a4';
      const filename = generateExportFilename(invoice.invoiceNumber, 'pdf');

      await exportInvoiceToPdf(previewDoc, {
        format,
        filename,
      });

      showToast(
        'success',
        'PDF Exported Successfully',
        `"${filename}" (${format.toUpperCase()}) saved. Zero watermarks, crisp vector styling.`
      );
    } catch (err: unknown) {
      console.error('PDF export error:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown generation error';
      showToast(
        'error',
        'PDF Generation Failed',
        `Could not export PDF directly: ${errMsg}. You can click "Print" to save as PDF via your browser. (Your form data is safe.)`
      );
    } finally {
      setButtonsLoading(pdfButtons, false, 'Download PDF');
    }
  }

  // 14. PNG Export Handler (Lazy-loads html2canvas on demand)
  async function handleDownloadPng() {
    const previewDoc = document.getElementById('invoice-preview-document');
    if (!previewDoc) {
      showToast('error', 'Export Failed', 'Invoice document preview element was not found.');
      return;
    }

    const pngButtons = [btnDownloadPngForm, btnDownloadPngPreview].filter(
      Boolean
    ) as HTMLButtonElement[];

    setButtonsLoading(pngButtons, true, 'Exporting PNG...');

    try {
      const filename = generateExportFilename(invoice.invoiceNumber, 'png');

      await exportInvoiceToPng(previewDoc, {
        filename,
      });

      showToast(
        'success',
        'PNG Image Exported',
        `"${filename}" saved with high-DPI resolution, ready to share.`
      );
    } catch (err: unknown) {
      console.error('PNG export error:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown export error';
      showToast(
        'error',
        'PNG Export Failed',
        `Could not export image: ${errMsg}. (Your form data is safe.)`
      );
    } finally {
      setButtonsLoading(pngButtons, false, 'PNG');
    }
  }

  // 15. Wire Event Handlers
  if (btnDownloadPdfForm) btnDownloadPdfForm.addEventListener('click', handleDownloadPdf);
  if (btnDownloadPdfPreview) btnDownloadPdfPreview.addEventListener('click', handleDownloadPdf);
  if (btnDownloadPngForm) btnDownloadPngForm.addEventListener('click', handleDownloadPng);
  if (btnDownloadPngPreview) btnDownloadPngPreview.addEventListener('click', handleDownloadPng);

  if (btnPrintInvoice) {
    btnPrintInvoice.addEventListener('click', (e) => {
      e.preventDefault();
      printInvoice();
    });
  }

  if (btnPrintPreview) {
    btnPrintPreview.addEventListener('click', (e) => {
      e.preventDefault();
      printInvoice();
    });
  }

  // Reset form handler
  if (btnResetForm) {
    btnResetForm.addEventListener('click', (e) => {
      e.preventDefault();
      if (
        confirm('Are you sure you want to reset this invoice? All entered details will be cleared.')
      ) {
        clearInvoiceDraft();
        invoice = createDefaultInvoice();
        populateFormInputs();
        renderLineItems();
        applyTemplate(invoice.template || 'modern');
        applyFormat(invoice.pageFormat || 'a4');
        updateLivePreview();
        // Clear any error states
        document.querySelectorAll('.text-input-error').forEach((el) => {
          el.classList.remove('text-input-error');
          el.removeAttribute('aria-invalid');
        });
        document.querySelectorAll('[id^="err-"]').forEach((el) => {
          el.classList.add('hidden');
          el.classList.remove('flex');
        });
        showToast('info', 'Form Reset', 'Invoice fields restored to clean defaults.');
      }
    });
  }

  // 16. Privacy, Storage & Saved Data Controllers
  function updateStorageStatus() {
    const storagePill = document.getElementById('storage-status-pill');
    const storageText = document.getElementById('storage-status-text');
    if (!storagePill || !storageText) return;

    if (isLocalStorageAvailable()) {
      storagePill.className =
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent-teal/10 text-accent-teal border border-accent-teal/20';
      storageText.textContent = 'Local Storage Active';
    } else {
      storagePill.className =
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20';
      storageText.textContent = 'Session In-Memory (Storage Blocked)';
    }
  }

  function refreshSavedClientsDropdown() {
    const container = document.getElementById('saved-clients-container');
    const selectEl = document.getElementById('select-saved-client') as HTMLSelectElement | null;
    const deleteBtn = document.getElementById(
      'btn-delete-saved-client'
    ) as HTMLButtonElement | null;
    if (!container || !selectEl) return;

    const clients = loadSavedClients();
    if (clients.length === 0) {
      container.classList.add('hidden');
      container.classList.remove('flex');
      selectEl.innerHTML = '<option value="">Select client...</option>';
      if (deleteBtn) deleteBtn.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    container.classList.add('flex');

    const currentVal = selectEl.value;
    let optionsHtml = '<option value="">Select client...</option>';
    clients.forEach((c) => {
      const isSelected = c.id === currentVal ? 'selected' : '';
      optionsHtml += `<option value="${c.id}" ${isSelected}>${c.name}${c.email ? ` (${c.email})` : ''}</option>`;
    });
    selectEl.innerHTML = optionsHtml;
  }

  function refreshCustomTemplatesDropdown() {
    const selectCustomTemplate = document.getElementById(
      'select-custom-template'
    ) as HTMLSelectElement | null;
    if (!selectCustomTemplate) return;

    const templates = loadCustomTemplates();
    if (templates.length === 0) {
      selectCustomTemplate.classList.add('hidden');
      selectCustomTemplate.innerHTML = '<option value="">My Templates (0)</option>';
      return;
    }

    selectCustomTemplate.classList.remove('hidden');
    let html = `<option value="">My Templates (${templates.length})</option>`;
    templates.forEach((t) => {
      html += `<option value="${t.id}">${t.name}</option>`;
    });
    selectCustomTemplate.innerHTML = html;
  }

  // Saved Client Picker Event
  const selectSavedClient = document.getElementById(
    'select-saved-client'
  ) as HTMLSelectElement | null;
  const btnDeleteSavedClient = document.getElementById(
    'btn-delete-saved-client'
  ) as HTMLButtonElement | null;

  if (selectSavedClient) {
    selectSavedClient.addEventListener('change', () => {
      const clientId = selectSavedClient.value;
      if (!clientId) {
        if (btnDeleteSavedClient) btnDeleteSavedClient.classList.add('hidden');
        return;
      }
      if (btnDeleteSavedClient) btnDeleteSavedClient.classList.remove('hidden');

      const clients = loadSavedClients();
      const found = clients.find((c) => c.id === clientId);
      if (!found) return;

      invoice.client.name = found.name;
      invoice.client.email = found.email || '';
      invoice.client.phone = found.phone || '';
      invoice.client.address = found.address || '';
      invoice.client.taxId = found.taxId || '';

      if (clientNameInput) clientNameInput.value = found.name;
      if (clientEmailInput) clientEmailInput.value = found.email || '';
      if (clientPhoneInput) clientPhoneInput.value = found.phone || '';
      if (clientAddressInput) clientAddressInput.value = found.address || '';
      if (clientTaxIdInput) clientTaxIdInput.value = found.taxId || '';

      triggerAutoSave();
      updateLivePreview();
      showToast('info', 'Client Details Loaded', `Auto-filled details for "${found.name}".`);
    });
  }

  if (btnDeleteSavedClient) {
    btnDeleteSavedClient.addEventListener('click', (e) => {
      e.preventDefault();
      const clientId = selectSavedClient?.value;
      if (!clientId) return;
      deleteSavedClient(clientId);
      refreshSavedClientsDropdown();
      showToast('info', 'Client Removed', 'Client deleted from saved directory.');
    });
  }

  // Clear All Data Modal Handlers
  const btnClearMyData = document.getElementById('btn-clear-my-data');
  const modalClearData = document.getElementById('modal-clear-data');
  const btnCancelClearData = document.getElementById('btn-cancel-clear-data');
  const btnConfirmClearData = document.getElementById('btn-confirm-clear-data');

  function openClearDataModal() {
    if (modalClearData) {
      modalClearData.classList.remove('opacity-0', 'pointer-events-none');
      const innerCard = modalClearData.querySelector('div');
      if (innerCard) innerCard.classList.remove('scale-95');
    }
  }

  function closeClearDataModal() {
    if (modalClearData) {
      modalClearData.classList.add('opacity-0', 'pointer-events-none');
      const innerCard = modalClearData.querySelector('div');
      if (innerCard) innerCard.classList.add('scale-95');
    }
  }

  if (btnClearMyData) btnClearMyData.addEventListener('click', openClearDataModal);
  if (btnCancelClearData) btnCancelClearData.addEventListener('click', closeClearDataModal);
  if (modalClearData) {
    modalClearData.addEventListener('click', (e) => {
      if (e.target === modalClearData) closeClearDataModal();
    });
  }

  if (btnConfirmClearData) {
    btnConfirmClearData.addEventListener('click', () => {
      clearAllStoredData();
      invoice = createDefaultInvoice();
      populateFormInputs();
      renderLineItems();
      applyTemplate(invoice.template || 'modern');
      applyFormat(invoice.pageFormat || 'a4');
      updateLivePreview();
      refreshSavedClientsDropdown();
      refreshCustomTemplatesDropdown();
      closeClearDataModal();

      // Clear any error states
      document.querySelectorAll('.text-input-error').forEach((el) => {
        el.classList.remove('text-input-error');
        el.removeAttribute('aria-invalid');
      });
      document.querySelectorAll('[id^="err-"]').forEach((el) => {
        el.classList.add('hidden');
        el.classList.remove('flex');
      });

      showToast(
        'success',
        'All Local Data Cleared',
        'Business profile, saved clients, custom templates, and invoice drafts have been permanently erased from this browser.'
      );
    });
  }

  // Save Custom Template Modal Handlers
  const btnSaveAsTemplate = document.getElementById('btn-save-as-template');
  const modalSaveTemplate = document.getElementById('modal-save-template');
  const inputTemplateName = document.getElementById(
    'input-template-name'
  ) as HTMLInputElement | null;
  const btnCancelSaveTemplate = document.getElementById('btn-cancel-save-template');
  const btnConfirmSaveTemplate = document.getElementById('btn-confirm-save-template');
  const selectCustomTemplate = document.getElementById(
    'select-custom-template'
  ) as HTMLSelectElement | null;

  function openSaveTemplateModal() {
    if (inputTemplateName) {
      const clientPrefix = invoice.client?.name ? `${invoice.client.name.trim()} - ` : '';
      inputTemplateName.value = `${clientPrefix}Template ${new Date().toLocaleDateString()}`;
    }
    if (modalSaveTemplate) {
      modalSaveTemplate.classList.remove('opacity-0', 'pointer-events-none');
      const innerCard = modalSaveTemplate.querySelector('div');
      if (innerCard) innerCard.classList.remove('scale-95');
      setTimeout(() => inputTemplateName?.focus(), 50);
    }
  }

  function closeSaveTemplateModal() {
    if (modalSaveTemplate) {
      modalSaveTemplate.classList.add('opacity-0', 'pointer-events-none');
      const innerCard = modalSaveTemplate.querySelector('div');
      if (innerCard) innerCard.classList.add('scale-95');
    }
  }

  if (btnSaveAsTemplate) btnSaveAsTemplate.addEventListener('click', openSaveTemplateModal);
  if (btnCancelSaveTemplate)
    btnCancelSaveTemplate.addEventListener('click', closeSaveTemplateModal);
  if (modalSaveTemplate) {
    modalSaveTemplate.addEventListener('click', (e) => {
      if (e.target === modalSaveTemplate) closeSaveTemplateModal();
    });
  }

  if (btnConfirmSaveTemplate) {
    btnConfirmSaveTemplate.addEventListener('click', () => {
      const name =
        inputTemplateName?.value?.trim() || `Template ${new Date().toLocaleDateString()}`;
      const saved = saveCustomTemplate(name, invoice);
      closeSaveTemplateModal();
      refreshCustomTemplatesDropdown();
      if (saved) {
        showToast(
          'success',
          'Template Saved',
          `Template "${saved.name}" has been saved to your browser.`
        );
      } else {
        showToast('error', 'Save Failed', 'Could not save template to browser storage.');
      }
    });
  }

  if (selectCustomTemplate) {
    selectCustomTemplate.addEventListener('change', () => {
      const templateId = selectCustomTemplate.value;
      if (!templateId) return;

      const templates = loadCustomTemplates();
      const found = templates.find((t) => t.id === templateId);
      if (!found) return;

      const preserveNumber = invoice.invoiceNumber;
      invoice = JSON.parse(JSON.stringify(found.invoice));
      // Retain active invoice number
      if (preserveNumber) invoice.invoiceNumber = preserveNumber;

      populateFormInputs();
      renderLineItems();
      applyTemplate(invoice.template || 'modern');
      applyFormat(invoice.pageFormat || 'a4');
      updateLivePreview();
      triggerAutoSave();

      showToast('info', 'Template Loaded', `Applied "${found.name}".`);
      selectCustomTemplate.value = '';
    });
  }

  // Duplicate Invoice Button Handler
  const btnDuplicateInvoice = document.getElementById('btn-duplicate-invoice');
  if (btnDuplicateInvoice) {
    btnDuplicateInvoice.addEventListener('click', (e) => {
      e.preventDefault();
      invoice = duplicateInvoice(invoice);
      populateFormInputs();
      renderLineItems();
      applyTemplate(invoice.template || 'modern');
      applyFormat(invoice.pageFormat || 'a4');
      updateLivePreview();
      triggerAutoSave();
      showToast(
        'success',
        'Invoice Duplicated',
        `Duplicated as "${invoice.invoiceNumber}". Issue date set to today.`
      );
    });
  }

  // Export JSON Button Handler
  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', (e) => {
      e.preventDefault();
      triggerJsonDownload(invoice);
      showToast(
        'success',
        'JSON Backup Exported',
        `Saved invoice configuration as "${(invoice.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9-_]/g, '_')}.json".`
      );
    });
  }

  // Import JSON Handlers
  const btnImportJson = document.getElementById('btn-import-json');
  const inputImportJson = document.getElementById('input-import-json') as HTMLInputElement | null;

  if (btnImportJson && inputImportJson) {
    btnImportJson.addEventListener('click', (e) => {
      e.preventDefault();
      inputImportJson.click();
    });

    inputImportJson.addEventListener('change', () => {
      const file = inputImportJson.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const result = importInvoiceFromJson(content);
        if (!result.success || !result.invoice) {
          showToast(
            'error',
            'JSON Import Failed',
            `Could not import invoice: ${result.error || 'Invalid JSON syntax'}. Your existing form data is safe.`
          );
          inputImportJson.value = '';
          return;
        }

        invoice = result.invoice;
        populateFormInputs();
        renderLineItems();
        applyTemplate(invoice.template || 'modern');
        applyFormat(invoice.pageFormat || 'a4');
        updateLivePreview();
        triggerAutoSave();
        refreshSavedClientsDropdown();

        showToast(
          'success',
          'Invoice Imported',
          `Successfully loaded "${invoice.invoiceNumber}" with line items and styles.`
        );
        inputImportJson.value = '';
      };

      reader.onerror = () => {
        showToast('error', 'File Read Error', 'Failed to read the selected JSON file.');
        inputImportJson.value = '';
      };

      reader.readAsText(file);
    });
  }

  // Initialize view
  updateStorageStatus();
  populateFormInputs();
  renderLineItems();
  refreshSavedClientsDropdown();
  refreshCustomTemplatesDropdown();
  setupTemplateSwitcher();
  setupFormatSelector();
  setupMobileViewToggle();
  updateLivePreview();
}

// Auto-run if DOM is ready, or on DOMContentLoaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupInvoiceForm);
  } else {
    setupInvoiceForm();
  }
}
