/**
 * Client-Side Interactive Engine for Brazilian Portuguese Receipts & Invoices
 *
 * Implements:
 * - Dynamic CPF/CNPJ mask and check-digit validation
 * - Automatic "Valor por extenso" in Brazilian Portuguese
 * - Pix BR Code EMV QR code generation
 * - 4 layout themes (Moderno, Clássico, Mínimo, Corporativo)
 * - Rent breakdown calculation (Aluguel + Condomínio + IPTU + Água)
 * - LocalStorage persistence, JSON export/import, PDF/PNG export, Print
 */

import QRCode from 'qrcode';
import { numeroPorExtenso } from '../lib/extenso';
import { formatCpfCnpj, validateCpfOrCnpj } from '../lib/brazil-docs';
import { generatePixPayload } from '../lib/pix';
import {
  exportInvoiceToPdf,
  exportInvoiceToPng,
  printInvoice,
  generateExportFilename,
} from '../lib/invoice-export';

const STORAGE_KEY = 'oic_pt_receipt_draft';

export interface BrazilianReceiptState {
  docType: 'pagamento' | 'aluguel' | 'venda' | 'fatura';
  receiptNumber: string;
  date: string;
  city: string;
  layout: 'modern' | 'classic' | 'minimal' | 'corporate';

  receiverName: string;
  receiverDoc: string;
  receiverPhone: string;
  receiverAddress: string;
  logoDataUrl?: string;

  payerName: string;
  payerDoc: string;
  payerAddress: string;

  amount: number;
  extensoOverride?: string;
  description: string;
  paymentMethod: string;

  propertyAddress?: string;
  referenceMonth?: string;
  rentAmount?: number;
  condoAmount?: number;
  iptuAmount?: number;
  waterAmount?: number;

  pixEnabled: boolean;
  pixKeyType: string;
  pixKey: string;
  pixName: string;
  pixCity: string;

  signatureName: string;
}

export function getDefaultBrazilianReceipt(
  initialType: 'pagamento' | 'aluguel' | 'venda' | 'fatura' = 'pagamento'
): BrazilianReceiptState {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  return {
    docType: initialType,
    receiptNumber: `REC-${yyyy}${mm}-001`,
    date: `${dd}/${mm}/${yyyy}`,
    city: 'São Paulo - SP',
    layout: 'modern',

    receiverName: 'Carlos Eduardo Oliveira',
    receiverDoc: '529.982.247-25',
    receiverPhone: '(11) 98765-4321',
    receiverAddress: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',

    payerName: 'Mariana Souza Silva',
    payerDoc: '06.990.590/0001-23',
    payerAddress: 'Rua Augusta, 500 - Consolação, São Paulo - SP',

    amount: initialType === 'aluguel' ? 2500 : 1250.5,
    description:
      initialType === 'aluguel'
        ? 'Locação de imóvel residencial referente ao mês vigente.'
        : 'Prestação de serviços de consultoria em desenvolvimento de software e suporte técnico.',
    paymentMethod: 'Pix',

    propertyAddress: 'Rua Vergueiro, 1200, Apto 42 - Vila Mariana, São Paulo - SP',
    referenceMonth: `${mm}/${yyyy}`,
    rentAmount: 2200,
    condoAmount: 550,
    iptuAmount: 180,
    waterAmount: 70,

    pixEnabled: true,
    pixKeyType: 'cpf',
    pixKey: '529.982.247-25',
    pixName: 'CARLOS E OLIVEIRA',
    pixCity: 'SAO PAULO',

    signatureName: 'Carlos Eduardo Oliveira',
  };
}

