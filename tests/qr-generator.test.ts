import { describe, it, expect } from 'vitest';
import { formatPaymentUri, generateQrSvg } from '../src/lib/qr-generator';

describe('QR Payment Generator Module', () => {
  it('formats UPI payment URI correctly', () => {
    const uri = formatPaymentUri('upi', 'freelancer@oksbi');
    expect(uri).toBe('upi://pay?pa=freelancer@oksbi&pn=freelancer@oksbi');
  });

  it('formats PayPal.me URI correctly', () => {
    const uri1 = formatPaymentUri('paypal', 'antigravity');
    expect(uri1).toBe('https://paypal.me/antigravity');

    const uri2 = formatPaymentUri('paypal', 'https://paypal.me/antigravity');
    expect(uri2).toBe('https://paypal.me/antigravity');
  });

  it('formats SEPA GiroCode EPC QR URI correctly', () => {
    const uri = formatPaymentUri('epc', 'DE89370400440532013000');
    expect(uri).toContain('BCD');
    expect(uri).toContain('DE89370400440532013000');
  });

  it('formats custom URLs correctly with protocol prepended if missing', () => {
    const uri1 = formatPaymentUri('url', 'stripe.com/pay/123');
    expect(uri1).toBe('https://stripe.com/pay/123');

    const uri2 = formatPaymentUri('url', 'https://buy.stripe.com/abc');
    expect(uri2).toBe('https://buy.stripe.com/abc');
  });

  it('generates a clean SVG string for payment URI', async () => {
    const svg = await generateQrSvg('https://onlineinvoicecreator.com', { width: 100 });
    expect(svg).toBeDefined();
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('viewBox');
  });
});
