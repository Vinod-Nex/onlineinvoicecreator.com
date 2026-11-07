/**
 * Client-Side Interactive Engine for Spanish (es) Receipts & Invoices
 *
 * Implements:
 * - Multi-country selector (España, México, Argentina, Colombia, Chile, Perú, Otro)
 * - Dynamic Tax ID labels (NIF/CIF/NIE, RFC, CUIT, NIT, RUT, RUC, ID Fiscal)
 * - Automatic "Importe en letra" in Spanish with country-specific currency terms
 * - Regional currency and number formatting (Intl with es-ES 1.234,56 vs es-MX 1,234.56)
 * - Bank transfer block: IBAN (Spain), CLABE SPEI (Mexico), CBU/CVU/Alias (Argentina)
 * - SEPA EPC QR code generation for Spain
 * - 4 layout themes (Moderno, Clásico, Mínimo, Corporativo)
 * - Rent receipt breakdown (Renta + Comunidad + IBI + Suministros)
 * - LocalStorage persistence, PDF/PNG export, and window.print()
 */

import QRCode from 'qrcode';
import { importeEnLetras } from '../lib/numero-a-letras';
import {
  SPANISH_COUNTRIES,
  getSpanishCountry,
  type SpanishCountryConfig,
} from '../lib/spanish-countries';
import {
  exportInvoiceToPdf,
  exportInvoiceToPng,
  printInvoice,
  generateExportFilename,
} from '../lib/invoice-export';

const STORAGE_KEY = 'oic_es_receipt_draft';

export interface SpanishReceiptState {
  countryCode: string;
  docType: 'recibo' | 'alquiler' | 'factura_simple' | 'factura_iva';
  receiptNumber: string;
  date: string;
  city: string;
  layout: 'modern' | 'classic' | 'minimal' | 'corporate';

  emitterName: string;
  emitterDoc: string;
  emitterPhone: string;
  emitterEmail: string;
  emitterAddress: string;
  logoDataUrl?: string;

  payerName: string;
  payerDoc: string;
  payerAddress: string;

  amount: number;
  extensoOverride?: string;
  concept: string;
  paymentMethod: string;

  // Rental fields
  propertyAddress?: string;
  rentalPeriod?: string;
  rentBase?: number;
  rentCommunity?: number;
  rentIbi?: number;
  rentUtilities?: number;

  // Invoice IVA fields
  taxRate?: number;
  discountRate?: number;

  // Banking & Transfer
  bankTransferDetails: string;
  sepaEnabled: boolean;
  sepaIban: string;
  sepaBic: string;

  signatureName: string;
}

export function getDefaultSpanishReceipt(
  initialType: 'recibo' | 'alquiler' | 'factura_simple' | 'factura_iva' = 'recibo'
): SpanishReceiptState {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  return {
    countryCode: 'ES',
    docType: initialType,
    receiptNumber: `REC-${yyyy}${mm}-001`,
    date: `${dd}/${mm}/${yyyy}`,
    city: 'Madrid',
    layout: 'modern',

    emitterName: 'Alejandro Morales Gómez',
    emitterDoc: '12345678Z',
    emitterPhone: '+34 600 123 456',
    emitterEmail: 'alejandro.morales@ejemplo.es',
    emitterAddress: 'Calle de Alcalá, 45, 28014 Madrid',

    payerName: 'Consultoría y Diseño Soluciones S.L.',
    payerDoc: 'B-87654321',
    payerAddress: 'Paseo de la Castellana, 100, 28046 Madrid',

    amount: 1250.5,
    concept: 'Servicios profesionales de diseño gráfico y consultoría digital',
    paymentMethod: 'Transferencia bancaria',

    propertyAddress: 'Calle Gran Vía, 22, 4º B, 28013 Madrid',
    rentalPeriod: 'Octubre 2026',
    rentBase: 1000,
    rentCommunity: 150,
    rentIbi: 60,
    rentUtilities: 40.5,

    taxRate: 21,
    discountRate: 0,

    bankTransferDetails: 'ES91 2100 0418 4502 0005 1332',
    sepaEnabled: false,
    sepaIban: 'ES9121000418450200051332',
    sepaBic: 'CAIXESBBXXX',

    signatureName: 'Alejandro Morales Gómez',
  };
}

class SpanishReceiptController {
  private state: SpanishReceiptState;
  private country: SpanishCountryConfig;

  constructor() {
    this.state = this.loadState();
    this.country = getSpanishCountry(this.state.countryCode);
    this.init();
  }

