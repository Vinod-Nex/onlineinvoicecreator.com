import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { ToolPageData } from '../src/types/page';

function countWords(text: string): number {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 0).length;
}

function extractFirstSentence(text: string): string {
  const match = text.trim().match(/^([^.!?]+[.!?])/);
  return match ? match[1].trim() : text.trim();
}

describe('Phase 25: FAQ Content & Direct Answers Audit', () => {
  const pagesDir = path.resolve(__dirname, '../src/data/pages');
  const astroPagesDir = path.resolve(__dirname, '../src/pages');

  const toolSlugs = [
    'index',
    'free-online-receipt-generator',
    'free-rent-receipt-generator',
    'receipt-maker-with-items',
    'invoice-generator-for-freelancers',
    'invoice-generator-excel',
    'contractor-invoice-template',
    'photography-invoice-generator',
    'tax-invoice-template-australia',
  ];

  const utilityPages = ['about.astro', 'contact.astro', 'privacy.astro', 'terms.astro'];

  describe('Tool Page FAQs (src/data/pages/*.json)', () => {
    toolSlugs.forEach((slug) => {
      describe(`Page: ${slug}.json`, () => {
        const filePath = path.join(pagesDir, `${slug}.json`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ToolPageData;

        it('contains exactly 5 to 6 FAQs', () => {
          expect(data.faq).toBeDefined();
          expect(Array.isArray(data.faq.items)).toBe(true);
          expect(data.faq.items.length).toBeGreaterThanOrEqual(5);
          expect(data.faq.items.length).toBeLessThanOrEqual(6);
        });

        it('each FAQ answer is strictly between 40 and 70 words', () => {
          data.faq.items.forEach((faq, index) => {
            const wordCount = countWords(faq.answer);
            expect(
              wordCount,
              `FAQ #${index + 1} ("${faq.question}") has ${wordCount} words, outside 40-70 limit: "${faq.answer}"`
            ).toBeGreaterThanOrEqual(40);
            expect(
              wordCount,
              `FAQ #${index + 1} ("${faq.question}") has ${wordCount} words, outside 40-70 limit: "${faq.answer}"`
            ).toBeLessThanOrEqual(70);
          });
        });

        it('the first sentence of each answer directly addresses the question', () => {
          data.faq.items.forEach((faq, index) => {
            const firstSentence = extractFirstSentence(faq.answer);
            expect(firstSentence.length, `FAQ #${index + 1} has empty first sentence`).toBeGreaterThan(15);
            // Check that the first sentence doesn't deflect or waffle
            expect(firstSentence).not.toMatch(/^(it depends|maybe|sometimes|well|to be honest)/i);
          });
        });
      });
    });
  });

  describe('Utility Pages FAQs (about, contact, privacy, terms)', () => {
    utilityPages.forEach((filename) => {
      describe(`Utility page: ${filename}`, () => {
        const filePath = path.join(astroPagesDir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract FAQ array from frontmatter using regex
        const faqRegex = /(?:const\s+\w+Faqs\s*=\s*)(\[\s*\{[\s\S]*?\}\s*,?\s*\]);/;
        const match = content.match(faqRegex);

        it('defines an array of 5 to 6 FAQs in frontmatter', () => {
          expect(match, `Could not find FAQs array in ${filename}`).toBeTruthy();
          if (match) {
            // Evaluate the JSON-like array
            const faqs = eval(match[1]) as Array<{ question: string; answer: string }>;
            expect(faqs.length).toBeGreaterThanOrEqual(5);
            expect(faqs.length).toBeLessThanOrEqual(6);
          }
        });

        it('each utility page FAQ answer is between 40 and 70 words', () => {
          if (match) {
            const faqs = eval(match[1]) as Array<{ question: string; answer: string }>;
            faqs.forEach((faq, index) => {
              const wordCount = countWords(faq.answer);
              expect(
                wordCount,
                `Utility FAQ #${index + 1} in ${filename} ("${faq.question}") has ${wordCount} words, outside 40-70 limit`
              ).toBeGreaterThanOrEqual(40);
              expect(
                wordCount,
                `Utility FAQ #${index + 1} in ${filename} ("${faq.question}") has ${wordCount} words, outside 40-70 limit`
              ).toBeLessThanOrEqual(70);
            });
          }
        });

        it('renders the FAQ section visibly in the page template', () => {
          expect(content).toContain('Frequently Asked Questions');
          // Must render visibly with article or cards, NOT collapsed details
          expect(content).toMatch(/<article[^>]*>/);
        });
      });
    });
  });

  describe('Core Questions Coverage Across Platform', () => {
    // Collect all questions across all 9 tool pages and 4 utility pages
    const allQuestions: string[] = [];

    toolSlugs.forEach((slug) => {
      const data = JSON.parse(
        fs.readFileSync(path.join(pagesDir, `${slug}.json`), 'utf-8')
      ) as ToolPageData;
      data.faq.items.forEach((item) => allQuestions.push(item.question.toLowerCase()));
    });

    utilityPages.forEach((filename) => {
      const content = fs.readFileSync(path.join(astroPagesDir, filename), 'utf-8');
      const faqRegex = /(?:const\s+\w+Faqs\s*=\s*)(\[\s*\{[\s\S]*?\}\s*,?\s*\]);/;
      const match = content.match(faqRegex);
      if (match) {
        const faqs = eval(match[1]) as Array<{ question: string; answer: string }>;
        faqs.forEach((item) => allQuestions.push(item.question.toLowerCase()));
      }
    });

    it('covers: "what must an invoice include"', () => {
      const matched = allQuestions.some(
        (q) => q.includes('must an invoice include') || q.includes('what must') || q.includes('must be included')
      );
      expect(matched).toBe(true);
    });

    it('covers: "is it free"', () => {
      const matched = allQuestions.some(
        (q) => q.includes('free') && (q.includes('is') || q.includes('truly') || q.includes('cost'))
      );
      expect(matched).toBe(true);
    });

    it('covers: "is it legally valid"', () => {
      const matched = allQuestions.some(
        (q) => q.includes('legally valid') || q.includes('legally binding') || q.includes('legal validity')
      );
      expect(matched).toBe(true);
    });

    it('covers: "do you store my data"', () => {
      const matched = allQuestions.some(
        (q) => q.includes('store my data') || q.includes('save my data') || q.includes('where is my data')
      );
      expect(matched).toBe(true);
    });

    it('covers: "can I add a logo"', () => {
      const matched = allQuestions.some(
        (q) => q.includes('add a logo') || q.includes('company logo') || q.includes('upload')
      );
      expect(matched).toBe(true);
    });

    it('covers: "what is the difference between an invoice and a receipt"', () => {
      const matched = allQuestions.some(
        (q) =>
          (q.includes('difference') || q.includes('versus') || q.includes('vs')) &&
          q.includes('invoice') &&
          q.includes('receipt')
      );
      expect(matched).toBe(true);
    });
  });

  describe('Visible Rendering (No hidden details/accordion or display:none)', () => {
    it('ToolPage.astro renders FAQs inside visible <article> elements, not collapsed <details>', () => {
      const toolPageContent = fs.readFileSync(
        path.resolve(__dirname, '../src/layouts/ToolPage.astro'),
        'utf-8'
      );
      // Ensure <article> is used for FAQ cards
      expect(toolPageContent).toContain('<article class="p-5 sm:p-6 rounded-2xl bg-surface-card');
      // Ensure <details> is NOT used for the FAQ items
      expect(toolPageContent).not.toMatch(/<details[\s\S]*?\{faq\.question\}/);
    });
  });
});
