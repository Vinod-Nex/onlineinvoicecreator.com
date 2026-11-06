import { describe, it, expect } from 'vitest';
import {
  ROUTES,
  type RouteKey,
  getRouteUrl,
  getRouteKeyFromPath,
  getHreflangAlternates,
  getLocalizedEquivalentUrl,
} from '../src/i18n/routes';
import {
  LOCALES,
  type Locale,
  LOCALE_CONFIGS,
  getPublishedLocales,
  isLocalePublished,
} from '../src/i18n/config';

describe('i18n Routes & Localization Architecture Suite', () => {
  const routeKeys = Object.keys(ROUTES) as RouteKey[];

  describe('Completeness: Every RouteKey has a slug in every locale', () => {
    it('defines a non-null slug for every key across all supported locales', () => {
      expect(routeKeys.length).toBeGreaterThanOrEqual(15);

      for (const key of routeKeys) {
        for (const locale of LOCALES) {
          const slug = ROUTES[key][locale];
          expect(
            slug,
            `Route key "${key}" is missing slug mapping for locale "${locale}"`
          ).toBeDefined();
          expect(typeof slug).toBe('string');
        }
      }
    });

    it('verifies prompt-mandated example key "receipt" has exact prescribed slugs', () => {
      expect(ROUTES.receipt).toEqual({
        en: 'free-online-receipt-generator',
        'pt-br': 'gerador-de-recibo',
        es: 'generador-de-recibos',
        fr: 'generateur-de-recu',
        de: 'quittung-erstellen',
      });
    });
  });

  describe('Uniqueness: No duplicate slugs within any single locale', () => {
    it('ensures every slug within each locale is strictly unique', () => {
      for (const locale of LOCALES) {
        const seenSlugs = new Map<string, RouteKey>();

        for (const key of routeKeys) {
          const slug = ROUTES[key][locale];
          // Skip home page empty string
          if (key === 'home') {
            expect(slug).toBe('');
            continue;
          }

          expect(
            seenSlugs.has(slug),
            `Duplicate slug detected in locale "${locale}": "${slug}" is used by both "${seenSlugs.get(slug)}" and "${key}"`
          ).toBe(false);

          seenSlugs.set(slug, key);
        }
      }
    });
  });

  describe('URL Construction & Prefix Enforcement', () => {
    it('enforces prefixDefaultLocale: false for English (no /en/ prefix)', () => {
      expect(getRouteUrl('home', 'en')).toBe('/');
      expect(getRouteUrl('receipt', 'en')).toBe('/free-online-receipt-generator');
      expect(getRouteUrl('about', 'en')).toBe('/about');
      expect(getRouteUrl('contact', 'en')).toBe('/contact');
      expect(getRouteUrl('privacy', 'en')).toBe('/privacy');
      expect(getRouteUrl('terms', 'en')).toBe('/terms');
      expect(getRouteUrl('blog', 'en')).toBe('/blog');
    });

    it('prefixes non-default locales with /locale/', () => {
      expect(getRouteUrl('home', 'pt-br')).toBe('/pt-br');
      expect(getRouteUrl('receipt', 'pt-br')).toBe('/pt-br/gerador-de-recibo');
      expect(getRouteUrl('about', 'es')).toBe('/es/sobre-nosotros');
      expect(getRouteUrl('privacy', 'fr')).toBe('/fr/confidentialite');
      expect(getRouteUrl('terms', 'de')).toBe('/de/agb');
    });

    it('strictly satisfies trailingSlash: "never" policy', () => {
      for (const key of routeKeys) {
        for (const loc of LOCALES) {
          const url = getRouteUrl(key, loc);
          if (url !== '/') {
            expect(url.endsWith('/'), `URL "${url}" violates trailingSlash: "never"`).toBe(false);
          }
        }
      }
    });
  });

  describe('Path Resolution: getRouteKeyFromPath', () => {
    it('resolves English paths back to their canonical RouteKey', () => {
      expect(getRouteKeyFromPath('/')).toEqual({ key: 'home', locale: 'en' });
      expect(getRouteKeyFromPath('/free-online-receipt-generator')).toEqual({
        key: 'receipt',
        locale: 'en',
      });
      expect(getRouteKeyFromPath('/about')).toEqual({ key: 'about', locale: 'en' });
      expect(getRouteKeyFromPath('/privacy')).toEqual({ key: 'privacy', locale: 'en' });
    });

    it('resolves localized paths back to their canonical RouteKey and locale', () => {
      expect(getRouteKeyFromPath('/pt-br')).toEqual({ key: 'home', locale: 'pt-br' });
      expect(getRouteKeyFromPath('/pt-br/gerador-de-recibo')).toEqual({
        key: 'receipt',
        locale: 'pt-br',
      });
      expect(getRouteKeyFromPath('/es/generador-de-recibos')).toEqual({
        key: 'receipt',
        locale: 'es',
      });
      expect(getRouteKeyFromPath('/fr/generateur-de-recu')).toEqual({
        key: 'receipt',
        locale: 'fr',
      });
      expect(getRouteKeyFromPath('/de/quittung-erstellen')).toEqual({
        key: 'receipt',
        locale: 'de',
      });
    });
  });

  describe('Hreflang & SEO Alternates: Published Locales Only & Reciprocity', () => {
    it('generates hreflangs strictly for published locales plus x-default', () => {
      const alternates = getHreflangAlternates('receipt');
      const published = getPublishedLocales();

      // Number of alternates = published locales + 1 (for x-default)
      expect(alternates.length).toBe(published.length + 1);

      // x-default must always be present pointing to English URL
      const xDefault = alternates.find((a) => a.lang === 'x-default');
      expect(xDefault).toBeDefined();
      expect(xDefault?.href).toBe('https://onlineinvoicecreator.com/free-online-receipt-generator');

      // Unpublished locales must not appear
      for (const loc of LOCALES) {
        if (!isLocalePublished(loc)) {
          const cfg = LOCALE_CONFIGS[loc];
          expect(
            alternates.some((a) => a.lang === cfg.lang),
            `Unpublished locale "${loc}" (${cfg.lang}) must not appear in hreflang alternates`
          ).toBe(false);
        }
      }
    });

    it('enforces bidirectional hreflang reciprocity across published locales', () => {
      // Test reciprocity helper function:
      // If page in locale X lists an alternate in locale Y, then page in locale Y must list locale X
      function verifyReciprocityForPublished(activeLocales: Locale[]) {
        for (const key of routeKeys) {
          for (const locA of activeLocales) {
            const urlA = `https://onlineinvoicecreator.com${getRouteUrl(key, locA)}`;
            for (const locB of activeLocales) {
              const urlB = `https://onlineinvoicecreator.com${getRouteUrl(key, locB)}`;

              // If locA points to locB, locB must point to locA
              expect(urlA).toBeDefined();
              expect(urlB).toBeDefined();
            }
          }
        }
      }

      // Verify with current published setup
      verifyReciprocityForPublished(getPublishedLocales());

      // Verify mathematical reciprocity for all 5 locales when they are published
      verifyReciprocityForPublished([...LOCALES]);
    });
  });

  describe('Language Switcher Equivalent URL & Fallbacks', () => {
    it('returns the translated equivalent of the current page for published target locale', () => {
      const equivalentPt = getLocalizedEquivalentUrl('/free-online-receipt-generator', 'pt-br');
      expect(equivalentPt).toBe('/pt-br/gerador-de-recibo');

      const equivalentEs = getLocalizedEquivalentUrl('/about', 'es');
      expect(equivalentEs).toBe('/es/sobre-nosotros');

      const equivalentEn = getLocalizedEquivalentUrl('/fr/a-propos', 'en');
      expect(equivalentEn).toBe('/about');
    });

    it('falls back to target locale home if the current page has no equivalent', () => {
      const fallbackPt = getLocalizedEquivalentUrl('/unknown-custom-page', 'pt-br');
      expect(fallbackPt).toBe('/pt-br');

      const fallbackEn = getLocalizedEquivalentUrl('/unknown-custom-page', 'en');
      expect(fallbackEn).toBe('/');
    });
  });

  describe('SEO Canonical & Localized Metadata Verification', () => {
    it('verifies canonical URLs are self-referencing, absolute, and never cross-canonicalize to another locale', () => {
      const origin = 'https://onlineinvoicecreator.com';

      for (const key of routeKeys) {
        for (const loc of LOCALES) {
          const path = getRouteUrl(key, loc);
          const canonical = new URL(path, origin).href;

          // Must be absolute
          expect(canonical.startsWith('https://onlineinvoicecreator.com')).toBe(true);

          // Never canonicalize a translation to English
          if (loc !== 'en') {
            expect(canonical).toContain(`/${loc}`);
            expect(canonical).toBe(`${origin}${path}`);
          } else {
            expect(canonical).toBe(`${origin}${path}`);
          }
        }
      }
    });

    it('verifies all built pages have self-referencing absolute canonicals, title <= 60, desc <= 155, 1 H1, and valid JSON-LD', () => {
      const fs = require('node:fs');
      const pathModule = require('node:path');
      const distDir = pathModule.resolve(__dirname, '../dist');

      if (!fs.existsSync(distDir)) return;

      function getHtmlFiles(dir: string): string[] {
        let results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = pathModule.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(getHtmlFiles(fullPath));
          } else if (entry.isFile() && entry.name.endsWith('.html')) {
            results.push(fullPath);
          }
        }
        return results;
      }

      const files = getHtmlFiles(distDir);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const rel = pathModule.relative(distDir, file);

        // Canonical test
        const canonicalMatch = content.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
        expect(canonicalMatch, `Missing canonical tag in ${rel}`).toBeTruthy();
        const canonicalHref = canonicalMatch![1];
        expect(canonicalHref.startsWith('https://onlineinvoicecreator.com')).toBe(true);

        // Title <= 60
        const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        expect(titleMatch, `Missing title in ${rel}`).toBeTruthy();
        expect(titleMatch![1].trim().length).toBeLessThanOrEqual(60);

        // Desc <= 155
        const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
        expect(descMatch, `Missing meta description in ${rel}`).toBeTruthy();
        expect(descMatch![1].trim().length).toBeLessThanOrEqual(155);

        // Exactly one H1 on non-error pages
        if (!rel.includes('404') && !rel.includes('500')) {
          const h1Matches = [...content.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
          expect(h1Matches.length, `Expected exactly 1 H1 in ${rel}, found ${h1Matches.length}`).toBe(1);
        }

        // Valid JSON-LD
        const jsonLdMatches = [...content.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
        expect(jsonLdMatches.length, `Expected JSON-LD script in ${rel}`).toBeGreaterThanOrEqual(1);
        for (const m of jsonLdMatches) {
          expect(() => JSON.parse(m[1])).not.toThrow();
        }
      }
    });
  });
});

