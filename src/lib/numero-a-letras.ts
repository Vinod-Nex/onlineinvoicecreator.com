/**
 * Conversor de Importes Numéricos a Letras en Español Neutro Internacional
 *
 * Soporta monedas de:
 * - España (EUR: euros / céntimos)
 * - México (MXN: pesos mexicanos / centavos)
 * - Argentina (ARS: pesos argentinos / centavos)
 * - Colombia (COP: pesos colombianos / centavos)
 * - Chile (CLP: pesos chilenos sin centavos)
 * - Perú (PEN: soles / céntimos)
 * - Genérico / Dólar (USD: dólares / centavos)
 *
 * Ejemplo:
 * 1250.50 EUR -> "mil doscientos cincuenta euros con cincuenta céntimos"
 */

const UNIDADES: string[] = [
  '',
  'un',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
];

const DECENAS_10: string[] = [
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
];

const DECENAS_20: string[] = [
  'veinte',
  'veintiún',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
];

const DECENAS: string[] = [
  '',
  '',
  'veinte',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
];

const CENTENAS: string[] = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];

export interface CurrencyWords {
  singular: string;
  plural: string;
  centSingular: string;
  centPlural: string;
  hasCents: boolean;
}

export const MONEDAS: Record<string, CurrencyWords> = {
  EUR: {
    singular: 'euro',
    plural: 'euros',
    centSingular: 'céntimo',
    centPlural: 'céntimos',
    hasCents: true,
  },
  MXN: {
    singular: 'peso mexicano',
    plural: 'pesos mexicanos',
    centSingular: 'centavo',
    centPlural: 'centavos',
    hasCents: true,
  },
  ARS: {
    singular: 'peso argentino',
    plural: 'pesos argentinos',
    centSingular: 'centavo',
    centPlural: 'centavos',
    hasCents: true,
  },
  COP: {
    singular: 'peso colombiano',
    plural: 'pesos colombianos',
    centSingular: 'centavo',
    centPlural: 'centavos',
    hasCents: true,
  },
  CLP: {
    singular: 'peso chileno',
    plural: 'pesos chilenos',
    centSingular: 'centavo',
    centPlural: 'centavos',
    hasCents: false,
  },
  PEN: {
    singular: 'sol',
    plural: 'soles',
    centSingular: 'céntimo',
    centPlural: 'céntimos',
    hasCents: true,
  },
  USD: {
    singular: 'dólar',
    plural: 'dólares',
    centSingular: 'centavo',
    centPlural: 'centavos',
    hasCents: true,
  },
};

/**
 * Convierte un número entero entre 0 y 999 en palabras.
 */
export function seccionCentena(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';

  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];

  if (c > 0) partes.push(CENTENAS[c]);

  if (r > 0) {
    if (r < 10) {
      partes.push(UNIDADES[r]);
    } else if (r >= 10 && r < 20) {
      partes.push(DECENAS_10[r - 10]);
    } else if (r >= 20 && r < 30) {
      partes.push(DECENAS_20[r - 20]);
    } else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      if (u === 0) {
        partes.push(DECENAS[d]);
      } else {
        partes.push(`${DECENAS[d]} y ${UNIDADES[u]}`);
      }
    }
  }

  return partes.join(' ');
}

/**
 * Convierte un número entero positivo (hasta 999.999.999) en palabras.
 */
export function enteroALetras(n: number): string {
  if (n === 0) return 'cero';

  const millones = Math.floor(n / 1000000);
  const restoMillones = n % 1000000;
  const miles = Math.floor(restoMillones / 1000);
  const unidades = restoMillones % 1000;

  const partes: string[] = [];

  if (millones > 0) {
    if (millones === 1) {
      partes.push('un millón');
    } else if (millones >= 1000) {
      partes.push(`${enteroALetras(millones)} millones`);
    } else {
      partes.push(`${seccionCentena(millones)} millones`);
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      partes.push('mil');
    } else {
      partes.push(`${seccionCentena(miles)} mil`);
    }
  }

  if (unidades > 0) {
    partes.push(seccionCentena(unidades));
  }

  return partes.join(' ').trim();
}

/**
 * Convierte un importe numérico con moneda a texto formal en letras.
 *
 * @param valor - Importe numérico (ej: 1250.50)
 * @param codigoMoneda - Código ISO de moneda (EUR, MXN, ARS, COP, CLP, PEN, USD)
 * @returns Cadena formateada en español (ej: "mil doscientos cincuenta euros con cincuenta céntimos")
 */
export function importeEnLetras(valor: number, codigoMoneda = 'EUR'): string {
  if (typeof valor !== 'number' || isNaN(valor) || valor < 0) {
    return '';
  }

  const moneda = MONEDAS[codigoMoneda.toUpperCase()] || MONEDAS.EUR;
  const fixed = valor.toFixed(2);
  const [inteiroStr, centavosStr] = fixed.split('.');
  const entero = parseInt(inteiroStr, 10);
  const centavos = parseInt(centavosStr, 10);

  let textoMoneda = '';
  if (entero === 1) {
    textoMoneda = moneda.singular;
  } else if (entero > 0 && entero % 1000000 === 0 && entero >= 1000000) {
    // Regla de la RAE: "un millón de euros", "dos millones de pesos"
    textoMoneda = `de ${moneda.plural}`;
  } else {
    textoMoneda = moneda.plural;
  }

  const textoEntero = enteroALetras(entero);
  let resultado = `${textoEntero} ${textoMoneda}`.trim();

  // Si tiene centavos y la moneda los usa
  if (moneda.hasCents && centavos > 0) {
    const textoCents = enteroALetras(centavos);
    const nombreCent = centavos === 1 ? moneda.centSingular : moneda.centPlural;
    resultado += ` con ${textoCents} ${nombreCent}`;
  }

  return resultado;
}
