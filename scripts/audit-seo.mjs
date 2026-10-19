#!/usr/bin/env node

/**
 * Build-time SEO & Metadata Audit Script
 *
 * Enforces SEO requirements on all generated HTML files in `dist/`:
 * 1. Must contain <title> tag
 * 2. Title length must not exceed 60 characters
 * 3. Must contain <meta name="description"> tag
 * 4. Description length must not exceed 155 characters
 * 5. Must contain <link rel="canonical"> tag
 * 6. Must contain at least one <h1> tag
 *
 * Exits with status code 1 if any page fails compliance.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function findHtmlFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Distribution directory not found: ${dir}`);
    console.error('Run `npm run build` before running the SEO audit.');
    process.exit(1);
  }

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

function auditHtmlFile(filePath) {
  const relativePath = path.relative(DIST_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];

  // 1. Title Audit
  const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1].trim() : null;
  const title = rawTitle ? decodeEntities(rawTitle) : null;

  if (!title) {
    errors.push('Missing <title> element');
  } else if (title.length > 60) {
    errors.push(`Title exceeds 60 characters (${title.length} chars): "${title}"`);
  }

  // 2. Meta Description Audit
  const descMatch =
    content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    content.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  const rawDesc = descMatch ? descMatch[1].trim() : null;
  const desc = rawDesc ? decodeEntities(rawDesc) : null;

  if (!desc) {
    errors.push('Missing <meta name="description"> tag');
  } else if (desc.length > 155) {
    errors.push(`Description exceeds 155 characters (${desc.length} chars): "${desc}"`);
  }

  // 3. Canonical URL Audit
  const canonicalMatch =
    content.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
    content.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : null;

  if (!canonical) {
    errors.push('Missing <link rel="canonical"> tag');
  }

  // 4. Heading Structure & Hierarchy Audit
  const headingRegex = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    const text = decodeEntities(
      match[2]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    );
    headings.push({ tag, level: parseInt(tag[1], 10), text });
  }

  const h1s = headings.filter((h) => h.tag === 'h1');
  const h1Text = h1s.length > 0 ? h1s[0].text : null;

  if (h1s.length === 0) {
    errors.push('Missing <h1> heading tag');
  } else if (h1s.length > 1) {
    errors.push(`Page has multiple <h1> tags (${h1s.length} found). Exactly one <h1> is required.`);
  }

  // Primary keyword in H1 check (if page is mapped in keyword-map.json)
  const route = '/' + relativePath.replace(/index\.html$/, '').replace(/\/$/, '');
  const normalizedRoute = route === '' ? '/' : route;
  const keywordMapPath = path.resolve(__dirname, '../src/data/keyword-map.json');

  if (fs.existsSync(keywordMapPath)) {
    try {
      const keywordMap = JSON.parse(fs.readFileSync(keywordMapPath, 'utf8'));
      const mappedPage = keywordMap.pages && keywordMap.pages[normalizedRoute];
      if (mappedPage && mappedPage.primaryKeyword && h1Text) {
        const pk = mappedPage.primaryKeyword.toLowerCase().trim();
        if (!h1Text.toLowerCase().includes(pk)) {
          errors.push(`H1 "${h1Text}" does not contain the assigned primary keyword "${pk}"`);
        }
      }
    } catch {
      // ignore parse errors if keyword-map is unavailable
    }
  }

  // Heading hierarchy: no skipped levels (e.g. H1 -> H3 without H2, H2 -> H4 without H3)
  let prevLevel = 0;
  for (const h of headings) {
    if (prevLevel > 0 && h.level > prevLevel + 1) {
      errors.push(
        `Skipped heading level: jumped from <h${prevLevel}> directly to <h${h.level}> at "${h.text}"`
      );
    }
    prevLevel = h.level;
  }

  // 5. Structured Data (JSON-LD) Audit
  const jsonLdMatches = [
    ...content.matchAll(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi),
  ];

  let hasBreadcrumbs = false;
  let hasOrg = false;
  let hasWebSite = false;
  let hasWebApp = false;
  let hasFaq = false;

  if (jsonLdMatches.length === 0) {
    errors.push('Missing <script type="application/ld+json"> tag');
  } else {
    const entities = [];
    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          entities.push(...parsed['@graph']);
        } else {
          entities.push(parsed);
        }
      } catch (e) {
        errors.push(`Invalid JSON-LD syntax: ${e.message}`);
      }
    }

    const types = entities.map((e) => e['@type']);
    hasBreadcrumbs = types.includes('BreadcrumbList');
    hasOrg = types.includes('Organization');
    hasWebSite = types.includes('WebSite');
    hasWebApp = types.includes('WebApplication');
    hasFaq = types.includes('FAQPage');

    // BreadcrumbList everywhere
    if (!hasBreadcrumbs) {
      errors.push('Missing BreadcrumbList in structured data graph');
    }

    // Home page checks
    const isHomePage = relativePath === 'index.html';
    if (isHomePage) {
      if (!hasOrg) {
        errors.push('Missing Organization in home page structured data');
      }
      if (!hasWebSite) {
        errors.push('Missing WebSite in home page structured data');
      }
    }

    // Tool pages checks
    const isToolPage = [
      'index.html',
      'contractor-invoice-template/index.html',
      'free-online-receipt-generator/index.html',
      'free-rent-receipt-generator/index.html',
      'invoice-generator-excel/index.html',
      'invoice-generator-for-freelancers/index.html',
      'photography-invoice-generator/index.html',
      'receipt-maker-with-items/index.html',
      'tax-invoice-template-australia/index.html',
    ].includes(relativePath);

    if (isToolPage) {
      const webApp = entities.find((e) => e['@type'] === 'WebApplication');
      if (!webApp) {
        errors.push('Missing WebApplication in tool page structured data');
      } else {
        if (webApp.applicationCategory !== 'BusinessApplication') {
          errors.push(
            `WebApplication applicationCategory must be "BusinessApplication", found "${webApp.applicationCategory}"`
          );
        }
        if (webApp.operatingSystem !== 'Any') {
          errors.push(
            `WebApplication operatingSystem must be "Any", found "${webApp.operatingSystem}"`
          );
        }
        if (!webApp.offers || webApp.offers.price !== '0') {
          errors.push('WebApplication must offer free price "0"');
        }
      }

      if (!hasFaq) {
        errors.push('Missing FAQPage in tool page structured data');
      }
    }
  }

  // 6. Open Graph & Social Cards Audit
  const ogImageMatch =
    content.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
    content.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  const ogWidthMatch =
    content.match(/<meta[^>]*property=["']og:image:width["'][^>]*content=["']([^"']+)["']/i) ||
    content.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image:width["']/i);
  const ogHeightMatch =
    content.match(/<meta[^>]*property=["']og:image:height["'][^>]*content=["']([^"']+)["']/i) ||
    content.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image:height["']/i);
  const ogAltMatch =
    content.match(/<meta[^>]*property=["']og:image:alt["'][^>]*content=["']([^"']+)["']/i) ||
    content.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image:alt["']/i);
  const twitterCardMatch =
    content.match(/<meta[^>]*name=["']twitter:card["'][^>]*content=["']([^"']+)["']/i) ||
    content.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:card["']/i);
  const twitterImageMatch =
    content.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
    content.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);

  if (!ogImageMatch) {
    errors.push('Missing <meta property="og:image"> tag');
  } else {
    const ogImgUrl = ogImageMatch[1];
    if (ogWidthMatch && ogWidthMatch[1] !== '1200') {
      errors.push(`og:image:width expected 1200, found "${ogWidthMatch[1]}"`);
    }
    if (ogHeightMatch && ogHeightMatch[1] !== '630') {
      errors.push(`og:image:height expected 630, found "${ogHeightMatch[1]}"`);
    }
    if (!ogAltMatch || !ogAltMatch[1].trim()) {
      errors.push('Missing descriptive <meta property="og:image:alt">');
    }

    // Verify image file exists in dist
    try {
      const parsedUrl = new URL(ogImgUrl, 'https://onlineinvoicecreator.com');
      const localImagePath = path.join(DIST_DIR, parsedUrl.pathname.replace(/^\//, ''));
      if (!fs.existsSync(localImagePath)) {
        errors.push(`Referenced Open Graph image does not exist on disk: ${localImagePath}`);
      }
    } catch {
      // ignore URL parsing errors
    }
  }

  if (!twitterCardMatch || twitterCardMatch[1] !== 'summary_large_image') {
    errors.push('Missing or invalid <meta name="twitter:card" content="summary_large_image">');
  }
  if (!twitterImageMatch) {
    errors.push('Missing <meta name="twitter:image"> tag');
  }

  // 7. Favicon & Web Manifest Audit
  const hasIcon = /<link[^>]*rel=["'](?:shortcut )?icon["']/i.test(content);
  const hasManifest = /<link[^>]*rel=["']manifest["']/i.test(content);

  if (!hasIcon) {
    errors.push('Missing favicon <link rel="icon">');
  }
  if (!hasManifest) {
    errors.push('Missing web manifest <link rel="manifest">');
  }

  // 8. Image Alt Text & Dimension Audit
  const imgMatches = [...content.matchAll(/<img\b([^>]*)>/gi)];
  for (const imgMatch of imgMatches) {
    const attrs = imgMatch[1];
    const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
    const widthMatch = attrs.match(/\bwidth=["']?(\d+)["']?/i);
    const heightMatch = attrs.match(/\bheight=["']?(\d+)["']?/i);

    if (!altMatch) {
      errors.push(`Found <img> missing alt attribute: ${imgMatch[0]}`);
    } else {
      const altValue = altMatch[1].trim().toLowerCase();
      const genericTerms = ['image', 'img', 'photo', 'picture', 'pic', 'logo'];
      // alt shouldn't be only a generic word
      if (genericTerms.includes(altValue)) {
        errors.push(`<img> alt text is too generic ("${altMatch[1]}"). Use descriptive alt text.`);
      }
    }

    if (!widthMatch || !heightMatch) {
      errors.push(`Found <img> missing explicit width or height attributes: ${imgMatch[0]}`);
    }
  }

  return {
    relativePath,
    title,
    titleLen: title ? title.length : 0,
    desc,
    descLen: desc ? desc.length : 0,
    canonical,
    h1Text,
    headingCount: headings.length,
    hasBreadcrumbs,
    hasOrg,
    hasWebSite,
    hasWebApp,
    hasFaq,
    errors,
  };
}

console.log('🔍 Running Build-time SEO & Metadata Audit on dist/...\n');

const htmlFiles = findHtmlFiles(DIST_DIR);
if (htmlFiles.length === 0) {
  console.error('❌ No HTML files found in dist/. Build failed.');
  process.exit(1);
}

let totalViolations = 0;
const auditedPages = [];

for (const file of htmlFiles) {
  const result = auditHtmlFile(file);
  auditedPages.push(result);

  if (result.errors.length > 0) {
    totalViolations += result.errors.length;
    console.error(`❌ /${result.relativePath}:`);
    for (const err of result.errors) {
      console.error(`   • ${err}`);
    }
  } else {
    console.log(
      `✅ /${result.relativePath.padEnd(40)} | Title: ${String(result.titleLen).padStart(2)}/60 | Desc: ${String(result.descLen).padStart(3)}/155 | H1: ✓ | Headings: ✓ | Schema: ✓`
    );
  }
}

console.log('\n--------------------------------------------------------------');
if (totalViolations > 0) {
  console.error(
    `💥 SEO Audit Failed: ${totalViolations} violation(s) found across ${htmlFiles.length} pages.`
  );
  process.exit(1);
} else {
  console.log(
    `🎉 SEO & Structured Data Audit Passed: All ${htmlFiles.length} pages satisfy title (<=60), description (<=155), single H1 with primary keyword, strict heading hierarchy, canonical, and Schema.org JSON-LD requirements.`
  );
  process.exit(0);
}
