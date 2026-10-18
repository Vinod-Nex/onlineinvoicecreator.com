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

        it('contains exactly one <h1> heading', () => {
          const headingRegex = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
          const matches = [...content.matchAll(headingRegex)];
          expect(matches.length, `Page ${pageRoute} must have exactly one <h1> heading`).toBe(1);
          const h1Text = decodeEntities(matches[0][1].replace(/<[^>]+>/g, '').trim());
          expect(h1Text.length).toBeGreaterThan(0);
        });

        it('contains primary keyword in <h1> heading (if mapped)', () => {
          const keywordMapPath = path.resolve(__dirname, '../src/data/keyword-map.json');
          if (!fs.existsSync(keywordMapPath)) return;
          const keywordMap = JSON.parse(fs.readFileSync(keywordMapPath, 'utf8'));
          const route = pageRoute.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
          const mappedPage = keywordMap.pages && keywordMap.pages[route];
          if (!mappedPage || !mappedPage.primaryKeyword) return;

          const match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          expect(match).toBeTruthy();
          const h1Text = decodeEntities(
            match![1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
          ).toLowerCase();
          const expectedKw = mappedPage.primaryKeyword.toLowerCase().trim();
          expect(
            h1Text.includes(expectedKw),
            `Page ${route} <h1> "${h1Text}" must contain primary keyword "${expectedKw}"`
          ).toBe(true);
        });

        it('enforces strict heading hierarchy without skipped levels', () => {
          const headingRegex = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
          const headings: { level: number; text: string }[] = [];
          let match;
          while ((match = headingRegex.exec(content)) !== null) {
            headings.push({
              level: parseInt(match[1][1], 10),
              text: decodeEntities(
                match[2]
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
              ),
            });
          }

          let prevLevel = 0;
          for (const h of headings) {
            if (prevLevel > 0) {
              expect(
                h.level,
                `Page ${pageRoute} jumped from <h${prevLevel}> directly to <h${h.level}> at "${h.text}"`
              ).toBeLessThanOrEqual(prevLevel + 1);
            }
            prevLevel = h.level;
          }
        });
      });
    }
  });
});
