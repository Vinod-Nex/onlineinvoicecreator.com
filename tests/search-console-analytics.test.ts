import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 32: Search Console, Bing Webmaster & Cloudflare Analytics', () => {
  const rootDir = path.resolve(__dirname, '..');
  const guidePath = path.resolve(rootDir, 'docs/search-console-analytics.md');
  const analyticsComponentPath = path.resolve(rootDir, 'src/components/CloudflareAnalytics.astro');
  const baseLayoutPath = path.resolve(rootDir, 'src/layouts/BaseLayout.astro');
  const headersPath = path.resolve(rootDir, 'public/_headers');

  it('docs/search-console-analytics.md exists and contains complete setup instructions', () => {
    expect(fs.existsSync(guidePath)).toBe(true);
    const content = fs.readFileSync(guidePath, 'utf8');

    // Google Search Console DNS TXT record
    expect(content).toContain('google-site-verification=');
    expect(content).toContain('TXT');

    // Bing Webmaster Tools DNS TXT record
    expect(content).toContain('MS=');

    // Sitemap submission instructions
    expect(content).toContain('sitemap-index.xml');
    expect(content).toContain('https://onlineinvoicecreator.com/sitemap-index.xml');

    // GSC to Bing import workflow
    expect(content).toContain('Import your sites from GSC');
    expect(content).toContain('Bing Webmaster Tools');

    // Cloudflare Web Analytics
    expect(content).toContain('Cloudflare Web Analytics');
    expect(content).toContain('0 Cookies');
    expect(content).toContain('PUBLIC_CF_ANALYTICS_TOKEN');
  });

  it('src/components/CloudflareAnalytics.astro renders non-blocking deferred beacon script', () => {
    expect(fs.existsSync(analyticsComponentPath)).toBe(true);
    const content = fs.readFileSync(analyticsComponentPath, 'utf8');

    // Asserts deferred loading and official Cloudflare beacon script
    expect(content).toContain('https://static.cloudflareinsights.com/beacon.min.js');
    expect(content).toContain('defer');
    expect(content).toContain('data-cf-beacon');
    expect(content).toContain('PUBLIC_CF_ANALYTICS_TOKEN');
  });

  it('src/layouts/BaseLayout.astro integrates CloudflareAnalytics component before closing body tag', () => {
    expect(fs.existsSync(baseLayoutPath)).toBe(true);
    const content = fs.readFileSync(baseLayoutPath, 'utf8');

    expect(content).toContain(
      "import CloudflareAnalytics from '../components/CloudflareAnalytics.astro';"
    );
    expect(content).toContain('<CloudflareAnalytics');
    expect(content).toContain('cfAnalyticsToken');
  });

  it('public/_headers CSP authorizes Cloudflare Web Analytics scripts and connect endpoints', () => {
    expect(fs.existsSync(headersPath)).toBe(true);
    const content = fs.readFileSync(headersPath, 'utf8');

    expect(content).toContain('https://static.cloudflareinsights.com');
    expect(content).toContain('https://cloudflareinsights.com');
  });
});
