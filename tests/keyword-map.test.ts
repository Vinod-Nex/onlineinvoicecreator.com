import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const KEYWORD_MAP_PATH = path.join(ROOT_DIR, 'src/data/keyword-map.json');

const FORBIDDEN_BRANDS = [
  'zoho',
  'wave',
  'paypal',
  'cleartax',
  'quickbooks',
  'quickbook',
  'hubspot',
  'freshbooks',
  'freshbook',
  'square',
  'invoiced',
];

describe('Phase 21: Keyword Map in Code (src/data/keyword-map.json)', () => {
  it('loads keyword-map.json cleanly and validates schema metadata', () => {
    expect(fs.existsSync(KEYWORD_MAP_PATH)).toBe(true);
    const content = fs.readFileSync(KEYWORD_MAP_PATH, 'utf8');
    const data = JSON.parse(content);

    expect(data.meta).toBeDefined();
    expect(data.meta.totalPagesMapped).toBe(13);
    expect(data.meta.totalUniqueKeywordsAssigned).toBeGreaterThanOrEqual(100);
    expect(data.pages).toBeDefined();
    expect(data.clusters).toBeDefined();
    expect(data.clusters.length).toBeGreaterThan(50);
  });

  it('guarantees each page has primary keyword, target volume, and index', () => {
    const data = JSON.parse(fs.readFileSync(KEYWORD_MAP_PATH, 'utf8'));
    const pages = data.pages;

    const expectedRoutes = [
      '/',
      '/free-online-receipt-generator',
      '/free-rent-receipt-generator',
      '/receipt-maker-with-items',
      '/invoice-generator-for-freelancers',
      '/invoice-generator-excel',
      '/contractor-invoice-template',
      '/photography-invoice-generator',
      '/tax-invoice-template-australia',
      '/about',
      '/contact',
      '/privacy',
      '/terms',
    ];

    for (const route of expectedRoutes) {
      const page = pages[route];
      expect(page, `Missing route ${route} in keyword map`).toBeDefined();
      expect(page.path).toBe(route);
      expect(typeof page.primaryKeyword).toBe('string');
      expect(page.primaryKeyword.length).toBeGreaterThan(0);
      expect(typeof page.targetVolume).toBe('number');
      expect(page.targetVolume).toBeGreaterThan(0);
      expect(typeof page.competitionIndex).toBe('number');
      expect(page.competitionIndex).toBeGreaterThanOrEqual(0);

      // Must have supporting phrases for H2s and FAQs
      expect(Array.isArray(page.h2Phrases)).toBe(true);
      expect(page.h2Phrases.length).toBeGreaterThan(0);
      expect(Array.isArray(page.faqPhrases)).toBe(true);
      expect(page.faqPhrases.length).toBeGreaterThan(0);
      expect(Array.isArray(page.supportingPhrases)).toBe(true);
    }
  });

  it('CRITICAL: Do not assign one keyword to two pages (100% Mutual Exclusivity)', () => {
    const data = JSON.parse(fs.readFileSync(KEYWORD_MAP_PATH, 'utf8'));
    const pages = data.pages;

    const keywordToPageMap = new Map<string, string>();

    for (const [route, pageData] of Object.entries(pages) as [string, any][]) {
      const pageKeywords = new Set<string>();

      // Collect primary keyword
      pageKeywords.add(pageData.primaryKeyword.toLowerCase().trim());

      // Collect H2 phrases
      for (const item of pageData.h2Phrases) {
        pageKeywords.add((item.phrase || item).toLowerCase().trim());
      }

      // Collect FAQ phrases
      for (const item of pageData.faqPhrases) {
        pageKeywords.add((item.phrase || item).toLowerCase().trim());
      }

      // Collect Supporting phrases
      for (const item of pageData.supportingPhrases) {
        pageKeywords.add((item.phrase || item).toLowerCase().trim());
      }

      for (const kw of pageKeywords) {
        if (keywordToPageMap.has(kw)) {
          const conflictingRoute = keywordToPageMap.get(kw);
          throw new Error(
            `Duplicate keyword detected: "${kw}" is assigned to both ${conflictingRoute} and ${route}`
          );
        }
        keywordToPageMap.set(kw, route);
      }
    }

    expect(keywordToPageMap.size).toBe(data.meta.totalUniqueKeywordsAssigned);
  });

  it('excludes all brand names from every keyword in the map', () => {
    const data = JSON.parse(fs.readFileSync(KEYWORD_MAP_PATH, 'utf8'));
    const pages = data.pages;

    for (const [route, pageData] of Object.entries(pages) as [string, any][]) {
      const allPagePhrases = [
        pageData.primaryKeyword,
        ...pageData.h2Phrases.map((x: any) => x.phrase || x),
        ...pageData.faqPhrases.map((x: any) => x.phrase || x),
        ...pageData.supportingPhrases.map((x: any) => x.phrase || x),
      ];

      for (const phrase of allPagePhrases) {
        const lower = phrase.toLowerCase();
        for (const brand of FORBIDDEN_BRANDS) {
          const regex = new RegExp(`\\b${brand}\\b`, 'i');
          expect(
            regex.test(lower),
            `Page ${route} contains forbidden brand "${brand}" in phrase "${phrase}"`
          ).toBe(false);
        }
      }
    }
  });

  it('verifies keyword clusters group identical volume and competition index', () => {
    const data = JSON.parse(fs.readFileSync(KEYWORD_MAP_PATH, 'utf8'));
    const clusters = data.clusters;

    for (const cluster of clusters) {
      expect(cluster.clusterKey).toBe(`${cluster.volume}_${cluster.competitionIndex}`);
      expect(cluster.keywordCount).toBeGreaterThan(0);
      expect(Array.isArray(cluster.sampleKeywords)).toBe(true);
    }
  });
});
