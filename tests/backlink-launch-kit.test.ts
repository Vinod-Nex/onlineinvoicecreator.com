import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 38: Backlink and Launch Kit (docs/launch.md)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const launchDocPath = path.resolve(rootDir, 'docs/launch.md');

  it('docs/launch.md exists and contains substantial, ready-to-send content', () => {
    expect(fs.existsSync(launchDocPath)).toBe(true);
    const content = fs.readFileSync(launchDocPath, 'utf8');

    expect(content.length).toBeGreaterThan(15000);
    expect(content).toContain('30-Day Launch Kit & Backlink Acquisition Plan');
    expect(content).toContain('https://onlineinvoicecreator.com');
  });

  it('contains a detailed 30-day plan covering all four weeks and closing days', () => {
    const content = fs.readFileSync(launchDocPath, 'utf8');

    // Milestones & Weeks
    expect(content).toContain('Week 1: Foundation & Authority Directories (Days 1–7)');
    expect(content).toContain('Week 2: Product Hunt & Developer Communities (Days 8–14)');
    expect(content).toContain('Week 3: Value-First Forum Answering & Blog Outreach (Days 15–21)');
    expect(content).toContain(
      'Week 4: Embeddable Widget Campaign & Resource Syndication (Days 22–28)'
    );
    expect(content).toContain('Days 29–30: Technical Audit, Indexing & Month 2 Plan');

    // Daily milestones
    expect(content).toContain('Day 1:');
    expect(content).toContain('Day 8: Product Hunt Launch Day');
    expect(content).toContain('Day 15:');
    expect(content).toContain('Day 22:');
    expect(content).toContain('Day 29:');
    expect(content).toContain('Day 30:');
  });

  it('contains ready-to-send directory submission copy for all required platforms', () => {
    const content = fs.readFileSync(launchDocPath, 'utf8');

    // Product Hunt
    expect(content).toContain('### 3.1 Product Hunt');
    expect(content).toContain('Free, private invoice generator. No signup, no watermarks.');
    expect(content).toContain("Maker's First Comment");
    expect(content).toContain('Hey Product Hunt!');

    // AlternativeTo
    expect(content).toContain('### 3.2 AlternativeTo');
    expect(content).toContain('FreshBooks');
    expect(content).toContain('QuickBooks');
    expect(content).toContain('Invoice Simple');
    expect(content).toContain('No Sign-Up or Account Required');

    // SaaSHub
    expect(content).toContain('### 3.3 SaaSHub');
    expect(content).toContain('Free Forever ($0)');
    expect(content).toContain('Competitor Advantages');

    // BetaList
    expect(content).toContain('### 3.4 BetaList');
    expect(content).toContain('Pitch (under 120 characters):');

    // Indie Hackers
    expect(content).toContain('### 3.5 Indie Hackers');
    expect(content).toContain(
      'Show IH: I built an invoice generator that stores zero data on servers'
    );
    expect(content).toContain('Astro (SSG) + Tailwind CSS v4 + TypeScript');
  });

  it('contains subreddit posts with strict community rule compliance notes', () => {
    const content = fs.readFileSync(launchDocPath, 'utf8');

    // r/SideProject
    expect(content).toContain('### 4.1 r/SideProject');
    expect(content).toContain('r/SideProject allows sharing projects you built');

    // r/webdev Showoff Saturday
    expect(content).toContain('### 4.2 r/webdev (Showoff Saturday)');
    expect(content).toContain('[Showoff Saturday]');

    // r/freelance Monthly Thread rule
    expect(content).toContain('### 4.3 r/freelance (Official Monthly Promotion Thread)');
    expect(content).toContain('Monthly Promotion Thread');

    // r/Entrepreneur
    expect(content).toContain('### 4.4 r/Entrepreneur');
    expect(content).toContain('Why most freelancers look amateur when billing clients');

    // r/smallbusiness Weekly Thread rule
    expect(content).toContain('### 4.5 r/smallbusiness (Weekly Sticky Promotion Thread)');
    expect(content).toContain('Weekly Promotion & Networking Megathread');
  });

  it('contains value-first forum answers for Quora and landlord communities', () => {
    const content = fs.readFileSync(launchDocPath, 'utf8');

    // Quora 1: Best free generator
    expect(content).toContain(
      'What is the best free invoice generator with no watermarks and no sign-up?'
    );
    expect(content).toContain('The "Hidden Paywall" Bait-and-Switch');
    expect(content).toContain('Data Privacy & Client Confidentiality');

    // Quora 2: Numbering invoices
    expect(content).toContain('How should I structure and number my invoices as a new freelancer?');
    expect(content).toContain('The Year-Prefix Sequential Format');
    expect(content).toContain('INV-YYYY-XXXX');

    // Landlord forum: Rent receipts
    expect(content).toContain(
      'Do landlords legally have to provide rent receipts? What must be on them?'
    );
    expect(content).toContain('The 7 Essential Fields Every Rent Receipt Must Contain');
    expect(content).toContain('/free-rent-receipt-generator');
  });

  it('contains outreach email templates for freelance and landlord bloggers with follow-ups', () => {
    const content = fs.readFileSync(launchDocPath, 'utf8');

    // Freelance outreach
    expect(content).toContain('### 6.1 Outreach to Freelance & Creator Economy Bloggers');
    expect(content).toContain(
      'Free unbranded invoicing resource for your freelance guide at [Blog Name]'
    );
    expect(content).toContain('Follow-Up Email (4 Days Later)');

    // Landlord outreach
    expect(content).toContain('### 6.2 Outreach to Landlord & Real Estate Management Blogs');
    expect(content).toContain(
      "Free, compliant rent receipt tool for [Blog Name]'s landlord toolkit"
    );
    expect(content).toContain('Re: Free, compliant rent receipt tool for [Blog Name]');
  });

  it('contains the embeddable "invoice number generator" widget with attribution link', () => {
    const content = fs.readFileSync(launchDocPath, 'utf8');

    // Embed code presence
    expect(content).toContain('oic-number-widget');
    expect(content).toContain('Invoice Number Generator');
    expect(content).toContain(
      'Powered by <a href="https://onlineinvoicecreator.com" target="_blank" rel="noopener">Online Invoice Creator</a>'
    );
    expect(content).toContain('navigator.clipboard.writeText');
  });

  it('contains explicit warnings against paid link farms, comment spam, and PBNs', () => {
    const content = fs.readFileSync(launchDocPath, 'utf8');

    expect(content).toContain('## 8. What to Avoid: Black-Hat Tactics & Penalty Safeguards');
    expect(content).toContain('Paid Link Farms & PBNs');
    expect(content).toContain('Automated Comment Spam');
    expect(content).toContain('Keyword-Stuffed Exact Anchors');
    expect(content).toContain('Reciprocal "Link Swaps"');
    expect(content).toContain('Google SpamBrain');
    expect(content).toContain('Penguin');
  });

  it('contains a comprehensive submission tracking table with all required columns and platforms', () => {
    const content = fs.readFileSync(launchDocPath, 'utf8');

    expect(content).toContain('## 9. Master Submission & Outreach Tracking Table');
    expect(content).toContain(
      '| # | Platform / Target | Category | Target URL / Thread | Pitch Date | Status | Live Link / Ref URL | Link Type | Follow-up Date |'
    );

    // Key rows
    expect(content).toContain('Product Hunt');
    expect(content).toContain('AlternativeTo');
    expect(content).toContain('SaaSHub');
    expect(content).toContain('BetaList');
    expect(content).toContain('Indie Hackers');
    expect(content).toContain('r/SideProject');
    expect(content).toContain('r/webdev');
    expect(content).toContain('r/freelance');
    expect(content).toContain('r/Entrepreneur');
    expect(content).toContain('r/smallbusiness');
    expect(content).toContain('Quora: Best Free Invoicing');
    expect(content).toContain('BiggerPockets');
    expect(content).toContain('Freelance Union Blog');
    expect(content).toContain('RentPrep Landlord Hub');
  });
});
