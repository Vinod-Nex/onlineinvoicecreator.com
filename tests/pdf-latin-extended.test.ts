import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { LOCALES, type Locale } from '../src/i18n/config';

// Windows-1252 / WinAnsiEncoding byte mapping for PDF stream decoding
const WIN1252_MAP: Record<number, number> = {
  128: 8364, // €
  130: 8218, // ‚
  131: 402,  // ƒ
  132: 8222, // „
  133: 8230, // …
  134: 8224, // †
  135: 8225, // ‡
  136: 710,  // ˆ
  137: 8240, // ‰
  138: 352,  // Š
  139: 8249, // ‹
  140: 338,  // Œ
  142: 381,  // Ž
  145: 8216, // ‘
  146: 8217, // ’
  147: 8220, // “
  148: 8221, // ”
  149: 8226, // •
  150: 8211, // –
  151: 8212, // —
  152: 732,  // ˜
  153: 8482, // ™
  154: 353,  // š
  155: 8250, // ›
  156: 339,  // œ
  158: 382,  // ž
  159: 376,  // Ÿ
};

function decodeWinAnsi(str: string): string {
  let res = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (WIN1252_MAP[code]) {
      res += String.fromCharCode(WIN1252_MAP[code]);
    } else {
      res += str[i];
    }
  }
  return res;
}

function extractTextFromPdf(pdfRaw: string): string {
  const matches = [...pdfRaw.matchAll(/\((.*?)\)\s*Tj/g)];
  return matches.map((m) => decodeWinAnsi(m[1])).join('\n');
}

describe('PDF Engine Latin Extended & Multilingual Glyphs Embedding', () => {
  const localeTestData: Record<Locale, { label: string; sample: string; requiredGlyphs: string[] }> = {
    'pt-br': {
      label: 'Portuguese (Brasil)',
      sample: 'Fatura e Recibo nº 001: ã õ ç é ê í ó ú á à â R$ 1.250,00',
      requiredGlyphs: ['ã', 'õ', 'ç', 'é', 'ê', 'í', 'ó', 'ú', 'á', 'à', 'â', 'R$'],
    },
    es: {
      label: 'Spanish',
      sample: 'Factura oficial: ¿Cuánto cuesta? ¡Pague ahora! año á é í ó ú € 1.250,00',
      requiredGlyphs: ['¿', '¡', 'ñ', 'á', 'é', 'í', 'ó', 'ú', '€'],
    },
    fr: {
      label: 'French',
      sample: 'Facture & Reçu: é ê í ó ú á à â ç œ « Total TTC » 1 250,00 €',
      requiredGlyphs: ['é', 'ê', 'í', 'ó', 'ú', 'á', 'à', 'â', 'ç', 'œ', '«', '»', '€'],
    },
    de: {
      label: 'German',
      sample: 'Rechnung & Quittung: Betrag für Überweisung: ä ö ü ß € 1.250,00',
      requiredGlyphs: ['ä', 'ö', 'ü', 'ß', '€'],
    },
    en: {
      label: 'English',
      sample: 'Official Invoice & Receipt: Total Due $1,250.00 Paid in full',
      requiredGlyphs: ['$', 'Invoice', 'Receipt'],
    },
  };

  it('generates a valid PDF for every supported locale containing its native glyphs', () => {
    for (const locale of LOCALES) {
      const data = localeTestData[locale];
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(data.sample, 15, 20);

      const pdfOutput = doc.output();
      expect(pdfOutput.length).toBeGreaterThan(1000);
      expect(pdfOutput.startsWith('%PDF-')).toBe(true);

      const extracted = extractTextFromPdf(pdfOutput);
      for (const glyph of data.requiredGlyphs) {
        expect(
          extracted.includes(glyph),
          `Locale "${locale}" PDF text extraction failed to contain required glyph "${glyph}". Extracted: "${extracted}"`
        ).toBe(true);
      }
    }
  });

  it('correctly embeds the complete master Latin Extended glyph set specified by prompt', () => {
    const masterGlyphString = 'ã õ ç é ê í ó ú á à â ñ ¿ ¡ ü ö ä ß œ « » € R$';
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.setFont('Helvetica', 'normal');
    doc.text(masterGlyphString, 10, 20);

    const pdfOutput = doc.output();
    const extracted = extractTextFromPdf(pdfOutput);

    // Verify every single individual glyph from user prompt
    const glyphsToCheck = [
      'ã', 'õ', 'ç', 'é', 'ê', 'í', 'ó', 'ú', 'á', 'à', 'â',
      'ñ', '¿', '¡', 'ü', 'ö', 'ä', 'ß', 'œ', '«', '»', '€', 'R$',
    ];

    for (const g of glyphsToCheck) {
      expect(
        extracted.includes(g),
        `PDF extraction missing glyph: ${g}`
      ).toBe(true);
    }
  });

  it('handles French numbers with narrow no-break space (U+202F / U+00A0)', () => {
    // Test both narrow no-break space (\u202F) and no-break space (\u00A0)
    const frenchNumberNBSP = '1\u00A0234,56\u00A0€';
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.text(`Total: ${frenchNumberNBSP}`, 10, 20);

    const pdfOutput = doc.output();
    const extracted = extractTextFromPdf(pdfOutput);
    expect(extracted).toContain('1\u00A0234,56\u00A0€');
  });
});

