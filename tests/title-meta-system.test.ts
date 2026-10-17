import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const KEYWORD_MAP_PATH = path.join(ROOT_DIR, 'src/data/keyword-map.json');
const PAGES_DIR = path.join(ROOT_DIR, 'src/data/pages');

const NINE_PAGES = [
  { slug: 'index', path: '/', file: 'index.json' },
  {
    slug: 'free-online-receipt-generator',
    path: '/free-online-receipt-generator',
    file: 'free-online-receipt-generator.json',
  },
  {
    slug: 'free-rent-receipt-generator',
    path: '/free-rent-receipt-generator',
    file: 'free-rent-receipt-generator.json',
  },
  {
    slug: 'receipt-maker-with-items',
    path: '/receipt-maker-with-items',
    file: 'receipt-maker-with-items.json',
  },
  {
    slug: 'invoice-generator-for-freelancers',
    path: '/invoice-generator-for-freelancers',
    file: 'invoice-generator-for-freelancers.json',
  },
  {
    slug: 'invoice-generator-excel',
    path: '/invoice-generator-excel',
    file: 'invoice-generator-excel.json',
  },
  {
    slug: 'contractor-invoice-template',
    path: '/contractor-invoice-template',
    file: 'contractor-invoice-template.json',
  },
  {
    slug: 'photography-invoice-generator',
    path: '/photography-invoice-generator',
    file: 'photography-invoice-generator.json',
  },
  {
    slug: 'tax-invoice-template-australia',
    path: '/tax-invoice-template-australia',
    file: 'tax-invoice-template-australia.json',
  },
];

describe('Phase 22: Title and Meta Description System', () => {
  const keywordMap = JSON.parse(fs.readFileSync(KEYWORD_MAP_PATH, 'utf8'));

  it('contains exactly 9 spoke/main pages in the page JSON repository', () => {
    expect(NINE_PAGES.length).toBe(9);
    for (const p of NINE_PAGES) {
      const filePath = path.join(PAGES_DIR, p.file);
      expect(fs.existsSync(filePath), `Missing JSON file for ${p.file}`).toBe(true);
    }
  });

  describe('Character length constraints (Title <= 60, Meta Description <= 155)', () => {
    for (const p of NINE_PAGES) {
      it(`enforces limits for ${p.slug} (${p.file})`, () => {
        const filePath = path.join(PAGES_DIR, p.file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        expect(typeof data.metaTitle, `${p.file} missing metaTitle`).toBe('string');
        expect(typeof data.metaDescription, `${p.file} missing metaDescription`).toBe('string');

        const title = data.metaTitle.trim();
        const desc = data.metaDescription.trim();

        expect(title.length).toBeGreaterThan(0);
        expect(
          title.length,
          `Title for ${p.file} exceeds 60 characters (${title.length} chars): "${title}"`
        ).toBeLessThanOrEqual(60);

        expect(desc.length).toBeGreaterThan(0);
        expect(
          desc.length,
          `Description for ${p.file} exceeds 155 characters (${desc.length} chars): "${desc}"`
        ).toBeLessThanOrEqual(155);
      });
    }
  });

  describe('Primary keyword placement near the front of Title', () => {
    for (const p of NINE_PAGES) {
      it(`places primary keyword near front in ${p.file}`, () => {
        const filePath = path.join(PAGES_DIR, p.file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const mappedPage = keywordMap.pages[p.path];

        expect(mappedPage, `Route ${p.path} not found in keyword-map.json`).toBeDefined();
        const primaryKeyword = mappedPage.primaryKeyword.toLowerCase();
        const titleLower = data.metaTitle.toLowerCase();

        // Check that the primary keyword occurs near the front (within first 15 characters)
        const kwIndex = titleLower.indexOf(primaryKeyword);
        expect(
          kwIndex,
          `Primary keyword "${primaryKeyword}" not found in title "${data.metaTitle}"`
        ).toBeGreaterThanOrEqual(0);
        expect(
          kwIndex,
          `Primary keyword "${primaryKeyword}" starts too late (index ${kwIndex}) in title "${data.metaTitle}"`
        ).toBeLessThanOrEqual(15);
      });
    }
  });

  it('guarantees all 9 titles are 100% unique (no duplicates)', () => {
    const titles = new Set<string>();
    for (const p of NINE_PAGES) {
      const data = JSON.parse(fs.readFileSync(path.join(PAGES_DIR, p.file), 'utf8'));
      const title = data.metaTitle.trim();
      expect(titles.has(title), `Duplicate title detected: "${title}"`).toBe(false);
      titles.add(title);
    }
    expect(titles.size).toBe(9);
  });

  it('guarantees all 9 meta descriptions are 100% unique (no duplicates)', () => {
    const descs = new Set<string>();
    for (const p of NINE_PAGES) {
      const data = JSON.parse(fs.readFileSync(path.join(PAGES_DIR, p.file), 'utf8'));
      const desc = data.metaDescription.trim();
      expect(descs.has(desc), `Duplicate meta description detected: "${desc}"`).toBe(false);
      descs.add(desc);
    }
    expect(descs.size).toBe(9);
  });
});
