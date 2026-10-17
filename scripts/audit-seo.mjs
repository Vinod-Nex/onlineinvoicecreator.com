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

  // 4. H1 Heading Audit
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Text = h1Match ? decodeEntities(h1Match[1].replace(/<[^>]+>/g, '')) : null;

  if (!h1Text) {
    errors.push('Missing <h1> heading tag');
  }

  return {
    relativePath,
    title,
    titleLen: title ? title.length : 0,
    desc,
    descLen: desc ? desc.length : 0,
    canonical,
    h1Text,
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
      `✅ /${result.relativePath.padEnd(40)} | Title: ${String(result.titleLen).padStart(2)}/60 | Desc: ${String(result.descLen).padStart(3)}/155 | H1: ✓ | Canonical: ✓`
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
    `🎉 SEO Audit Passed: All ${htmlFiles.length} pages satisfy title (<=60), description (<=155), H1, and canonical rules.`
  );
  process.exit(0);
}
