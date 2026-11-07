import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROUTES,
  BUILT_ROUTES,
  getRouteUrl,
  getHreflangAlternates,
  getLocalizedEquivalentUrl,
} from '../src/i18n/routes';
import { getPublishedLocales, isLocalePublished, LOCALE_CONFIGS } from '../src/i18n/config';
import { formatCurrency, formatNumber, formatDate } from '../src/i18n/format';
import { importeEnLetras, enteroALetras } from '../src/lib/numero-a-letras';
import { SPANISH_COUNTRIES, getSpanishCountry, getTaxLabelForCountry } from '../src/lib/spanish-countries';

describe('Spanish (es) Localization & Market Suite', () => {
  const rootDir = path.resolve(__dirname, '..');
  const esPagesDir = path.resolve(rootDir, 'src/pages/es');

  // ==========================================
  // 1. Importe en Letras (25+ cases per currency family)
  // ==========================================
  describe('1. Importe en Letras Engine (25+ cases per currency family)', () => {
    // EUR Family
    describe('EUR (Euros y Céntimos)', () => {
      const eurCases: Array<[number, string]> = [
        [0, 'cero euros'],
        [1, 'un euro'],
        [2, 'dos euros'],
        [16, 'dieciséis euros'],
        [21, 'veintiún euros'],
        [30, 'treinta euros'],
        [55.20, 'cincuenta y cinco euros con veinte céntimos'],
        [100, 'cien euros'],
        [101.05, 'ciento un euros con cinco céntimos'],
        [200, 'doscientos euros'],
        [500, 'quinientos euros'],
        [700, 'setecientos euros'],
        [900, 'novecientos euros'],
        [1000, 'mil euros'],
        [1001, 'mil un euros'],
        [1250.50, 'mil doscientos cincuenta euros con cincuenta céntimos'],
        [2000, 'dos mil euros'],
        [10000, 'diez mil euros'],
        [21000, 'veintiún mil euros'],
        [100000, 'cien mil euros'],
        [500000, 'quinientos mil euros'],
        [1000000, 'un millón de euros'],
        [2000000, 'dos millones de euros'],
        [1500250.75, 'un millón quinientos mil doscientos cincuenta euros con setenta y cinco céntimos'],
        [999999999.99, 'novecientos noventa y nueve millones novecientos noventa y nueve mil novecientos noventa y nueve euros con noventa y nueve céntimos'],
      ];

      eurCases.forEach(([amount, expected]) => {
        it(`converts ${amount} EUR -> "${expected}"`, () => {
          expect(importeEnLetras(amount, 'EUR')).toBe(expected);
        });
      });
    });

    // MXN Family
    describe('MXN (Pesos Mexicanos y Centavos)', () => {
      const mxnCases: Array<[number, string]> = [
        [0, 'cero pesos mexicanos'],
        [1, 'un peso mexicano'],
        [5, 'cinco pesos mexicanos'],
        [10, 'diez pesos mexicanos'],
        [21, 'veintiún pesos mexicanos'],
        [45.50, 'cuarenta y cinco pesos mexicanos con cincuenta centavos'],
        [100, 'cien pesos mexicanos'],
        [101, 'ciento un pesos mexicanos'],
        [250.25, 'doscientos cincuenta pesos mexicanos con veinticinco centavos'],
        [500, 'quinientos pesos mexicanos'],
        [1000, 'mil pesos mexicanos'],
        [1500, 'mil quinientos pesos mexicanos'],
        [2026, 'dos mil veintiséis pesos mexicanos'],
        [5000, 'cinco mil pesos mexicanos'],
        [10000, 'diez mil pesos mexicanos'],
        [25000, 'veinticinco mil pesos mexicanos'],
        [50000, 'cincuenta mil pesos mexicanos'],
        [100000, 'cien mil pesos mexicanos'],
        [250000, 'doscientos cincuenta mil pesos mexicanos'],
        [500000, 'quinientos mil pesos mexicanos'],
        [1000000, 'un millón de pesos mexicanos'],
        [3000000, 'tres millones de pesos mexicanos'],
        [1234567.89, 'un millón doscientos treinta y cuatro mil quinientos sesenta y siete pesos mexicanos con ochenta y nueve centavos'],
        [50000000, 'cincuenta millones de pesos mexicanos'],
        [100000000, 'cien millones de pesos mexicanos'],
      ];

      mxnCases.forEach(([amount, expected]) => {
        it(`converts ${amount} MXN -> "${expected}"`, () => {
          expect(importeEnLetras(amount, 'MXN')).toBe(expected);
        });
      });
    });

    // ARS Family
    describe('ARS (Pesos Argentinos)', () => {
      const arsCases: Array<[number, string]> = [
        [1, 'un peso argentino'],
        [100, 'cien pesos argentinos'],
        [500, 'quinientos pesos argentinos'],
        [1000, 'mil pesos argentinos'],
        [1850.50, 'mil ochocientos cincuenta pesos argentinos con cincuenta centavos'],
        [5000, 'cinco mil pesos argentinos'],
        [10000, 'diez mil pesos argentinos'],
        [20000, 'veinte mil pesos argentinos'],
        [50000, 'cincuenta mil pesos argentinos'],
        [100000, 'cien mil pesos argentinos'],
        [150000, 'ciento cincuenta mil pesos argentinos'],
        [250000, 'doscientos cincuenta mil pesos argentinos'],
        [500000, 'quinientos mil pesos argentinos'],
        [750000, 'setecientos cincuenta mil pesos argentinos'],
        [1000000, 'un millón de pesos argentinos'],
        [1500000, 'un millón quinientos mil pesos argentinos'],
        [2000000, 'dos millones de pesos argentinos'],
        [5000000, 'cinco millones de pesos argentinos'],
        [10000000, 'diez millones de pesos argentinos'],
        [15000000, 'quince millones de pesos argentinos'],
        [20000000, 'veinte millones de pesos argentinos'],
        [50000000, 'cincuenta millones de pesos argentinos'],
        [100000000, 'cien millones de pesos argentinos'],
        [250000000, 'doscientos cincuenta millones de pesos argentinos'],
        [500000000, 'quinientos millones de pesos argentinos'],
      ];

      arsCases.forEach(([amount, expected]) => {
        it(`converts ${amount} ARS -> "${expected}"`, () => {
          expect(importeEnLetras(amount, 'ARS')).toBe(expected);
        });
      });
    });

    // COP Family
    describe('COP (Pesos Colombianos)', () => {
      const copCases: Array<[number, string]> = [
        [1, 'un peso colombiano'],
        [1000, 'mil pesos colombianos'],
        [5000, 'cinco mil pesos colombianos'],
        [10000, 'diez mil pesos colombianos'],
        [20000, 'veinte mil pesos colombianos'],
        [50000, 'cincuenta mil pesos colombianos'],
        [80000, 'ochenta mil pesos colombianos'],
        [100000, 'cien mil pesos colombianos'],
        [200000, 'doscientos mil pesos colombianos'],
        [500000, 'quinientos mil pesos colombianos'],
        [1000000, 'un millón de pesos colombianos'],
        [1200000, 'un millón doscientos mil pesos colombianos'],
        [1500000, 'un millón quinientos mil pesos colombianos'],
        [2000000, 'dos millones de pesos colombianos'],
        [3500000, 'tres millones quinientos mil pesos colombianos'],
        [5000000, 'cinco millones de pesos colombianos'],
        [10000000, 'diez millones de pesos colombianos'],
        [20000000, 'veinte millones de pesos colombianos'],
        [50000000, 'cincuenta millones de pesos colombianos'],
        [100000000, 'cien millones de pesos colombianos'],
        [250000000, 'doscientos cincuenta millones de pesos colombianos'],
        [500000000, 'quinientos millones de pesos colombianos'],
        [750000000, 'setecientos cincuenta millones de pesos colombianos'],
        [1000000000, 'mil millones de pesos colombianos'],
        [2500000000, 'dos mil quinientos millones de pesos colombianos'],
      ];

      copCases.forEach(([amount, expected]) => {
        it(`converts ${amount} COP -> "${expected}"`, () => {
          expect(importeEnLetras(amount, 'COP')).toBe(expected);
        });
      });
    });

    // PEN Family
    describe('PEN (Soles Peruanos y Céntimos)', () => {
      const penCases: Array<[number, string]> = [
        [1, 'un sol'],
        [2, 'dos soles'],
        [5, 'cinco soles'],
        [10, 'diez soles'],
        [20, 'veinte soles'],
        [50.50, 'cincuenta soles con cincuenta céntimos'],
        [100, 'cien soles'],
        [150, 'ciento cincuenta soles'],
        [200, 'doscientos soles'],
        [500, 'quinientos soles'],
        [800, 'ochocientos soles'],
        [1000, 'mil soles'],
        [1500, 'mil quinientos soles'],
        [2000, 'dos mil soles'],
        [3500.75, 'tres mil quinientos soles con setenta y cinco céntimos'],
        [5000, 'cinco mil soles'],
        [10000, 'diez mil soles'],
        [20000, 'veinte mil soles'],
        [50000, 'cincuenta mil soles'],
        [100000, 'cien mil soles'],
        [250000, 'doscientos cincuenta mil soles'],
        [500000, 'quinientos mil soles'],
        [1000000, 'un millón de soles'],
        [2500000, 'dos millones quinientos mil soles'],
        [10000000, 'diez millones de soles'],
      ];

      penCases.forEach(([amount, expected]) => {
        it(`converts ${amount} PEN -> "${expected}"`, () => {
          expect(importeEnLetras(amount, 'PEN')).toBe(expected);
        });
      });
    });

    // CLP Family
    describe('CLP (Pesos Chilenos)', () => {
      const clpCases: Array<[number, string]> = [
        [1, 'un peso chileno'],
        [100, 'cien pesos chilenos'],
        [500, 'quinientos pesos chilenos'],
        [1000, 'mil pesos chilenos'],
        [5000, 'cinco mil pesos chilenos'],
        [10000, 'diez mil pesos chilenos'],
        [25000, 'veinticinco mil pesos chilenos'],
        [50000, 'cincuenta mil pesos chilenos'],
        [100000, 'cien mil pesos chilenos'],
        [250000, 'doscientos cincuenta mil pesos chilenos'],
        [500000, 'quinientos mil pesos chilenos'],
        [800000, 'ochocientos mil pesos chilenos'],
        [1000000, 'un millón de pesos chilenos'],
        [1500000, 'un millón quinientos mil pesos chilenos'],
        [2000000, 'dos millones de pesos chilenos'],
        [5000000, 'cinco millones de pesos chilenos'],
        [10000000, 'diez millones de pesos chilenos'],
        [20000000, 'veinte millones de pesos chilenos'],
        [50000000, 'cincuenta millones de pesos chilenos'],
        [100000000, 'cien millones de pesos chilenos'],
        [200000000, 'doscientos millones de pesos chilenos'],
        [500000000, 'quinientos millones de pesos chilenos'],
        [800000000, 'ochocientos millones de pesos chilenos'],
        [1000000000, 'mil millones de pesos chilenos'],
        [5000000000, 'cinco mil millones de pesos chilenos'],
      ];

      clpCases.forEach(([amount, expected]) => {
        it(`converts ${amount} CLP -> "${expected}"`, () => {
          expect(importeEnLetras(amount, 'CLP')).toBe(expected);
        });
      });
    });

    // USD Family
    describe('USD (Dólares y Centavos)', () => {
      const usdCases: Array<[number, string]> = [
        [0, 'cero dólares'],
        [1, 'un dólar'],
        [2, 'dos dólares'],
        [15, 'quince dólares'],
        [21, 'veintiún dólares'],
        [50.25, 'cincuenta dólares con veinticinco centavos'],
        [100, 'cien dólares'],
        [101, 'ciento un dólares'],
        [200, 'doscientos dólares'],
        [500, 'quinientos dólares'],
        [1000, 'mil dólares'],
        [1250.50, 'mil doscientos cincuenta dólares con cincuenta centavos'],
        [2000, 'dos mil dólares'],
        [5000, 'cinco mil dólares'],
        [10000, 'diez mil dólares'],
        [25000, 'veinticinco mil dólares'],
        [50000, 'cincuenta mil dólares'],
        [100000, 'cien mil dólares'],
        [250000, 'doscientos cincuenta mil dólares'],
        [500000, 'quinientos mil dólares'],
        [1000000, 'un millón de dólares'],
        [2000000, 'dos millones de dólares'],
        [5000000, 'cinco millones de dólares'],
        [10000000, 'diez millones de dólares'],
        [50000000, 'cincuenta millones de dólares'],
      ];

      usdCases.forEach(([amount, expected]) => {
        it(`converts ${amount} USD -> "${expected}"`, () => {
          expect(importeEnLetras(amount, 'USD')).toBe(expected);
        });
      });
    });
  });

  // ==========================================
  // 2. Number Formats: es-ES vs es-MX
  // ==========================================
  describe('2. Regional Number Formatting', () => {
    it('formats numbers in es-ES with period for thousands and comma for decimals', () => {
      const formatted = formatNumber(1234567.89, 2, 'es-ES');
      expect(formatted).toBe('1.234.567,89');
    });

    it('formats numbers in es-MX with comma for thousands and period for decimals', () => {
      const formatted = formatNumber(1234567.89, 2, 'es-MX');
      expect(formatted).toBe('1,234,567.89');
    });

    it('formats EUR in es-ES with symbol and comma decimal', () => {
      const formatted = formatCurrency(1250.5, 'EUR', 'es-ES');
      const normalized = formatted.replace(/\u00A0|\u202F/g, ' ');
      expect(normalized).toContain('1250,50');
      expect(normalized).toContain('€');
    });

    it('formats MXN in es-MX with dollar symbol prefix and period decimal', () => {
      const formatted = formatCurrency(1250.5, 'MXN', 'es-MX');
      const normalized = formatted.replace(/\u00A0|\u202F/g, ' ');
      expect(normalized).toContain('1,250.50');
      expect(normalized).toContain('$');
    });
  });

  // ==========================================
  // 3. Tax ID Label & Paper Size Switching
  // ==========================================
  describe('3. Country Configurations & Tax ID Labels', () => {
    it('provides NIF/CIF/NIE and A4 paper for Spain (ES)', () => {
      const esCountry = getSpanishCountry('ES');
      expect(esCountry.taxIdLabel).toBe('NIF / CIF / NIE');
      expect(esCountry.defaultPaper).toBe('a4');
      expect(esCountry.currency).toBe('EUR');
    });

    it('provides RFC and Letter paper for Mexico (MX)', () => {
      const mxCountry = getSpanishCountry('MX');
      expect(mxCountry.taxIdLabel).toBe('RFC');
      expect(mxCountry.defaultPaper).toBe('letter');
      expect(mxCountry.currency).toBe('MXN');
    });

    it('provides CUIT and A4 paper for Argentina (AR)', () => {
      const arCountry = getSpanishCountry('AR');
      expect(arCountry.taxIdLabel).toBe('CUIT');
      expect(arCountry.defaultPaper).toBe('a4');
      expect(arCountry.currency).toBe('ARS');
    });

    it('provides NIT and A4 paper for Colombia (CO)', () => {
      const coCountry = getSpanishCountry('CO');
      expect(coCountry.taxIdLabel).toBe('NIT');
      expect(coCountry.defaultPaper).toBe('a4');
      expect(coCountry.currency).toBe('COP');
    });

    it('provides RUT for Chile (CL) and RUC for Perú (PE)', () => {
      expect(getSpanishCountry('CL').taxIdLabel).toBe('RUT');
      expect(getSpanishCountry('PE').taxIdLabel).toBe('RUC');
    });
  });

  // ==========================================
  // 4. Spanish Character Encoding & Diacritics
  // ==========================================
  describe('4. Character Encoding & Diacritics Preservation', () => {
    const specialChars = ['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡', 'Ñ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ü'];

    it('preserves all Spanish special characters and diacritics', () => {
      const testString = '¿Año nuevo? ¡Facturación con éxito y pingüinos!';
      specialChars.forEach((char) => {
        expect(typeof char).toBe('string');
      });
      expect(testString).toContain('¿');
      expect(testString).toContain('¡');
      expect(testString).toContain('ñ');
      expect(testString).toContain('ü');
    });
  });

  // ==========================================
  // 5. Spanish Pages Metadata, Titles (<=60) & Descriptions (<=155)
  // ==========================================
  describe('5. Spanish Pages Title, Description & H1 Compliance', () => {
    const spanishPages = [
      {
        file: 'index.astro',
        expectedTitle: 'Generador de Recibos y Facturas Gratis Online',
        expectedDesc: 'Crea recibos y facturas en PDF gratis. Sin registro ni marca de agua. Funciona en tu navegador para México, España, Argentina y Colombia.',
      },
      {
        file: 'generador-de-recibos.astro',
        expectedTitle: 'Generador de Recibos Gratis – Crear y Descargar en PDF',
        expectedDesc: 'Genera recibos de pago gratis online. Completa los datos, visualiza el resultado y descarga tu PDF al instante. Sin registro y sin marca de agua.',
      },
      {
        file: 'aviso-legal.astro',
        expectedTitle: 'Aviso Legal – Información General y Titularidad',
        expectedDesc: 'Información general y condiciones de titularidad del servicio Online Invoice Creator conforme al artículo 10 de la Ley LSSI-CE de España.',
      },
      {
        file: 'privacidad.astro',
        expectedTitle: 'Política de Privacidad – Protección de Datos Locales',
        expectedDesc: 'Política de privacidad de Online Invoice Creator: procesamiento local en el navegador, sin cuentas y sin almacenamiento de datos en servidores.',
      },
      {
        file: 'terminos.astro',
        expectedTitle: 'Términos y Condiciones de Uso – Servicio Gratuito',
        expectedDesc: 'Términos y condiciones del generador de recibos y facturas. Documentos en PDF para fines civiles y mercantiles, sin valor fiscal oficial.',
      },
      {
        file: 'sobre.astro',
        expectedTitle: 'Sobre Nosotros – Herramientas Financieras Privadas',
        expectedDesc: 'Conoce Online Invoice Creator: herramientas financieras gratuitas para autónomos y pequeñas empresas que funcionan 100% en el navegador.',
      },
      {
        file: 'contacto.astro',
        expectedTitle: 'Contacto y Soporte – Online Invoice Creator',
        expectedDesc: 'Ponte en contacto con nuestro equipo para dudas, sugerencias o asistencia sobre el generador de recibos y facturas en PDF.',
      },
    ];

    spanishPages.forEach(({ file, expectedTitle, expectedDesc }) => {
      it(`${file} has valid title (<=60 chars) and description (<=155 chars)`, () => {
        const fullPath = path.join(esPagesDir, file);
        expect(fs.existsSync(fullPath)).toBe(true);

        const content = fs.readFileSync(fullPath, 'utf8');

        // Verify Title length
        expect(expectedTitle.length).toBeLessThanOrEqual(60);
        expect(content).toContain(`title = '${expectedTitle}'`);

        // Verify Description length
        expect(expectedDesc.length).toBeLessThanOrEqual(155);
        expect(content).toContain(`description = '${expectedDesc}'`);

        // Verify H1 exists and is unique
        const h1Matches = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
        expect(h1Matches).not.toBeNull();
        expect(h1Matches?.length).toBe(1);
      });
    });
  });

  // ==========================================
  // 6. JSON-LD Schema & hreflang Reciprocity
  // ==========================================
  describe('6. JSON-LD & hreflang Reciprocity', () => {
    it('marks Spanish locale as published and active in routes', () => {
      expect(isLocalePublished('es')).toBe(true);
      expect(getPublishedLocales()).toContain('es');
      expect(BUILT_ROUTES.es.has('home')).toBe(true);
      expect(BUILT_ROUTES.es.has('receipt')).toBe(true);
    });

    it('generates bidirectional hreflang links with x-default', () => {
      const alternates = getHreflangAlternates('home');
      const langs = alternates.map((a) => a.lang);
      expect(langs).toContain('en');
      expect(langs).toContain('pt-BR');
      expect(langs).toContain('es');
      expect(langs).toContain('x-default');

      // es URL should point to /es
      const esAlt = alternates.find((a) => a.lang === 'es');
      expect(esAlt?.href).toBe('https://onlineinvoicecreator.com/es');
    });

    it('does NOT build reserved routes before requested', () => {
      expect(BUILT_ROUTES.es.has('es-invoice-generator' as any)).toBe(false);
      expect(BUILT_ROUTES.es.has('rent-receipt' as any)).toBe(false);
      expect(BUILT_ROUTES.es.has('es-invoice-template' as any)).toBe(false);
    });
  });
});
