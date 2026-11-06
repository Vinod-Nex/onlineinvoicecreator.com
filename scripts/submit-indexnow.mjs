#!/usr/bin/env node

/**
 * Fast Indexing & IndexNow Automated Submission Script
 *
 * Discovers new or changed URLs from Git commits and submits them
 * to the IndexNow protocol through the Phase 18 Cloudflare API Worker (/api/indexnow).
 *
 * Supported flags:
 *   --all, --force        Force submit all 14 indexable URLs
 *   --dry-run             Detect changed URLs without making remote HTTP requests
 *   --require-auth        Exit with code 1 if INDEXNOW_ADMIN_SECRET is missing
 *   --commit-range <c>    Specify custom git commit range (e.g. HEAD~1..HEAD)
 *   --urls <u1,u2>        Explicit comma-separated list of URLs to submit
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');

export const DEFAULT_HOST = 'onlineinvoicecreator.com';
export const DEFAULT_SITE_ORIGIN = `https://${DEFAULT_HOST}`;
export const DEFAULT_WORKER_ENDPOINT = `${DEFAULT_SITE_ORIGIN}/api/indexnow`;

/**
 * Master Registry of all 14 indexable canonical URLs
 */
export const ALL_INDEXABLE_URLS = [
  `${DEFAULT_SITE_ORIGIN}/`,
  `${DEFAULT_SITE_ORIGIN}/free-online-receipt-generator`,
  `${DEFAULT_SITE_ORIGIN}/free-rent-receipt-generator`,
  `${DEFAULT_SITE_ORIGIN}/invoice-generator-for-freelancers`,
  `${DEFAULT_SITE_ORIGIN}/invoice-generator-excel`,
  `${DEFAULT_SITE_ORIGIN}/receipt-maker-with-items`,
  `${DEFAULT_SITE_ORIGIN}/tax-invoice-template-australia`,
  `${DEFAULT_SITE_ORIGIN}/contractor-invoice-template`,
  `${DEFAULT_SITE_ORIGIN}/photography-invoice-generator`,
  `${DEFAULT_SITE_ORIGIN}/blog`,
  `${DEFAULT_SITE_ORIGIN}/about`,
  `${DEFAULT_SITE_ORIGIN}/contact`,
  `${DEFAULT_SITE_ORIGIN}/privacy`,
  `${DEFAULT_SITE_ORIGIN}/terms`,
];

/**
 * Searches public directory for an IndexNow key file matching [a-zA-Z0-9-]{8,128}.txt
 * @param {string} [publicDir=PUBLIC_DIR]
 * @returns {string} Key string
 */
export function findIndexNowKey(publicDir = PUBLIC_DIR) {
  if (process.env.INDEXNOW_KEY && process.env.INDEXNOW_KEY.trim()) {
    return process.env.INDEXNOW_KEY.trim();
  }

  if (fs.existsSync(publicDir)) {
    const entries = fs.readdirSync(publicDir);
    for (const file of entries) {
      if (file.endsWith('.txt') && file !== 'robots.txt') {
        const candidateKey = file.replace(/\.txt$/, '');
        if (/^[a-zA-Z0-9-]{8,128}$/.test(candidateKey)) {
          const filePath = path.join(publicDir, file);
          const content = fs.readFileSync(filePath, 'utf8').trim();
          if (content === candidateKey) {
            return candidateKey;
          }
        }
      }
    }
  }

  return '24680abcdef1234567890abcdef12345';
}

/**
 * Mapping of repository file patterns to affected canonical URLs
 */
