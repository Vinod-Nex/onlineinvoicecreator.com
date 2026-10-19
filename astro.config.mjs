// @ts-check
import { defineConfig } from 'astro/config';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for git lastmod lookups
const gitLastModCache = new Map();

/**
 * Retrieves the ISO last-modified timestamp from git history for a page's source files.
 * Falls back to file modification time or current date if git is unavailable.
 * @param {string} urlStr
 * @returns {string}
 */
function getGitLastMod(urlStr) {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname.replace(/\/$/, '') || '/';

    if (gitLastModCache.has(pathname)) {
      return gitLastModCache.get(pathname);
    }

    const cleanPath = pathname === '/' ? '' : pathname.replace(/^\//, '');
    const candidateFiles =
      cleanPath === ''
        ? [
            path.resolve(__dirname, 'src/pages/index.astro'),
            path.resolve(__dirname, 'src/data/pages/index.json'),
          ]
        : [
            path.resolve(__dirname, `src/pages/${cleanPath}.astro`),
            path.resolve(__dirname, `src/data/pages/${cleanPath}.json`),
            path.resolve(__dirname, `src/pages/${cleanPath}/index.astro`),
          ];

    const existingFiles = candidateFiles.filter((f) => fs.existsSync(f));
    if (existingFiles.length > 0) {
      try {
        const cmd = `git log -1 --format=%cI -- ${existingFiles.join(' ')}`;
        const gitDate = execSync(cmd, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
        if (gitDate) {
          const iso = new Date(gitDate).toISOString();
          gitLastModCache.set(pathname, iso);
          return iso;
        }
      } catch {
        const mtimes = existingFiles.map((f) => fs.statSync(f).mtime.getTime());
        const iso = new Date(Math.max(...mtimes)).toISOString();
        gitLastModCache.set(pathname, iso);
        return iso;
      }
    }
  } catch {
    // ignore parse errors
  }

  return new Date().toISOString();
}

/**
 * Checks whether a route should be excluded from the sitemap due to noindex directive.
 * @param {string} urlStr
 * @returns {boolean}
 */
function isNoIndexPage(urlStr) {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname.replace(/\/$/, '') || '/';

    // Disallowed routes
    if (
      pathname.includes('/404') ||
      pathname.includes('/style-guide') ||
      pathname.startsWith('/api')
    ) {
      return true;
    }

    const cleanPath = pathname === '/' ? 'index' : pathname.replace(/^\//, '');
    const astroFile = path.resolve(__dirname, `src/pages/${cleanPath}.astro`);
    if (fs.existsSync(astroFile)) {
      const content = fs.readFileSync(astroFile, 'utf8');
      if (/noindex\s*[:=]\s*\{?true\}?/i.test(content)) {
        return true;
      }
    }
  } catch {
    // ignore parse errors
  }

  return false;
}

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  output: 'static',
  site: 'https://onlineinvoicecreator.com',
  trailingSlash: 'never',
  compressHTML: true,
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      filter: (page) => !isNoIndexPage(page),
      serialize(item) {
        if (isNoIndexPage(item.url)) {
          return undefined;
        }

        const parsed = new URL(item.url);
        const cleanPath = parsed.pathname.replace(/\/$/, '') || '/';
        const origin = parsed.origin;

        // Lastmod retrieved directly from git commit history
        item.lastmod = getGitLastMod(item.url);

        // Tiered priority and changefreq
        if (cleanPath === '/') {
          item.changefreq = ChangeFreqEnum.WEEKLY;
          item.priority = 1.0;
        } else if (
          [
            '/free-online-receipt-generator',
            '/free-rent-receipt-generator',
            '/receipt-maker-with-items',
            '/invoice-generator-for-freelancers',
            '/invoice-generator-excel',
            '/contractor-invoice-template',
            '/photography-invoice-generator',
            '/tax-invoice-template-australia',
          ].includes(cleanPath)
        ) {
          item.changefreq = ChangeFreqEnum.WEEKLY;
          item.priority = 0.9;
        } else if (cleanPath === '/blog') {
          item.changefreq = ChangeFreqEnum.WEEKLY;
          item.priority = 0.8;
        } else if (cleanPath === '/about' || cleanPath === '/contact') {
          item.changefreq = ChangeFreqEnum.MONTHLY;
          item.priority = 0.6;
        } else {
          item.changefreq = ChangeFreqEnum.MONTHLY;
          item.priority = 0.4;
        }

        // Hreflang-ready structure: English (default), Spanish, Portuguese, and x-default
        const esPath = cleanPath === '/' ? '/es' : `/es${cleanPath}`;
        const ptPath = cleanPath === '/' ? '/pt' : `/pt${cleanPath}`;

        item.links = [
          { lang: 'en', url: item.url },
          { lang: 'es', url: `${origin}${esPath}` },
          { lang: 'pt', url: `${origin}${ptPath}` },
          { lang: 'x-default', url: item.url },
        ];

        return item;
      },
    }),
  ],
});
