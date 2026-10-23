import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BLOG_ARTICLES } from '../src/data/blog-articles';

const distDir = path.resolve(process.cwd(), 'dist');

describe('Phase 34: Blog and Supporting Content', () => {
  describe('1. 12 Informational Article Outlines & Tool Links', () => {
    it('contains exactly 12 informational blog outlines derived from search queries', () => {
      expect(BLOG_ARTICLES).toHaveLength(12);
    });

    it('each outline defines title, description, category, and target keyword', () => {
      for (const article of BLOG_ARTICLES) {
        expect(article.slug).toBeTruthy();
        expect(article.title).toBeTruthy();
        expect(article.seoTitle.length).toBeLessThanOrEqual(60);
        expect(article.description.length).toBeLessThanOrEqual(155);
        expect(article.category).toBeTruthy();
        expect(article.primaryKeyword).toBeTruthy();
        expect(article.readTime).toMatch(/\d+\s*min\s*read/i);
      }
    });

    it('each outline explicitly links to an appropriate tool page', () => {
      const validToolPaths = [
        '/',
        '/free-online-receipt-generator',
        '/free-rent-receipt-generator',
        '/invoice-generator-for-freelancers',
        '/invoice-generator-excel',
        '/receipt-maker-with-items',
        '/tax-invoice-template-australia',
        '/contractor-invoice-template',
        '/photography-invoice-generator',
      ];

      for (const article of BLOG_ARTICLES) {
        expect(article.tool).toBeDefined();
        expect(article.tool.name).toBeTruthy();
        expect(validToolPaths).toContain(article.tool.href);
      }
    });

    it('each outline specifies a non-generic practical value differentiator', () => {
      const validTypes = [
        'worked_example',
        'calculation',
        'downloadable_sample',
        'ledger_breakdown',
      ];

      for (const article of BLOG_ARTICLES) {
        expect(article.differentiator).toBeDefined();
        expect(validTypes).toContain(article.differentiator.type);
        expect(article.differentiator.label).toBeTruthy();
        expect(article.differentiator.description.length).toBeGreaterThan(20);
      }
    });

    it('each outline contains a structured H2/H3 blueprint', () => {
      for (const article of BLOG_ARTICLES) {
        expect(article.outline.length).toBeGreaterThanOrEqual(3);
        for (const section of article.outline) {
          expect(section.heading).toBeTruthy();
          expect(section.subheadings.length).toBeGreaterThanOrEqual(2);
          expect(section.summary).toBeTruthy();
        }
      }
    });
  });

  describe('2. First Four Articles Written In Full', () => {
    const fullArticles = BLOG_ARTICLES.filter((a) => a.isFull);

    it('exactly four articles are designated as full articles', () => {
      expect(fullArticles).toHaveLength(4);
    });

    it('the four full articles correspond to the primary requested informational queries', () => {
      const expectedSlugs = [
        'how-to-write-an-invoice-for-freelance-work',
        'what-is-a-pro-forma-invoice',
        'invoice-vs-receipt',
        'how-to-number-invoices',
      ];

      expect(fullArticles.map((a) => a.slug)).toEqual(expectedSlugs);
    });

    for (const article of fullArticles) {
      describe(`Full Article: ${article.slug}`, () => {
        const filePath = path.join(distDir, 'blog', article.slug, 'index.html');

        it('exists as a compiled static HTML file in dist/blog/', () => {
          expect(fs.existsSync(filePath), `Missing compiled file: ${filePath}`).toBe(true);
        });

        it('satisfies title (<=60) and meta description (<=155) constraints', () => {
          const content = fs.readFileSync(filePath, 'utf8');
          const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          expect(titleMatch).toBeTruthy();
          const title = titleMatch![1].trim();
          expect(title.length).toBeLessThanOrEqual(60);

          const descMatch = content.match(
            /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
          );
          expect(descMatch).toBeTruthy();
          const desc = descMatch![1].trim();
          expect(desc.length).toBeLessThanOrEqual(155);
        });

        it('contains exactly one H1 element containing the primary keyword', () => {
          const content = fs.readFileSync(filePath, 'utf8');
          const h1Matches = content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
          expect(h1Matches).toBeTruthy();
          expect(h1Matches!.length).toBe(1);

          const cleanH1 = h1Matches![0].replace(/<[^>]+>/g, '').toLowerCase();
          expect(cleanH1).toContain(article.primaryKeyword.toLowerCase());
        });

        it('declares a self-referencing canonical URL without trailing slash', () => {
          const content = fs.readFileSync(filePath, 'utf8');
          const expectedCanonical = `https://onlineinvoicecreator.com/blog/${article.slug}`;
          expect(content).toContain(`<link rel="canonical" href="${expectedCanonical}"`);
        });

        it('embeds BlogPosting and BreadcrumbList JSON-LD structured data', () => {
          const content = fs.readFileSync(filePath, 'utf8');
          expect(content).toContain('"@type":"BlogPosting"');
          expect(content).toContain('"@type":"BreadcrumbList"');
        });

        it('includes direct CTA link to its designated tool page', () => {
          const content = fs.readFileSync(filePath, 'utf8');
          expect(content).toContain(`href="${article.tool.href}"`);
        });
      });
    }

    it('Article 1 contains worked project calculation ($3,800) and copyable JSON sample', () => {
      const content = fs.readFileSync(
        path.join(distDir, 'blog/how-to-write-an-invoice-for-freelance-work/index.html'),
        'utf8'
      );
      expect(content).toContain('$3,800.00');
      expect(content).toContain('$2,280.00');
      expect(content).toContain('$1,500.00');
      expect(content).toContain('oic_v1 compatible');
      expect(content).toContain('OnlineInvoiceCreator.com');
    });

    it('Article 2 contains international CIF customs calculation ($6,830) and comparison matrix', () => {
      const content = fs.readFileSync(
        path.join(distDir, 'blog/what-is-a-pro-forma-invoice/index.html'),
        'utf8'
      );
      expect(content).toContain('$6,830.00');
      expect(content).toContain('$307.35');
      expect(content).toContain('Pro Forma Invoice');
      expect(content).toContain('Commercial Invoice');
      expect(content).toContain('Purchase Order');
    });

    it('Article 3 contains 4-stage transaction timeline and Double-Entry General Ledger entries', () => {
      const content = fs.readFileSync(
        path.join(distDir, 'blog/invoice-vs-receipt/index.html'),
        'utf8'
      );
      expect(content).toContain('Stage 1: Agreement');
      expect(content).toContain('Stage 4: Final Project Close-Out');
      expect(content).toContain('Debit: Accounts Receivable');
      expect(content).toContain('Credit: Service Revenue');
      expect(content).toContain('Debit: Cash / Operating Bank');
    });

    it('Article 4 contains zero-padding collation math and TypeScript auto-increment code logic', () => {
      const content = fs.readFileSync(
        path.join(distDir, 'blog/how-to-number-invoices/index.html'),
        'utf8'
      );
      expect(content).toContain('INV-001');
      expect(content).toContain('Zero-Padding Preserved');
      expect(content).toContain('incrementInvoiceNumber');
      expect(content).toContain('padStart');
    });
  });

  describe('3. Main Blog Hub (/blog) Integration', () => {
    const blogHubFile = path.join(distDir, 'blog/index.html');

    it('blog hub exists in dist/blog/index.html', () => {
      expect(fs.existsSync(blogHubFile)).toBe(true);
    });

    it('displays links to all 4 full deep-dive articles', () => {
      const content = fs.readFileSync(blogHubFile, 'utf8');
      expect(content).toContain('href="/blog/how-to-write-an-invoice-for-freelance-work"');
      expect(content).toContain('href="/blog/what-is-a-pro-forma-invoice"');
      expect(content).toContain('href="/blog/invoice-vs-receipt"');
      expect(content).toContain('href="/blog/how-to-number-invoices"');
    });

    it('presents the 12 article outlines with their primary keywords and unique value', () => {
      const content = fs.readFileSync(blogHubFile, 'utf8');
      for (const article of BLOG_ARTICLES) {
        expect(content).toContain(article.primaryKeyword);
        const htmlEncodedLabel = article.differentiator.label.replace(/&/g, '&amp;');
        expect(content).toContain(htmlEncodedLabel);
      }
    });
  });
});