  private loadState(): SpanishReceiptState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...getDefaultSpanishReceipt(), ...parsed };
      }
    } catch {
      // fallback
    }
    return getDefaultSpanishReceipt();
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage full or disabled
    }
  }

  private init() {
    this.bindInputs();
    this.bindButtons();
    this.applyCountry(this.state.countryCode, false);
    this.render();
  }

  public applyCountry(code: string, rerender = true) {
    this.state.countryCode = code;
    this.country = getSpanishCountry(code);

    // Update tax ID labels and placeholders
    const taxIdLabelEl = document.getElementById('es-label-emitter-doc');
    if (taxIdLabelEl) taxIdLabelEl.textContent = this.country.taxIdLabel;

    const payerTaxIdLabelEl = document.getElementById('es-label-payer-doc');
    if (payerTaxIdLabelEl) payerTaxIdLabelEl.textContent = this.country.taxIdLabel;

    const emitterDocInput = document.getElementById('es-emitter-doc') as HTMLInputElement | null;
    if (emitterDocInput) emitterDocInput.placeholder = this.country.taxIdPlaceholder;

    const payerDocInput = document.getElementById('es-payer-doc') as HTMLInputElement | null;
    if (payerDocInput) payerDocInput.placeholder = this.country.taxIdPlaceholder;

    const bankLabel = document.getElementById('es-label-bank-details');
    if (bankLabel) bankLabel.textContent = this.country.bankingTransferLabel;

    const bankInput = document.getElementById('es-bank-details') as HTMLInputElement | null;
    if (bankInput) bankInput.placeholder = this.country.bankingTransferPlaceholder;

    // Currency symbol badge
    const curBadge = document.getElementById('es-currency-symbol');
    if (curBadge) curBadge.textContent = this.country.currencySymbol;

    // Paper size attribute on preview canvas
    const canvas = document.getElementById('es-receipt-canvas');
    if (canvas) {
      canvas.setAttribute('data-paper', this.country.defaultPaper);
    }

    // SEPA QR is only shown for Spain / EUR
    const sepaRow = document.getElementById('es-sepa-row');
    if (sepaRow) {
      if (code === 'ES') {
        sepaRow.classList.remove('hidden');
      } else {
        sepaRow.classList.add('hidden');
        this.state.sepaEnabled = false;
        const sepaCheckbox = document.getElementById('es-sepa-enabled') as HTMLInputElement | null;
        if (sepaCheckbox) sepaCheckbox.checked = false;
      }
    }

    if (rerender) {
      this.saveState();
      this.render();
    }
  }

  private bindInputs() {
    const bind = (id: string, prop: keyof SpanishReceiptState, isNumber = false) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
      if (!el) return;

      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        el.checked = Boolean(this.state[prop]);
        el.addEventListener('change', () => {
          (this.state as any)[prop] = el.checked;
          this.saveState();
          this.render();
        });
        return;
      }

      if (isNumber) {
        el.value = String(this.state[prop] ?? '');
      } else {
        el.value = String(this.state[prop] ?? '');
      }

      el.addEventListener('input', () => {
        if (isNumber) {
          const val = parseFloat(el.value);
          (this.state as any)[prop] = isNaN(val) ? 0 : val;
        } else {
          (this.state as any)[prop] = el.value;
        }
        this.saveState();
        this.render();
      });
    };

    // Country Selector
    const countrySelect = document.getElementById('es-country-select') as HTMLSelectElement | null;
    if (countrySelect) {
      countrySelect.value = this.state.countryCode;
      countrySelect.addEventListener('change', () => {
        this.applyCountry(countrySelect.value);
      });
    }

    // Doc Type Tabs
    const docTypeSelect = document.getElementById('es-doc-type-select') as HTMLSelectElement | null;
    if (docTypeSelect) {
      docTypeSelect.value = this.state.docType;
      docTypeSelect.addEventListener('change', () => {
        this.state.docType = docTypeSelect.value as any;
        this.toggleDocTypeSections();
        this.saveState();
        this.render();
      });
    }

    // Layout Selector
    const layoutRadios = document.querySelectorAll<HTMLInputElement>('input[name="es-layout"]');
    layoutRadios.forEach((radio) => {
      if (radio.value === this.state.layout) radio.checked = true;
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.state.layout = radio.value as any;
          this.saveState();
          this.render();
        }
      });
    });

    bind('es-receipt-number', 'receiptNumber');
    bind('es-receipt-date', 'date');
    bind('es-receipt-city', 'city');

    bind('es-emitter-name', 'emitterName');
    bind('es-emitter-doc', 'emitterDoc');
    bind('es-emitter-phone', 'emitterPhone');
    bind('es-emitter-email', 'emitterEmail');
    bind('es-emitter-address', 'emitterAddress');

    bind('es-payer-name', 'payerName');
    bind('es-payer-doc', 'payerDoc');
    bind('es-payer-address', 'payerAddress');

    bind('es-amount', 'amount', true);
    bind('es-extenso', 'extensoOverride');
    bind('es-concept', 'concept');
    bind('es-payment-method', 'paymentMethod');

    // Rental
    bind('es-rent-property', 'propertyAddress');
    bind('es-rent-month', 'rentalPeriod');
    bind('es-rent-base', 'rentBase', true);
    bind('es-rent-community', 'rentCommunity', true);
    bind('es-rent-ibi', 'rentIbi', true);
    bind('es-rent-utilities', 'rentUtilities', true);

    // Banking
    bind('es-bank-details', 'bankTransferDetails');
    bind('es-sepa-enabled', 'sepaEnabled');
    bind('es-sepa-iban', 'sepaIban');
    bind('es-sepa-bic', 'sepaBic');

    bind('es-signature-name', 'signatureName');

    // Listen for rent calculation updates
    const rentInputs = ['es-rent-base', 'es-rent-community', 'es-rent-ibi', 'es-rent-utilities'];
    rentInputs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          if (this.state.docType === 'alquiler') {
            const base = this.state.rentBase || 0;
            const com = this.state.rentCommunity || 0;
            const ibi = this.state.rentIbi || 0;
            const util = this.state.rentUtilities || 0;
            const total = base + com + ibi + util;
            this.state.amount = Math.round(total * 100) / 100;
            const amountInput = document.getElementById('es-amount') as HTMLInputElement | null;
            if (amountInput) amountInput.value = String(this.state.amount);
            this.saveState();
            this.render();
          }
        });
      }
    });

    this.toggleDocTypeSections();
  }

  private toggleDocTypeSections() {
    const rentFields = document.getElementById('es-rent-fields');
    if (rentFields) {
      if (this.state.docType === 'alquiler') {
        rentFields.classList.remove('hidden');
      } else {
        rentFields.classList.add('hidden');
      }
    }
  }

  private bindButtons() {
    // Export PDF
    const btnPdf = document.getElementById('btn-export-es-pdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', async () => {
        btnPdf.classList.add('opacity-70', 'pointer-events-none');
        try {
          const container = document.getElementById('es-receipt-canvas');
          if (container) {
            const filename = generateExportFilename(
              this.state.docType === 'alquiler'
                ? 'recibo-alquiler'
                : this.state.docType.startsWith('factura')
                  ? 'factura'
                  : 'recibo',
              this.state.receiptNumber
            );
            await exportInvoiceToPdf(container, {
              filename,
              paperSize: this.country.defaultPaper,
              orientation: 'portrait',
            });
          }
        } finally {
          btnPdf.classList.remove('opacity-70', 'pointer-events-none');
        }
      });
    }

    // Export PNG
    const btnPng = document.getElementById('btn-export-es-png');
    if (btnPng) {
      btnPng.addEventListener('click', async () => {
        btnPng.classList.add('opacity-70', 'pointer-events-none');
        try {
          const container = document.getElementById('es-receipt-canvas');
          if (container) {
            const filename = generateExportFilename(
              'recibo-comprobante',
              this.state.receiptNumber
            );
            await exportInvoiceToPng(container, { filename, scale: 2 });
          }
        } finally {
          btnPng.classList.remove('opacity-70', 'pointer-events-none');
        }
      });
    }

    // Print
    const btnPrint = document.getElementById('btn-print-es');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        printInvoice();
      });
    }

    // Clear Data
    const btnClear = document.getElementById('btn-clear-es-data');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (
          confirm(
            '¿Deseas borrar los datos guardados en este navegador y restaurar el formulario inicial?'
          )
        ) {
          localStorage.removeItem(STORAGE_KEY);
          this.state = getDefaultSpanishReceipt();
          this.applyCountry('ES', false);
          location.reload();
        }
      });
    }
  }

  public render() {
    const setText = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    // Header info
    let docTitle = 'RECIBO DE PAGO';
    if (this.state.docType === 'alquiler') docTitle = 'RECIBO DE ALQUILER';
    if (this.state.docType === 'factura_simple') docTitle = 'FACTURA SIMPLIFICADA';
    if (this.state.docType === 'factura_iva') docTitle = 'FACTURA COMERCIAL';
    setText('prev-es-doc-title', docTitle);

    // Canvas layout & paper attributes
    const canvas = document.getElementById('es-receipt-canvas');
    if (canvas) {
      canvas.setAttribute('data-paper', this.country.defaultPaper);
      canvas.setAttribute('data-layout', this.state.layout);
      canvas.classList.remove('layout-modern', 'layout-classic', 'layout-minimal', 'layout-corporate');
      canvas.classList.add(`layout-${this.state.layout}`);
    }

    setText('prev-es-number', this.state.receiptNumber || 'REC-001');
    setText('prev-es-date', this.state.date || '');
    setText('prev-es-city', this.state.city || '');

    // Formatted monetary amount
    const formattedAmount = new Intl.NumberFormat(this.country.locale, {
      style: 'currency',
      currency: this.country.currency,
      minimumFractionDigits: this.country.hasCents ? 2 : 0,
      maximumFractionDigits: this.country.hasCents ? 2 : 0,
    }).format(this.state.amount || 0);
    setText('prev-es-amount', formattedAmount);

    // Automatic Importe en Letra
    const extensoComputed = importeEnLetras(this.state.amount || 0, this.country.currency);
    const extensoFinal = this.state.extensoOverride?.trim() || extensoComputed;
    setText('prev-es-extenso', `(${extensoFinal})`);

    // Parties
    setText('prev-es-emitter-name', this.state.emitterName || 'Nombre del Emisor');
    setText(
      'prev-es-emitter-doc',
      `${this.country.taxIdLabel}: ${this.state.emitterDoc || '---'}`
    );
    setText('prev-es-emitter-address', this.state.emitterAddress || '');
    setText('prev-es-emitter-phone', this.state.emitterPhone || '');
    setText('prev-es-emitter-email', this.state.emitterEmail || '');

    setText('prev-es-payer-name', this.state.payerName || 'Nombre del Cliente');
    setText(
      'prev-es-payer-doc',
      `${this.country.taxIdLabel}: ${this.state.payerDoc || '---'}`
    );
    setText('prev-es-payer-address', this.state.payerAddress || '');

    // Main formal receipt statement: "Recibí de ... la cantidad de ... por concepto de ..."
    const formalStatement = `Recibí de ${this.state.payerName || '[Nombre del pagador]'}, con ${this.country.taxIdLabel} ${this.state.payerDoc || '[Identificación]'}, la cantidad de ${extensoFinal} (${formattedAmount}) por concepto de ${this.state.concept || '[Descripción del servicio o producto]'}.`;
    setText('prev-es-formal-statement', formalStatement);

    setText('prev-es-concept', this.state.concept || 'Sin descripción');
    setText('prev-es-method', this.state.paymentMethod || 'Efectivo');

    // Rental block
    const rentBlock = document.getElementById('prev-es-rent-block');
    if (rentBlock) {
      if (this.state.docType === 'alquiler') {
        rentBlock.classList.remove('hidden');
        setText('prev-es-rent-property', this.state.propertyAddress || 'No especificado');
        setText('prev-es-rent-month', this.state.rentalPeriod || 'Mes actual');
        const breakdown = `Desglose: Renta (${this.state.rentBase || 0} ${this.country.currencySymbol}) + Comunidad (${this.state.rentCommunity || 0} ${this.country.currencySymbol}) + IBI (${this.state.rentIbi || 0} ${this.country.currencySymbol}) + Suministros (${this.state.rentUtilities || 0} ${this.country.currencySymbol})`;
        setText('prev-es-rent-breakdown', breakdown);
      } else {
        rentBlock.classList.add('hidden');
      }
    }

    // Bank Details
    const bankBlock = document.getElementById('prev-es-bank-block');
    if (bankBlock) {
      if (this.state.bankTransferDetails?.trim()) {
        bankBlock.classList.remove('hidden');
        setText('prev-es-bank-details', this.state.bankTransferDetails.trim());
      } else {
        bankBlock.classList.add('hidden');
      }
    }

    // SEPA EPC QR
    const sepaBlock = document.getElementById('prev-es-sepa-block');
    const sepaImg = document.getElementById('prev-es-sepa-qr') as HTMLImageElement | null;
    if (sepaBlock && sepaImg) {
      if (this.state.countryCode === 'ES' && this.state.sepaEnabled && this.state.sepaIban) {
        sepaBlock.classList.remove('hidden');
        const cleanIban = this.state.sepaIban.replace(/\s+/g, '');
        // SEPA EPC QR Payload specification
        const epcPayload = [
          'BCD',
          '002',
          '1',
          'SCT',
          this.state.sepaBic || '',
          this.state.emitterName || '',
          cleanIban,
          `EUR${(this.state.amount || 0).toFixed(2)}`,
          '',
          '',
          this.state.receiptNumber || 'REC',
        ].join('\n');

        QRCode.toDataURL(epcPayload, { width: 140, margin: 1 })
          .then((url) => {
            sepaImg.src = url;
          })
          .catch(() => {});
      } else {
        sepaBlock.classList.add('hidden');
      }
    }

    // Date & Signature line
    setText(
      'prev-es-city-date',
      `${this.state.city || 'Ciudad'}, a ${this.state.date || ''}`
    );
    setText('prev-es-signature-line', this.state.signatureName || this.state.emitterName || '');
  }
}

// Instantiate on client DOM load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SpanishReceiptController());
  } else {
    new SpanishReceiptController();
  }
}

