/**
 * Image processing utilities for client-side logo upload,
 * size limit enforcement, and proportional canvas downscaling.
 */

export const LOGO_CONFIG = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 Megabytes raw limit
  MAX_WIDTH: 500, // Max width in pixels
  MAX_HEIGHT: 250, // Max height in pixels
  ALLOWED_MIME_TYPES: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml',
  ] as const,
};

export interface ImageProcessingResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
  width?: number;
  height?: number;
}

/**
 * Validates a file against allowed MIME types and max size limit.
 */
export function validateImageFile(file: { size: number; type: string }): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size > LOGO_CONFIG.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.`,
    };
  }

  const isAllowedType = LOGO_CONFIG.ALLOWED_MIME_TYPES.some((type) => type === file.type);
  if (!isAllowedType) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload a PNG, JPG, WebP, or SVG file.',
    };
  }

  return { valid: true };
}

/**
 * Computes proportionally scaled dimensions preserving aspect ratio within max constraints.
 */
export function calculateScaledDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth = LOGO_CONFIG.MAX_WIDTH,
  maxHeight = LOGO_CONFIG.MAX_HEIGHT
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
    return { width: srcWidth, height: srcHeight };
  }

  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * Resizes and compresses an image file using browser Canvas.
 * Keeps SVGs in crisp vector Data URL format without rasterization.
 */
export async function resizeImageFile(
  file: File,
  maxWidth = LOGO_CONFIG.MAX_WIDTH,
  maxHeight = LOGO_CONFIG.MAX_HEIGHT
): Promise<ImageProcessingResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Handle vector SVG directly without rasterizing
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve({ success: true, dataUrl });
      };
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read SVG file.' });
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle raster images (PNG, JPEG, WebP) with Canvas scaling
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const srcUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        try {
          const { width, height } = calculateScaledDimensions(
            img.width,
            img.height,
            maxWidth,
            maxHeight
          );

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ success: true, dataUrl: srcUrl, width: img.width, height: img.height });
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Use PNG for transparency preservation, otherwise JPEG
          const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputMime, 0.92);

          resolve({
            success: true,
            dataUrl,
            width,
            height,
          });
        } catch (err) {
          console.warn('Canvas resize failed, falling back to original data URL', err);
          resolve({ success: true, dataUrl: srcUrl });
        }
      };

      img.onerror = () => {
        resolve({ success: false, error: 'Failed to decode image data.' });
      };

      img.src = srcUrl;
    };

    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read image file.' });
    };

    reader.readAsDataURL(file);
  });
}
