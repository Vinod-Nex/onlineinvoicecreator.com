import { describe, it, expect } from 'vitest';
import {
  generatePixPayload,
  calculatePixCrc16,
  formatPixKey,
} from '../src/lib/pix';
import { formatPaymentUri } from '../src/lib/qr-generator';

describe('Pix BR Code & EMV Payload Generation Suite', () => {
  it('formats keys properly (CPF, CNPJ, phone, email, EVP)', () => {
    expect(formatPixKey('123.456.789-01')).toBe('12345678901');
    expect(formatPixKey('00.000.000/0001-91')).toBe('00000000000191');
    expect(formatPixKey('(11) 98765-4321')).toBe('+5511987654321');
    expect(formatPixKey('usuario@empresa.com.br')).toBe('usuario@empresa.com.br');
    expect(formatPixKey('123e4567-e89b-12d3-a456-426614174000')).toBe(
      '123e4567-e89b-12d3-a456-426614174000'
    );
  });

  describe('Known-good Pix Payloads (3 distinct key types)', () => {
    it('1. Generates valid CPF Pix static payload with amount and receiver', () => {
      const payload = generatePixPayload({
        key: '12345678900',
        merchantName: 'FULANO DE TAL',
        merchantCity: 'SAO PAULO',
        amount: 150.0,
      });

      expect(payload.startsWith('000201')).toBe(true);
      expect(payload).toContain('br.gov.bcb.pix');
      expect(payload).toContain('12345678900');
      expect(payload).toContain('986'); // BRL
      expect(payload).toContain('5406150.00'); // Amount 150.00
      expect(payload).toContain('5802BR');
      expect(payload).toContain('FULANO DE TAL');
      expect(payload).toContain('SAO PAULO');

      // Verify CRC16 is 4 hex chars and matches calculation on prefix
      const prefix = payload.slice(0, -4);
      const crc = payload.slice(-4);
      expect(calculatePixCrc16(prefix)).toBe(crc);
    });

    it('2. Generates valid CNPJ Pix static payload with custom txid and description', () => {
      const payload = generatePixPayload({
        key: '00000000000191',
        merchantName: 'BANCO DO BRASIL',
        merchantCity: 'BRASILIA',
        amount: 2500.5,
        txid: 'INV12345',
        description: 'PAGAMENTO SERVICO',
      });

      expect(payload).toContain('00000000000191');
      expect(payload).toContain('PAGAMENTO SERVICO');
      expect(payload).toContain('INV12345');
      expect(payload).toContain('54072500.50');

      const prefix = payload.slice(0, -4);
      const crc = payload.slice(-4);
      expect(calculatePixCrc16(prefix)).toBe(crc);
    });

    it('3. Generates valid E-mail Pix static payload without amount (open donation/payment)', () => {
      const payload = generatePixPayload({
        key: 'financeiro@empresa.com.br',
        merchantName: 'EMPRESA EXEMPLO LTDA',
        merchantCity: 'CURITIBA',
      });

      expect(payload).toContain('financeiro@empresa.com.br');
      expect(payload).not.toContain('540'); // No amount field
      expect(payload).toContain('CURITIBA');

      const prefix = payload.slice(0, -4);
      const crc = payload.slice(-4);
      expect(calculatePixCrc16(prefix)).toBe(crc);
    });
  });

  describe('Integration with formatPaymentUri', () => {
    it('generates Pix payload through formatPaymentUri when type is pix', () => {
      const uri = formatPaymentUri({
        type: 'pix',
        value: 'contato@teste.com',
        recipientName: 'MARIA SILVA',
        amount: 99.9,
      });

      expect(uri.startsWith('000201')).toBe(true);
      expect(uri).toContain('contato@teste.com');
      expect(uri).toContain('MARIA SILVA');
      expect(uri).toContain('540599.90');
    });
  });
});

