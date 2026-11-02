import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import http from 'http';

describe('Phase 29: Canonicals, Redirects, and Error Pages', () => {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(rootDir, 'dist');
  const redirectsFile = path.join(distDir, '_redirects');
  const html404File = path.join(distDir, '404.html');
  const html500File = path.join(distDir, '500.html');

  beforeAll(() => {
    if (!fs.existsSync(distDir) || !fs.existsSync(html404File) || !fs.existsSync(html500File)) {
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

  describe('Canonicals: Absolute and Self-Referencing', () => {
    it('ensures all pages have an absolute, self-referencing canonical URL', () => {
      const htmlFiles = getAllHtmlFiles(distDir);
      expect(htmlFiles.length).toBeGreaterThanOrEqual(15);

      for (const file of htmlFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relative = path.relative(distDir, file);
        const canonicalMatch = content.match(
          /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
        );

        expect(canonicalMatch, `Missing canonical in /${relative}`).not.toBeNull();
        const canonical = canonicalMatch![1];

        // Must be absolute https on apex domain
        expect(
          canonical.startsWith('https://onlineinvoicecreator.com'),
          `Non-apex or non-https canonical in /${relative}: ${canonical}`
        ).toBe(true);
        expect(canonical).not.toContain('www.');

        // Self-referencing check
        if (relative === 'index.html') {
          expect(canonical).toBe('https://onlineinvoicecreator.com/');
        } else if (relative === '404.html') {
          expect(canonical).toBe('https://onlineinvoicecreator.com/404');
        } else {
          const expectedRoute = relative.replace(/\/index\.html$/, '').replace(/\.html$/, '');
          expect(canonical).toBe(`https://onlineinvoicecreator.com/${expectedRoute}`);
          // Subpages must NOT have a trailing slash (enforce trailingSlash: 'never')
          expect(canonical.endsWith('/')).toBe(false);
        }
      }
    });
  });

  describe('Redirects: Single Hostname and Trailing Slash Normalization', () => {
    it('deploys public/_redirects to dist/_redirects', () => {
      expect(fs.existsSync(redirectsFile)).toBe(true);
    });

    it('enforces canonical redirect rules in _redirects', () => {
      const content = fs.readFileSync(redirectsFile, 'utf8');
      expect(content).toContain('/about/ /about 301');
      expect(content).toContain('/privacy-policy /privacy 301');
      expect(content).toContain('/terms-and-conditions /terms 301');
    });

    it('enforces trailing slash normalization via 301 redirects for all site routes', () => {
      const content = fs.readFileSync(redirectsFile, 'utf8');
      const expectedRoutes = [
        '/about',
        '/blog',
        '/contact',
        '/privacy',
        '/terms',
        '/contractor-invoice-template',
        '/free-online-receipt-generator',
        '/free-rent-receipt-generator',
        '/invoice-generator-excel',
        '/invoice-generator-for-freelancers',
        '/photography-invoice-generator',
        '/receipt-maker-with-items',
        '/tax-invoice-template-australia',
        '/style-guide',
        '/500',
      ];

      for (const route of expectedRoutes) {
        expect(content, `Missing 301 trailing slash redirect for ${route}`).toContain(
          `${route}/ ${route} 301`
        );
      }
    });
  });

  describe('404 Error Page: Structure, Tool Links, and Search-Free Popular Pages', () => {
    it('builds dist/404.html', () => {
      expect(fs.existsSync(html404File)).toBe(true);
    });

    it('includes noindex, nofollow robots directive on 404 page', () => {
      const content = fs.readFileSync(html404File, 'utf8');
      expect(content).toMatch(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i);
    });

    it('has a clear single H1 heading and helpful error guidance', () => {
      const content = fs.readFileSync(html404File, 'utf8');
      const h1Matches = [...content.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
      expect(h1Matches.length).toBe(1);
      expect(h1Matches[0][1]).toContain('Page Not Found');
    });

    it('contains direct links to all 9 free billing and receipt tools', () => {
      const content = fs.readFileSync(html404File, 'utf8');
      const requiredTools = [
        '/',
        '/contractor-invoice-template',
        '/free-online-receipt-generator',
        '/free-rent-receipt-generator',
        '/invoice-generator-for-freelancers',
        '/receipt-maker-with-items',
        '/tax-invoice-template-australia',
        '/invoice-generator-excel',
        '/photography-invoice-generator',
      ];

      for (const toolHref of requiredTools) {
        expect(content, `404 missing tool link: ${toolHref}`).toMatch(
          new RegExp(`href=["']${toolHref}["']`)
        );
      }
    });

    it('contains a curated, search-free list of popular pages and guides', () => {
      const content = fs.readFileSync(html404File, 'utf8');
      expect(content).toContain('/blog');
      expect(content).toContain('/about');
      expect(content).toContain('/contact');
      expect(content).toContain('/privacy');
      expect(content).toContain('/terms');
    });

    it('includes a prominent Return Home action button', () => {
      const content = fs.readFileSync(html404File, 'utf8');
      expect(content).toContain('Return to Free Invoice Generator');
      expect(content).toMatch(/href=["']\/["']/);
    });
  });

  describe('Confirm 404 Status: Server Returns HTTP 404 on Missing Routes', () => {
    it('returns HTTP 404 status code and serves 404.html content for non-existent URLs', async () => {
      // Create a lightweight static server simulating Cloudflare Pages static routing behavior
      const server = http.createServer((req, res) => {
        const urlPath = req.url?.split('?')[0] || '/';
        const cleanPath = urlPath.replace(/\/$/, '') || '/';
        const candidateFile = path.join(
          distDir,
          cleanPath === '/' ? 'index.html' : `${cleanPath}/index.html`
        );
        const directFile = path.join(distDir, cleanPath);

        if (fs.existsSync(candidateFile)) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fs.readFileSync(candidateFile));
        } else if (fs.existsSync(directFile) && fs.statSync(directFile).isFile()) {
          res.writeHead(200);
          res.end(fs.readFileSync(directFile));
        } else {
          // Cloudflare Pages / standard static host behavior: serve 404.html with status 404
          const errFile = path.join(distDir, '404.html');
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(fs.readFileSync(errFile));
        }
      });

      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      const response = await fetch(
        `http://127.0.0.1:${port}/this-page-definitely-does-not-exist-xyz`
      );
      expect(response.status).toBe(404);

      const body = await response.text();
      expect(body).toContain('Page Not Found');
      expect(body).toContain('Return to Free Invoice Generator');

      server.close();
    });
  });

  describe('500 Server Error Page: Structure, Data Protection Guarantee, and Tools', () => {
    it('builds dist/500.html', () => {
      expect(fs.existsSync(html500File)).toBe(true);
    });

    it('includes noindex, nofollow robots directive on 500 page', () => {
      const content = fs.readFileSync(html500File, 'utf8');
      expect(content).toMatch(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i);
    });

    it('has a clear single H1 heading and technical guidance', () => {
      const content = fs.readFileSync(html500File, 'utf8');
      const h1Matches = [...content.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
      expect(h1Matches.length).toBe(1);
      expect(h1Matches[0][1]).toContain('Internal Server Error');
    });

    it('includes reload action button, return home link, and contact support', () => {
      const content = fs.readFileSync(html500File, 'utf8');
      expect(content).toContain('Reload Page');
      expect(content).toContain('Return to Free Invoice Generator');
      expect(content).toContain('Contact Support');
      expect(content).toMatch(/href=["']\/["']/);
      expect(content).toMatch(/href=["']\/contact["']/);
    });

    it('contains data protection guarantee reassuring users about client-side storage', () => {
      const content = fs.readFileSync(html500File, 'utf8');
      expect(content).toContain('Why Your Business Data Remains Protected');
      expect(content).toContain('Your Invoice Data is 100% Safe');
      expect(content).toContain('localStorage');
    });

    it('contains direct links to all 9 free billing and receipt tools', () => {
      const content = fs.readFileSync(html500File, 'utf8');
      const requiredTools = [
        '/',
        '/contractor-invoice-template',
        '/free-online-receipt-generator',
        '/free-rent-receipt-generator',
        '/invoice-generator-for-freelancers',
        '/receipt-maker-with-items',
        '/tax-invoice-template-australia',
        '/invoice-generator-excel',
        '/photography-invoice-generator',
      ];

      for (const toolHref of requiredTools) {
        expect(content, `500 missing tool link: ${toolHref}`).toMatch(
          new RegExp(`href=["']${toolHref}["']`)
        );
      }
    });

    it('contains a curated list of popular pages and guides', () => {
      const content = fs.readFileSync(html500File, 'utf8');
      expect(content).toContain('/blog');
      expect(content).toContain('/about');
      expect(content).toContain('/contact');
      expect(content).toContain('/privacy');
      expect(content).toContain('/terms');
    });
  });
});
