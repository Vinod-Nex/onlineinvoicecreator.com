import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 39: Ads and Revenue Readiness', () => {
  const rootDir = path.resolve(__dirname, '..');
  const adsTxtPath = path.resolve(rootDir, 'public/ads.txt');
  const adSlotPath = path.resolve(rootDir, 'src/components/AdSlot.astro');
  const consentBannerPath = path.resolve(rootDir, 'src/components/ConsentBanner.astro');
  const affiliatePartnersPath = path.resolve(rootDir, 'src/components/AffiliatePartners.astro');
  const baseLayoutPath = path.resolve(rootDir, 'src/layouts/BaseLayout.astro');
  const toolPagePath = path.resolve(rootDir, 'src/layouts/ToolPage.astro');
  const blogLayoutPath = path.resolve(rootDir, 'src/layouts/BlogArticleLayout.astro');

  const invoiceFormPath = path.resolve(rootDir, 'src/components/InvoiceForm.astro');
  const receiptFormPath = path.resolve(rootDir, 'src/components/ReceiptForm.astro');
  const rentReceiptFormPath = path.resolve(rootDir, 'src/components/RentReceiptForm.astro');

  it('1. public/ads.txt exists and contains valid AdSense configuration', () => {
    expect(fs.existsSync(adsTxtPath)).toBe(true);
    const content = fs.readFileSync(adsTxtPath, 'utf8');

    // Google AdSense direct entry
    expect(content).toContain('google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0');
    expect(content).toContain('https://onlineinvoicecreator.com');
    expect(content).toContain('IAB Tech Lab Authorized Digital Sellers');
  });

  it('2. AdSlot.astro enforces reserved dimensions (zero CLS) and lazy loads only after interaction', () => {
    expect(fs.existsSync(adSlotPath)).toBe(true);
    const content = fs.readFileSync(adSlotPath, 'utf8');

    // Strict containment & reserved height
    expect(content).toContain('contain: layout paint style;');
    expect(content).toContain('min-h-[100px]');
    expect(content).toContain('min-h-[250px]');
    expect(content).toContain('min-h-[90px]');

    // Clear advertisement disclosure label
    expect(content).toMatch(/Advertisement/i);

    // User interaction gating
    expect(content).toContain('pointerdown');
    expect(content).toContain('scroll');
    expect(content).toContain('touchstart');

    // IntersectionObserver for viewport lazy-loading
    expect(content).toContain('IntersectionObserver');
    expect(content).toContain('rootMargin');

    // Idle scheduling & event dispatch
    expect(content).toContain('requestIdleCallback');
    expect(content).toContain('loadAdScripts');
    expect(content).toContain('oic:ad-slot-ready');
  });

  it('3. Form components contain ZERO ads (clean, distraction-free tool canvas)', () => {
    const invoiceForm = fs.readFileSync(invoiceFormPath, 'utf8');
    const receiptForm = fs.readFileSync(receiptFormPath, 'utf8');
    const rentReceiptForm = fs.readFileSync(rentReceiptFormPath, 'utf8');

    // Form markup must not import or contain AdSlot or advertisement banners
    expect(invoiceForm).not.toContain('<AdSlot');
    expect(invoiceForm).not.toContain('data-ad-slot');
    expect(invoiceForm).not.toContain('class="ad-slot-container"');

    expect(receiptForm).not.toContain('<AdSlot');
    expect(receiptForm).not.toContain('data-ad-slot');

    expect(rentReceiptForm).not.toContain('<AdSlot');
    expect(rentReceiptForm).not.toContain('data-ad-slot');
  });

  it('4. ToolPage layout positions ad slots strictly below the tool canvas and never covers download buttons', () => {
    const toolPageContent = fs.readFileSync(toolPagePath, 'utf8');

    // Tool canvas appears in <main>
    const mainIndex = toolPageContent.indexOf('<main class="w-full bg-canvas">');
    const adSlotIndex = toolPageContent.indexOf('<AdSlot');

    expect(mainIndex).toBeGreaterThan(-1);
    expect(adSlotIndex).toBeGreaterThan(-1);

    // Ad slot MUST be positioned after/below the main interactive tool canvas
    expect(adSlotIndex).toBeGreaterThan(mainIndex);
  });

  it('5. ConsentBanner.astro exists, targets only EU/EEA/UK, and integrates into BaseLayout', () => {
    expect(fs.existsSync(consentBannerPath)).toBe(true);
    const bannerContent = fs.readFileSync(consentBannerPath, 'utf8');

    // Checks jurisdiction heuristics (EU/EEA/UK timezones)
    expect(bannerContent).toContain('Europe/');
    expect(bannerContent).toContain('oic_consent_status');
    expect(bannerContent).toContain('not_required');
    expect(bannerContent).toContain('granted');
    expect(bannerContent).toContain('denied');

    // User controls
    expect(bannerContent).toContain('Essential Only');
    expect(bannerContent).toContain('Accept All');
    expect(bannerContent).toContain('/privacy');

    // Integrated in BaseLayout before closing body
    const baseLayoutContent = fs.readFileSync(baseLayoutPath, 'utf8');
    expect(baseLayoutContent).toContain(
      "import ConsentBanner from '../components/ConsentBanner.astro';"
    );
    expect(baseLayoutContent).toContain('<ConsentBanner />');
  });

  it('6. AffiliatePartners.astro provides clearly labelled accounting software placeholders with rel="noopener sponsored"', () => {
    expect(fs.existsSync(affiliatePartnersPath)).toBe(true);
    const affiliateContent = fs.readFileSync(affiliatePartnersPath, 'utf8');

    // Prominent labelling & FTC disclosure
    expect(affiliateContent).toContain('Sponsored Recommendations');
    expect(affiliateContent).toContain('Affiliate Partners');
    expect(affiliateContent).toContain('Transparency Disclosure:');
    expect(affiliateContent).toContain('rel="noopener sponsored"');

    // Accounting partners
    expect(affiliateContent).toContain('FreshBooks');
    expect(affiliateContent).toContain('QuickBooks Online');
    expect(affiliateContent).toContain('Xero');
    expect(affiliateContent).toContain('TurboTenant');

    // Contextual configurations
    expect(affiliateContent).toContain('australia:');
    expect(affiliateContent).toContain('contractor:');
    expect(affiliateContent).toContain('freelance:');
    expect(affiliateContent).toContain('excel:');
    expect(affiliateContent).toContain('landlord:');
  });

  it('7. AffiliatePartners is rendered in ToolPage and BlogArticleLayout on relevant pages', () => {
    const toolPageContent = fs.readFileSync(toolPagePath, 'utf8');
    expect(toolPageContent).toContain(
      "import AffiliatePartners from '../components/AffiliatePartners.astro';"
    );
    expect(toolPageContent).toContain('<AffiliatePartners context={affiliateContext} />');

    const blogLayoutContent = fs.readFileSync(blogLayoutPath, 'utf8');
    expect(blogLayoutContent).toContain(
      "import AffiliatePartners from '../components/AffiliatePartners.astro';"
    );
    expect(blogLayoutContent).toContain('<AffiliatePartners context="general" />');
  });
});
