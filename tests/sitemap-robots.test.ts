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
  const sitemapXmlPath = path.join(distDir, 'sitemap.xml');
  const publicRobotsPath = path.join(publicDir, 'robots.txt');
  const distRobotsPath = path.join(distDir, 'robots.txt');
  const publicRobotPath = path.join(publicDir, 'robot.txt');
  const distRobotPath = path.join(distDir, 'robot.txt');

  beforeAll(() => {
    if (
      !fs.existsSync(sitemapIndexPath) ||
      !fs.existsSync(sitemapXmlPath) ||
      !fs.existsSync(distRobotsPath)
    ) {
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

    it('points crawlers directly to sitemap-index.xml and sitemap.xml', () => {
      const content = fs.readFileSync(distRobotsPath, 'utf8');
      expect(content).toMatch(
        /Sitemap:\s*https:\/\/onlineinvoicecreator\.com\/sitemap-index\.xml/i
      );
      expect(content).toMatch(
        /Sitemap:\s*https:\/\/onlineinvoicecreator\.com\/sitemap\.xml/i
      );
    });

    it('creates public/robot.txt alias and deploys it to dist/robot.txt', () => {
      expect(fs.existsSync(publicRobotPath)).toBe(true);
      expect(fs.existsSync(distRobotPath)).toBe(true);
      const content = fs.readFileSync(distRobotPath, 'utf8');
      expect(content).toMatch(/User-agent:\s*\*/i);
    });
  });

  describe('sitemap.xml Canonical Endpoint', () => {
    it('generates sitemap.xml in dist/', () => {
      expect(fs.existsSync(sitemapXmlPath)).toBe(true);
    });

    it('is a valid sitemap index referencing sitemap-index.xml and sitemap-0.xml', () => {
      const content = fs.readFileSync(sitemapXmlPath, 'utf8');
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain(
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
      );
      expect(content).toContain('<loc>https://onlineinvoicecreator.com/sitemap-index.xml</loc>');
      expect(content).toContain('<loc>https://onlineinvoicecreator.com/sitemap-0.xml</loc>');
      expect(content).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T[\d:.]+Z<\/lastmod>/);
    });
  });

  describe('sitemap-index.xml Generation', () => {
    it('generates sitemap-index.xml in dist/', () => {
      expect(fs.existsSync(sitemapIndexPath)).toBe(true);
    });

    it('is a valid sitemap index referencing sitemap-0.xml', () => {
      const content = fs.readFileSync(sitemapIndexPath, 'utf8');
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain(
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
      );
      expect(content).toContain('<loc>https://onlineinvoicecreator.com/sitemap-0.xml</loc>');
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
        'https://onlineinvoicecreator.com/changelog',
      ];

      for (const pageUrl of expectedPages) {
        expect(content, `Missing in sitemap: ${pageUrl}`).toContain(`<loc>${pageUrl}</loc>`);
      }

      const expectedBlogPages = [
        'https://onlineinvoicecreator.com/blog/how-to-write-an-invoice-for-freelance-work',
        'https://onlineinvoicecreator.com/blog/what-is-a-pro-forma-invoice',
        'https://onlineinvoicecreator.com/blog/invoice-vs-receipt',
        'https://onlineinvoicecreator.com/blog/how-to-number-invoices',
      ];

      for (const blogUrl of expectedBlogPages) {
        expect(content, `Missing in sitemap: ${blogUrl}`).toContain(`<loc>${blogUrl}</loc>`);
      }

      // Count total <url> tags (19 English + 8 Brazilian Portuguese + 7 Spanish = 34 total indexable pages)
      const urlCount = (content.match(/<url>/g) || []).length;
      expect(urlCount).toBe(34);

      const expectedSpanishPages = [
        'https://onlineinvoicecreator.com/es',
        'https://onlineinvoicecreator.com/es/generador-de-recibos',
        'https://onlineinvoicecreator.com/es/aviso-legal',
        'https://onlineinvoicecreator.com/es/sobre',
        'https://onlineinvoicecreator.com/es/contacto',
        'https://onlineinvoicecreator.com/es/privacidad',
        'https://onlineinvoicecreator.com/es/terminos',
      ];
      for (const esUrl of expectedSpanishPages) {
        expect(content, `Missing in sitemap: ${esUrl}`).toContain(`<loc>${esUrl}</loc>`);
      }
    });

    it('formats each entry cleanly with url and loc tags', () => {
      const content = fs.readFileSync(sitemap0Path, 'utf8');
      const urlBlocks = content.split('</url>');

      for (const block of urlBlocks) {
        if (!block.includes('<loc>')) continue;
        const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
        expect(locMatch).not.toBeNull();
        const loc = locMatch![1];
        expect(loc).toMatch(/^https:\/\/onlineinvoicecreator\.com/);
      }
    });
  });

  describe('HTML Pages Discovery Integration', () => {
    it('ensures all HTML pages have a <link rel="sitemap"> tag in <head>', () => {
      const htmlFiles = getAllHtmlFiles(distDir);
      expect(htmlFiles.length).toBeGreaterThanOrEqual(15);

      for (const file of htmlFiles) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content, `Missing sitemap link in ${file}`).toMatch(
          /<link[^>]+rel=["']sitemap["'][^>]+href=["']\/sitemap-index\.xml["']/i
        );
      }
    });
  });
});
