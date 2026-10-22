import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 30: Core Web Vitals & Ad Space Containment', () => {
  const adSlotPath = path.resolve(__dirname, '../src/components/AdSlot.astro');
  const toolPagePath = path.resolve(__dirname, '../src/layouts/ToolPage.astro');
  const docsReportPath = path.resolve(__dirname, '../docs/cwv-audit-report.json');
  const distReportPath = path.resolve(__dirname, '../dist/cwv-audit-report.json');
  const cwvReportPath = fs.existsSync(docsReportPath) ? docsReportPath : distReportPath;

  it('AdSlot component exists and enforces strict CSS layout containment to prevent CLS', () => {
    expect(fs.existsSync(adSlotPath)).toBe(true);
    const content = fs.readFileSync(adSlotPath, 'utf8');

    // Strict containment rule
    expect(content).toContain('contain: layout paint style;');

    // Explicit format dimension classes to reserve space before rendering
    expect(content).toContain('min-h-[100px]');
    expect(content).toContain('min-h-[250px]');
    expect(content).toContain('min-h-[90px]');
  });

  it('AdSlot defers ad network script execution until after tool interactivity and idle time', () => {
    const content = fs.readFileSync(adSlotPath, 'utf8');

    // Asserts deferred loading via requestIdleCallback / load event
    expect(content).toContain('requestIdleCallback');
    expect(content).toContain('loadAdScripts');
    expect(content).toContain('oic:ad-slot-ready');
  });

  it('ToolPage layout integrates AdSlot below the interactive canvas with responsive formatting', () => {
    expect(fs.existsSync(toolPagePath)).toBe(true);
    const content = fs.readFileSync(toolPagePath, 'utf8');

    expect(content).toContain("import AdSlot from '../components/AdSlot.astro';");
    expect(content).toContain('<AdSlot');
    expect(content).toContain('format="responsive"');
  });

  it('dist/cwv-audit-report.json validates all 5 key mobile routes meet strict CWV thresholds', () => {
    expect(fs.existsSync(cwvReportPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(cwvReportPath, 'utf8'));

    expect(report.allPassed).toBe(true);
    expect(report.results).toHaveLength(5);

    const expectedRoutes = [
      '/',
      '/contractor-invoice-template',
      '/free-online-receipt-generator',
      '/free-rent-receipt-generator',
      '/invoice-generator-for-freelancers',
    ];

    for (const expectedRoute of expectedRoutes) {
      const pageResult = report.results.find((r: any) => r.path === expectedRoute);
      expect(pageResult).toBeDefined();

      // Core Web Vitals Budgets:
      // LCP <= 2.0s (2000ms)
      expect(pageResult.lcp).toBeLessThanOrEqual(2000);
      expect(pageResult.lcpPass).toBe(true);

      // CLS <= 0.05
      expect(pageResult.cls).toBeLessThanOrEqual(0.05);
      expect(pageResult.clsPass).toBe(true);

      // TBT <= 150ms
      expect(pageResult.tbt).toBeLessThanOrEqual(150);
      expect(pageResult.tbtPass).toBe(true);

      // Lighthouse Performance Score >= 90
      expect(pageResult.perfScore).toBeGreaterThanOrEqual(90);
    }
  });
});
