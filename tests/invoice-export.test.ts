import { describe, it, expect } from 'vitest';
import {
  generateExportFilename,
  PAGE_FORMATS,
  exportInvoiceToPdf,
  exportInvoiceToPng,
} from '../src/lib/invoice-export';

describe('Invoice Export Utility Suite', () => {
  describe('generateExportFilename', () => {
    it('creates default filename when invoice number is empty', () => {
      expect(generateExportFilename('', 'pdf')).toBe('INV-001.pdf');
      expect(generateExportFilename(undefined, 'png')).toBe('INV-001.png');
    });

    it('cleans special characters in invoice number for safe filename', () => {
      expect(generateExportFilename('INV/2026/042', 'pdf')).toBe('INV_2026_042.pdf');
      expect(generateExportFilename('BILL #99 (FINAL)', 'png')).toBe('BILL__99__FINAL_.png');
    });

    it('preserves hyphens and underscores', () => {
      expect(generateExportFilename('INV-2026_001', 'pdf')).toBe('INV-2026_001.pdf');
    });
  });

  describe('PAGE_FORMATS', () => {
    it('defines standard A4 dimensions (210 x 297 mm)', () => {
      expect(PAGE_FORMATS.a4.widthMm).toBe(210);
      expect(PAGE_FORMATS.a4.heightMm).toBe(297);
      expect(PAGE_FORMATS.a4.marginMm).toBe(10);
    });

    it('defines standard US Letter dimensions (215.9 x 279.4 mm)', () => {
      expect(PAGE_FORMATS.letter.widthMm).toBe(215.9);
      expect(PAGE_FORMATS.letter.heightMm).toBe(279.4);
      expect(PAGE_FORMATS.letter.marginMm).toBe(10);
    });
  });

  describe('Validation & Error Handling', () => {
    it('rejects null element gracefully for PDF export', async () => {
      await expect(exportInvoiceToPdf(null as unknown as HTMLElement)).rejects.toThrow(
        'Target invoice preview element not found.'
      );
    });

    it('rejects null element gracefully for PNG export', async () => {
      await expect(exportInvoiceToPng(null as unknown as HTMLElement)).rejects.toThrow(
        'Target invoice preview element not found.'
      );
    });
  });
});
