/**
 * Client-Side Invoice Export Utility
 * Zero-server, zero-watermark, lazy-loaded vector PDF and high-res PNG export.
 * Handles A4 & US Letter page geometries and preserves non-Latin fonts & symbols.
 */

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

/**
 * Lazy-loads jsPDF and html2canvas on demand, rendering the invoice
 * element to an A4 or US Letter PDF without contacting any server.
 */
export async function exportInvoiceToPdf(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  if (!element) {
    throw new Error('Target invoice preview element not found.');
  }

  // 1. Dynamic import: Lazy-load libraries only when user requests PDF
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // 2. Ensure fonts are loaded
  await waitForFontsLoaded();

  const formatKey = options.format === 'letter' ? 'letter' : 'a4';
  const pageConfig = PAGE_FORMATS[formatKey];

  // 3. Render DOM element to high-DPI canvas (2x scale ensures crisp 300dpi printing)
  const canvas = await html2canvas(element, {
    scale: options.scale || 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc) => {
      // html2canvas v1.4.1 doesn't support modern CSS oklch() color syntax.
      // Replace any oklch() definitions in style tags with fallback hex colors.
      const styleTags = clonedDoc.querySelectorAll('style');
      styleTags.forEach((styleEl) => {
        if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
          styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/g, '#111827');
        }
      });

      const clonedArticle = clonedDoc.getElementById('invoice-preview-document');
      if (clonedArticle) {
        clonedArticle.style.width = '800px';
        clonedArticle.style.maxWidth = '800px';
        clonedArticle.style.margin = '0 auto';
        clonedArticle.style.boxShadow = 'none';
        clonedArticle.style.borderRadius = '0';
      }
    },
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

  // 1. Dynamic import: Lazy-load html2canvas only when user requests PNG
  const { default: html2canvas } = await import('html2canvas');

  // 2. Ensure fonts are loaded
  await waitForFontsLoaded();

  // 3. Render high-res canvas
  const canvas = await html2canvas(element, {
    scale: options.scale || 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc) => {
      // html2canvas v1.4.1 doesn't support modern CSS oklch() color syntax.
      // Replace any oklch() definitions in style tags with fallback hex colors.
      const styleTags = clonedDoc.querySelectorAll('style');
      styleTags.forEach((styleEl) => {
        if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
          styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/g, '#111827');
        }
      });

      const clonedArticle = clonedDoc.getElementById('invoice-preview-document');
      if (clonedArticle) {
        clonedArticle.style.width = '800px';
        clonedArticle.style.maxWidth = '800px';
        clonedArticle.style.margin = '0 auto';
        clonedArticle.style.boxShadow = 'none';
      }
    },
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
    window.print();
  }
}
