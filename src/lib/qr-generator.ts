import QRCode from 'qrcode';

export type PaymentQrType = 'none' | 'upi' | 'paypal' | 'link' | 'url' | 'sepa' | 'epc';

export interface PaymentQrConfig {
  type: PaymentQrType | string;
  value: string; // VPA for UPI, username for paypal, URL for link, IBAN for SEPA
  recipientName?: string;
  amount?: number;
  currency?: string;
  bic?: string;
  reference?: string;
}

/**
 * Formats a payment URI string from either a config object or positional arguments.
 */
export function formatPaymentUri(
  configOrType: PaymentQrConfig | string,
  maybeValue?: string,
  maybeRecipient?: string
): string {
  const config: PaymentQrConfig =
    typeof configOrType === 'string'
      ? {
          type: configOrType as PaymentQrType,
          value: maybeValue || '',
          recipientName: maybeRecipient,
        }
      : configOrType;

  if (!config.value || config.type === 'none') return '';

  const cleanValue = config.value.trim();
  const safeAmount = config.amount && config.amount > 0 ? config.amount.toFixed(2) : '';
  const normalizedType = (config.type || '').toLowerCase();

  switch (normalizedType) {
    case 'upi': {
      // UPI specification: upi://pay?pa=recipient@vpa&pn=Recipient+Name&am=100.00&cu=INR
      const pa = cleanValue;
      const recipient = config.recipientName?.trim() || cleanValue;
      const pn = encodeURIComponent(recipient).replace(/%40/g, '@');
      let uri = `upi://pay?pa=${pa}&pn=${pn}`;
      if (config.currency) {
        uri += `&cu=${encodeURIComponent(config.currency)}`;
      }
      if (safeAmount) {
        uri += `&am=${encodeURIComponent(safeAmount)}`;
      }
      return uri;
    }

    case 'paypal': {
      // PayPal.me format: https://paypal.me/username/amount
      const username = cleanValue.replace(/^https?:\/\/(www\.)?paypal\.me\/?/i, '').replace(/^\/+/, '');
      if (safeAmount) {
        return `https://paypal.me/${username}/${safeAmount}`;
      }
      return `https://paypal.me/${username}`;
    }

    case 'sepa':
    case 'epc': {
      // European EPC QR Code specification (Quick Response Code Guidelines for EPC)
      // Version 002: BCD\n002\n1\nSCT\nBIC\nName\nIBAN\nEUR100.00\n\nReference
      const iban = cleanValue.replace(/\s+/g, '').toUpperCase();
      const bic = config.bic?.trim() || '';
      const name = config.recipientName?.trim() || 'Beneficiary';
      const ref = config.reference?.trim() || 'INVOICE';
      const cur = config.currency || 'EUR';
      const amountStr = safeAmount ? `${cur}${safeAmount}` : '';

      return [
        'BCD',
        '002',
        '1',
        'SCT',
        bic,
        name,
        iban,
        amountStr,
        '',
        ref,
      ].join('\n');
    }

    case 'url':
    case 'link':
    default: {
      if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
        return cleanValue;
      }
      return `https://${cleanValue}`;
    }
  }
}

/**
 * Generates an optimized inline SVG string for the QR code.
 */
export async function generateQrSvg(
  payload: string,
  options: {
    margin?: number;
    color?: { dark: string; light: string };
  } = {}
): Promise<string> {
  if (!payload || !payload.trim()) return '';

  try {
    return await QRCode.toString(payload, {
      type: 'svg',
      margin: options.margin ?? 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: options.color?.dark || '#111827',
        light: options.color?.light || '#ffffff',
      },
    });
  } catch (err) {
    console.warn('[QR Generator] Failed to generate QR SVG:', err);
    return '';
  }
}
