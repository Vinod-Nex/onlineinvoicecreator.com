// @ts-check
import { defineConfig } from 'astro/config';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLocalePublished } from './src/i18n/config';

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
      pathname.includes('/500') ||
      pathname.includes('/style-guide') ||
      pathname.startsWith('/api') ||
      pathname.endsWith('.xml')
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
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt-br', 'es', 'fr', 'de'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  devToolbar: {
    enabled: false,
  },
  build: {
    inlineStylesheets: 'always',
  },
  server: {
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true,
      host: true,
      watch: {
        ignored: ['**/testsprite_tests/**', '**/dist/**', '**/downloads/**', '**/.git/**', '**/*.pdf', '**/*.log'],
      },
    },
  },
  integrations: [
    {
      name: 'strip-html-comments',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const distDir = fileURLToPath(dir);
          function cleanDir(d) {
            const files = fs.readdirSync(d);
            for (const f of files) {
              const full = path.join(d, f);
              if (fs.statSync(full).isDirectory()) {
                cleanDir(full);
              } else if (f.endsWith('.html')) {
                let content = fs.readFileSync(full, 'utf8');
                content = content.replace(/<!--(?!\[if|<!)([\s\S]*?)-->/g, '');
                fs.writeFileSync(full, content, 'utf8');
              }
            }
          }
          cleanDir(distDir);
        },
      },
    },
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          'pt-br': 'pt-BR',
          es: 'es',
          fr: 'fr',
          de: 'de',
        },
      },
      filter: (page) => !isNoIndexPage(page),
      serialize(item) {
        if (isNoIndexPage(item.url)) {
          return undefined;
        }
        if (item.links && item.links.length > 0) {
          item.links = item.links.filter((link) => {
            const code = link.lang?.toLowerCase();
            return code === 'en' || isLocalePublished(code);
          });
          if (item.links.length <= 1) {
            delete item.links;
          }
        }
        return item;
      },
    }),
    {
      name: 'pretty-format-sitemaps',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const distDir = fileURLToPath(dir);
          const sitemap0Path = path.join(distDir, 'sitemap-0.xml');
          if (fs.existsSync(sitemap0Path)) {
            let content = fs.readFileSync(sitemap0Path, 'utf8');
            content = content.replace(/<\?xml-stylesheet[^>]*\?>\s*/g, '');
            content = content
              .replace(/<url>/g, '\n  <url>\n    ')
              .replace(/<\/url>/g, '\n  </url>')
              .replace(/<\/urlset>/g, '\n</urlset>\n');
            fs.writeFileSync(sitemap0Path, content, 'utf8');
          }
          const sitemapIndexPath = path.join(distDir, 'sitemap-index.xml');
          if (fs.existsSync(sitemapIndexPath)) {
            let content = fs.readFileSync(sitemapIndexPath, 'utf8');
            content = content.replace(/<\?xml-stylesheet[^>]*\?>\s*/g, '');
            fs.writeFileSync(sitemapIndexPath, content, 'utf8');
          }
          const sitemapXmlPath = path.join(distDir, 'sitemap.xml');
          if (fs.existsSync(sitemapXmlPath)) {
            let content = fs.readFileSync(sitemapXmlPath, 'utf8');
            content = content.replace(/<\?xml-stylesheet[^>]*\?>\s*/g, '');
            fs.writeFileSync(sitemapXmlPath, content, 'utf8');
          }
        },
      },
    },
  ],
});
