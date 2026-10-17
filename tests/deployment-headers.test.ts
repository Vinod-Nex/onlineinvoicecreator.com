import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

describe('Phase 20: Cloudflare Pages Deployment Headers & Redirects', () => {
  const publicHeadersPath = path.join(ROOT_DIR, 'public/_headers');
  const distHeadersPath = path.join(ROOT_DIR, 'dist/_headers');
  const publicRedirectsPath = path.join(ROOT_DIR, 'public/_redirects');
  const distRedirectsPath = path.join(ROOT_DIR, 'dist/_redirects');

  it('verifies public/_headers and dist/_headers exist', () => {
    expect(fs.existsSync(publicHeadersPath)).toBe(true);
    expect(fs.existsSync(distHeadersPath)).toBe(true);
  });

  it('validates critical security headers in _headers', () => {
    const content = fs.readFileSync(publicHeadersPath, 'utf8');

    expect(content).toContain('X-Frame-Options: DENY');
    expect(content).toContain('X-Content-Type-Options: nosniff');
    expect(content).toContain('Referrer-Policy: strict-origin-when-cross-origin');
    expect(content).toContain(
      'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'
    );
    expect(content).toContain('Permissions-Policy:');
    expect(content).toContain('Content-Security-Policy:');
    expect(content).toContain('https://challenges.cloudflare.com');
  });

  it('validates caching directives in _headers', () => {
    const content = fs.readFileSync(publicHeadersPath, 'utf8');

    // Hashed assets must have immutable long-term caching
    expect(content).toContain('/_astro/*');
    expect(content).toContain('max-age=31536000, immutable');

    // Self-hosted fonts
    expect(content).toContain('/fonts/*');

    // Document root must have revalidation
    expect(content).toContain('max-age=0, must-revalidate');
  });

  it('verifies public/_redirects and dist/_redirects exist', () => {
    expect(fs.existsSync(publicRedirectsPath)).toBe(true);
    expect(fs.existsSync(distRedirectsPath)).toBe(true);
  });

  it('validates canonical apex domain redirection in _redirects', () => {
    const content = fs.readFileSync(publicRedirectsPath, 'utf8');

    // www to apex redirect
    expect(content).toContain(
      'https://www.onlineinvoicecreator.com/* https://onlineinvoicecreator.com/:splat 301!'
    );
    expect(content).toContain(
      'http://onlineinvoicecreator.com/* https://onlineinvoicecreator.com/:splat 301!'
    );
  });

  it('validates trailing slash normalization in _redirects', () => {
    const content = fs.readFileSync(publicRedirectsPath, 'utf8');

    expect(content).toContain('/about/ /about 301');
    expect(content).toContain('/contact/ /contact 301');
    expect(content).toContain('/privacy/ /privacy 301');
    expect(content).toContain('/terms/ /terms 301');
    expect(content).toContain('/free-online-receipt-generator/ /free-online-receipt-generator 301');
  });
});
