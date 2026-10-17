import {
  type RentReceiptData,
  createDefaultRentReceipt,
  calculateRentGrandTotal,
  saveRentReceiptDraft,
  loadRentReceiptDraft,
  clearRentReceiptDraft,
} from '../lib/rent-receipt';
import { TOP_30_CURRENCIES } from '../data/currencies';
import {
  exportInvoiceToPdf,
  exportInvoiceToPng,
  generateExportFilename,
  printInvoice,
} from '../lib/invoice-export';

export function setupRentReceiptForm() {
  const formEl = document.getElementById('rent-receipt-form') as HTMLFormElement | null;
  if (!formEl) return;

  let rentReceipt: RentReceiptData = loadRentReceiptDraft() || createDefaultRentReceipt();

  // Inputs
  const rentNumberInput = document.getElementById('rent-number') as HTMLInputElement | null;
  const rentDateInput = document.getElementById('rent-date') as HTMLInputElement | null;
  const rentCurrencySelect = document.getElementById('rent-currency') as HTMLSelectElement | null;

  const landlordNameInput = document.getElementById('landlord-name') as HTMLInputElement | null;
  const landlordPanInput = document.getElementById('landlord-pan') as HTMLInputElement | null;
  const landlordEmailInput = document.getElementById('landlord-email') as HTMLInputElement | null;
  const landlordPhoneInput = document.getElementById('landlord-phone') as HTMLInputElement | null;
  const landlordAddressInput = document.getElementById(
    'landlord-address'
  ) as HTMLTextAreaElement | null;

  const tenantNameInput = document.getElementById('tenant-name') as HTMLInputElement | null;
  const tenantPhoneInput = document.getElementById('tenant-phone') as HTMLInputElement | null;
  const propertyAddressInput = document.getElementById(
    'property-address'
  ) as HTMLTextAreaElement | null;

  const rentMonthInput = document.getElementById('rent-period-month') as HTMLInputElement | null;
  const rentAmountInput = document.getElementById('rent-amount') as HTMLInputElement | null;
  const maintenanceAmountInput = document.getElementById(
    'maintenance-amount'
  ) as HTMLInputElement | null;
  const paymentModeSelect = document.getElementById(
    'rent-payment-mode'
  ) as HTMLSelectElement | null;
  const rentTxRefInput = document.getElementById('rent-tx-ref') as HTMLInputElement | null;

  const rentNotesInput = document.getElementById('rent-notes') as HTMLTextAreaElement | null;
  const landlordSignatureInput = document.getElementById(
    'landlord-signature'
  ) as HTMLInputElement | null;

  // Preview elements
  const previewDoc = document.getElementById('rent-preview-document');
  const prevRentNumber = document.getElementById('prev-rent-number');
  const prevRentDate = document.getElementById('prev-rent-date');
  const prevTenantName = document.getElementById('prev-rent-tenant-name');
  const prevGrandtotalWords = document.getElementById('prev-rent-grandtotal-words');
  const prevPeriod = document.getElementById('prev-rent-period');
  const prevPeriodTd = document.getElementById('prev-rent-period-td');
  const prevAddress = document.getElementById('prev-rent-address');

  const prevBaseTd = document.getElementById('prev-rent-base-td');
  const prevMaintRow = document.getElementById('prev-rent-maint-row');
  const prevMaintPeriodTd = document.getElementById('prev-rent-maint-period-td');
  const prevMaintTd = document.getElementById('prev-rent-maint-td');
  const prevGrandtotal = document.getElementById('prev-rent-grandtotal');

  const prevMode = document.getElementById('prev-rent-mode');
  const prevRef = document.getElementById('prev-rent-ref');
  const prevRefRow = document.getElementById('prev-rent-ref-row');

  const prevLandlordName = document.getElementById('prev-rent-landlord-name');
  const prevPanRow = document.getElementById('prev-rent-pan-row');
  const prevPan = document.getElementById('prev-rent-pan');
  const prevLandlordContact = document.getElementById('prev-rent-landlord-contact');

  const prevNotes = document.getElementById('prev-rent-notes');
  const prevSignature = document.getElementById('prev-rent-signature');

  const rentBaseDisp = document.getElementById('rent-base-disp');
  const rentMaintDisp = document.getElementById('rent-maint-disp');
  const rentTotalDisp = document.getElementById('rent-total-disp');
  const saveStatus = document.getElementById('rent-save-status');

  // Currency helper
  function getCurrencySymbol() {
    const found = TOP_30_CURRENCIES.find((c) => c.code === rentReceipt.currency);
    return found ? found.symbol : '$';
  }

  function formatMoney(amount: number) {
    const symbol = getCurrencySymbol();
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Toast
  const toastEl = document.getElementById('rent-toast');
  const toastTitle = document.getElementById('rent-toast-title');
  const toastMsg = document.getElementById('rent-toast-message');
  const btnCloseToast = document.getElementById('btn-close-rent-toast');

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

  // Populate inputs
  function populateInputs() {
    if (rentNumberInput) rentNumberInput.value = rentReceipt.receiptNumber;
    if (rentDateInput) rentDateInput.value = rentReceipt.paymentDate;
    if (rentCurrencySelect) rentCurrencySelect.value = rentReceipt.currency;

    if (landlordNameInput) landlordNameInput.value = rentReceipt.landlord.name;
    if (landlordPanInput) landlordPanInput.value = rentReceipt.landlord.pan || '';
    if (landlordEmailInput) landlordEmailInput.value = rentReceipt.landlord.email || '';
    if (landlordPhoneInput) landlordPhoneInput.value = rentReceipt.landlord.phone || '';
    if (landlordAddressInput) landlordAddressInput.value = rentReceipt.landlord.address || '';

    if (tenantNameInput) tenantNameInput.value = rentReceipt.tenant.name;
    if (tenantPhoneInput) tenantPhoneInput.value = rentReceipt.tenant.phone || '';
    if (propertyAddressInput) propertyAddressInput.value = rentReceipt.propertyAddress;

    if (rentMonthInput) rentMonthInput.value = rentReceipt.periodMonthYear;
    if (rentAmountInput) rentAmountInput.value = String(rentReceipt.rentAmount);
    if (maintenanceAmountInput)
      maintenanceAmountInput.value = rentReceipt.maintenanceAmount
        ? String(rentReceipt.maintenanceAmount)
        : '';
    if (paymentModeSelect) paymentModeSelect.value = rentReceipt.paymentMode;
    if (rentTxRefInput) rentTxRefInput.value = rentReceipt.transactionReference || '';

    if (rentNotesInput) rentNotesInput.value = rentReceipt.notes || '';
    if (landlordSignatureInput) landlordSignatureInput.value = rentReceipt.landlordSignature || '';
  }

  // Auto-save debounce
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function triggerSave() {
    if (saveStatus) {
      saveStatus.textContent = 'Saving...';
      saveStatus.classList.remove('opacity-0');
    }
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveRentReceiptDraft(rentReceipt);
      if (saveStatus) {
        saveStatus.textContent = 'Saved locally';
        setTimeout(() => saveStatus.classList.add('opacity-0'), 1500);
      }
    }, 300);
  }

  // Live preview update
  function updatePreview() {
    const total = calculateRentGrandTotal(rentReceipt);
    const rentFormatted = formatMoney(rentReceipt.rentAmount || 0);
    const maintFormatted = formatMoney(rentReceipt.maintenanceAmount || 0);
    const totalFormatted = formatMoney(total);

    if (prevRentNumber) prevRentNumber.textContent = `#${rentReceipt.receiptNumber || 'RENT-001'}`;
    if (prevRentDate) prevRentDate.textContent = `Date: ${rentReceipt.paymentDate || ''}`;
    if (prevTenantName) prevTenantName.textContent = rentReceipt.tenant.name || 'Tenant Name';
    if (prevGrandtotalWords) prevGrandtotalWords.textContent = totalFormatted;
    if (prevPeriod) prevPeriod.textContent = rentReceipt.periodMonthYear || 'Rental Period';
    if (prevPeriodTd) prevPeriodTd.textContent = rentReceipt.periodMonthYear || 'Rental Period';
    if (prevAddress)
      prevAddress.textContent = rentReceipt.propertyAddress || 'Rental Property Address';

    if (prevBaseTd) prevBaseTd.textContent = rentFormatted;
    if (rentBaseDisp) rentBaseDisp.textContent = rentFormatted;

    // Maintenance row display
    if (rentReceipt.maintenanceAmount && rentReceipt.maintenanceAmount > 0) {
      if (prevMaintRow) prevMaintRow.classList.remove('hidden');
      if (prevMaintPeriodTd) prevMaintPeriodTd.textContent = rentReceipt.periodMonthYear;
      if (prevMaintTd) prevMaintTd.textContent = maintFormatted;
      if (rentMaintDisp) rentMaintDisp.textContent = maintFormatted;
    } else {
      if (prevMaintRow) prevMaintRow.classList.add('hidden');
      if (rentMaintDisp) rentMaintDisp.textContent = formatMoney(0);
    }

    if (prevGrandtotal) prevGrandtotal.textContent = totalFormatted;
    if (rentTotalDisp) rentTotalDisp.textContent = totalFormatted;

    if (prevMode) prevMode.textContent = rentReceipt.paymentMode;
    if (prevRef) prevRef.textContent = rentReceipt.transactionReference || 'N/A';
    if (prevRefRow) {
      if (rentReceipt.transactionReference) prevRefRow.classList.remove('hidden');
      else prevRefRow.classList.add('hidden');
    }

    if (prevLandlordName)
      prevLandlordName.textContent = rentReceipt.landlord.name || 'Landlord Name';

    // Landlord PAN display
    if (rentReceipt.landlord.pan && rentReceipt.landlord.pan.trim()) {
      if (prevPanRow) prevPanRow.classList.remove('hidden');
      if (prevPan) prevPan.textContent = rentReceipt.landlord.pan.trim().toUpperCase();
    } else {
      if (prevPanRow) prevPanRow.classList.add('hidden');
    }

    if (prevLandlordContact) {
      const parts = [rentReceipt.landlord.phone, rentReceipt.landlord.email].filter(Boolean);
      prevLandlordContact.textContent = parts.join(' · ') || '';
    }

    if (prevNotes) prevNotes.textContent = rentReceipt.notes || '';
    if (prevSignature)
      prevSignature.textContent = rentReceipt.landlordSignature || 'Authorized Landlord';
  }

  // Field change bindings
  rentNumberInput?.addEventListener('input', (e) => {
    rentReceipt.receiptNumber = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  rentDateInput?.addEventListener('input', (e) => {
    rentReceipt.paymentDate = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  rentCurrencySelect?.addEventListener('change', (e) => {
    rentReceipt.currency = (e.target as HTMLSelectElement).value;
    triggerSave();
    updatePreview();
  });

  landlordNameInput?.addEventListener('input', (e) => {
    rentReceipt.landlord.name = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  landlordPanInput?.addEventListener('input', (e) => {
    rentReceipt.landlord.pan = (e.target as HTMLInputElement).value.toUpperCase();
    triggerSave();
    updatePreview();
  });

  landlordEmailInput?.addEventListener('input', (e) => {
    rentReceipt.landlord.email = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  landlordPhoneInput?.addEventListener('input', (e) => {
    rentReceipt.landlord.phone = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  landlordAddressInput?.addEventListener('input', (e) => {
    rentReceipt.landlord.address = (e.target as HTMLTextAreaElement).value;
    triggerSave();
    updatePreview();
  });

  tenantNameInput?.addEventListener('input', (e) => {
    rentReceipt.tenant.name = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  tenantPhoneInput?.addEventListener('input', (e) => {
    rentReceipt.tenant.phone = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  propertyAddressInput?.addEventListener('input', (e) => {
    rentReceipt.propertyAddress = (e.target as HTMLTextAreaElement).value;
    triggerSave();
    updatePreview();
  });

  rentMonthInput?.addEventListener('input', (e) => {
    rentReceipt.periodMonthYear = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  rentAmountInput?.addEventListener('input', (e) => {
    rentReceipt.rentAmount = Number((e.target as HTMLInputElement).value) || 0;
    triggerSave();
    updatePreview();
  });

  maintenanceAmountInput?.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    rentReceipt.maintenanceAmount = val ? Number(val) : undefined;
    triggerSave();
    updatePreview();
  });

  paymentModeSelect?.addEventListener('change', (e) => {
    rentReceipt.paymentMode = (e.target as HTMLSelectElement).value;
    triggerSave();
    updatePreview();
  });

  rentTxRefInput?.addEventListener('input', (e) => {
    rentReceipt.transactionReference = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  rentNotesInput?.addEventListener('input', (e) => {
    rentReceipt.notes = (e.target as HTMLTextAreaElement).value;
    triggerSave();
    updatePreview();
  });

  landlordSignatureInput?.addEventListener('input', (e) => {
    rentReceipt.landlordSignature = (e.target as HTMLInputElement).value;
    triggerSave();
    updatePreview();
  });

  // Style switcher
  document.querySelectorAll('.btn-rent-tmpl').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const tmpl = target.getAttribute('data-tmpl') || 'modern';
      rentReceipt.template = tmpl as any;
      if (previewDoc) previewDoc.setAttribute('data-template', tmpl);

      document.querySelectorAll('.btn-rent-tmpl').forEach((b) => {
        b.className =
          'btn-rent-tmpl px-2.5 py-1 rounded-lg text-xs font-semibold transition-all text-charcoal hover:bg-surface-soft';
      });
      target.className =
        'btn-rent-tmpl px-2.5 py-1 rounded-lg text-xs font-semibold transition-all bg-primary text-white';
      triggerSave();
    });
  });

  // Format switcher
  document.querySelectorAll('.btn-rent-format').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const fmt = target.getAttribute('data-fmt') || 'a4';
      rentReceipt.pageFormat = fmt as any;
      if (previewDoc) previewDoc.setAttribute('data-format', fmt);

      document.querySelectorAll('.btn-rent-format').forEach((b) => {
        b.className =
          'btn-rent-format px-2.5 py-1 rounded-lg text-xs font-semibold transition-all text-charcoal hover:bg-surface-soft';
      });
      target.className =
        'btn-rent-format px-2.5 py-1 rounded-lg text-xs font-semibold transition-all bg-primary text-white';
      triggerSave();
    });
  });

  // Mobile toggle
  const btnToggleForm = document.getElementById('btn-toggle-rent-form');
  const btnTogglePreview = document.getElementById('btn-toggle-rent-preview');
  const formCol = document.getElementById('rent-form-column');
  const previewCol = document.getElementById('rent-preview-column');

  btnToggleForm?.addEventListener('click', () => {
    formCol?.classList.remove('hidden');
    previewCol?.classList.add('hidden');
    btnToggleForm.className =
      'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-primary text-white shadow-2xs cursor-pointer';
    if (btnTogglePreview)
      btnTogglePreview.className =
        'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-charcoal hover:text-ink hover:bg-surface-soft cursor-pointer';
  });

  btnTogglePreview?.addEventListener('click', () => {
    formCol?.classList.add('hidden');
    previewCol?.classList.remove('hidden');
    btnTogglePreview.className =
      'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-primary text-white shadow-2xs cursor-pointer';
    if (btnToggleForm)
      btnToggleForm.className =
        'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-charcoal hover:text-ink hover:bg-surface-soft cursor-pointer';
  });

  // Reset & Clear
  const btnReset = document.getElementById('btn-reset-rent');
  btnReset?.addEventListener('click', () => {
    if (confirm('Reset rent receipt to default values?')) {
      rentReceipt = createDefaultRentReceipt();
      populateInputs();
      updatePreview();
      triggerSave();
      showToast('info', 'Receipt Reset', 'Restored default rent receipt details.');
    }
  });

  const btnClearAll = document.getElementById('btn-clear-rent-data');
  btnClearAll?.addEventListener('click', () => {
    if (confirm('Clear saved rent receipt data from this browser?')) {
      clearRentReceiptDraft();
      rentReceipt = createDefaultRentReceipt();
      populateInputs();
      updatePreview();
      showToast('success', 'Data Cleared', 'Rent receipt data cleared from your browser.');
    }
  });

  // Exports
  const btnPrint = document.getElementById('btn-print-rent');
  btnPrint?.addEventListener('click', () => {
    printInvoice();
  });

  const btnPng = document.getElementById('btn-png-rent') as HTMLButtonElement | null;
  btnPng?.addEventListener('click', async () => {
    if (!previewDoc) return;
    try {
      if (btnPng) {
        btnPng.disabled = true;
        btnPng.textContent = 'Exporting...';
      }
      const filename = generateExportFilename(rentReceipt.receiptNumber || 'rent_receipt', 'png');
      await exportInvoiceToPng(previewDoc, { filename });
      showToast('success', 'PNG Exported', `Saved "${filename}".`);
    } catch (err) {
      console.error('Rent receipt PNG export failed:', err);
      showToast('error', 'Export Failed', 'Could not export PNG.');
    } finally {
      if (btnPng) {
        btnPng.disabled = false;
        btnPng.textContent = 'PNG';
      }
    }
  });

  const btnPdf = document.getElementById('btn-pdf-rent') as HTMLButtonElement | null;
  btnPdf?.addEventListener('click', async () => {
    if (!previewDoc) return;
    try {
      if (btnPdf) {
        btnPdf.disabled = true;
        btnPdf.textContent = 'Generating PDF...';
      }
      const filename = generateExportFilename(rentReceipt.receiptNumber || 'rent_receipt', 'pdf');
      await exportInvoiceToPdf(previewDoc, {
        format: rentReceipt.pageFormat || 'a4',
        filename,
      });
      showToast('success', 'PDF Exported', `Saved "${filename}" (Zero Watermarks).`);
    } catch (err) {
      console.error('Rent receipt PDF export failed:', err);
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
  updatePreview();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupRentReceiptForm);
  } else {
    setupRentReceiptForm();
  }
}
