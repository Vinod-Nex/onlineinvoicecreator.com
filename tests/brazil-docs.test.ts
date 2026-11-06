import { describe, it, expect } from 'vitest';
import {
  formatCpf,
  formatCnpj,
  formatCpfCnpj,
  isValidCpf,
  isValidCnpj,
  validateCpfOrCnpj,
} from '../src/lib/brazil-docs';

describe('Brazilian Document Validation & Masking (CPF & CNPJ)', () => {
  describe('CPF Masking & Validation', () => {
    it('formats 11 digits into standard CPF mask 000.000.000-00', () => {
      expect(formatCpf('52998224725')).toBe('529.982.247-25');
      expect(formatCpf('12345678909')).toBe('123.456.789-09');
    });

    it('validates genuine check digits correctly', () => {
      // Known valid CPFs generated according to Receita Federal algorithm
      expect(isValidCpf('52998224725')).toBe(true);
      expect(isValidCpf('529.982.247-25')).toBe(true);
      expect(isValidCpf('52998224720')).toBe(false); // Invalid check digit
    });

    it('rejects numbers with repeated identical digits', () => {
      expect(isValidCpf('00000000000')).toBe(false);
      expect(isValidCpf('11111111111')).toBe(false);
      expect(isValidCpf('99999999999')).toBe(false);
    });

    it('rejects numbers with incorrect lengths', () => {
      expect(isValidCpf('123456')).toBe(false);
      expect(isValidCpf('123456789012')).toBe(false);
    });
  });

  describe('CNPJ Masking & Validation', () => {
    it('formats 14 digits into standard CNPJ mask 00.000.000/0000-00', () => {
      expect(formatCnpj('00000000000191')).toBe('00.000.000/0001-91');
      expect(formatCnpj('06990590000123')).toBe('06.990.590/0001-23');
    });

    it('validates genuine check digits correctly', () => {
      // Banco do Brasil CNPJ: 00.000.000/0001-91
      expect(isValidCnpj('00000000000191')).toBe(true);
      expect(isValidCnpj('00.000.000/0001-91')).toBe(true);
      // Petrobras CNPJ: 33.000.167/0001-01
      expect(isValidCnpj('33000167000101')).toBe(true);
      expect(isValidCnpj('00000000000190')).toBe(false); // wrong check digit
    });

    it('rejects numbers with repeated identical digits', () => {
      expect(isValidCnpj('00000000000000')).toBe(false);
      expect(isValidCnpj('11111111111111')).toBe(false);
    });
  });

  describe('Dynamic formatCpfCnpj & validateCpfOrCnpj', () => {
    it('detects type and formats dynamically', () => {
      const cpfCheck = validateCpfOrCnpj('52998224725');
      expect(cpfCheck.valid).toBe(true);
      expect(cpfCheck.type).toBe('cpf');
      expect(cpfCheck.formatted).toBe('529.982.247-25');

      const cnpjCheck = validateCpfOrCnpj('00000000000191');
      expect(cnpjCheck.valid).toBe(true);
      expect(cnpjCheck.type).toBe('cnpj');
      expect(cnpjCheck.formatted).toBe('00.000.000/0001-91');
    });
  });
});
