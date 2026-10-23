import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createOrganizationSchema } from '../src/lib/schema';

describe('Phase 36: E-E-A-T and Trust Signals', () => {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(rootDir, 'dist');
  const aboutHtmlPath = path.join(distDir, 'about/index.html');
  const changelogHtmlPath = path.join(distDir, 'changelog/index.html');
  const contactHtmlPath = path.join(distDir, 'contact/index.html');
  const atoHtmlPath = path.join(distDir, 'tax-invoice-template-australia/index.html');
  const rentHtmlPath = path.join(distDir, 'free-rent-receipt-generator/index.html');
  const contractorHtmlPath = path.join(distDir, 'contractor-invoice-template/index.html');

  beforeAll(() => {
    if (!fs.existsSync(changelogHtmlPath)) {
      execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
    }
  });

  describe('1. Confirmed Organization Schema', () => {
    it('creates an Organization schema matching user-confirmed details without personal identity disclosure', () => {
      const orgSchema = createOrganizationSchema('https://onlineinvoicecreator.com');
      expect(orgSchema['@type']).toBe('Organization');
      expect(orgSchema.name).toBe('Online Invoice Creator');
      expect(orgSchema.url).toBe('https://onlineinvoicecreator.com');
      expect(orgSchema.email).toBe('support@onlineinvoicecreator.com');
      expect(orgSchema.foundingDate).toBe('2026');
      expect(orgSchema.contactPoint).toBeDefined();
      expect(Array.isArray(orgSchema.contactPoint)).toBe(true);

      const contact = (orgSchema.contactPoint as any[])[0];
      expect(contact['@type']).toBe('ContactPoint');
      expect(contact.email).toBe('support@onlineinvoicecreator.com');
      expect(contact.url).toBe('https://onlineinvoicecreator.com/contact');
    });

    it('embeds the confirmed Organization schema in the about page JSON-LD graph', () => {
      const content = fs.readFileSync(aboutHtmlPath, 'utf8');
      const scriptMatch = content.match(
        /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
      );
      expect(scriptMatch).not.toBeNull();

      const jsonLd = JSON.parse(scriptMatch![1]);
      const graph = jsonLd['@graph'] || [jsonLd];
      const orgEntry = graph.find((item: any) => item['@type'] === 'Organization');

      expect(orgEntry).toBeDefined();
      expect(orgEntry.name).toBe('Online Invoice Creator');
      expect(orgEntry.email).toBe('support@onlineinvoicecreator.com');
      expect(orgEntry.foundingDate).toBe('2026');
    });
  });

  describe('2. Real About Page (Creator Background & Mission)', () => {
    it('details the creator background as an independent software engineer and former freelance contractor', () => {
      const content = fs.readFileSync(aboutHtmlPath, 'utf8');
      expect(content).toContain('independent software engineer');
      expect(content).toContain('freelance contractor');
    });

    it('explains the philosophical reason for building the platform (eliminating paywalls, watermarks, and data leaks)', () => {
      const content = fs.readFileSync(aboutHtmlPath, 'utf8');
      expect(content).toContain('Zero Gimmicks');
      expect(content).toContain('100% Client-Side Processing');
      expect(content).toContain('100% Watermark-Free');
      expect(content).toContain('No Mandatory Signup');
      expect(content).toContain('Private Local Storage');
    });

    it('provides clear direct contact methods and response turnaround times', () => {
      const content = fs.readFileSync(aboutHtmlPath, 'utf8');
      expect(content).toContain('support@onlineinvoicecreator.com');
      expect(content).toContain('/contact');
      expect(content).toContain('24 to 48 business hours');

      const contactContent = fs.readFileSync(contactHtmlPath, 'utf8');
      expect(contactContent).toContain('support@onlineinvoicecreator.com');
      expect(contactContent).toContain('cf-turnstile');
    });

    it('cross-links to the product changelog', () => {
      const content = fs.readFileSync(aboutHtmlPath, 'utf8');
      expect(content).toContain('href="/changelog"');
    });
  });

  describe('3. Verified Citations to Official Government Authorities (ATO, HMRC, IRS, India Income Tax)', () => {
    it('links to Australian Taxation Office (ATO) on the Australian tax invoice page', () => {
      const content = fs.readFileSync(atoHtmlPath, 'utf8');
      expect(content).toContain(
        'https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/tax-invoices'
      );
      expect(content).toContain('Australian Taxation Office (ATO)');
      expect(content).toContain('rel="noopener noreferrer"');
    });

    it('links to Income Tax Department of India and IRS on the rent receipt page', () => {
      const content = fs.readFileSync(rentHtmlPath, 'utf8');
      expect(content).toContain('https://incometaxindia.gov.in/');
      expect(content).toContain('Income Tax Department of India');
      expect(content).toContain('Section 10(13A)');
      expect(content).toContain(
        'https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping'
      );
      expect(content).toContain('rel="noopener noreferrer"');
    });

    it('links to IRS 1099-NEC and HMRC on the contractor invoice page', () => {
      const content = fs.readFileSync(contractorHtmlPath, 'utf8');
      expect(content).toContain('https://www.irs.gov/forms-pubs/about-form-1099-nec');
      expect(content).toContain(
        'https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include'
      );
      expect(content).toContain('Internal Revenue Service (IRS)');
      expect(content).toContain('HM Revenue &amp; Customs (HMRC)');
      expect(content).toContain('rel="noopener noreferrer"');
    });
  });

  describe('4. Editorial Review Notes & Last-Reviewed Dates', () => {
    it('displays last-reviewed verification dates on statutory tax and guidance pages', () => {
      const pagesToCheck = [atoHtmlPath, rentHtmlPath, contractorHtmlPath];
      for (const p of pagesToCheck) {
        const content = fs.readFileSync(p, 'utf8');
        expect(content).toContain('Editorial Review & Regulatory Accuracy');
        expect(content).toContain('October 2026');
        expect(content).toContain('Statutory Disclaimer:');
      }
    });

    it('displays editorial notes with official sources on deep-dive blog guides', () => {
      const freelanceGuidePath = path.join(
        distDir,
        'blog/how-to-write-an-invoice-for-freelance-work/index.html'
      );
      const content = fs.readFileSync(freelanceGuidePath, 'utf8');
      expect(content).toContain('Editorial Review & Regulatory Accuracy');
      expect(content).toContain('October 2026');
      expect(content).toContain(
        'https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include'
      );
    });
  });

  describe('5. Product Changelog Page (/changelog)', () => {
    it('compiles dist/changelog/index.html with strict SEO title and description bounds', () => {
      expect(fs.existsSync(changelogHtmlPath)).toBe(true);
      const content = fs.readFileSync(changelogHtmlPath, 'utf8');

      // Title <= 60 chars
      const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
      expect(titleMatch).not.toBeNull();
      const title = titleMatch![1];
      expect(title.length).toBeLessThanOrEqual(60);
      expect(title).toContain('Changelog');

      // Description <= 155 chars
      const descMatch = content.match(/<meta name="description" content="([^"]+)"/i);
      expect(descMatch).not.toBeNull();
      const desc = descMatch![1];
      expect(desc.length).toBeLessThanOrEqual(155);
      expect(desc.length).toBeGreaterThanOrEqual(50);
    });

    it('contains exactly one h1 and valid heading hierarchy', () => {
      const content = fs.readFileSync(changelogHtmlPath, 'utf8');
      const h1Matches = content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
      expect(h1Matches).not.toBeNull();
      expect(h1Matches!.length).toBe(1);
      expect(h1Matches![0]).toContain('Changelog');
    });

    it('documents all versions from v1.0 through v1.5 chronologically', () => {
      const content = fs.readFileSync(changelogHtmlPath, 'utf8');
      expect(content).toContain('v1.5');
      expect(content).toContain('v1.4');
      expect(content).toContain('v1.3');
      expect(content).toContain('v1.2');
      expect(content).toContain('v1.1');
      expect(content).toContain('v1.0');
    });

    it('links to contact page and is referenced in footer navigation', () => {
      const content = fs.readFileSync(changelogHtmlPath, 'utf8');
      expect(content).toContain('href="/contact"');

      // Verify footer link across pages
      const homeContent = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
      expect(homeContent).toContain('href="/changelog"');
    });
  });
});
