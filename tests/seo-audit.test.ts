import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function findHtmlFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Build-Time SEO & Metadata Audit', () => {
  const htmlFiles = findHtmlFiles(DIST_DIR);

  it('finds compiled HTML files in dist directory', () => {
    expect(htmlFiles.length).toBeGreaterThanOrEqual(14);
  });

  describe('Page-by-page SEO Compliance', () => {
    for (const filePath of htmlFiles) {
      const pageRoute = '/' + path.relative(DIST_DIR, filePath);

      describe(`Route: ${pageRoute}`, () => {
        const content = fs.readFileSync(filePath, 'utf8');

        it('contains a valid <title> tag within 60 characters', () => {
          const match = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          expect(match, `Page ${pageRoute} is missing a <title> element`).toBeTruthy();
          const title = decodeEntities(match![1]);
          expect(title.length).toBeGreaterThan(0);
          expect(
            title.length,
            `Page ${pageRoute} title "${title}" exceeds 60 characters (${title.length})`
          ).toBeLessThanOrEqual(60);
        });

        it('contains a valid <meta name="description"> tag within 155 characters', () => {
          const match =
            content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
            content.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
          expect(match, `Page ${pageRoute} is missing a meta description`).toBeTruthy();
          const desc = decodeEntities(match![1]);
          expect(desc.length).toBeGreaterThan(0);
          expect(
            desc.length,
            `Page ${pageRoute} description exceeds 155 characters (${desc.length})`
          ).toBeLessThanOrEqual(155);
        });

        it('contains a valid <link rel="canonical"> tag', () => {
          const match =
            content.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
            content.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
          expect(match, `Page ${pageRoute} is missing a canonical link`).toBeTruthy();
          expect(match![1]).toMatch(/^https:\/\/onlineinvoicecreator\.com/);
        });

        it('contains at least one <h1> heading', () => {
          const match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          expect(match, `Page ${pageRoute} is missing an <h1> heading`).toBeTruthy();
          const h1Text = decodeEntities(match![1].replace(/<[^>]+>/g, ''));
          expect(h1Text.length).toBeGreaterThan(0);
        });
      });
    }
  });
});
