import { describe, it, expect } from 'vitest';
import { validateImageFile, calculateScaledDimensions, LOGO_CONFIG } from '../src/lib/image-utils';

describe('Image Processing & Scaling Suite', () => {
  describe('LOGO_CONFIG', () => {
    it('defines 5MB max file size and proper dimensions', () => {
      expect(LOGO_CONFIG.MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
      expect(LOGO_CONFIG.MAX_WIDTH).toBe(500);
      expect(LOGO_CONFIG.MAX_HEIGHT).toBe(250);
      expect(LOGO_CONFIG.ALLOWED_MIME_TYPES).toContain('image/png');
    });
  });

  describe('validateImageFile', () => {
    it('accepts valid PNG, JPG, WebP, and SVG files within 5MB', () => {
      expect(validateImageFile({ size: 1024 * 500, type: 'image/png' }).valid).toBe(true);
      expect(validateImageFile({ size: 1024 * 1024 * 2, type: 'image/jpeg' }).valid).toBe(true);
      expect(validateImageFile({ size: 1024 * 300, type: 'image/webp' }).valid).toBe(true);
      expect(validateImageFile({ size: 1024 * 50, type: 'image/svg+xml' }).valid).toBe(true);
    });

    it('rejects files larger than 5MB limit', () => {
      const oversized = { size: 6 * 1024 * 1024, type: 'image/png' };
      const res = validateImageFile(oversized);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('File size exceeds the 5MB limit');
    });

    it('rejects unsupported file formats', () => {
      expect(validateImageFile({ size: 1024, type: 'application/pdf' }).valid).toBe(false);
      expect(validateImageFile({ size: 1024, type: 'image/gif' }).valid).toBe(false);
      expect(validateImageFile({ size: 1024, type: 'text/plain' }).valid).toBe(false);
    });
  });

  describe('calculateScaledDimensions', () => {
    it('preserves dimensions if already smaller than max bounds', () => {
      const dims = calculateScaledDimensions(300, 150, 500, 250);
      expect(dims.width).toBe(300);
      expect(dims.height).toBe(150);
    });

    it('scales down proportionally when width exceeds max width', () => {
      // 1000x500 scaled to max 500x250 -> 500x250
      const dims = calculateScaledDimensions(1000, 500, 500, 250);
      expect(dims.width).toBe(500);
      expect(dims.height).toBe(250);
    });

    it('scales down proportionally when height exceeds max height', () => {
      // 400x800 scaled to max 500x250 -> 125x250
      const dims = calculateScaledDimensions(400, 800, 500, 250);
      expect(dims.width).toBe(125);
      expect(dims.height).toBe(250);
    });

    it('handles square images properly', () => {
      // 1000x1000 scaled to max 500x250 -> limited by height 250 -> 250x250
      const dims = calculateScaledDimensions(1000, 1000, 500, 250);
      expect(dims.width).toBe(250);
      expect(dims.height).toBe(250);
    });

    it('handles zero or negative dimensions safely', () => {
      const dims = calculateScaledDimensions(0, 0, 500, 250);
      expect(dims.width).toBe(500);
      expect(dims.height).toBe(250);
    });
  });
});