const FILE_TO_URL_MAP = {
  'src/pages/index.astro': `${DEFAULT_SITE_ORIGIN}/`,
  'src/data/pages/index.json': `${DEFAULT_SITE_ORIGIN}/`,
  'src/pages/free-online-receipt-generator.astro': `${DEFAULT_SITE_ORIGIN}/free-online-receipt-generator`,
  'src/data/pages/free-online-receipt-generator.json': `${DEFAULT_SITE_ORIGIN}/free-online-receipt-generator`,
  'src/pages/free-rent-receipt-generator.astro': `${DEFAULT_SITE_ORIGIN}/free-rent-receipt-generator`,
  'src/data/pages/free-rent-receipt-generator.json': `${DEFAULT_SITE_ORIGIN}/free-rent-receipt-generator`,
  'src/pages/invoice-generator-for-freelancers.astro': `${DEFAULT_SITE_ORIGIN}/invoice-generator-for-freelancers`,
  'src/data/pages/invoice-generator-for-freelancers.json': `${DEFAULT_SITE_ORIGIN}/invoice-generator-for-freelancers`,
  'src/pages/invoice-generator-excel.astro': `${DEFAULT_SITE_ORIGIN}/invoice-generator-excel`,
  'src/data/pages/invoice-generator-excel.json': `${DEFAULT_SITE_ORIGIN}/invoice-generator-excel`,
  'src/pages/receipt-maker-with-items.astro': `${DEFAULT_SITE_ORIGIN}/receipt-maker-with-items`,
  'src/data/pages/receipt-maker-with-items.json': `${DEFAULT_SITE_ORIGIN}/receipt-maker-with-items`,
  'src/pages/tax-invoice-template-australia.astro': `${DEFAULT_SITE_ORIGIN}/tax-invoice-template-australia`,
  'src/data/pages/tax-invoice-template-australia.json': `${DEFAULT_SITE_ORIGIN}/tax-invoice-template-australia`,
  'src/pages/contractor-invoice-template.astro': `${DEFAULT_SITE_ORIGIN}/contractor-invoice-template`,
  'src/data/pages/contractor-invoice-template.json': `${DEFAULT_SITE_ORIGIN}/contractor-invoice-template`,
  'src/pages/photography-invoice-generator.astro': `${DEFAULT_SITE_ORIGIN}/photography-invoice-generator`,
  'src/data/pages/photography-invoice-generator.json': `${DEFAULT_SITE_ORIGIN}/photography-invoice-generator`,
  'src/pages/blog.astro': `${DEFAULT_SITE_ORIGIN}/blog`,
  'src/pages/about.astro': `${DEFAULT_SITE_ORIGIN}/about`,
  'src/pages/contact.astro': `${DEFAULT_SITE_ORIGIN}/contact`,
  'src/pages/privacy.astro': `${DEFAULT_SITE_ORIGIN}/privacy`,
  'src/pages/terms.astro': `${DEFAULT_SITE_ORIGIN}/terms`,
};

/**
 * Shared assets that affect all indexable pages when modified
 */
const GLOBAL_AFFECTING_PATTERNS = [
  'src/layouts/',
  'src/components/',
  'src/styles/',
  'src/lib/',
  'src/i18n/',
  'src/data/currencies.ts',
  'src/data/keyword-map.json',
  'astro.config.mjs',
  'package.json',
  'public/_headers',
  'public/_redirects',
  'scripts/generate-',
];

/**
 * Inspects Git changed files between commits to identify affected URLs
 * @param {Object} [options]
 * @param {string} [options.commitRange]
 * @param {string[]} [options.changedFiles]
 * @param {boolean} [options.forceAll]
 * @returns {{ urls: string[], reason: string }}
 */
