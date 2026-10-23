import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(ROOT_DIR, 'src/data/pages');
const TITLE_MATRIX_PATH = path.join(ROOT_DIR, 'docs/title-testing-matrix.md');

const TOOL_SLUGS = [
  'index',
  'contractor-invoice-template',
  'free-online-receipt-generator',
  'free-rent-receipt-generator',
  'invoice-generator-excel',
  'invoice-generator-for-freelancers',
  'photography-invoice-generator',
  'receipt-maker-with-items',
  'tax-invoice-template-australia',
];

const UTILITY_PAGES = [
  { path: 'src/pages/about.astro', name: 'About' },
  { path: 'src/pages/contact.astro', name: 'Contact' },
  { path: 'src/pages/privacy.astro', name: 'Privacy' },
  { path: 'src/pages/terms.astro', name: 'Terms' },
  { path: 'src/pages/blog.astro', name: 'Blog Hub' },
  { path: 'src/pages/changelog.astro', name: 'Changelog' },
];

const BLOG_SLUGS = [
  'how-to-write-an-invoice-for-freelance-work',
  'what-is-a-pro-forma-invoice',
  'invoice-vs-receipt',
  'how-to-number-invoices',
];

function countWords(text: string): number {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

describe('Phase 37: Snippet and Click-Through Optimisation', () => {
  describe('1. Featured Snippet Eligibility: First Paragraph Word Count (40 to 60 words)', () => {
    TOOL_SLUGS.forEach((slug) => {
      it(`enforces 40-60 words intro paragraph for tool page: ${slug}.json`, () => {
        const filePath = path.join(PAGES_DIR, `${slug}.json`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(data.intro).toBeDefined();

        const words = countWords(data.intro);
        expect(
          words,
          `Tool page ${slug}.json intro paragraph has ${words} words, expected between 40 and 60.`
        ).toBeGreaterThanOrEqual(40);
        expect(
          words,
          `Tool page ${slug}.json intro paragraph has ${words} words, expected between 40 and 60.`
        ).toBeLessThanOrEqual(60);
      });
    });

    UTILITY_PAGES.forEach(({ path: pagePath, name }) => {
      it(`enforces 40-60 words intro paragraph for utility page: ${name}`, () => {
        const fullPath = path.join(ROOT_DIR, pagePath);
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Extract the first <p> paragraph inside <header>
        const match = content.match(
          /<header[\s\S]*?<p[^>]*class="[^"]*text-mute[^"]*"[^>]*>([\s\S]*?)<\/p>/i
        );
        expect(match, `Could not find hero paragraph in ${pagePath}`).toBeTruthy();

        const pText = match![1];
        const words = countWords(pText);
        expect(
          words,
          `Utility page ${name} hero paragraph has ${words} words, expected between 40 and 60.`
        ).toBeGreaterThanOrEqual(40);
        expect(
          words,
          `Utility page ${name} hero paragraph has ${words} words, expected between 40 and 60.`
        ).toBeLessThanOrEqual(60);
      });
    });

    BLOG_SLUGS.forEach((slug) => {
      it(`enforces 40-60 words lead answer paragraph for blog article: ${slug}`, () => {
        const fullPath = path.join(ROOT_DIR, `src/pages/blog/${slug}.astro`);
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Extract first paragraph under Section 1
        const sectionMatch = content.match(
          /<section[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/i
        );
        expect(sectionMatch, `Could not find section 1 paragraph in ${slug}.astro`).toBeTruthy();

        const pText = sectionMatch![1];
        const words = countWords(pText);
        expect(
          words,
          `Blog guide ${slug}.astro section 1 paragraph has ${words} words, expected between 40 and 60.`
        ).toBeGreaterThanOrEqual(40);
        expect(
          words,
          `Blog guide ${slug}.astro section 1 paragraph has ${words} words, expected between 40 and 60.`
        ).toBeLessThanOrEqual(60);
      });
    });
  });

  describe('2. Short Numbered "How To" List Near the Top of Tool Pages', () => {
    const layoutPath = path.join(ROOT_DIR, 'src/layouts/ToolPage.astro');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

    it('renders a semantic <ol> numbered list in the hero section before the interactive tool canvas', () => {
      // Must contain numbered list markup in hero
      expect(layoutContent).toContain('<ol');
      expect(layoutContent).toContain('grid grid-cols-1 sm:grid-cols-3 gap-3');
      expect(layoutContent).toContain('aria-label="Quick steps to create your document"');
      expect(layoutContent).toContain('3-Step Quick Start');

      // The <ol> must appear before <main class="w-full bg-canvas">
      const olIndex = layoutContent.indexOf('aria-label="Quick steps to create your document"');
      const mainIndex = layoutContent.indexOf('<main class="w-full bg-canvas">');
      expect(olIndex).toBeGreaterThan(0);
      expect(mainIndex).toBeGreaterThan(olIndex);
    });

    TOOL_SLUGS.forEach((slug) => {
      it(`provides at least 3 how-to steps for ${slug}.json`, () => {
        const filePath = path.join(PAGES_DIR, `${slug}.json`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(data.howTo).toBeDefined();
        expect(Array.isArray(data.howTo.steps)).toBe(true);
        expect(data.howTo.steps.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('3. Comparison Tables Where a Table Fits', () => {
    const layoutPath = path.join(ROOT_DIR, 'src/layouts/ToolPage.astro');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

    it('renders comparisonTable section with semantic <table> markup in ToolPage layout', () => {
      expect(layoutContent).toContain('id="comparison-heading"');
      expect(layoutContent).toContain('<table class="w-full text-left text-xs sm:text-sm">');
      expect(layoutContent).toContain('<th scope="col"');
    });

    TOOL_SLUGS.forEach((slug) => {
      it(`provides structured comparison table data for ${slug}.json`, () => {
        const filePath = path.join(PAGES_DIR, `${slug}.json`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        expect(data.comparisonTable, `Missing comparisonTable in ${slug}.json`).toBeDefined();
        expect(data.comparisonTable.title).toBeTruthy();
        expect(Array.isArray(data.comparisonTable.headers)).toBe(true);
        expect(data.comparisonTable.headers.length).toBe(3);
        expect(Array.isArray(data.comparisonTable.rows)).toBe(true);
        expect(data.comparisonTable.rows.length).toBeGreaterThanOrEqual(4);

        data.comparisonTable.rows.forEach((row: any) => {
          expect(row.feature).toBeTruthy();
          expect(row.ourValue).toBeTruthy();
          expect(row.otherValue).toBeTruthy();
        });
      });
    });
  });

  describe('4. Click Appeal Title Review (Honest, Specific, No ALL CAPS, No Clickbait)', () => {
    const CLICKBAIT_TRIGGERS = [
      "you won't believe",
      'shocking',
      'secret trick',
      'guaranteed',
      'the only tool',
      'insane',
      'mind blowing',
      'never do this',
    ];

    TOOL_SLUGS.forEach((slug) => {
      it(`audits title for ${slug}.json against clickbait, shouting, and length constraints`, () => {
        const filePath = path.join(PAGES_DIR, `${slug}.json`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const title = data.metaTitle.trim();

        // 1. Length constraint
        expect(title.length).toBeLessThanOrEqual(60);

        // 2. No clickbait triggers
        const lower = title.toLowerCase();
        for (const trigger of CLICKBAIT_TRIGGERS) {
          expect(lower).not.toContain(trigger);
        }

        // 3. No screaming all-caps words (allow legitimate abbreviations like PDF, ATO, GST, POS, ABN)
        const allowedAcronyms = new Set([
          'PDF',
          'ATO',
          'GST',
          'POS',
          'ABN',
          'HRA',
          'PAN',
          'EIN',
          'VAT',
        ]);
        const rawWords = title.split(/[\s:|\-&()]+/).filter(Boolean);
        for (const raw of rawWords) {
          const letterOnly = raw.replace(/[^A-Za-z]/g, '');
          if (letterOnly.length > 1 && letterOnly === letterOnly.toUpperCase()) {
            expect(
              allowedAcronyms.has(letterOnly),
              `Title "${title}" contains screaming all-caps word "${raw}" (${letterOnly}) that is not an approved statutory acronym.`
            ).toBe(true);
          }
        }
      });
    });
  });

  describe('5. Title Testing Matrix Documentation (docs/title-testing-matrix.md)', () => {
    it('exists and documents two title variants for all pages with character counts <= 60', () => {
      expect(fs.existsSync(TITLE_MATRIX_PATH)).toBe(true);
      const content = fs.readFileSync(TITLE_MATRIX_PATH, 'utf-8');

      // Verify presence of core sections
      expect(content).toContain('Core Tool Pages (9 Pages)');
      expect(content).toContain('Blog & Invoicing Guides (5 Pages)');
      expect(content).toContain('Trust & Utility Pages (5 Pages)');
      expect(content).toContain('Google Search Console Testing Protocol');

      // Check all 9 tool slugs are referenced
      TOOL_SLUGS.forEach((slug) => {
        const route = slug === 'index' ? '`/`' : `\`/${slug}\``;
        expect(content).toContain(route);
      });

      // Check all 4 full blog slugs are referenced
      BLOG_SLUGS.forEach((slug) => {
        expect(content).toContain(`\`/blog/${slug}\``);
      });
    });
  });
});
