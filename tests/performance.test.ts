import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Phase 16: Performance and Build Audit', () => {
  const distDir = path.resolve(__dirname, '../dist');

  beforeAll(() => {
    // Ensure dist exists; if not, build it
    if (!fs.existsSync(distDir)) {
      execSync('npm run build', { stdio: 'pipe' });
    }
  });

  function getAllHtmlFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(getAllHtmlFiles(fullPath));
      } else if (file.endsWith('.html')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('builds all 14 site pages into dist', () => {
    const htmlFiles = getAllHtmlFiles(distDir);
    expect(htmlFiles.length).toBeGreaterThanOrEqual(14);
  });

  it('inlines critical CSS across all pages (no render-blocking external stylesheet)', () => {
    const htmlFiles = getAllHtmlFiles(distDir);
    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      // Must contain inline <style> block
      expect(content).toMatch(/<style[^>]*>[\s\S]+?<\/style>/i);
      // Must NOT contain external render-blocking .css link
      const externalCssLinks = [...content.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi)];
      expect(externalCssLinks.length).toBe(0);
    }
  });

  it('preloads the main font (inter-variable.woff2) in the head of every page', () => {
    const htmlFiles = getAllHtmlFiles(distDir);
    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toMatch(
        /<link[^>]+rel=["']preload["'][^>]+href=["']\/fonts\/inter-variable\.woff2["'][^>]+as=["']font["'][^>]+type=["']font\/woff2["']/i
      );
    }
  });

  it('has explicit width and height on every <img> tag to prevent CLS', () => {
    const htmlFiles = getAllHtmlFiles(distDir);
    let totalImages = 0;
    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const imgTags = [...content.matchAll(/<img[^>]*>/gi)].map((m) => m[0]);
      for (const tag of imgTags) {
        totalImages++;
        expect(tag).toMatch(/width=["']?\d+/i);
        expect(tag).toMatch(/height=["']?\d+/i);
      }
    }
    expect(totalImages).toBeGreaterThan(0);
  });

  it('confirms the PDF and canvas libraries (jspdf, html2canvas) are NEVER in the initial bundle', () => {
    const htmlFiles = getAllHtmlFiles(distDir);
    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const initialScriptHrefs = [
        ...content.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi),
      ].map((m) => m[1]);

      for (const src of initialScriptHrefs) {
        const fullPath = path.join(distDir, src.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          const code = fs.readFileSync(fullPath, 'utf8');
          expect(code).not.toContain('jsPDF');
          expect(code).not.toContain('html2canvas');
          expect(src).not.toContain('jspdf');
          expect(src).not.toContain('html2canvas');
        }
      }
    }
  });

  it('enforces JS budget: < 60 KB on content pages and < 150 KB on tool pages before lazy loading', () => {
    const htmlFiles = getAllHtmlFiles(distDir);
    const contentRoutes = ['/about', '/contact', '/privacy', '/terms', '/style-guide'];

    for (const file of htmlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const scripts = [...content.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(
        (m) => m[1]
      );
      const inlineScripts = [
        ...content.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi),
      ].map((m) => m[1]);

      let totalJsBytes = 0;
      for (const s of scripts) {
        const assetPath = path.join(distDir, s.replace(/^\//, ''));
        if (fs.existsSync(assetPath)) {
          totalJsBytes += fs.statSync(assetPath).size;
        }
      }
      for (const inlineCode of inlineScripts) {
        totalJsBytes += Buffer.byteLength(inlineCode, 'utf8');
      }

      const totalJsKb = totalJsBytes / 1024;
      const route = file.replace(distDir, '').replace('/index.html', '') || '/';
      const isContentPage = contentRoutes.includes(route);

      if (isContentPage) {
        // Must be under 60 KB on content pages
        expect(totalJsKb).toBeLessThan(60);
      } else {
        // Must be under 150 KB on tool pages
        expect(totalJsKb).toBeLessThan(150);
      }
    }
  });

  it('verifies astro:assets generates AVIF and WebP optimized formats', () => {
    const aboutHtml = fs.readFileSync(path.join(distDir, 'about/index.html'), 'utf8');
    expect(aboutHtml).toContain('type="image/avif"');
    expect(aboutHtml).toContain('type="image/webp"');
    expect(aboutHtml).toContain('loading="lazy"');
    expect(aboutHtml).toContain('decoding="async"');
  });
});