export function detectChangedUrls(options = {}) {
  if (options.forceAll) {
    return {
      urls: [...ALL_INDEXABLE_URLS],
      reason: 'Forced full submission (--all or --force flag requested).',
    };
  }

  let fileList = options.changedFiles;

  if (!fileList) {
    let range = options.commitRange;
    if (!range) {
      const beforeSha = process.env.GITHUB_EVENT_BEFORE;
      const headSha = process.env.GITHUB_SHA || 'HEAD';

      if (beforeSha && !/^0+$/.test(beforeSha)) {
        try {
          execSync(`git rev-parse --verify ${beforeSha}^{commit}`, { stdio: 'ignore' });
          range = `${beforeSha}..${headSha}`;
        } catch {
          range = undefined;
        }
      }

      if (!range) {
        try {
          execSync('git rev-parse --verify HEAD~1^{commit}', { stdio: 'ignore' });
          range = 'HEAD~1..HEAD';
        } catch {
          range = undefined;
        }
      }
    }

    if (range) {
      try {
        const output = execSync(`git diff --name-only ${range}`, {
          encoding: 'utf8',
          cwd: ROOT_DIR,
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
        fileList = output
          ? output
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
          : [];
      } catch (err) {
        console.warn(`⚠️ Git diff failed for range "${range}":`, err.message);
        fileList = null;
      }
    } else {
      // Shallow clone or initial commit with no parent
      return {
        urls: [...ALL_INDEXABLE_URLS],
        reason: 'Initial deploy or shallow commit history (submitting all indexable URLs).',
      };
    }
  }

  if (!fileList || fileList.length === 0) {
    return {
      urls: [],
      reason: 'No changed files detected in commit diff.',
    };
  }

  // Check if any global file changed
  const hasGlobalChange = fileList.some((file) =>
    GLOBAL_AFFECTING_PATTERNS.some((pattern) => file.includes(pattern))
  );

  if (hasGlobalChange) {
    return {
      urls: [...ALL_INDEXABLE_URLS],
      reason: 'Global template, shared component, or configuration modified; all URLs affected.',
    };
  }

  // Map individual changed files
  const matchedUrls = new Set();
  for (const file of fileList) {
    const normalized = file.replace(/^[./]+/, '');
    if (FILE_TO_URL_MAP[normalized]) {
      matchedUrls.add(FILE_TO_URL_MAP[normalized]);
    } else if (normalized.startsWith('src/scripts/invoice-form-client')) {
      // Tool pages using invoice form
      matchedUrls.add(`${DEFAULT_SITE_ORIGIN}/`);
      matchedUrls.add(`${DEFAULT_SITE_ORIGIN}/invoice-generator-for-freelancers`);
      matchedUrls.add(`${DEFAULT_SITE_ORIGIN}/invoice-generator-excel`);
      matchedUrls.add(`${DEFAULT_SITE_ORIGIN}/tax-invoice-template-australia`);
      matchedUrls.add(`${DEFAULT_SITE_ORIGIN}/contractor-invoice-template`);
      matchedUrls.add(`${DEFAULT_SITE_ORIGIN}/photography-invoice-generator`);
    } else if (normalized.startsWith('src/scripts/receipt-client')) {
      // Tool pages using receipt client
      matchedUrls.add(`${DEFAULT_SITE_ORIGIN}/free-online-receipt-generator`);
      matchedUrls.add(`${DEFAULT_SITE_ORIGIN}/receipt-maker-with-items`);
    } else if (normalized.startsWith('src/scripts/rent-receipt-client')) {
      matchedUrls.add(`${DEFAULT_SITE_ORIGIN}/free-rent-receipt-generator`);
    }
  }

  return {
    urls: Array.from(matchedUrls),
    reason: `Identified ${matchedUrls.size} specific URL(s) from changed files.`,
  };
}

/**
 * Submits URL list to Cloudflare Worker endpoint (/api/indexnow)
 * @param {Object} params
 * @param {string[]} params.urls
 * @param {string} [params.workerUrl]
 * @param {string} [params.adminSecret]
 * @param {string} [params.key]
 * @param {string} [params.host]
 * @param {boolean} [params.dryRun]
 * @returns {Promise<{ success: boolean, statusCode: number, message: string, submittedCount: number }>}
 */
export async function submitUrlsViaWorker(params) {
  const {
    urls,
    workerUrl = process.env.WORKER_INDEXNOW_URL || DEFAULT_WORKER_ENDPOINT,
    adminSecret = process.env.INDEXNOW_ADMIN_SECRET,
    key = findIndexNowKey(),
    host = DEFAULT_HOST,
    dryRun = false,
  } = params;

  if (!urls || urls.length === 0) {
    return {
      success: true,
      statusCode: 200,
      message: 'No URLs to submit.',
      submittedCount: 0,
    };
  }

  const payload = {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: urls,
  };

  if (dryRun) {
    console.log(`[DRY RUN] Would dispatch ${urls.length} URL(s) to ${workerUrl}:`);
    console.log(JSON.stringify(payload, null, 2));
    return {
      success: true,
      statusCode: 200,
      message: 'Dry run completed successfully.',
      submittedCount: urls.length,
    };
  }

  if (!adminSecret) {
    const warnMsg =
      'INDEXNOW_ADMIN_SECRET is not configured in the environment. Skipping remote submission (dry run).';
    console.warn(`⚠️  ${warnMsg}`);
    return {
      success: true,
      statusCode: 200,
      message: warnMsg,
      submittedCount: 0,
    };
  }

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    Authorization: `Bearer ${adminSecret}`,
    'User-Agent': 'onlineinvoicecreator-deploy-script/1.0',
  };

  const response = await fetch(workerUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok || !responseData.success) {
    const errorDetails = responseData.error || responseData.message || `HTTP ${response.status}`;
    throw new Error(`Worker IndexNow submission failed (${response.status}): ${errorDetails}`);
  }

  return {
    success: true,
    statusCode: response.status,
    message: responseData.message || 'URLs successfully submitted.',
    submittedCount: responseData.data?.submittedCount || urls.length,
  };
}

/**
 * CLI Entry point
 */
export async function main() {
  const args = process.argv.slice(2);
  const forceAll = args.includes('--all') || args.includes('--force');
  const dryRun = args.includes('--dry-run');
  const requireAuth = args.includes('--require-auth');

  let explicitUrls;
  const urlsIdx = args.indexOf('--urls');
  if (urlsIdx !== -1 && args[urlsIdx + 1]) {
    explicitUrls = args[urlsIdx + 1]
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
  }

  let customRange;
  const rangeIdx = args.indexOf('--commit-range');
  if (rangeIdx !== -1 && args[rangeIdx + 1]) {
    customRange = args[rangeIdx + 1].trim();
  }

  console.log('🚀 IndexNow Fast Indexing Submission Pipeline');
  console.log(`📍 Site Domain:   ${DEFAULT_HOST}`);
  console.log(`🔑 IndexNow Key:  ${findIndexNowKey()}`);

  let urlsToSubmit;
  let reason;

  if (explicitUrls && explicitUrls.length > 0) {
    urlsToSubmit = explicitUrls;
    reason = `Explicit URL list provided via --urls (${explicitUrls.length} URLs).`;
  } else {
    const detection = detectChangedUrls({
      forceAll,
      commitRange: customRange,
    });
    urlsToSubmit = detection.urls;
    reason = detection.reason;
  }

  console.log(`ℹ️  Detection:     ${reason}`);

  if (urlsToSubmit.length === 0) {
    console.log('✅ No new or changed indexable URLs to submit. Exiting cleanly.');
    process.exit(0);
  }

  console.log(`📋 Target URLs (${urlsToSubmit.length}):`);
  for (const url of urlsToSubmit) {
    console.log(`   - ${url}`);
  }

  if (requireAuth && !process.env.INDEXNOW_ADMIN_SECRET && !dryRun) {
    console.error('❌ Error: --require-auth was specified but INDEXNOW_ADMIN_SECRET is missing.');
    process.exit(1);
  }

  try {
    const result = await submitUrlsViaWorker({
      urls: urlsToSubmit,
      dryRun,
    });

    console.log(`✨ Status: ${result.message} (${result.submittedCount} submitted)`);
  } catch (err) {
    console.error(`❌ Submission failed: ${err.message}`);
    process.exit(1);
  }
}

// Execute if run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
