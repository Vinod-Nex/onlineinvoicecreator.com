/**
 * Client-Side Invoice Export Utility
 * Zero-server, zero-watermark, lazy-loaded vector PDF and high-res PNG export.
 * Handles A4 & US Letter page geometries and preserves non-Latin fonts & symbols.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportOptions {
  format?: 'a4' | 'letter';
  filename?: string;
  scale?: number;
}

export const PAGE_FORMATS = {
  a4: {
    name: 'A4',
    widthMm: 210,
    heightMm: 297,
    marginMm: 10,
  },
  letter: {
    name: 'US Letter',
    widthMm: 215.9,
    heightMm: 279.4,
    marginMm: 10,
  },
} as const;

/**
 * Generates a clean, safe filename from invoice number.
 */
export function generateExportFilename(
  invoiceNumber?: string,
  extension: 'pdf' | 'png' = 'pdf'
): string {
  const safeNumber = (invoiceNumber || 'INV-001').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeNumber}.${extension}`;
}

/**
 * Ensures all document fonts (including Inter Variable and non-Latin glyphs)
 * are fully loaded into the browser memory before rasterization.
 */
export async function waitForFontsLoaded(): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue safely if document.fonts is not supported
    }
  }
}

function sanitizeClonedDocForHtml2Canvas(clonedDoc: Document): void {
  // 1. Helper canvas to convert ANY modern CSS color (oklch, oklab, lab, lch) to standard rgb/rgba
  const canvasHelper = document.createElement('canvas');
  canvasHelper.width = 1;
  canvasHelper.height = 1;
  const ctx = canvasHelper.getContext('2d', { willReadFrequently: true });

  const toRgb = (colorStr: string): string => {
    if (!colorStr || (!colorStr.includes('oklch') && !colorStr.includes('oklab') && !colorStr.includes('lab(') && !colorStr.includes('lch('))) {
      return colorStr;
    }
    try {
      if (ctx) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = colorStr;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        const alpha = Math.round((a / 255) * 1000) / 1000;
        return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    } catch {
      // fallback
    }
    return '#111827';
  };

  // 2. Sanitize style tags
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((styleEl) => {
    if (styleEl.textContent) {
      styleEl.textContent = styleEl.textContent.replace(/okl(ch|ab)\([^)]+\)/g, (match) => toRgb(match));
    }
  });

  // 3. Layout stabilization for preview articles
  ['invoice-preview-document', 'receipt-preview-document', 'rent-preview-document'].forEach((id) => {
    const docEl = clonedDoc.getElementById(id);
    if (docEl) {
      docEl.style.width = '800px';
      docEl.style.maxWidth = '800px';
      docEl.style.margin = '0 auto';
      docEl.style.boxShadow = 'none';
      docEl.style.borderRadius = '0';
    }
  });
}

/**
 * Renders an element to canvas while safely neutralizing any modern CSS color functions
 * (oklch, oklab, lab, lch) that html2canvas cannot parse.
 */
async function renderHtml2CanvasSafely(
  element: HTMLElement,
  options: { scale?: number; onclone?: (clonedDoc: Document) => void } = {}
): Promise<HTMLCanvasElement> {
  const win = typeof window !== 'undefined' ? window : null;
  const origGetComputedStyle = win ? win.getComputedStyle : null;

  const canvasHelper = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (canvasHelper) {
    canvasHelper.width = 1;
    canvasHelper.height = 1;
  }
  const ctx = canvasHelper?.getContext('2d', { willReadFrequently: true });

  const toRgb = (colorStr: string): string => {
    if (!colorStr || (!colorStr.includes('oklch') && !colorStr.includes('oklab') && !colorStr.includes('lab(') && !colorStr.includes('lch('))) {
      return colorStr;
    }
    try {
      if (ctx) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = colorStr;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        const alpha = Math.round((a / 255) * 1000) / 1000;
        return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    } catch {
      // fallback
    }
    return '#111827';
  };

  if (win && origGetComputedStyle) {
    win.getComputedStyle = function (el: Element, pseudo?: string | null): CSSStyleDeclaration {
      const style = origGetComputedStyle.call(win, el, pseudo);
      return new Proxy(style, {
        get(target, prop: string | symbol) {
          if (prop === 'getPropertyValue') {
            return function (name: string) {
              const v = target.getPropertyValue(name);
              if (typeof v === 'string' && (v.includes('oklch') || v.includes('oklab') || v.includes('lab(') || v.includes('lch('))) {
                return toRgb(v);
              }
              return v;
            };
          }
          const val = (target as any)[prop];
          if (typeof val === 'function') {
            return val.bind(target);
          }
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('lab(') || val.includes('lch('))) {
            return toRgb(val);
          }
          return val;
        },
      });
    };
  }

  try {
    return await html2canvas(element, {
      scale: options.scale || 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        sanitizeClonedDocForHtml2Canvas(clonedDoc);
        options.onclone?.(clonedDoc);
      },
    });
  } finally {
    if (win && origGetComputedStyle) {
      win.getComputedStyle = origGetComputedStyle;
    }
  }
}

/**
 * Renders the invoice element to an A4 or US Letter PDF without contacting any server.
 */
export async function exportInvoiceToPdf(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  if (!element) {
    throw new Error('Target invoice preview element not found.');
  }

  // Ensure fonts are loaded
  await waitForFontsLoaded();

  const formatKey = options.format === 'letter' ? 'letter' : 'a4';
  const pageConfig = PAGE_FORMATS[formatKey];

  // 3. Render DOM element to high-DPI canvas (2x scale ensures crisp 300dpi printing)
  const canvas = await renderHtml2CanvasSafely(element, {
    scale: options.scale || 2,
  });

  // 4. Initialize jsPDF with specified format
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: formatKey,
  });

  const printableWidth = pageConfig.widthMm - pageConfig.marginMm * 2;
  const printableHeight = pageConfig.heightMm - pageConfig.marginMm * 2;
  const imgWidth = printableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= printableHeight) {
    // Single page document (most invoices)
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(
      imgData,
      'PNG',
      pageConfig.marginMm,
      pageConfig.marginMm,
      imgWidth,
      imgHeight,
      undefined,
      'FAST'
    );
  } else {
    // Multi-page document support
    const pageCanvasHeight = Math.floor((canvas.width * printableHeight) / printableWidth);
    let currentY = 0;
    let pageNum = 0;

    while (currentY < canvas.height) {
      const sliceHeight = Math.min(pageCanvasHeight, canvas.height - currentY);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;

      const sliceCtx = sliceCanvas.getContext('2d');
      if (sliceCtx) {
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceCtx.drawImage(
          canvas,
          0,
          currentY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );

        const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
        const sliceImgHeight = (sliceHeight * printableWidth) / canvas.width;

        if (pageNum > 0) {
          pdf.addPage(formatKey, 'portrait');
        }

        pdf.addImage(
          sliceImgData,
          'PNG',
          pageConfig.marginMm,
          pageConfig.marginMm,
          printableWidth,
          sliceImgHeight,
          undefined,
          'FAST'
        );
      }

      currentY += sliceHeight;
      pageNum++;
    }
  }

  const finalFilename = options.filename || generateExportFilename(undefined, 'pdf');
  if (typeof window !== 'undefined' && window.history && window.history.pushState) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('export', finalFilename);
      window.history.pushState({}, '', url.toString());
    } catch {
      // Ignore if URL update fails
    }
  }
  pdf.save(finalFilename);
}

/**
 * Lazy-loads html2canvas on demand and triggers a client-side high-res PNG download.
 */
export async function exportInvoiceToPng(
  element: HTMLElement,
  options: Omit<ExportOptions, 'format'> = {}
): Promise<void> {
  if (!element) {
    throw new Error('Target invoice preview element not found.');
  }

  // Ensure fonts are loaded
  await waitForFontsLoaded();

  // Render high-res canvas
  const canvas = await renderHtml2CanvasSafely(element, {
    scale: options.scale || 2,
  });

  const finalFilename = options.filename || generateExportFilename(undefined, 'png');

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate PNG image from canvas.'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      }, 100);
    }, 'image/png');
  });
}

/**
 * Triggers native browser print dialog for instant printing or browser-native PDF export.
 */
export function printInvoice(): void {
  if (typeof window !== 'undefined') {
    try {
      if (window.history && window.history.pushState) {
        const url = new URL(window.location.href);
        url.searchParams.set('action', 'print');
        window.history.pushState({}, '', url.toString());
      }
    } catch {
      // Ignore if URL update fails
    }
    window.print();
  }
}