export function initBrazilianReceipt() {
  const root = document.getElementById('brazilian-receipt-root');
  if (!root) return;

  const defaultType =
    (root.getAttribute('data-default-type') as BrazilianReceiptState['docType']) || 'pagamento';

  let state: BrazilianReceiptState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = { ...getDefaultBrazilianReceipt(defaultType), ...JSON.parse(raw) };
      // Enforce URL-requested type if provided via data attribute on specialized page
      if (defaultType === 'aluguel') {
        state.docType = 'aluguel';
      }
    } else {
      state = getDefaultBrazilianReceipt(defaultType);
    }
  } catch {
    state = getDefaultBrazilianReceipt(defaultType);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota issues
    }
  }

  // Bind UI Elements
  const docTypeButtons = document.querySelectorAll<HTMLButtonElement>('.btn-doc-type');
  const layoutButtons = document.querySelectorAll<HTMLButtonElement>('.btn-doc-layout');

  const inputNumber = document.getElementById('br-receipt-number') as HTMLInputElement | null;
  const inputDate = document.getElementById('br-receipt-date') as HTMLInputElement | null;
  const inputCity = document.getElementById('br-receipt-city') as HTMLInputElement | null;

  const inputReceiverName = document.getElementById('br-receiver-name') as HTMLInputElement | null;
  const inputReceiverDoc = document.getElementById('br-receiver-doc') as HTMLInputElement | null;
  const badgeReceiverDoc = document.getElementById('badge-receiver-doc');
  const inputReceiverPhone = document.getElementById('br-receiver-phone') as HTMLInputElement | null;
  const inputReceiverAddress = document.getElementById('br-receiver-address') as HTMLInputElement | null;

  const inputPayerName = document.getElementById('br-payer-name') as HTMLInputElement | null;
  const inputPayerDoc = document.getElementById('br-payer-doc') as HTMLInputElement | null;
  const badgePayerDoc = document.getElementById('badge-payer-doc');
  const inputPayerAddress = document.getElementById('br-payer-address') as HTMLInputElement | null;

  const inputAmount = document.getElementById('br-amount') as HTMLInputElement | null;
  const inputExtenso = document.getElementById('br-extenso') as HTMLInputElement | null;
  const inputDescription = document.getElementById('br-description') as HTMLTextAreaElement | null;
  const selectPaymentMethod = document.getElementById('br-payment-method') as HTMLSelectElement | null;

  // Rent Fields
  const rentSection = document.getElementById('br-rent-fields');
  const inputPropertyAddress = document.getElementById('br-rent-property') as HTMLInputElement | null;
  const inputReferenceMonth = document.getElementById('br-rent-month') as HTMLInputElement | null;
  const inputRentAmount = document.getElementById('br-rent-val') as HTMLInputElement | null;
  const inputCondoAmount = document.getElementById('br-rent-condo') as HTMLInputElement | null;
  const inputIptuAmount = document.getElementById('br-rent-iptu') as HTMLInputElement | null;
  const inputWaterAmount = document.getElementById('br-rent-water') as HTMLInputElement | null;

  // Pix
  const checkPix = document.getElementById('br-pix-enabled') as HTMLInputElement | null;
  const pixContainer = document.getElementById('br-pix-container');
  const selectPixType = document.getElementById('br-pix-type') as HTMLSelectElement | null;
  const inputPixKey = document.getElementById('br-pix-key') as HTMLInputElement | null;
  const inputPixName = document.getElementById('br-pix-name') as HTMLInputElement | null;
  const inputPixCity = document.getElementById('br-pix-city') as HTMLInputElement | null;

  const inputSignature = document.getElementById('br-signature-name') as HTMLInputElement | null;

  // Preview elements
  const prevDoc = document.getElementById('brazilian-receipt-preview');
  const prevTitle = document.getElementById('prev-br-title');
  const prevNumber = document.getElementById('prev-br-number');
  const prevDate = document.getElementById('prev-br-date');
  const prevCityDate = document.getElementById('prev-br-city-date');
  const prevAmount = document.getElementById('prev-br-amount');
  const prevExtenso = document.getElementById('prev-br-extenso');
  const prevReceiverName = document.getElementById('prev-br-receiver-name');
  const prevReceiverDoc = document.getElementById('prev-br-receiver-doc');
  const prevReceiverAddress = document.getElementById('prev-br-receiver-address');
  const prevReceiverPhone = document.getElementById('prev-br-receiver-phone');

  const prevPayerName = document.getElementById('prev-br-payer-name');
  const prevPayerDoc = document.getElementById('prev-br-payer-doc');
  const prevPayerAddress = document.getElementById('prev-br-payer-address');

  const prevDescription = document.getElementById('prev-br-description');
  const prevMethod = document.getElementById('prev-br-method');

  const prevRentBlock = document.getElementById('prev-br-rent-block');
  const prevRentProperty = document.getElementById('prev-br-rent-property');
  const prevRentMonth = document.getElementById('prev-br-rent-month');
  const prevRentBreakdown = document.getElementById('prev-br-rent-breakdown');

  const prevPixBlock = document.getElementById('prev-br-pix-block');
  const prevPixQrImg = document.getElementById('prev-br-pix-qr') as HTMLImageElement | null;
  const prevPixKey = document.getElementById('prev-br-pix-key');

  const prevSignatureLine = document.getElementById('prev-br-signature-line');

  // Format currency in BRL (R$ 1.234,56)
  function formatBRL(val: number): string {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function updateDocBadges(docValue: string, badgeEl: HTMLElement | null) {
    if (!badgeEl) return;
    const clean = docValue.replace(/\D/g, '');
    if (clean.length === 0) {
      badgeEl.innerHTML = '';
      return;
    }
    const check = validateCpfOrCnpj(clean);
    if (clean.length === 11 || clean.length === 14) {
      if (check.valid) {
        badgeEl.innerHTML = `<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">✓ ${check.type?.toUpperCase()} válido</span>`;
      } else {
        badgeEl.innerHTML = `<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200" title="Dígito verificador inválido. Verifique o número digitado.">⚠️ ${clean.length === 11 ? 'CPF' : 'CNPJ'} com dígito inválido</span>`;
      }
    } else {
      badgeEl.innerHTML = '';
    }
  }

  function recalculateRentTotal() {
    if (state.docType === 'aluguel') {
      const rent = Number(state.rentAmount) || 0;
      const condo = Number(state.condoAmount) || 0;
      const iptu = Number(state.iptuAmount) || 0;
      const water = Number(state.waterAmount) || 0;
      const total = rent + condo + iptu + water;
      state.amount = total;
      if (inputAmount) {
        inputAmount.value = total.toFixed(2);
      }
    }
  }

  async function updatePixQr() {
    if (!state.pixEnabled || !state.pixKey.trim() || !prevPixQrImg) {
      if (prevPixBlock) prevPixBlock.classList.add('hidden');
      return;
    }

    if (prevPixBlock) prevPixBlock.classList.remove('hidden');
    if (prevPixKey) {
      prevPixKey.textContent = `Chave Pix: ${state.pixKey}`;
    }

    try {
      const payload = generatePixPayload({
        key: state.pixKey,
        merchantName: state.pixName || state.receiverName,
        merchantCity: state.pixCity || state.city,
        amount: state.amount,
      });

      const qrDataUrl = await QRCode.toDataURL(payload, {
        width: 140,
        margin: 1,
        color: {
          dark: '#111827',
          light: '#ffffff',
        },
      });

      prevPixQrImg.src = qrDataUrl;
    } catch {
      if (prevPixBlock) prevPixBlock.classList.add('hidden');
    }
  }

  function updatePreview() {
    // 1. Title by document type
    const titles: Record<string, string> = {
      pagamento: 'RECIBO DE PAGAMENTO',
      aluguel: 'RECIBO DE ALUGUEL',
      venda: 'RECIBO DE VENDA',
      fatura: 'FATURA COMERCIAL',
    };
    if (prevTitle) prevTitle.textContent = titles[state.docType] || 'RECIBO DE PAGAMENTO';
    if (prevNumber) prevNumber.textContent = state.receiptNumber;
    if (prevDate) prevDate.textContent = state.date;
    if (prevCityDate) prevCityDate.textContent = `${state.city}, ${state.date}`;

    // 2. Amount and Extenso
    if (prevAmount) prevAmount.textContent = formatBRL(state.amount);
    const extensoTexto = state.extensoOverride || numeroPorExtenso(state.amount);
    if (prevExtenso) prevExtenso.textContent = `(${extensoTexto})`;
    if (inputExtenso && !state.extensoOverride) {
      inputExtenso.value = extensoTexto;
    }

    // 3. Emissor
    if (prevReceiverName) prevReceiverName.textContent = state.receiverName;
    if (prevReceiverDoc) prevReceiverDoc.textContent = state.receiverDoc ? `CPF/CNPJ: ${formatCpfCnpj(state.receiverDoc)}` : '';
    if (prevReceiverAddress) prevReceiverAddress.textContent = state.receiverAddress;
    if (prevReceiverPhone) prevReceiverPhone.textContent = state.receiverPhone ? `Tel: ${state.receiverPhone}` : '';

    // 4. Pagador
    if (prevPayerName) prevPayerName.textContent = state.payerName;
    if (prevPayerDoc) prevPayerDoc.textContent = state.payerDoc ? `CPF/CNPJ: ${formatCpfCnpj(state.payerDoc)}` : '';
    if (prevPayerAddress) prevPayerAddress.textContent = state.payerAddress;

    // 5. Descrição e Forma de Pagamento
    if (prevDescription) prevDescription.textContent = state.description;
    if (prevMethod) prevMethod.textContent = state.paymentMethod;

    // 6. Aluguel Block
    if (prevRentBlock) {
      if (state.docType === 'aluguel') {
        prevRentBlock.classList.remove('hidden');
        if (prevRentProperty) prevRentProperty.textContent = state.propertyAddress || '';
        if (prevRentMonth) prevRentMonth.textContent = state.referenceMonth || '';
        if (prevRentBreakdown) {
          const items = [];
          if (state.rentAmount) items.push(`Aluguel: ${formatBRL(state.rentAmount)}`);
          if (state.condoAmount) items.push(`Condomínio: ${formatBRL(state.condoAmount)}`);
          if (state.iptuAmount) items.push(`IPTU: ${formatBRL(state.iptuAmount)}`);
          if (state.waterAmount) items.push(`Água/Outros: ${formatBRL(state.waterAmount)}`);
          prevRentBreakdown.textContent = items.join(' | ');
        }
      } else {
        prevRentBlock.classList.add('hidden');
      }
    }

    // 7. Assinatura
    if (prevSignatureLine) {
      prevSignatureLine.textContent = state.signatureName || state.receiverName;
    }

    // 8. Layout Theme
    if (prevDoc) {
      prevDoc.classList.remove('layout-modern', 'layout-classic', 'layout-minimal', 'layout-corporate');
      prevDoc.classList.add(`layout-${state.layout}`);
    }

    // 9. Badges
    updateDocBadges(state.receiverDoc, badgeReceiverDoc);
    updateDocBadges(state.payerDoc, badgePayerDoc);

    // 10. Pix
    updatePixQr();

    saveState();
  }

  // Event Listeners for Document Type
  docTypeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type') as BrazilianReceiptState['docType'];
      if (!type) return;
      state.docType = type;
      docTypeButtons.forEach((b) => {
        const isCurrent = b === btn;
        b.classList.toggle('bg-primary', isCurrent);
        b.classList.toggle('text-white', isCurrent);
        b.classList.toggle('bg-surface-card', !isCurrent);
        b.classList.toggle('text-ink', !isCurrent);
        b.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      });

      if (rentSection) {
        rentSection.classList.toggle('hidden', type !== 'aluguel');
      }

      if (type === 'aluguel') {
        recalculateRentTotal();
      }

      updatePreview();
    });
  });

  // Event Listeners for Layout Buttons
  layoutButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const layout = btn.getAttribute('data-layout') as BrazilianReceiptState['layout'];
      if (!layout) return;
      state.layout = layout;
      layoutButtons.forEach((b) => {
        const isCurrent = b === btn;
        b.classList.toggle('border-primary', isCurrent);
        b.classList.toggle('bg-primary/5', isCurrent);
      });
      updatePreview();
    });
  });

  // Input Listeners
  if (inputNumber) {
    inputNumber.value = state.receiptNumber;
    inputNumber.addEventListener('input', (e) => {
      state.receiptNumber = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputDate) {
    inputDate.value = state.date;
    inputDate.addEventListener('input', (e) => {
      state.date = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputCity) {
    inputCity.value = state.city;
    inputCity.addEventListener('input', (e) => {
      state.city = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputReceiverName) {
    inputReceiverName.value = state.receiverName;
    inputReceiverName.addEventListener('input', (e) => {
      state.receiverName = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputReceiverDoc) {
    inputReceiverDoc.value = state.receiverDoc;
    inputReceiverDoc.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      target.value = formatCpfCnpj(target.value);
      state.receiverDoc = target.value;
      updatePreview();
    });
  }

  if (inputReceiverPhone) {
    inputReceiverPhone.value = state.receiverPhone;
    inputReceiverPhone.addEventListener('input', (e) => {
      state.receiverPhone = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputReceiverAddress) {
    inputReceiverAddress.value = state.receiverAddress;
    inputReceiverAddress.addEventListener('input', (e) => {
      state.receiverAddress = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputPayerName) {
    inputPayerName.value = state.payerName;
    inputPayerName.addEventListener('input', (e) => {
      state.payerName = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputPayerDoc) {
    inputPayerDoc.value = state.payerDoc;
    inputPayerDoc.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      target.value = formatCpfCnpj(target.value);
      state.payerDoc = target.value;
      updatePreview();
    });
  }

  if (inputPayerAddress) {
    inputPayerAddress.value = state.payerAddress;
    inputPayerAddress.addEventListener('input', (e) => {
      state.payerAddress = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputAmount) {
    inputAmount.value = state.amount.toString();
    inputAmount.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value) || 0;
      state.amount = val;
      state.extensoOverride = undefined;
      updatePreview();
    });
  }

  if (inputExtenso) {
    inputExtenso.value = numeroPorExtenso(state.amount);
    inputExtenso.addEventListener('input', (e) => {
      state.extensoOverride = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputDescription) {
    inputDescription.value = state.description;
    inputDescription.addEventListener('input', (e) => {
      state.description = (e.target as HTMLTextAreaElement).value;
      updatePreview();
    });
  }

  if (selectPaymentMethod) {
    selectPaymentMethod.value = state.paymentMethod;
    selectPaymentMethod.addEventListener('change', (e) => {
      state.paymentMethod = (e.target as HTMLSelectElement).value;
      updatePreview();
    });
  }

  // Rent inputs
  if (inputPropertyAddress) {
    inputPropertyAddress.value = state.propertyAddress || '';
    inputPropertyAddress.addEventListener('input', (e) => {
      state.propertyAddress = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputReferenceMonth) {
    inputReferenceMonth.value = state.referenceMonth || '';
    inputReferenceMonth.addEventListener('input', (e) => {
      state.referenceMonth = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  [
    { el: inputRentAmount, key: 'rentAmount' as const },
    { el: inputCondoAmount, key: 'condoAmount' as const },
    { el: inputIptuAmount, key: 'iptuAmount' as const },
    { el: inputWaterAmount, key: 'waterAmount' as const },
  ].forEach(({ el, key }) => {
    if (el) {
      el.value = (state[key] || 0).toString();
      el.addEventListener('input', (e) => {
        state[key] = parseFloat((e.target as HTMLInputElement).value) || 0;
        recalculateRentTotal();
        updatePreview();
      });
    }
  });

  // Pix inputs
  if (checkPix) {
    checkPix.checked = state.pixEnabled;
    checkPix.addEventListener('change', (e) => {
      state.pixEnabled = (e.target as HTMLInputElement).checked;
      if (pixContainer) {
        pixContainer.classList.toggle('hidden', !state.pixEnabled);
      }
      updatePreview();
    });
  }

  if (selectPixType) {
    selectPixType.value = state.pixKeyType;
    selectPixType.addEventListener('change', (e) => {
      state.pixKeyType = (e.target as HTMLSelectElement).value;
      updatePreview();
    });
  }

  if (inputPixKey) {
    inputPixKey.value = state.pixKey;
    inputPixKey.addEventListener('input', (e) => {
      state.pixKey = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputPixName) {
    inputPixName.value = state.pixName;
    inputPixName.addEventListener('input', (e) => {
      state.pixName = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputPixCity) {
    inputPixCity.value = state.pixCity;
    inputPixCity.addEventListener('input', (e) => {
      state.pixCity = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  if (inputSignature) {
    inputSignature.value = state.signatureName;
    inputSignature.addEventListener('input', (e) => {
      state.signatureName = (e.target as HTMLInputElement).value;
      updatePreview();
    });
  }

  // Clear my data
  const btnClear = document.getElementById('btn-clear-br-data');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Tem certeza de que deseja limpar todos os dados do recibo?')) {
        localStorage.removeItem(STORAGE_KEY);
        state = getDefaultBrazilianReceipt(defaultType);
        location.reload();
      }
    });
  }

  // Export Buttons
  const btnPdf = document.getElementById('btn-export-br-pdf');
  if (btnPdf) {
    btnPdf.addEventListener('click', async () => {
      if (!prevDoc) return;
      btnPdf.setAttribute('disabled', 'true');
      const originalText = btnPdf.innerHTML;
      btnPdf.innerHTML = `<span>Gerando PDF...</span>`;
      try {
        await exportInvoiceToPdf('brazilian-receipt-preview', {
          format: 'a4',
          filename: generateExportFilename(state.receiptNumber, 'pdf'),
        });
      } finally {
        btnPdf.removeAttribute('disabled');
        btnPdf.innerHTML = originalText;
      }
    });
  }

  const btnPng = document.getElementById('btn-export-br-png');
  if (btnPng) {
    btnPng.addEventListener('click', async () => {
      if (!prevDoc) return;
      btnPng.setAttribute('disabled', 'true');
      const originalText = btnPng.innerHTML;
      btnPng.innerHTML = `<span>Gerando PNG...</span>`;
      try {
        await exportInvoiceToPng('brazilian-receipt-preview', {
          filename: generateExportFilename(state.receiptNumber, 'png'),
        });
      } finally {
        btnPng.removeAttribute('disabled');
        btnPng.innerHTML = originalText;
      }
    });
  }

  const btnPrint = document.getElementById('btn-print-br');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      printInvoice('brazilian-receipt-preview');
    });
  }

  // Mobile segmented toggle
  const btnToggleForm = document.getElementById('btn-toggle-br-form');
  const btnTogglePrev = document.getElementById('btn-toggle-br-prev');
  const formCol = document.getElementById('br-form-col');
  const prevCol = document.getElementById('br-prev-col');

  if (btnToggleForm && btnTogglePrev && formCol && prevCol) {
    btnToggleForm.addEventListener('click', () => {
      formCol.classList.remove('hidden');
      prevCol.classList.add('hidden');
      btnToggleForm.classList.add('bg-primary', 'text-white');
      btnToggleForm.classList.remove('text-ink');
      btnTogglePrev.classList.remove('bg-primary', 'text-white');
      btnTogglePrev.classList.add('text-ink');
    });

    btnTogglePrev.addEventListener('click', () => {
      formCol.classList.add('hidden');
      prevCol.classList.remove('hidden');
      btnTogglePrev.classList.add('bg-primary', 'text-white');
      btnTogglePrev.classList.remove('text-ink');
      btnToggleForm.classList.remove('bg-primary', 'text-white');
      btnToggleForm.classList.add('text-ink');
    });
  }

  // Initial render
  updatePreview();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrazilianReceipt);
  } else {
    initBrazilianReceipt();
  }
}

