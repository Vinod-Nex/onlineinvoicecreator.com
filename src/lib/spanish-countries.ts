/**
 * Configuración de Países Hispanohablantes
 *
 * Soporta selectores regionales para:
 * - España (es-ES, EUR, NIF/CIF/NIE, A4, dd/mm/aaaa, SEPA EPC QR)
 * - México (es-MX, MXN, RFC, Letter, dd/mm/aaaa, CLABE SPEI)
 * - Argentina (es-AR, ARS, CUIT, A4, dd/mm/aaaa, CBU/CVU/Alias)
 * - Colombia (es-CO, COP, NIT, A4, dd/mm/aaaa, Transferencia)
 * - Chile (es-CL, CLP, RUT, A4, dd/mm/aaaa, Transferencia)
 * - Perú (es-PE, PEN, RUC, A4, dd/mm/aaaa, Transferencia)
 * - Otro (es, USD, ID Fiscal, A4, dd/mm/aaaa)
 */

export interface SpanishCountryConfig {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  currencyNameSingular: string;
  currencyNamePlural: string;
  centNameSingular: string;
  centNamePlural: string;
  hasCents: boolean;
  locale: string;
  taxLabel: string;
  defaultTaxRate: number;
  taxIdLabel: string;
  taxIdPlaceholder: string;
  defaultPaper: 'a4' | 'letter';
  dateFormat: string;
  bankingTransferLabel: string;
  bankingTransferPlaceholder: string;
}

export const SPANISH_COUNTRIES: Record<string, SpanishCountryConfig> = {
  ES: {
    code: 'ES',
    name: 'España',
    currency: 'EUR',
    currencySymbol: '€',
    currencyNameSingular: 'euro',
    currencyNamePlural: 'euros',
    centNameSingular: 'céntimo',
    centNamePlural: 'céntimos',
    hasCents: true,
    locale: 'es-ES',
    taxLabel: 'IVA',
    defaultTaxRate: 21,
    taxIdLabel: 'NIF / CIF / NIE',
    taxIdPlaceholder: 'B-12345678 o 12345678Z',
    defaultPaper: 'a4',
    dateFormat: 'dd/mm/aaaa',
    bankingTransferLabel: 'IBAN / Código Bancario',
    bankingTransferPlaceholder: 'ES91 2100 0418 4502 0005 1332',
  },
  MX: {
    code: 'MX',
    name: 'México',
    currency: 'MXN',
    currencySymbol: '$',
    currencyNameSingular: 'peso mexicano',
    currencyNamePlural: 'pesos mexicanos',
    centNameSingular: 'centavo',
    centNamePlural: 'centavos',
    hasCents: true,
    locale: 'es-MX',
    taxLabel: 'IVA',
    defaultTaxRate: 16,
    taxIdLabel: 'RFC',
    taxIdPlaceholder: 'ABC120315XY1',
    defaultPaper: 'letter',
    dateFormat: 'dd/mm/aaaa',
    bankingTransferLabel: 'CLABE Interbancaria (SPEI)',
    bankingTransferPlaceholder: '012180001234567890 (18 dígitos)',
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    currency: 'ARS',
    currencySymbol: '$',
    currencyNameSingular: 'peso argentino',
    currencyNamePlural: 'pesos argentinos',
    centNameSingular: 'centavo',
    centNamePlural: 'centavos',
    hasCents: true,
    locale: 'es-AR',
    taxLabel: 'IVA',
    defaultTaxRate: 21,
    taxIdLabel: 'CUIT',
    taxIdPlaceholder: '20-12345678-9',
    defaultPaper: 'a4',
    dateFormat: 'dd/mm/aaaa',
    bankingTransferLabel: 'CBU / CVU / Alias',
    bankingTransferPlaceholder: '0000003100010000000000 o alias.mp',
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    currency: 'COP',
    currencySymbol: '$',
    currencyNameSingular: 'peso colombiano',
    currencyNamePlural: 'pesos colombianos',
    centNameSingular: 'centavo',
    centNamePlural: 'centavos',
    hasCents: true,
    locale: 'es-CO',
    taxLabel: 'IVA',
    defaultTaxRate: 19,
    taxIdLabel: 'NIT',
    taxIdPlaceholder: '900.123.456-7',
    defaultPaper: 'a4',
    dateFormat: 'dd/mm/aaaa',
    bankingTransferLabel: 'Cuenta Bancaria / Llave',
    bankingTransferPlaceholder: 'Bancolombia Ahorros # 123-456789-01',
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    currency: 'CLP',
    currencySymbol: '$',
    currencyNameSingular: 'peso chileno',
    currencyNamePlural: 'pesos chilenos',
    centNameSingular: 'centavo',
    centNamePlural: 'centavos',
    hasCents: false,
    locale: 'es-CL',
    taxLabel: 'IVA',
    defaultTaxRate: 19,
    taxIdLabel: 'RUT',
    taxIdPlaceholder: '12.345.678-K',
    defaultPaper: 'a4',
    dateFormat: 'dd/mm/aaaa',
    bankingTransferLabel: 'Datos de Transferencia',
    bankingTransferPlaceholder: 'Banco Santander Cta Corriente # 1234567',
  },
  PE: {
    code: 'PE',
    name: 'Perú',
    currency: 'PEN',
    currencySymbol: 'S/',
    currencyNameSingular: 'sol',
    currencyNamePlural: 'soles',
    centNameSingular: 'céntimo',
    centNamePlural: 'céntimos',
    hasCents: true,
    locale: 'es-PE',
    taxLabel: 'IGV',
    defaultTaxRate: 18,
    taxIdLabel: 'RUC',
    taxIdPlaceholder: '20123456789',
    defaultPaper: 'a4',
    dateFormat: 'dd/mm/aaaa',
    bankingTransferLabel: 'CCI / Número de Cuenta',
    bankingTransferPlaceholder: 'BCP CCI 002-191-000000000000-50',
  },
  OTRO: {
    code: 'OTRO',
    name: 'Otro',
    currency: 'USD',
    currencySymbol: '$',
    currencyNameSingular: 'dólar',
    currencyNamePlural: 'dólares',
    centNameSingular: 'centavo',
    centNamePlural: 'centavos',
    hasCents: true,
    locale: 'es',
    taxLabel: 'IVA',
    defaultTaxRate: 0,
    taxIdLabel: 'ID Fiscal / NIF',
    taxIdPlaceholder: 'Identificación fiscal de la empresa',
    defaultPaper: 'a4',
    dateFormat: 'dd/mm/aaaa',
    bankingTransferLabel: 'Datos de Pago / Cuenta',
    bankingTransferPlaceholder: 'Número de cuenta o instrucciones de pago',
  },
};

export const DEFAULT_SPANISH_COUNTRY = 'ES';

/**
 * Obtiene la configuración de un país o retorna la configuración de España por defecto.
 */
export function getSpanishCountry(code?: string): SpanishCountryConfig {
  if (code && code.toUpperCase() in SPANISH_COUNTRIES) {
    return SPANISH_COUNTRIES[code.toUpperCase()];
  }
  return SPANISH_COUNTRIES[DEFAULT_SPANISH_COUNTRY];
}

/**
 * Formatea un importe numérico según las normas regionales del país elegido.
 */
export function formatRegionalMoney(amount: number, countryCode: string): string {
  const country = getSpanishCountry(countryCode);
  return new Intl.NumberFormat(country.locale, {
    style: 'currency',
    currency: country.currency,
    minimumFractionDigits: country.hasCents ? 2 : 0,
    maximumFractionDigits: country.hasCents ? 2 : 0,
  }).format(amount);
}

