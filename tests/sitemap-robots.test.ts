import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Phase 28: Sitemap and robots.txt Configuration', () => {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(rootDir, 'dist');
  const publicDir = path.resolve(rootDir, 'public');

  const sitemapIndexPath = path.join(distDir, 'sitemap-index.xml');
  const sitemap0Path = path.join(distDir, 'sitemap-0.xml');
  const publicRobotsPath = path.join(publicDir, 'robots.txt');
  const distRobotsPath = path.join(distDir, 'robots.txt');

  beforeAll(() => {
    if (!fs.existsSync(sitemapIndexPath) || !fs.existsSync(distRobotsPath)) {
      execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
    }
  });

  function getAllHtmlFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(getAllHtmlFiles(fullPath));
      } else if (file.endsWith('.html')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  describe('robots.txt Configuration', () => {
    it('creates public/robots.txt and deploys it to dist/robots.txt', () => {
      expect(fs.existsSync(publicRobotsPath)).toBe(true);
      expect(fs.existsSync(distRobotsPath)).toBe(true);
    });

    it('allows all web crawlers by default', () => {
      const content = fs.readFileSync(distRobotsPath, 'utf8');
      expect(content).toMatch(/User-agent:\s*\*/i);
      expect(content).toMatch(/Allow:\s*\//i);
    });

    it('blocks /api/ worker routes and /style-guide noindex page', () => {
      const content = fs.readFileSync(distRobotsPath, 'utf8');
      expect(content).toMatch(/Disallow:\s*\/api\//i);
      expect(content).toMatch(/Disallow:\s*\/style-guide/i);
    });

    it('points crawlers directly to sitemap-index.xml', () => {
      const content = fs.readFileSync(distRobotsPath, 'utf8');
      expect(content).toMatch(
        /Sitemap:\s*https:\/\/onlineinvoicecreator\.com\/sitemap-index\.xml/i
      );
    });
  });

  describe('sitemap-index.xml Generation', () => {
    it('generates sitemap-index.xml in dist/', () => {
      expect(fs.existsSync(sitemapIndexPath)).toBe(true);
    });

    it('is a valid sitemap index referencing sitemap-0.xml', () => {
      const content = fs.readFileSync(sitemapIndexPath, 'utf8');
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
      expect(content).toContain('<loc>https://onlineinvoicecreator.com/sitemap-0.xml</loc>');
      expect(content).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T[\d:.]+Z<\/lastmod>/);
    });
  });

  describe('sitemap-0.xml Details, Lastmod from Git & Noindex Exclusion', () => {
    it('generates sitemap-0.xml in dist/ with xhtml namespace for hreflang', () => {
      expect(fs.existsSync(sitemap0Path)).toBe(true);
      const content = fs.readFileSync(sitemap0Path, 'utf8');
      expect(content).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    });

    it('strictly excludes noindex pages (/style-guide)', () => {
      const content = fs.readFileSync(sitemap0Path, 'utf8');
      expect(content).not.toContain('/style-guide');
      expect(content).not.toContain('/404');
    });

    it('contains all 14 indexable canonical site pages', () => {
      const content = fs.readFileSync(sitemap0Path, 'utf8');
      const expectedPages = [
        'https://onlineinvoicecreator.com/',
        'https://onlineinvoicecreator.com/about',
        'https://onlineinvoicecreator.com/blog',
        'https://onlineinvoicecreator.com/contact',
        'https://onlineinvoicecreator.com/contractor-invoice-template',
        'https://onlineinvoicecreator.com/free-online-receipt-generator',
        'https://onlineinvoicecreator.com/free-rent-receipt-generator',
        'https://onlineinvoicecreator.com/invoice-generator-excel',
        'https://onlineinvoicecreator.com/invoice-generator-for-freelancers',
        'https://onlineinvoicecreator.com/photography-invoice-generator',
        'https://onlineinvoicecreator.com/privacy',
        'https://onlineinvoicecreator.com/receipt-maker-with-items',
        'https://onlineinvoicecreator.com/tax-invoice-template-australia',
        'https://onlineinvoicecreator.com/terms',
      ];

      for (const pageUrl of expectedPages) {
        expect(content, `Missing in sitemap: ${pageUrl}`).toContain(`<loc>${pageUrl}</loc>`);
      }

      // Count total <url> tags
      const urlCount = (content.match(/<url>/g) || []).length;
      expect(urlCount).toBe(14);
    });

    it('assigns valid ISO lastmod dates derived from git commit history to every entry', () => {
      const content = fs.readFileSync(sitemap0Path, 'utf8');
      const urlBlocks = content.split('</url>');

      for (const block of urlBlocks) {
        if (!block.includes('<loc>')) continue;
        const lastmodMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/);
        expect(lastmodMatch, `Missing lastmod in block: ${block}`).not.toBeNull();

        const isoDate = lastmodMatch![1];
        // Must be a valid date parseable by Date constructor
        const parsed = new Date(isoDate);
        expect(isNaN(parsed.getTime())).toBe(false);
        // Year must be realistic (>= 2026)
        expect(parsed.getFullYear()).toBeGreaterThanOrEqual(2026);
      }
    });

    it('assigns tiered priorities and changefreq values across site sections', () => {
      const content = fs.readFileSync(sitemap0Path, 'utf8');

      // Home page: priority 1.0, weekly
      expect(content).toMatch(
        /<loc>https:\/\/onlineinvoicecreator\.com\/<\/loc>[\s\S]*?<changefreq>weekly<\/changefreq>[\s\S]*?<priority>1\.0<\/priority>/
      );

      // Core tool pages: priority 0.9, weekly
      expect(content).toMatch(
        /<loc>https:\/\/onlineinvoicecreator\.com\/contractor-invoice-template<\/loc>[\s\S]*?<changefreq>weekly<\/changefreq>[\s\S]*?<priority>0\.9<\/priority>/
      );

      // Blog: priority 0.8, weekly
      expect(content).toMatch(
        /<loc>https:\/\/onlineinvoicecreator\.com\/blog<\/loc>[\s\S]*?<changefreq>weekly<\/changefreq>[\s\S]*?<priority>0\.8<\/priority>/
      );

      // Informational: priority 0.6, monthly
      expect(content).toMatch(
        /<loc>https:\/\/onlineinvoicecreator\.com\/about<\/loc>[\s\S]*?<changefreq>monthly<\/changefreq>[\s\S]*?<priority>0\.6<\/priority>/
      );

      // Legal: priority 0.4, monthly
      expect(content).toMatch(
        /<loc>https:\/\/onlineinvoicecreator\.com\/privacy<\/loc>[\s\S]*?<changefreq>monthly<\/changefreq>[\s\S]*?<priority>0\.4<\/priority>/
      );
    });
  });

  describe('Hreflang-Ready Sitemap Structure (Spanish & Portuguese)', () => {
    it('includes alternate links for en, es, pt, and x-default on every page', () => {
      const content = fs.readFileSync(sitemap0Path, 'utf8');
      const urlBlocks = content.split('</url>');

      for (const block of urlBlocks) {
        if (!block.includes('<loc>')) continue;
        const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
        expect(locMatch).not.toBeNull();
        const loc = locMatch![1];

        // English canonical alternate
        expect(block, `Missing en link for ${loc}`).toContain(
          `<xhtml:link rel="alternate" hreflang="en" href="${loc}"/>`
        );

        // Spanish alternate
        const cleanPath = loc.replace('https://onlineinvoicecreator.com', '').replace(/\/$/, '') || '/';
        const expectedEsUrl =
          cleanPath === '/'
            ? 'https://onlineinvoicecreator.com/es'
            : `https://onlineinvoicecreator.com/es${cleanPath}`;
        expect(block, `Missing es link for ${loc}`).toContain(
          `<xhtml:link rel="alternate" hreflang="es" href="${expectedEsUrl}"/>`
        );

        // Portuguese alternate
        const expectedPtUrl =
          cleanPath === '/'
            ? 'https://onlineinvoicecreator.com/pt'
            : `https://onlineinvoicecreator.com/pt${cleanPath}`;
        expect(block, `Missing pt link for ${loc}`).toContain(
          `<xhtml:link rel="alternate" hreflang="pt" href="${expectedPtUrl}"/>`
        );

        // x-default alternate pointing to English default
        expect(block, `Missing x-default link for ${loc}`).toContain(
          `<xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>`
        );
      }
    });
  });

  describe('HTML Pages Discovery Integration', () => {
    it('ensures all HTML pages have a <link rel="sitemap"> tag in <head>', () => {
      const htmlFiles = getAllHtmlFiles(distDir);
      expect(htmlFiles.length).toBe(15);

      for (const file of htmlFiles) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Missing sitemap link in ${file}`).toMatch(
          /<link[^>]+rel=["']sitemap["'][^>]+href=["']\/sitemap-index\.xml["']/i
        );
      }
    });
  });
});
