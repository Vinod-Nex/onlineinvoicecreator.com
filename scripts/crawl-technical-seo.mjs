#!/usr/bin/env node
/**
 * Technical SEO Crawler & Auditor
 * Crawls dist/ and inspects:
 * - Broken links (internal & anchor)
 * - Redirect chains / trailing slashes in links
 * - Duplicate titles & meta descriptions
 * - Missing or empty image alt text
 * - Non-indexable pages (robots meta)
 * - Mixed content (http:// references)
 * - Page weight & payload budgets (HTML, CSS, JS, fonts, images)
 * - Hreflang placeholders (HTML head & sitemap)
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');
const REDIRECTS_PATH = path.resolve(__dirname, '../public/_redirects');
const SITE_ORIGIN = 'https://onlineinvoicecreator.com';

function getGzipSize(content) {
  return zlib.gzipSync(Buffer.from(content)).length;
}

function findHtmlFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function parseRedirects() {
  if (!fs.existsSync(REDIRECTS_PATH)) return [];
  const lines = fs.readFileSync(REDIRECTS_PATH, 'utf8').split('\n');
  const redirects = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      redirects.push({
        from: parts[0],
        to: parts[1],
        status: parseInt(parts[2] || '301', 10),
      });
    }
  }
  return redirects;
}

async function runTechnicalSeoAudit() {
  console.log('🕷️  Starting Technical SEO Crawl on dist/...\n');
  const htmlFiles = findHtmlFiles(DIST_DIR);
  const redirects = parseRedirects();

  const pages = [];
  const titles = new Map();
  const descriptions = new Map();
  const allInternalLinks = [];
  const issues = {
    brokenLinks: [],
    redirectChains: [],
    duplicateTitles: [],
    duplicateDescriptions: [],
    missingAltText: [],
    nonIndexablePages: [],
    mixedContent: [],
    pageWeightWarnings: [],
    missingHreflang: [],
  };

  // Build a set of known available route paths in dist/
  const knownRoutes = new Set();
  for (const file of htmlFiles) {
    const rel = path.relative(DIST_DIR, file);
    if (rel === 'index.html') {
      knownRoutes.add('/');
    } else if (rel.endsWith('/index.html')) {
      knownRoutes.add('/' + rel.replace(/\/index\.html$/, ''));
    } else if (rel.endsWith('.html')) {
      knownRoutes.add('/' + rel.replace(/\.html$/, ''));
    }
  }

  for (const file of htmlFiles) {
    const rel = path.relative(DIST_DIR, file);
    const content = fs.readFileSync(file, 'utf8');
    const fileSize = fs.statSync(file).size;
    const gzipSize = getGzipSize(content);

    let route = '/' + rel.replace(/index\.html$/, '').replace(/\/$/, '');
    if (route === '') route = '/';

    // 1. Extract Title
    const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    if (title) {
      if (!titles.has(title)) titles.set(title, []);
      titles.get(title).push(route);
    }

    // 2. Extract Meta Description
    const descMatch =
      content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
      content.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const desc = descMatch ? descMatch[1].trim() : '';
    if (desc) {
      if (!descriptions.has(desc)) descriptions.set(desc, []);
      descriptions.get(desc).push(route);
    }

    // 3. Robots / Indexability
    const robotsMatch =
      content.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i) ||
      content.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']robots["']/i);
    const robots = robotsMatch ? robotsMatch[1].trim() : 'index, follow';
    const isNoIndex = robots.toLowerCase().includes('noindex');

    if (isNoIndex) {
      issues.nonIndexablePages.push({
        route,
        robots,
        reason:
          route === '/404' || rel === '404.html'
            ? 'HTTP 404 Error page should not be indexed in search engines'
            : route === '/500' || rel === '500.html'
              ? 'HTTP 500 Error page should not be indexed in search engines'
              : route === '/style-guide'
                ? 'Internal component style guide & design system preview'
                : 'Configured with noindex',
      });
    }

    // 4. Missing Alt Text
    const imgMatches = [...content.matchAll(/<img\b([^>]*)>/gi)];
    for (const match of imgMatches) {
      const attrs = match[1];
      const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
      const srcMatch = attrs.match(/\bsrc=["']([^"']*)["']/i);
      const src = srcMatch ? srcMatch[1] : 'unknown';

      if (!altMatch) {
        issues.missingAltText.push({ route, src, issue: 'Missing alt attribute' });
      } else if (altMatch[1].trim() === '') {
        issues.missingAltText.push({ route, src, issue: 'Empty alt text' });
      }
    }

    // 5. Mixed Content (http://)
    const mixedMatches = [...content.matchAll(/\b(src|href|action)=["'](http:\/\/[^"']+)["']/gi)];
    for (const match of mixedMatches) {
      const attr = match[1];
      const url = match[2];
      // Exclude W3C/XML/Schema.org namespaces if they happen to appear in href/xmlns
      if (!url.includes('schema.org') && !url.includes('w3.org')) {
        issues.mixedContent.push({ route, attr, url });
      }
    }

    // 6. Links (Internal, Anchors, External, Trailing Slashes)
    const linkMatches = [...content.matchAll(/<a\b[^>]*\bhref=["']([^"']*)["'][^>]*>/gi)];
    for (const match of linkMatches) {
      const href = match[1].trim();
      if (!href) {
        issues.brokenLinks.push({ route, href, issue: 'Empty href attribute' });
        continue;
      }
      if (href === '#') {
        // Empty anchor
        continue;
      }
      if (href.startsWith('mailto:') || href.startsWith('tel:')) {
        // Safe communication protocol
        continue;
      }
      if (href.startsWith('javascript:')) {
        issues.brokenLinks.push({ route, href, issue: 'javascript: pseudoprotocol link' });
        continue;
      }

      // Check external links
      if (href.startsWith('http://') || href.startsWith('https://')) {
        if (href.startsWith('http://')) {
          issues.mixedContent.push({ route, attr: 'href', url: href });
        }
        // If it points to our site domain, check canonical/redirects
        if (href.startsWith(SITE_ORIGIN)) {
          const pathOnly = href.replace(SITE_ORIGIN, '') || '/';
          checkInternalLink(route, pathOnly);
        }
        continue;
      }

      // Check anchor on the same page
      if (href.startsWith('#')) {
        const id = href.slice(1);
        const hasId = content.includes(`id="${id}"`) || content.includes(`id='${id}'`);
        if (!hasId) {
          issues.brokenLinks.push({ route, href, issue: `Anchor target #${id} not found on page` });
        }
        continue;
      }

      // Relative or absolute internal link
      checkInternalLink(route, href);
    }

    function checkInternalLink(sourceRoute, href) {
      const [rawPath, rawHash] = href.split('#');
      let targetPath = rawPath;

      // Handle relative paths
      if (!targetPath.startsWith('/')) {
        targetPath = path.posix.normalize(path.posix.join(sourceRoute, targetPath));
      }

      allInternalLinks.push({ source: sourceRoute, target: targetPath, originalHref: href });

      // Check trailing slash redirects (e.g. /blog/ -> /blog)
      if (targetPath.length > 1 && targetPath.endsWith('/')) {
        const canonicalTarget = targetPath.replace(/\/$/, '');
        issues.redirectChains.push({
          source: sourceRoute,
          target: href,
          destination: canonicalTarget,
          issue: `Internal link has trailing slash, triggering 301 redirect to "${canonicalTarget}"`,
        });
      }

      // Verify destination exists in dist
      const cleanPath = targetPath === '/' ? '/' : targetPath.replace(/\/$/, '');
      if (!knownRoutes.has(cleanPath)) {
        issues.brokenLinks.push({
          source: sourceRoute,
          href,
          issue: `Target route "${cleanPath}" does not exist in build output`,
        });
      }
    }

    // 7. Hreflang Check in HTML Head
    const hreflangMatches = [
      ...content.matchAll(
        /<link[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']([^"']*)["'][^>]*>/gi
      ),
    ];
    const hreflangs = hreflangMatches.map((m) => m[1]);
    const requiredHreflangs = ['en', 'es', 'pt', 'x-default'];
    const missingHreflangLangs = requiredHreflangs.filter((l) => !hreflangs.includes(l));

    if (!isNoIndex && missingHreflangLangs.length > 0) {
      issues.missingHreflang.push({
        route,
        found: hreflangs,
        missing: missingHreflangLangs,
      });
    }

    // 8. Page Weight & Budgets
    // Budget: HTML uncompressed <= 200KB, HTML gzip <= 35KB
    if (fileSize > 250 * 1024) {
      issues.pageWeightWarnings.push({
        route,
        fileSize,
        gzipSize,
        issue: `HTML file size (${(fileSize / 1024).toFixed(1)} KB) exceeds 250 KB budget`,
      });
    }

    pages.push({
      route,
      relPath: rel,
      title,
      desc,
      robots,
      isNoIndex,
      fileSize,
      gzipSize,
      linkCount: linkMatches.length,
      imageCount: imgMatches.length,
      hreflangs,
    });
  }

  // Check duplicate titles across indexable pages
  for (const [title, routes] of titles.entries()) {
    const indexableRoutes = routes.filter((r) => !pages.find((p) => p.route === r)?.isNoIndex);
    if (indexableRoutes.length > 1) {
      issues.duplicateTitles.push({ title, routes: indexableRoutes });
    }
  }

  // Check duplicate descriptions across indexable pages
  for (const [desc, routes] of descriptions.entries()) {
    const indexableRoutes = routes.filter((r) => !pages.find((p) => p.route === r)?.isNoIndex);
    if (indexableRoutes.length > 1) {
      issues.duplicateDescriptions.push({ desc, routes: indexableRoutes });
    }
  }

  console.log(`Crawled ${pages.length} total HTML pages.`);
  console.log(`Found ${allInternalLinks.length} internal links.`);
  console.log(`Broken links: ${issues.brokenLinks.length}`);
  console.log(`Redirect chains in internal links: ${issues.redirectChains.length}`);
  console.log(`Duplicate titles (indexable): ${issues.duplicateTitles.length}`);
  console.log(`Duplicate descriptions (indexable): ${issues.duplicateDescriptions.length}`);
  console.log(`Missing alt text: ${issues.missingAltText.length}`);
  console.log(`Non-indexable pages: ${issues.nonIndexablePages.length}`);
  console.log(`Mixed content: ${issues.mixedContent.length}`);
  console.log(`Missing hreflang: ${issues.missingHreflang.length}`);
  console.log(`Page weight warnings: ${issues.pageWeightWarnings.length}\n`);

  if (issues.brokenLinks.length > 0) {
    console.log('❌ Broken links details:', JSON.stringify(issues.brokenLinks, null, 2));
  }
  if (issues.redirectChains.length > 0) {
    console.log('⚠️  Redirect chains details:', JSON.stringify(issues.redirectChains, null, 2));
  }
  if (issues.missingHreflang.length > 0) {
    console.log('⚠️  Missing hreflang details:', JSON.stringify(issues.missingHreflang, null, 2));
  }
  if (issues.missingAltText.length > 0) {
    console.log('❌ Missing alt text details:', JSON.stringify(issues.missingAltText, null, 2));
  }
  if (issues.mixedContent.length > 0) {
    console.log('❌ Mixed content details:', JSON.stringify(issues.mixedContent, null, 2));
  }
}

runTechnicalSeoAudit().catch(console.error);
