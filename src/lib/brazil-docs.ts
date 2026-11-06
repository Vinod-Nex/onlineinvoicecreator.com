/**
 * Utilitários para Validação e Máscara de CPF e CNPJ (Brasil)
 *
 * Inclui:
 * - Formatação com máscara dinâmica (000.000.000-00 ou 00.000.000/0000-00)
 * - Validação de dígitos verificadores módulo 11
 * - Rejeição de sequências repetidas (111.111.111-11, etc.)
 */

/**
 * Remove todos os caracteres não numéricos.
 */
export function cleanDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function formatCpf(cpf: string): string {
  const digits = cleanDigits(cpf).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Aplica máscara de CNPJ: 00.000.000/0000-00
 */
export function formatCnpj(cnpj: string): string {
  const digits = cleanDigits(cnpj).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Aplica máscara automática dependendo da quantidade de dígitos (CPF <= 11, CNPJ > 11)
 */
export function formatCpfCnpj(value: string): string {
  const digits = cleanDigits(value);
  if (digits.length <= 11) {
    return formatCpf(digits);
  }
  return formatCnpj(digits);
}

/**
 * Valida se um número de CPF é válido de acordo com os dígitos verificadores (módulo 11).
 */
export function isValidCpf(cpf: string): boolean {
  const clean = cleanDigits(cpf);
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean[i], 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean[10], 10)) return false;

  return true;
}

/**
 * Valida se um número de CNPJ é válido de acordo com os dígitos verificadores (módulo 11).
 */
export function isValidCnpj(cnpj: string): boolean {
  const clean = cleanDigits(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i], 10) * w1[i];
  }
  let rest = sum % 11;
  const d1 = rest < 2 ? 0 : 11 - rest;
  if (d1 !== parseInt(clean[12], 10)) return false;

  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean[i], 10) * w2[i];
  }
  rest = sum % 11;
  const d2 = rest < 2 ? 0 : 11 - rest;
  if (d2 !== parseInt(clean[13], 10)) return false;

  return true;
}

/**
 * Verifica se o valor informado é um CPF ou CNPJ válido.
 */
export function validateCpfOrCnpj(value: string): {
  valid: boolean;
  type?: 'cpf' | 'cnpj';
  formatted: string;
} {
  const digits = cleanDigits(value);
  if (digits.length === 11) {
    return {
      valid: isValidCpf(digits),
      type: 'cpf',
      formatted: formatCpf(digits),
    };
  }
  if (digits.length === 14) {
    return {
      valid: isValidCnpj(digits),
      type: 'cnpj',
      formatted: formatCnpj(digits),
    };
  }
  return {
    valid: false,
    formatted: formatCpfCnpj(value),
  };
}

