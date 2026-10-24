import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseArgs,
  tagQueryOpportunity,
  escapeCsvField,
  generateCsv,
  main as runGscExport,
  MOCK_GSC_ROWS,
} from '../scripts/export-gsc-queries.mjs';

describe('Phase 40: SEO Routine & Monitoring Loop', () => {
  const rootDir = path.resolve(__dirname, '..');
  const routineDocPath = path.resolve(rootDir, 'docs/seo-routine.md');
  const scriptPath = path.resolve(rootDir, 'scripts/export-gsc-queries.mjs');
  const packageJsonPath = path.resolve(rootDir, 'package.json');
  const testOutputPath = path.resolve(rootDir, 'dist/test-gsc-export.csv');

  it('1. docs/seo-routine.md exists and contains complete monitoring and governance routine', () => {
    expect(fs.existsSync(routineDocPath)).toBe(true);
    const content = fs.readFileSync(routineDocPath, 'utf8');

    expect(content.length).toBeGreaterThan(8000);
    expect(content).toContain('SEO Routine, Monitoring Cadence & Content Lifecycle Governance');
    expect(content).toContain('https://onlineinvoicecreator.com');
  });

  it('2. documents weekly Search Console triage (striking distance, low CTR, indexing errors)', () => {
    const content = fs.readFileSync(routineDocPath, 'utf8');

    // Striking Distance
    expect(content).toContain('Position 8.0 to 30.0');
    expect(content).toContain('Striking Distance');
    expect(content).toContain('STRIKING_DISTANCE');

    // Low CTR
    expect(content).toContain('High Impression, Low CTR Pages');
    expect(content).toContain('LOW_CTR_OPPORTUNITY');
    expect(content).toContain('docs/title-testing-matrix.md');

    // Indexing Errors
    expect(content).toContain('GSC Indexing & Coverage Triage');
    expect(content).toContain('Server error (5xx)');
    expect(content).toContain('Not found (404)');
    expect(content).toContain('Soft 404');
    expect(content).toContain("Excluded by 'noindex' tag");
    expect(content).toContain('Crawled - currently not indexed');
  });

  it('3. documents monthly content refresh rules and statutory compliance checks', () => {
    const content = fs.readFileSync(routineDocPath, 'utf8');

    expect(content).toContain('Monthly Content Refresh Rules');
    expect(content).toContain('Legal & Tax Regulation Audit');
    expect(content).toContain('ATO');
    expect(content).toContain('HMRC');
    expect(content).toContain('IRS');
    expect(content).toContain('lastReviewedDate');
    expect(content).toContain('dateModified');
    expect(content).toContain('FAQ Expansion');
    expect(content).toContain('IndexNow');
  });

  it('4. documents quarterly technical audit playbook and automated test commands', () => {
    const content = fs.readFileSync(routineDocPath, 'utf8');

    expect(content).toContain('Quarterly Technical Audit Playbook');
    expect(content).toContain('npm run audit:crawl');
    expect(content).toContain('npm run audit:seo');
    expect(content).toContain('npm run audit:cwv');
    expect(content).toContain('Largest Contentful Paint (LCP)');
    expect(content).toContain('Cumulative Layout Shift (CLS)');
    expect(content).toContain('Rich Results Test');
    expect(content).toContain('public/_headers');
  });

  it('5. contains a comprehensive master keyword tracking sheet with core URLs and intents', () => {
    const content = fs.readFileSync(routineDocPath, 'utf8');

    expect(content).toContain('Master Keyword Tracking Sheet');
    expect(content).toContain(
      '| # | Target URL Path | Primary Target Keyword | Search Intent | Est. Monthly Vol |'
    );
    expect(content).toContain('invoice generator');
    expect(content).toContain('receipt generator');
    expect(content).toContain('rent receipt generator');
    expect(content).toContain('tax invoice template australia');
    expect(content).toContain('contractor invoice template');
    expect(content).toContain('how to write an invoice for freelance work');
    expect(content).toContain('how to number invoices');
  });

  it('6. defines strict content lifecycle governance rules for adding, merging, or deleting pages', () => {
    const content = fs.readFileSync(routineDocPath, 'utf8');

    // Add criteria
    expect(content).toContain('Rule 1: When to ADD a Page');
    expect(content).toContain('Distinct Search Intent');
    expect(content).toContain('Search Demand Threshold');

    // Merge criteria
    expect(content).toContain('Rule 2: When to MERGE a Page');
    expect(content).toContain('Cannibalization Triggers');
    expect(content).toContain('public/_redirects');

    // Delete criteria
    expect(content).toContain('Rule 3: When to DELETE a Page');
    expect(content).toContain('301 Moved Permanently');
    expect(content).toContain('410 Gone');
  });

  it('7. scripts/export-gsc-queries.mjs exists and is registered in package.json', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.scripts['gsc:export']).toBe('node scripts/export-gsc-queries.mjs');
  });

  it('8. export-gsc-queries script parses CLI args, tags opportunities, escapes CSV, and exports data', async () => {
    // CLI Args Parsing
    const parsed = parseArgs(['--output', 'dist/custom.csv', '--days', '90', '--mock']);
    expect(parsed.output).toContain('custom.csv');
    expect(parsed.days).toBe(90);
    expect(parsed.mock).toBe(true);

    // Opportunity Classification
    const striking = tagQueryOpportunity(12.5, 800, 2.1);
    expect(striking.tag).toBe('STRIKING_DISTANCE');

    const lowCtr = tagQueryOpportunity(4.5, 1200, 1.8);
    expect(lowCtr.tag).toBe('LOW_CTR_OPPORTUNITY');

    const topPerformer = tagQueryOpportunity(2.1, 5000, 12.0);
    expect(topPerformer.tag).toBe('TOP_PERFORMER');

    // CSV Escaping
    expect(escapeCsvField('simple text')).toBe('simple text');
    expect(escapeCsvField('text with, comma')).toBe('"text with, comma"');
    expect(escapeCsvField('quote "test"')).toBe('"quote ""test"""');

    // CSV Generation
    const csv = generateCsv(MOCK_GSC_ROWS.slice(0, 3));
    expect(csv).toContain('Query,Page,Clicks,Impressions,CTR,Position,Opportunity_Tag');
    expect(csv).toContain('invoice generator');
    expect(csv).toContain('TOP_PERFORMER');

    // Script execution test (outputs to dist/test-gsc-export.csv)
    process.argv = ['node', 'scripts/export-gsc-queries.mjs', '--output', testOutputPath, '--mock'];
    const result = await runGscExport();

    expect(fs.existsSync(testOutputPath)).toBe(true);
    const exportedFile = fs.readFileSync(testOutputPath, 'utf8');
    expect(exportedFile).toContain('Query,Page,Clicks,Impressions,CTR,Position,Opportunity_Tag');
    expect(result.totalQueries).toBeGreaterThan(20);
    expect(result.strikingDistanceCount).toBeGreaterThan(5);

    // Cleanup test output file
    if (fs.existsSync(testOutputPath)) {
      fs.unlinkSync(testOutputPath);
    }
  });
});
