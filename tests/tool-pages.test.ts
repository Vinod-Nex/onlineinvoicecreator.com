import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { ToolPageData } from '../src/types/page';

describe('ToolPage Data Schema & Real Copy Verification (Phase 14)', () => {
  const pagesDir = path.resolve(__dirname, '../src/data/pages');
  const expectedSlugs = [
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

  it('contains all nine pages from the site map in src/data/pages/*.json', () => {
    const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'));
    const slugs = files.map((f) => f.replace('.json', ''));

    expect(slugs.length).toBe(9);
    expectedSlugs.forEach((slug) => {
      expect(slugs).toContain(slug);
    });
  });

  expectedSlugs.forEach((slug) => {
    describe(`Page data verification: ${slug}.json`, () => {
      const filePath = path.join(pagesDir, `${slug}.json`);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as ToolPageData;

      it('has valid top-level metadata and one-sentence intro', () => {
        expect(data.slug).toBe(slug);
        expect(data.metaTitle).toBeTruthy();
        expect(data.metaDescription).toBeTruthy();
        expect(data.h1).toBeTruthy();
        expect(data.intro).toBeTruthy();
        expect(typeof data.intro).toBe('string');
        // Validate tool type is valid
        expect(['invoice', 'receipt', 'rent-receipt']).toContain(data.toolType);
      });

      it('has real copy with NO leftover [TODO: ...] placeholder tags', () => {
        expect(raw).not.toContain('[TODO:');
      });

      it('includes the mandatory legal disclaimer line near legal section', () => {
        const disclaimer = 'General information, not legal or tax advice. Check your local rules.';
        expect(raw).toContain(disclaimer);
        expect(data.whatItMustContain.disclaimer).toBe(disclaimer);
      });

      it('has how-to section with numbered steps', () => {
        expect(data.howTo).toBeDefined();
        expect(data.howTo.title).toBeTruthy();
        expect(Array.isArray(data.howTo.steps)).toBe(true);
        expect(data.howTo.steps.length).toBeGreaterThanOrEqual(3);
        data.howTo.steps.forEach((step, idx) => {
          expect(step.step).toBe(idx + 1);
          expect(step.title).toBeTruthy();
          expect(step.description).toBeTruthy();
        });
      });

      it('has "what this document must contain" section with items', () => {
        expect(data.whatItMustContain).toBeDefined();
        expect(data.whatItMustContain.title).toBeTruthy();
        expect(Array.isArray(data.whatItMustContain.items)).toBe(true);
        expect(data.whatItMustContain.items.length).toBeGreaterThanOrEqual(4);
        data.whatItMustContain.items.forEach((item) => {
          expect(item.title).toBeTruthy();
          expect(item.description).toBeTruthy();
        });
      });

      it('has an example section with realistic breakdown', () => {
        expect(data.example).toBeDefined();
        expect(data.example.title).toBeTruthy();
        expect(data.example.scenario).toBeTruthy();
        expect(data.example.sender.name).toBeTruthy();
        expect(data.example.recipient.name).toBeTruthy();
        expect(data.example.items.length).toBeGreaterThan(0);
        expect(data.example.total).toBeTruthy();
      });

      it('has an FAQ section with Q&A entries', () => {
        expect(data.faq).toBeDefined();
        expect(data.faq.title).toBeTruthy();
        expect(Array.isArray(data.faq.items)).toBe(true);
        expect(data.faq.items.length).toBeGreaterThanOrEqual(3);
        data.faq.items.forEach((faq) => {
          expect(faq.question).toBeTruthy();
          expect(faq.answer).toBeTruthy();
        });
      });

      it('has related tools pointing to valid paths', () => {
        expect(data.relatedTools).toBeDefined();
        expect(data.relatedTools.title).toBeTruthy();
        expect(Array.isArray(data.relatedTools.items)).toBe(true);
        expect(data.relatedTools.items.length).toBeGreaterThanOrEqual(2);
        data.relatedTools.items.forEach((tool) => {
          expect(tool.title).toBeTruthy();
          expect(tool.href).toMatch(/^\//);
        });
      });
    });
  });

  describe('Specific Phase 14 Content Checks', () => {
    it('covers ABN, "Tax invoice" and GST on the Australian page in line with ATO guidance', () => {
      const filePath = path.join(pagesDir, 'tax-invoice-template-australia.json');
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as ToolPageData;

      expect(raw).toContain('ABN');
      expect(raw).toContain('Tax invoice');
      expect(raw).toContain('GST');
      expect(raw).toContain('ATO');
      expect(raw).toContain('[Verify with official source:');

      // Check specific items in checklist
      const itemTitles = data.whatItMustContain.items.map((i) => i.title);
      expect(itemTitles.some((t) => t.includes('Tax invoice'))).toBe(true);
      expect(itemTitles.some((t) => t.includes('ABN'))).toBe(true);
      expect(itemTitles.some((t) => t.includes('GST'))).toBe(true);
    });

    it('covers what a landlord should record on the rent receipt page', () => {
      const filePath = path.join(pagesDir, 'free-rent-receipt-generator.json');
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as ToolPageData;

      expect(data.whatItMustContain.title).toContain('Landlord Must Record');
      const itemTitles = data.whatItMustContain.items.map((i) => i.title.toLowerCase());
      expect(itemTitles.some((t) => t.includes('tenant'))).toBe(true);
      expect(itemTitles.some((t) => t.includes('landlord'))).toBe(true);
      expect(itemTitles.some((t) => t.includes('address'))).toBe(true);
      expect(itemTitles.some((t) => t.includes('rental period'))).toBe(true);
      expect(itemTitles.some((t) => t.includes('payment date'))).toBe(true);
      expect(itemTitles.some((t) => t.includes('signature'))).toBe(true);
      expect(raw).toContain('[Verify with official source:');
    });
  });
});
