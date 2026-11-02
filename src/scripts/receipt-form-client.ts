import {
  type ReceiptData,
  createDefaultReceipt,
  saveReceiptDraft,
  loadReceiptDraft,
  clearReceiptDraft,
  calculateTotals,
} from '../lib/receipt';
import { TOP_30_CURRENCIES } from '../data/currencies';
import {
  exportInvoiceToPdf,
  exportInvoiceToPng,
  generateExportFilename,
  printInvoice,
} from '../lib/invoice-export';

export function setupReceiptForm() {
  const formEl = document.getElementById('receipt-form') as HTMLFormElement | null;
  if (!formEl) return;

  let receipt: ReceiptData = loadReceiptDraft() || createDefaultReceipt();

  // Inputs
  const receiptNumInput = document.getElementById('receipt-number') as HTMLInputElement | null;
  const receiptDateInput = document.getElementById('receipt-date') as HTMLInputElement | null;
  const currencySelect = document.getElementById('receipt-currency') as HTMLSelectElement | null;

  const merchantNameInput = document.getElementById('merchant-name') as HTMLInputElement | null;
  const merchantEmailInput = document.getElementById('merchant-email') as HTMLInputElement | null;
  const merchantPhoneInput = document.getElementById('merchant-phone') as HTMLInputElement | null;
  const merchantAddressInput = document.getElementById(
    'merchant-address'
  ) as HTMLTextAreaElement | null;
  const merchantTaxIdInput = document.getElementById('merchant-tax-id') as HTMLInputElement | null;

  const customerNameInput = document.getElementById('customer-name') as HTMLInputElement | null;
  const customerEmailInput = document.getElementById('customer-email') as HTMLInputElement | null;
  const customerPhoneInput = document.getElementById('customer-phone') as HTMLInputElement | null;
  const customerAddressInput = document.getElementById(
    'customer-address'
  ) as HTMLTextAreaElement | null;

  const paymentMethodSelect = document.getElementById(
    'receipt-payment-method'
  ) as HTMLSelectElement | null;
  const txRefInput = document.getElementById('receipt-tx-ref') as HTMLInputElement | null;
  const notesInput = document.getElementById('receipt-notes') as HTMLTextAreaElement | null;
  const signatureInput = document.getElementById('receipt-signature') as HTMLInputElement | null;

  const itemsContainer = document.getElementById('receipt-items-container');
  const btnAddItem = document.getElementById('btn-add-receipt-item');

  // Preview elements
  const previewDoc = document.getElementById('receipt-preview-document');
  const prevTitle = document.getElementById('prev-rec-title');
  const prevNumber = document.getElementById('prev-rec-number');
  const prevDate = document.getElementById('prev-rec-date');

  const prevMerchantName = document.getElementById('prev-rec-merchant-name');
  const prevMerchantAddress = document.getElementById('prev-rec-merchant-address');
  const prevMerchantEmailPhone = document.getElementById('prev-rec-merchant-email-phone');
  const prevMerchantTax = document.getElementById('prev-rec-merchant-tax');

  const prevCustomerName = document.getElementById('prev-rec-customer-name');
  const prevCustomerEmail = document.getElementById('prev-rec-customer-email');
  const prevCustomerPhone = document.getElementById('prev-rec-customer-phone');
  const prevCustomerAddress = document.getElementById('prev-rec-customer-address');

  const prevMethod = document.getElementById('prev-rec-method');
  const prevRef = document.getElementById('prev-rec-ref');
  const prevRefRow = document.getElementById('prev-rec-ref-row');
  const prevItemsBody = document.getElementById('prev-rec-items-body');
  const prevSubtotal = document.getElementById('prev-rec-subtotal');
  const prevGrandtotal = document.getElementById('prev-rec-grandtotal');
  const prevNotes = document.getElementById('prev-rec-notes');
  const prevSignature = document.getElementById('prev-rec-signature');

  const subtotalDisp = document.getElementById('receipt-subtotal-disp');
  const grandtotalDisp = document.getElementById('receipt-grandtotal-disp');

  const receiptTaxRateInput = document.getElementById('receipt-tax-rate') as HTMLInputElement | null;
  const receiptTaxRow = document.getElementById('receipt-tax-row');
  const receiptTaxLabel = document.getElementById('receipt-tax-label');
  const receiptTaxDisp = document.getElementById('receipt-tax-disp');
  const prevTaxRow = document.getElementById('prev-rec-tax-row');
  const prevTaxLabel = document.getElementById('prev-rec-tax-label');
  const prevTax = document.getElementById('prev-rec-tax');

  // Currency Formatter
  function getCurrencySymbol() {
    const found = TOP_30_CURRENCIES.find((c) => c.code === receipt.currency);
    return found ? found.symbol : '$';
  }

  function formatMoney(amount: number) {
    const symbol = getCurrencySymbol();
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Toast
  const toastEl = document.getElementById('receipt-toast');
  const toastTitle = document.getElementById('receipt-toast-title');
  const toastMsg = document.getElementById('receipt-toast-message');
  const btnCloseToast = document.getElementById('btn-close-receipt-toast');

  function showToast(type: 'success' | 'error' | 'info', title: string, message: string) {
    if (!toastEl || !toastTitle || !toastMsg) return;
    toastTitle.textContent = title;
    toastMsg.textContent = message;

    if (type === 'success') {
      toastEl.className =
        'fixed bottom-6 right-6 z-50 max-w-md w-full px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/30 bg-white text-emerald-950 transition-all duration-300 translate-y-0 opacity-100 flex items-start gap-3 no-print';
    } else if (type === 'error') {
      toastEl.className =
        'fixed bottom-6 right-6 z-50 max-w-md w-full px-4 py-3 rounded-2xl shadow-xl border border-rose-500/30 bg-white text-rose-950 transition-all duration-300 translate-y-0 opacity-100 flex items-start gap-3 no-print';
    } else {
      toastEl.className =
        'fixed bottom-6 right-6 z-50 max-w-md w-full px-4 py-3 rounded-2xl shadow-xl border border-blue-500/30 bg-white text-blue-950 transition-all duration-300 translate-y-0 opacity-100 flex items-start gap-3 no-print';
    }

    setTimeout(() => {
      toastEl.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
    }, 4500);
  }

  if (btnCloseToast) {
    btnCloseToast.addEventListener('click', () => {
      toastEl?.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
    });
  }

  // Populate form
  function populateInputs() {
    if (receiptNumInput) receiptNumInput.value = receipt.receiptNumber;
    if (receiptDateInput) receiptDateInput.value = receipt.paymentDate;
    if (currencySelect) currencySelect.value = receipt.currency;

    if (merchantNameInput) merchantNameInput.value = receipt.merchant.name;
    if (merchantEmailInput) merchantEmailInput.value = receipt.merchant.email || '';
    if (merchantPhoneInput) merchantPhoneInput.value = receipt.merchant.phone || '';
    if (merchantAddressInput) merchantAddressInput.value = receipt.merchant.address || '';
    if (merchantTaxIdInput) merchantTaxIdInput.value = receipt.merchant.taxId || '';

    if (customerNameInput) customerNameInput.value = receipt.customer.name;
    if (customerEmailInput) customerEmailInput.value = receipt.customer.email || '';
    if (customerPhoneInput) customerPhoneInput.value = receipt.customer.phone || '';
    if (customerAddressInput) customerAddressInput.value = receipt.customer.address || '';

    if (paymentMethodSelect) paymentMethodSelect.value = receipt.paymentMethod;
    if (txRefInput) txRefInput.value = receipt.transactionReference || '';
    if (notesInput) notesInput.value = receipt.notes || '';
    if (signatureInput) signatureInput.value = receipt.signature || '';
  }

  // Auto-save debounce
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function triggerSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveReceiptDraft(receipt);
    }, 300);
  }

  // Render Line items
  function renderLineItems() {
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '';

    receipt.lineItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.className =
        'flex items-center gap-2 p-2.5 rounded-xl border border-hairline bg-surface-card hover:border-hairline-strong transition-colors';
      row.innerHTML = `
        <input
          type="text"
          class="item-desc text-input h-10 text-xs flex-1 min-w-0"
          placeholder="Description of product / service"
          aria-label="Item description"
          value="${item.description}"
          data-index="${index}"
        />
        <input
          type="number"
          class="item-qty text-input h-10 text-xs !w-16 shrink-0 text-center font-mono"
          placeholder="Qty"
          aria-label="Quantity"
          value="${item.quantity}"
          min="1"
          data-index="${index}"
        />
        <input
          type="number"
          class="item-price text-input h-10 text-xs !w-24 shrink-0 text-right font-mono"
          placeholder="Price"
          aria-label="Unit price"
          value="${item.unitPrice}"
          min="0"
          step="0.01"
          data-index="${index}"
        />
        <button
          type="button"
          class="btn-del-item h-9 w-9 shrink-0 flex items-center justify-center text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
          data-index="${index}"
          title="Remove line item"
          aria-label="Remove item ${index + 1}"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
      itemsContainer.appendChild(row);
    });

    // Wire input events
    itemsContainer.querySelectorAll('.item-desc').forEach((el) => {
      const onDescInput = (e: Event) => {
        const idx = Number((e.target as HTMLElement).getAttribute('data-index'));
        receipt.lineItems[idx].description = (e.target as HTMLInputElement).value;
        triggerSave();
        updatePreview();
      };
      el.addEventListener('input', onDescInput);
      el.addEventListener('change', onDescInput);
      el.addEventListener('keyup', onDescInput);
    });

    itemsContainer.querySelectorAll('.item-qty').forEach((el) => {
      const onQtyInput = (e: Event) => {
        const idx = Number((e.target as HTMLElement).getAttribute('data-index'));
        receipt.lineItems[idx].quantity = Number((e.target as HTMLInputElement).value) || 0;
        triggerSave();
        updatePreview();
      };
      el.addEventListener('input', onQtyInput);
      el.addEventListener('change', onQtyInput);
      el.addEventListener('keyup', onQtyInput);
    });

    itemsContainer.querySelectorAll('.item-price').forEach((el) => {
      const onPriceInput = (e: Event) => {
        const idx = Number((e.target as HTMLElement).getAttribute('data-index'));
        receipt.lineItems[idx].unitPrice = Number((e.target as HTMLInputElement).value) || 0;
        triggerSave();
        updatePreview();
      };
      el.addEventListener('input', onPriceInput);
      el.addEventListener('change', onPriceInput);
      el.addEventListener('keyup', onPriceInput);
    });

    itemsContainer.querySelectorAll('.btn-del-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-index'));
        if (receipt.lineItems.length <= 1) {
          receipt.lineItems[0] = {
            id: `item_${Date.now()}`,
            description: '',
            quantity: 1,
            unitPrice: 0,
          };
        } else {
          receipt.lineItems.splice(idx, 1);
        }
        renderLineItems();
        triggerSave();
        updatePreview();
      });
    });
  }

  // Update Live Preview
  function updatePreview() {
    const totals = calculateTotals({ lineItems: receipt.lineItems });

    if (prevTitle) {
      if (receipt.receiptType === 'cash') prevTitle.textContent = 'CASH RECEIPT';
      else if (receipt.receiptType === 'payment') prevTitle.textContent = 'PAYMENT RECEIPT';
      else prevTitle.textContent = 'RECEIPT';
    }

    if (prevNumber) prevNumber.textContent = `#${receipt.receiptNumber || 'REC-001'}`;
    if (prevDate) prevDate.textContent = `Date: ${receipt.paymentDate || ''}`;

    if (prevMerchantName) prevMerchantName.textContent = receipt.merchant.name || 'Merchant Name';
    if (prevMerchantAddress) prevMerchantAddress.textContent = receipt.merchant.address || '';
    if (prevMerchantEmailPhone) {
      const parts = [receipt.merchant.email, receipt.merchant.phone].filter(Boolean);
      prevMerchantEmailPhone.textContent = parts.join(' · ');
    }
    if (prevMerchantTax)
      prevMerchantTax.textContent = receipt.merchant.taxId
        ? `Tax ID: ${receipt.merchant.taxId}`
        : '';

    if (prevCustomerName) prevCustomerName.textContent = receipt.customer.name || 'Customer Name';
    if (prevCustomerEmail) prevCustomerEmail.textContent = receipt.customer.email || '';
    if (prevCustomerPhone) prevCustomerPhone.textContent = receipt.customer.phone || '';
    if (prevCustomerAddress) prevCustomerAddress.textContent = receipt.customer.address || '';

    if (prevMethod) prevMethod.textContent = receipt.paymentMethod;
    if (prevRef) prevRef.textContent = receipt.transactionReference || 'N/A';
    if (prevRefRow) {
      if (receipt.transactionReference) prevRefRow.classList.remove('hidden');
      else prevRefRow.classList.add('hidden');
    }

    // Line items preview
    if (prevItemsBody) {
      prevItemsBody.innerHTML = '';
      receipt.lineItems.forEach((item) => {
        const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-100';
        tr.innerHTML = `
          <td class="py-2.5 text-gray-900 font-medium">${item.description || 'Item'}</td>
          <td class="py-2.5 text-right font-mono text-gray-600">${item.quantity}</td>
          <td class="py-2.5 text-right font-mono text-gray-600">${formatMoney(item.unitPrice)}</td>
          <td class="py-2.5 text-right font-mono font-medium text-gray-900">${formatMoney(itemTotal)}</td>
        `;
        prevItemsBody.appendChild(tr);
      });
    }

    // Subtotal, Tax & Grandtotal
    const taxRate = Math.max(0, receipt.taxRate || 0);
    const taxAmount = (totals.subtotal * taxRate) / 100;
    const finalTotal = totals.subtotal + taxAmount;

    const formattedSub = formatMoney(totals.subtotal);
    const formattedGrand = formatMoney(finalTotal);

    if (prevSubtotal) prevSubtotal.textContent = formattedSub;
    if (subtotalDisp) subtotalDisp.textContent = formattedSub;

    if (taxRate > 0) {
      const taxText = formatMoney(taxAmount);
      if (receiptTaxLabel) receiptTaxLabel.textContent = `Tax (${taxRate}%)`;
      if (receiptTaxDisp) receiptTaxDisp.textContent = taxText;
      if (receiptTaxRow) receiptTaxRow.classList.remove('hidden');

      if (prevTaxLabel) prevTaxLabel.textContent = `Tax (${taxRate}%)`;
      if (prevTax) prevTax.textContent = taxText;
      if (prevTaxRow) prevTaxRow.classList.remove('hidden');
    } else {
      if (receiptTaxRow) receiptTaxRow.classList.add('hidden');
      if (prevTaxRow) prevTaxRow.classList.add('hidden');
    }

    if (prevGrandtotal) prevGrandtotal.textContent = formattedGrand;
    if (grandtotalDisp) grandtotalDisp.textContent = formattedGrand;

    if (prevNotes) prevNotes.textContent = receipt.notes || '';
    if (prevSignature) prevSignature.textContent = receipt.signature || 'Authorized Signatory';
  }

  // Field change bindings
  const onTaxRateChange = (e: Event) => {
    receipt.taxRate = parseFloat((e.target as HTMLInputElement).value) || 0;
    triggerSave();
    updatePreview();
  };
  receiptTaxRateInput?.addEventListener('input', onTaxRateChange);
  receiptTaxRateInput?.addEventListener('change', onTaxRateChange);
  receiptNumInput?.addEventListener('input', (e) => {
    receipt.receiptNumber = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  receiptDateInput?.addEventListener('input', (e) => {
    receipt.paymentDate = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  currencySelect?.addEventListener('change', (e) => {
    receipt.currency = (e.target as HTMLSelectElement).value;
    triggerSave();
    updatePreview();
  });

  merchantNameInput?.addEventListener('input', (e) => {
    receipt.merchant.name = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  merchantEmailInput?.addEventListener('input', (e) => {
    receipt.merchant.email = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  merchantPhoneInput?.addEventListener('input', (e) => {
    receipt.merchant.phone = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  merchantAddressInput?.addEventListener('input', (e) => {
    receipt.merchant.address = (e.target as HTMLTextAreaElement).value;
    triggerSave();
    updatePreview();
  });

  merchantTaxIdInput?.addEventListener('input', (e) => {
    receipt.merchant.taxId = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  customerNameInput?.addEventListener('input', (e) => {
    receipt.customer.name = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  customerEmailInput?.addEventListener('input', (e) => {
    receipt.customer.email = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  customerPhoneInput?.addEventListener('input', (e) => {
    receipt.customer.phone = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  customerAddressInput?.addEventListener('input', (e) => {
    receipt.customer.address = (e.target as HTMLTextAreaElement).value;
    triggerSave();
    updatePreview();
  });

  ['change', 'input'].forEach((evt) => {
    paymentMethodSelect?.addEventListener(evt, (e) => {
      receipt.paymentMethod = (e.target as HTMLSelectElement).value || 'Cash';
      triggerSave();
      updatePreview();
    });
  });

  txRefInput?.addEventListener('input', (e) => {
    receipt.transactionReference = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  notesInput?.addEventListener('input', (e) => {
    receipt.notes = (e.target as HTMLTextAreaElement).value;
    triggerSave();
    updatePreview();
  });

  signatureInput?.addEventListener('input', (e) => {
    receipt.signature = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  // Add line item button
  btnAddItem?.addEventListener('click', () => {
    receipt.lineItems.push({
      id: `rec_item_${Date.now()}`,
      description: 'Service / Item',
      quantity: 1,
      unitPrice: 100,
    });
    renderLineItems();
    triggerSave();
    updatePreview();
  });

  // Receipt Type Switching (Itemized, Cash, Payment)
  document.querySelectorAll('.btn-receipt-type').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const type = target.getAttribute('data-type') as 'itemized' | 'cash' | 'payment';
      receipt.receiptType = type;

      document.querySelectorAll('.btn-receipt-type').forEach((b) => {
        b.className =
          'btn-receipt-type px-3.5 py-1.5 min-h-[32px] rounded-full text-charcoal hover:text-ink cursor-pointer transition-all';
      });
      target.className =
        'btn-receipt-type px-3.5 py-1.5 min-h-[32px] rounded-full bg-primary text-white shadow-2xs cursor-pointer transition-all';

      if (type === 'cash') {
        receipt.paymentMethod = 'Cash';
        if (paymentMethodSelect) paymentMethodSelect.value = 'Cash';
      }

      triggerSave();
      updatePreview();
      showToast('info', 'Receipt Type Switched', `Mode set to ${type.toUpperCase()} receipt.`);
    });
  });

  // Style switcher
  document.querySelectorAll('.btn-rec-tmpl').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const tmpl = target.getAttribute('data-tmpl') || 'modern';
      receipt.template = tmpl as any;
      if (previewDoc) previewDoc.setAttribute('data-template', tmpl);

      document.querySelectorAll('.btn-rec-tmpl').forEach((b) => {
        b.className =
          'btn-rec-tmpl px-2.5 py-1 rounded-lg text-xs font-semibold transition-all text-charcoal hover:bg-surface-soft';
      });
      target.className =
        'btn-rec-tmpl px-2.5 py-1 rounded-lg text-xs font-semibold transition-all bg-primary text-white';
      triggerSave();
    });
  });

  // Format switcher
  document.querySelectorAll('.btn-rec-format').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const fmt = target.getAttribute('data-fmt') || 'a4';
      receipt.pageFormat = fmt as any;
      if (previewDoc) previewDoc.setAttribute('data-format', fmt);

      document.querySelectorAll('.btn-rec-format').forEach((b) => {
        b.className =
          'btn-rec-format px-2.5 py-1 rounded-lg text-xs font-semibold transition-all text-charcoal hover:bg-surface-soft';
      });
      target.className =
        'btn-rec-format px-2.5 py-1 rounded-lg text-xs font-semibold transition-all bg-primary text-white';
      triggerSave();
    });
  });

  // Mobile toggle
  const btnToggleForm = document.getElementById('btn-toggle-receipt-form');
  const btnTogglePreview = document.getElementById('btn-toggle-receipt-preview');
  const formCol = document.getElementById('receipt-form-column');
  const previewCol = document.getElementById('receipt-preview-column');

  let activeReceiptTab: 'form' | 'preview' = 'form';

  function setReceiptMobileView(tab: 'form' | 'preview') {
    activeReceiptTab = tab;
    if (tab === 'form') {
      formCol?.classList.remove('hidden');
      previewCol?.classList.add('hidden');
      if (btnToggleForm) {
        btnToggleForm.className =
          'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-primary text-white shadow-2xs cursor-pointer';
        btnToggleForm.setAttribute('aria-pressed', 'true');
      }
      if (btnTogglePreview) {
        btnTogglePreview.className =
          'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-charcoal hover:text-ink hover:bg-surface-soft cursor-pointer';
        btnTogglePreview.setAttribute('aria-pressed', 'false');
      }
    } else {
      formCol?.classList.add('hidden');
      previewCol?.classList.remove('hidden');
      updatePreview();
      if (btnTogglePreview) {
        btnTogglePreview.className =
          'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-primary text-white shadow-2xs cursor-pointer';
        btnTogglePreview.setAttribute('aria-pressed', 'true');
      }
      if (btnToggleForm) {
        btnToggleForm.className =
          'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-charcoal hover:text-ink hover:bg-surface-soft cursor-pointer';
        btnToggleForm.setAttribute('aria-pressed', 'false');
      }
    }
  }

  btnToggleForm?.addEventListener('click', () => setReceiptMobileView('form'));
  btnTogglePreview?.addEventListener('click', () => setReceiptMobileView('preview'));

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      formCol?.classList.remove('hidden');
      previewCol?.classList.remove('hidden');
    } else {
      setReceiptMobileView(activeReceiptTab);
    }
  });

  // Reset & Clear
  const btnReset = document.getElementById('btn-reset-receipt');
  btnReset?.addEventListener('click', () => {
    receipt = createDefaultReceipt();
    populateInputs();
    renderLineItems();
    updatePreview();
    triggerSave();
    showToast('info', 'Receipt Reset', 'Restored default receipt values.');
  });

  const btnClearAll = document.getElementById('btn-clear-receipt-data');
  btnClearAll?.addEventListener('click', () => {
    clearReceiptDraft();
    receipt = createDefaultReceipt();
    populateInputs();
    renderLineItems();
    updatePreview();
    showToast('success', 'Receipt Cleared', 'All local receipt data has been cleared.');
  });

  // Exports
  const btnPrint = document.getElementById('btn-print-receipt');
  btnPrint?.addEventListener('click', () => {
    printInvoice();
  });

  const btnPng = document.getElementById('btn-png-receipt') as HTMLButtonElement | null;
  btnPng?.addEventListener('click', async () => {
    if (!previewDoc) return;
    try {
      if (btnPng) {
        btnPng.disabled = true;
        btnPng.textContent = 'Exporting...';
      }
      const filename = generateExportFilename(receipt.receiptNumber || 'receipt', 'png');
      await exportInvoiceToPng(previewDoc, { filename });
      showToast('success', 'PNG Exported', `Saved "${filename}".`);
    } catch (err) {
      console.error('PNG export failed:', err);
      showToast('error', 'Export Failed', 'Could not export PNG.');
    } finally {
      if (btnPng) {
        btnPng.disabled = false;
        btnPng.textContent = 'PNG';
      }
    }
  });

  const btnPdf = document.getElementById('btn-pdf-receipt') as HTMLButtonElement | null;
  btnPdf?.addEventListener('click', async () => {
    if (!previewDoc) return;
    try {
      if (btnPdf) {
        btnPdf.disabled = true;
        btnPdf.textContent = 'Generating PDF...';
      }
      const filename = generateExportFilename(receipt.receiptNumber || 'receipt', 'pdf');
      await exportInvoiceToPdf(previewDoc, {
        format: receipt.pageFormat || 'a4',
        filename,
      });
      showToast('success', 'PDF Exported', `Saved "${filename}" (Zero Watermarks).`);
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('error', 'Export Failed', 'Could not export PDF.');
    } finally {
      if (btnPdf) {
        btnPdf.disabled = false;
        btnPdf.textContent = 'Download PDF';
      }
    }
  });

  // Initial render
  populateInputs();
  renderLineItems();
  updatePreview();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupReceiptForm);
  } else {
    setupReceiptForm();
  }
}
