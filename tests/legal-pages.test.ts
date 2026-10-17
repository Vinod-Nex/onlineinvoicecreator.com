import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 15: Legal & Trust Pages Verification', () => {
  const pagesDir = path.resolve(__dirname, '../src/pages');

  it('has all four legal and trust pages in src/pages', () => {
    const requiredFiles = ['about.astro', 'contact.astro', 'privacy.astro', 'terms.astro'];
    requiredFiles.forEach((file) => {
      const exists = fs.existsSync(path.join(pagesDir, file));
      expect(exists).toBe(true);
    });
  });

  describe('/privacy page content requirements', () => {
    const privacyContent = fs.readFileSync(path.join(pagesDir, 'privacy.astro'), 'utf-8');

    it('states that processing happens in the browser with zero server uploads', () => {
      expect(privacyContent).toMatch(/in your browser|in the browser|client-side/i);
      expect(privacyContent).toMatch(/zero server uploads|nothing is uploaded/i);
    });

    it('details what localStorage holds and how users can clear it', () => {
      expect(privacyContent).toMatch(/localStorage/i);
      expect(privacyContent).toMatch(/Business Details|Business Profile/i);
      expect(privacyContent).toMatch(/Client Details/i);
      expect(privacyContent).toMatch(/Active Draft/i);
      expect(privacyContent).toMatch(/Logo/i);
      expect(privacyContent).toMatch(/Clear my data/i);
    });

    it('details what analytics and ads collect', () => {
      expect(privacyContent).toMatch(/analytics/i);
      expect(privacyContent).toMatch(/advertising|ads/i);
      expect(privacyContent).toMatch(
        /NEVER record, inspect, or log your invoice amounts|never collect/i
      );
    });

    it('details cookie use and categories', () => {
      expect(privacyContent).toMatch(/cookie/i);
      expect(privacyContent).toMatch(/Essential \/ Functional/i);
      expect(privacyContent).toMatch(/Performance/i);
    });
  });

  describe('/contact page content and form requirements', () => {
    const contactContent = fs.readFileSync(path.join(pagesDir, 'contact.astro'), 'utf-8');

    it('includes a contact form posting to Cloudflare Worker endpoint', () => {
      expect(contactContent).toMatch(/<form[^>]+action="\/api\/contact"/i);
      expect(contactContent).toMatch(/method="POST"/i);
    });

    it('includes Cloudflare Turnstile spam protection container', () => {
      expect(contactContent).toMatch(/class="cf-turnstile"/i);
      expect(contactContent).toMatch(/data-sitekey/i);
      expect(contactContent).toMatch(/challenges\.cloudflare\.com\/turnstile/i);
    });

    it('includes a direct mailto fallback link', () => {
      expect(contactContent).toMatch(/mailto:support@onlineinvoicecreator\.com/i);
    });
  });

  describe('/terms page content requirements', () => {
    const termsContent = fs.readFileSync(path.join(pagesDir, 'terms.astro'), 'utf-8');

    it('states that tools are strictly for genuine business documents', () => {
      expect(termsContent).toMatch(
        /genuine.*business documents|genuine, lawful business documents/i
      );
    });

    it('prohibits fraudulent invoicing, fake tax numbers, and fictitious rent receipts', () => {
      expect(termsContent).toMatch(/fraudulent/i);
      expect(termsContent).toMatch(/tax evasion|fake tax/i);
      expect(termsContent).toMatch(/rent receipt/i);
    });

    it('contains the mandatory legal disclaimer line', () => {
      expect(termsContent).toContain(
        'General information, not legal or tax advice. Check your local rules.'
      );
    });
  });

  describe('/about page content requirements', () => {
    const aboutContent = fs.readFileSync(path.join(pagesDir, 'about.astro'), 'utf-8');

    it('explains the mission, anti-paywall philosophy, and client-side technology', () => {
      expect(aboutContent).toMatch(/Built for Speed, Privacy/i);
      expect(aboutContent).toMatch(/paywall/i);
      expect(aboutContent).toMatch(/watermark/i);
      expect(aboutContent).toMatch(/client-side/i);
    });
  });
});
