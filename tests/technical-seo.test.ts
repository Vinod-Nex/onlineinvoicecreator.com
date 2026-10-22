import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import zlib from 'node:zlib';

describe('Phase 31: Technical SEO Audit & Crawl Validation', () => {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(rootDir, 'dist');
  const auditDocPath = path.resolve(rootDir, 'docs/seo-audit.md');

  beforeAll(() => {
    if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
      execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
    }
  });

  function getHtmlFiles(dir: string): string[] {
    let results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(getHtmlFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('docs/seo-audit.md exists and documents all technical audit categories', () => {
    expect(fs.existsSync(auditDocPath)).toBe(true);
    const content = fs.readFileSync(auditDocPath, 'utf8');

    // Asserts all 8 technical categories required by Phase 31 are documented
    expect(content).toContain('Broken Links');
    expect(content).toContain('Redirect Chains');
    expect(content).toContain('Duplicate Titles');
    expect(content).toContain('Duplicate Descriptions');
    expect(content).toContain('Image Alt Text');
    expect(content).toContain('Non-Indexable Pages');
    expect(content).toContain('Mixed Content');
    expect(content).toContain('Page Weight');
    expect(content).toContain('Hreflang');
    expect(content).toContain('Warnings & Maintained Design Decisions');
  });

  it('crawls all 16 built HTML files in dist/ with zero broken internal links or anchors', () => {
    const htmlFiles = getHtmlFiles(distDir);
    expect(htmlFiles.length).toBe(16);

    const knownRoutes = new Set<string>();
    for (const file of htmlFiles) {
      const rel = path.relative(distDir, file);
      if (rel === 'index.html') {
        knownRoutes.add('/');
      } else if (rel.endsWith('/index.html')) {
        knownRoutes.add('/' + rel.replace(/\/index\.html$/, ''));
      } else if (rel.endsWith('.html')) {
        knownRoutes.add('/' + rel.replace(/\.html$/, ''));
      }
    }

    const brokenLinks: any[] = [];

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(distDir, file);
      const linkMatches = [...content.matchAll(/<a\b[^>]*\bhref=["']([^"']*)["'][^>]*>/gi)];

      for (const m of linkMatches) {
        const href = m[1].trim();
        if (
          !href ||
          href === '#' ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('http://') ||
          href.startsWith('https://')
        ) {
          continue;
        }

        if (href.startsWith('#')) {
          const id = href.slice(1);
          if (!content.includes(`id="${id}"`) && !content.includes(`id='${id}'`)) {
            brokenLinks.push({ file: relPath, href, issue: `Anchor target #${id} not found` });
          }
          continue;
        }

        const targetPath = href.split('#')[0];
        const cleanPath = targetPath === '/' ? '/' : targetPath.replace(/\/$/, '');
        if (!knownRoutes.has(cleanPath)) {
          brokenLinks.push({ file: relPath, href, issue: `Target route "${cleanPath}" missing` });
        }
      }
    }

    expect(brokenLinks).toEqual([]);
  });

  it('confirms zero redirect chains in internal links (no trailing slashes on subpages)', () => {
    const htmlFiles = getHtmlFiles(distDir);
    const trailingSlashLinks: any[] = [];

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(distDir, file);
      const linkMatches = [...content.matchAll(/<a\b[^>]*\bhref=["']([^"']*)["'][^>]*>/gi)];

      for (const m of linkMatches) {
        const href = m[1].trim();
        if (
          !href ||
          href === '#' ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('http://') ||
          href.startsWith('https://')
        ) {
          continue;
        }

        const targetPath = href.split('#')[0];
        if (targetPath.length > 1 && targetPath.endsWith('/')) {
          trailingSlashLinks.push({ file: relPath, href });
        }
      }
    }

    expect(trailingSlashLinks).toEqual([]);
  });

  it('guarantees unique title tags and meta descriptions across all 14 indexable pages', () => {
    const htmlFiles = getHtmlFiles(distDir);
    const titleMap = new Map<string, string[]>();
    const descMap = new Map<string, string[]>();

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(distDir, file);
      const isNoIndex = content.includes('noindex');
      if (isNoIndex) continue;

      const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const descMatch =
        content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
        content.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);

      expect(titleMatch, `Missing title in ${relPath}`).toBeTruthy();
      expect(descMatch, `Missing description in ${relPath}`).toBeTruthy();

      const title = titleMatch![1].trim();
      const desc = descMatch![1].trim();

      if (!titleMap.has(title)) titleMap.set(title, []);
      titleMap.get(title)!.push(relPath);

      if (!descMap.has(desc)) descMap.set(desc, []);
      descMap.get(desc)!.push(relPath);
    }

    // Every indexable page must have a distinct title and description
    for (const [title, pages] of titleMap.entries()) {
      expect(pages.length, `Duplicate title "${title}" on pages: ${pages.join(', ')}`).toBe(1);
    }

    for (const [desc, pages] of descMap.entries()) {
      expect(pages.length, `Duplicate description "${desc}" on pages: ${pages.join(', ')}`).toBe(1);
    }
  });

  it('verifies all images have descriptive alt text and explicit width/height attributes', () => {
    const htmlFiles = getHtmlFiles(distDir);
    const imageIssues: any[] = [];

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(distDir, file);
      const imgMatches = [...content.matchAll(/<img\b([^>]*)>/gi)];

      for (const m of imgMatches) {
        const attrs = m[1];
        const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
        const widthMatch = attrs.match(/\bwidth=["']?(\d+)["']?/i);
        const heightMatch = attrs.match(/\bheight=["']?(\d+)["']?/i);

        if (!altMatch || !altMatch[1].trim()) {
          imageIssues.push({ file: relPath, issue: 'Missing or empty alt attribute', tag: m[0] });
        }
        if (!widthMatch || !heightMatch) {
          imageIssues.push({
            file: relPath,
            issue: 'Missing width or height attribute',
            tag: m[0],
          });
        }
      }
    }

    expect(imageIssues).toEqual([]);
  });

  it('verifies non-indexable pages are strictly limited to intentional error and style-guide routes', () => {
    const htmlFiles = getHtmlFiles(distDir);
    const noIndexPages: string[] = [];

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(distDir, file);
      if (content.includes('noindex')) {
        noIndexPages.push(relPath);
      }
    }

    // Exactly 2 non-indexable pages: 404.html and style-guide/index.html
    expect(noIndexPages.sort()).toEqual(['404.html', 'style-guide/index.html'].sort());
  });

  it('verifies zero insecure mixed content (http://) resource requests exist', () => {
    const htmlFiles = getHtmlFiles(distDir);
    const mixedContent: any[] = [];

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(distDir, file);
      const matches = [...content.matchAll(/\b(src|href|action)=["'](http:\/\/[^"']+)["']/gi)];

      for (const m of matches) {
        const url = m[2];
        if (!url.includes('schema.org') && !url.includes('w3.org')) {
          mixedContent.push({ file: relPath, attr: m[1], url });
        }
      }
    }

    expect(mixedContent).toEqual([]);
  });

  it('verifies all 14 indexable pages include complete multilingual hreflang placeholders in <head>', () => {
    const htmlFiles = getHtmlFiles(distDir);
    const missingHreflang: any[] = [];
    const expectedLangs = ['en', 'es', 'pt', 'x-default'];

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(distDir, file);
      const isNoIndex = content.includes('noindex');
      if (isNoIndex) continue;

      const hreflangMatches = [
        ...content.matchAll(
          /<link[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']([^"']*)["'][^>]*>/gi
        ),
      ];
      const foundLangs = hreflangMatches.map((m) => m[1]);

      for (const lang of expectedLangs) {
        if (!foundLangs.includes(lang)) {
          missingHreflang.push({ file: relPath, missingLang: lang });
        }
      }
    }

    expect(missingHreflang).toEqual([]);
  });

  it('verifies page weight budgets are satisfied across all pages (raw HTML <= 250KB, gzip <= 45KB)', () => {
    const htmlFiles = getHtmlFiles(distDir);

    for (const file of htmlFiles) {
      const buf = fs.readFileSync(file);
      const gzipLen = zlib.gzipSync(buf).length;
      const relPath = path.relative(distDir, file);

      expect(
        buf.length,
        `${relPath} raw size ${(buf.length / 1024).toFixed(1)}KB exceeds 250KB budget`
      ).toBeLessThanOrEqual(250 * 1024);

      expect(
        gzipLen,
        `${relPath} gzip size ${(gzipLen / 1024).toFixed(1)}KB exceeds 45KB budget`
      ).toBeLessThanOrEqual(45 * 1024);
    }
  });
});
