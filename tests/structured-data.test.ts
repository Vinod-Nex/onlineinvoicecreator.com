import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createOrganizationSchema,
  createWebSiteSchema,
  createWebApplicationSchema,
  createFAQSchema,
  createBreadcrumbSchema,
  buildPageSchemaGraph,
} from '../src/lib/schema';
import type { ToolPageData } from '../src/types/page';

describe('Phase 24: Structured Data (JSON-LD) Unit Tests', () => {
  const pagesDir = path.resolve(__dirname, '../src/data/pages');
  const distDir = path.resolve(__dirname, '../dist');

  describe('src/lib/schema.ts Pure Helpers', () => {
    it('generates compliant Organization schema', () => {
      const org = createOrganizationSchema('https://onlineinvoicecreator.com');
      expect(org['@type']).toBe('Organization');
      expect(org['@id']).toBe('https://onlineinvoicecreator.com/#organization');
      expect(org.name).toBe('Online Invoice Creator');
      expect(org.url).toBe('https://onlineinvoicecreator.com');
      expect(org.logo).toBeDefined();
      expect(org.logo['@type']).toBe('ImageObject');
      expect(org.logo.url).toBe('https://onlineinvoicecreator.com/favicon.svg');
      expect(org.email).toBe('support@onlineinvoicecreator.com');
    });

    it('generates compliant WebSite schema with publisher linking', () => {
      const website = createWebSiteSchema('https://onlineinvoicecreator.com');
      expect(website['@type']).toBe('WebSite');
      expect(website['@id']).toBe('https://onlineinvoicecreator.com/#website');
      expect(website.name).toBe('Online Invoice Creator');
      expect(website.url).toBe('https://onlineinvoicecreator.com');
      expect(website.publisher).toEqual({
        '@id': 'https://onlineinvoicecreator.com/#organization',
      });
      expect(website.inLanguage).toBe('en-US');
    });

    it('generates compliant WebApplication schema with free offer and operatingSystem Any', () => {
      const webApp = createWebApplicationSchema({
        name: 'Free Contractor Invoice Template',
        description: 'Download free contractor invoices with no watermarks.',
        url: 'https://onlineinvoicecreator.com/contractor-invoice-template',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        features: ['Zero Watermarks', 'Instant PDF'],
      });

      expect(webApp['@type']).toBe('WebApplication');
      expect(webApp['@id']).toBe('https://onlineinvoicecreator.com/contractor-invoice-template/#webapp');
      expect(webApp.name).toBe('Free Contractor Invoice Template');
      expect(webApp.applicationCategory).toBe('BusinessApplication');
      expect(webApp.operatingSystem).toBe('Any');
      expect(webApp.offers).toEqual({
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      });
      expect(webApp.browserRequirements).toBe('Requires JavaScript and HTML5 canvas/PDF support');
      expect(webApp.featureList).toContain('Zero Watermarks');
    });

    it('generates FAQPage schema from items with Question and Answer', () => {
      const faq = createFAQSchema([
        { question: 'Is it free?', answer: 'Yes, 100% free with zero watermarks.' },
        { question: 'Is my data private?', answer: 'Yes, 100% in-browser processing.' },
      ]);

      expect(faq).not.toBeNull();
      expect(faq!['@type']).toBe('FAQPage');
      expect(faq!.mainEntity).toHaveLength(2);
      expect(faq!.mainEntity[0]['@type']).toBe('Question');
      expect(faq!.mainEntity[0].name).toBe('Is it free?');
      expect(faq!.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
      expect(faq!.mainEntity[0].acceptedAnswer.text).toBe('Yes, 100% free with zero watermarks.');
    });

    it('generates BreadcrumbList schema with sequential positions and absolute URLs', () => {
      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Receipt Generator', href: '/free-online-receipt-generator' },
        { label: 'Rent Receipt' },
      ];

      const schema = createBreadcrumbSchema(
        breadcrumbs,
        'https://onlineinvoicecreator.com/free-rent-receipt-generator',
        'https://onlineinvoicecreator.com'
      );

      expect(schema).not.toBeNull();
      expect(schema!['@type']).toBe('BreadcrumbList');
      expect(schema!.itemListElement).toHaveLength(3);

      expect(schema!.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://onlineinvoicecreator.com',
      });

      expect(schema!.itemListElement[1]).toEqual({
        '@type': 'ListItem',
        position: 2,
        name: 'Receipt Generator',
        item: 'https://onlineinvoicecreator.com/free-online-receipt-generator',
      });

      expect(schema!.itemListElement[2]).toEqual({
        '@type': 'ListItem',
        position: 3,
        name: 'Rent Receipt',
        item: 'https://onlineinvoicecreator.com/free-rent-receipt-generator',
      });
    });

    it('buildPageSchemaGraph correctly distinguishes home page from tool pages', () => {
      const homeGraph = buildPageSchemaGraph({
        canonicalUrl: 'https://onlineinvoicecreator.com',
        title: 'Free Online Invoice Generator',
        description: 'Create invoices online.',
        isHomePage: true,
        isToolPage: true,
        breadcrumbs: [{ label: 'Home' }],
        faqItems: [{ question: 'Q1', answer: 'A1' }],
      });

      const homeTypes = homeGraph['@graph'].map((x) => x['@type']);
      expect(homeTypes).toContain('Organization');
      expect(homeTypes).toContain('WebSite');
      expect(homeTypes).toContain('WebApplication');
      expect(homeTypes).toContain('FAQPage');
      expect(homeTypes).toContain('BreadcrumbList');

      const toolGraph = buildPageSchemaGraph({
        canonicalUrl: 'https://onlineinvoicecreator.com/contractor-invoice-template',
        title: 'Contractor Invoice Template',
        description: 'Contractor invoices.',
        isHomePage: false,
        isToolPage: true,
        breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Contractor Invoice Template' }],
        faqItems: [{ question: 'Q1', answer: 'A1' }],
      });

      const toolTypes = toolGraph['@graph'].map((x) => x['@type']);
      expect(toolTypes).not.toContain('Organization');
      expect(toolTypes).not.toContain('WebSite');
      expect(toolTypes).toContain('WebApplication');
      expect(toolTypes).toContain('FAQPage');
      expect(toolTypes).toContain('BreadcrumbList');
    });
  });

  describe('Built HTML Inspection & Content Parity Verification (dist/)', () => {
    const toolPageSlugs = [
      'index',
      'invoice-generator-for-freelancers',
      'contractor-invoice-template',
      'tax-invoice-template-australia',
      'photography-invoice-generator',
      'invoice-generator-excel',
      'receipt-maker-with-items',
      'free-rent-receipt-generator',
      'free-online-receipt-generator',
    ];

    function extractJsonLd(filePath: string): Array<Record<string, unknown>> {
      const html = fs.readFileSync(filePath, 'utf8');
      const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
      expect(matches.length).toBeGreaterThanOrEqual(1);

      const entities: Array<Record<string, unknown>> = [];
      matches.forEach((m) => {
        const parsed = JSON.parse(m[1].trim());
        if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          entities.push(...parsed['@graph']);
        } else {
          entities.push(parsed);
        }
      });
      return entities;
    }

    it('Home Page (/) includes Organization and WebSite structured data', () => {
      const homeHtmlPath = path.join(distDir, 'index.html');
      const entities = extractJsonLd(homeHtmlPath);

      const org = entities.find((e) => e['@type'] === 'Organization');
      expect(org).toBeDefined();
      expect(org!.name).toBe('Online Invoice Creator');
      expect(org!.url).toBe('https://onlineinvoicecreator.com');

      const website = entities.find((e) => e['@type'] === 'WebSite');
      expect(website).toBeDefined();
      expect(website!.name).toBe('Online Invoice Creator');
      expect(website!.url).toBe('https://onlineinvoicecreator.com');
    });

    toolPageSlugs.forEach((slug) => {
      it(`Tool Page (${slug}) contains WebApplication with free offer, BusinessApplication category, and operatingSystem Any`, () => {
        const pageHtmlPath =
          slug === 'index'
            ? path.join(distDir, 'index.html')
            : path.join(distDir, slug, 'index.html');

        const entities = extractJsonLd(pageHtmlPath);
        const webApp = entities.find((e) => e['@type'] === 'WebApplication');

        expect(webApp).toBeDefined();
        expect(webApp!.applicationCategory).toBe('BusinessApplication');
        expect(webApp!.operatingSystem).toBe('Any');
        expect(webApp!.offers).toBeDefined();

        const offers = webApp!.offers as Record<string, unknown>;
        expect(offers['@type']).toBe('Offer');
        expect(offers.price).toBe('0');
        expect(offers.priceCurrency).toBe('USD');
      });

      it(`Tool Page (${slug}) FAQPage schema strictly matches visible FAQ content in page data`, () => {
        const pageHtmlPath =
          slug === 'index'
            ? path.join(distDir, 'index.html')
            : path.join(distDir, slug, 'index.html');

        const dataPath = path.join(pagesDir, `${slug}.json`);
        const pageData = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as ToolPageData;

        const entities = extractJsonLd(pageHtmlPath);
        const faqPage = entities.find((e) => e['@type'] === 'FAQPage');

        expect(faqPage).toBeDefined();
        const mainEntity = faqPage!.mainEntity as Array<{
          '@type': string;
          name: string;
          acceptedAnswer: { '@type': string; text: string };
        }>;

        expect(mainEntity).toBeDefined();
        expect(mainEntity.length).toBe(pageData.faq.items.length);

        pageData.faq.items.forEach((item, idx) => {
          expect(mainEntity[idx]['@type']).toBe('Question');
          expect(mainEntity[idx].name).toBe(item.question);
          expect(mainEntity[idx].acceptedAnswer['@type']).toBe('Answer');
          expect(mainEntity[idx].acceptedAnswer.text).toBe(item.answer);
        });
      });
    });

    it('BreadcrumbList is present on all 14 pages with valid sequential positions and absolute URLs', () => {
      function findHtml(dir: string): string[] {
        let res: string[] = [];
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) res = res.concat(findHtml(p));
          else if (e.name.endsWith('.html')) res.push(p);
        }
        return res;
      }

      const allHtmlFiles = findHtml(distDir);
      expect(allHtmlFiles.length).toBe(14);

      allHtmlFiles.forEach((file) => {
        const rel = path.relative(distDir, file);
        const entities = extractJsonLd(file);
        const breadcrumb = entities.find((e) => e['@type'] === 'BreadcrumbList');

        expect(breadcrumb, `BreadcrumbList missing in ${rel}`).toBeDefined();
        const items = breadcrumb!.itemListElement as Array<{
          '@type': string;
          position: number;
          name: string;
          item: string;
        }>;

        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBeGreaterThanOrEqual(1);

        items.forEach((item, idx) => {
          expect(item['@type']).toBe('ListItem');
          expect(item.position).toBe(idx + 1);
          expect(item.name).toBeTruthy();
          expect(item.item).toMatch(/^https:\/\/onlineinvoicecreator\.com/);
        });
      });
    });
  });
});
