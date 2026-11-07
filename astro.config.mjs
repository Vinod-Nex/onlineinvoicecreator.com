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
        delete item.links;
        return item;
      },
    }),
    {
      name: 'pretty-format-sitemaps',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const distDir = fileURLToPath(dir);
          const publicDir = path.resolve(__dirname, 'public');

          function formatSitemap0(xml) {
            let clean = xml.replace(/<\?xml-stylesheet[^>]*\?>\s*/g, '');
            const urlRegex = /<url>([\s\S]*?)<\/url>/g;
            const englishUrls = [];
            const ptBrUrls = [];
            let match;
            while ((match = urlRegex.exec(clean)) !== null) {
              const inner = match[1];
              const locMatch = inner.match(/<loc>([\s\S]*?)<\/loc>/);
              const loc = locMatch ? locMatch[1].trim() : '';

              if (loc) {
                const block = `  <url>\n    <loc>${loc}</loc>\n  </url>`;
                if (loc.includes('/pt-br')) {
                  ptBrUrls.push({ loc, block });
                } else {
                  englishUrls.push({ loc, block });
                }
              }
            }

            // Keep the exact English ordering as in the screenshot
            const englishOrder = [
              'https://onlineinvoicecreator.com/',
              'https://onlineinvoicecreator.com/about',
              'https://onlineinvoicecreator.com/blog',
              'https://onlineinvoicecreator.com/blog/how-to-number-invoices',
              'https://onlineinvoicecreator.com/blog/how-to-write-an-invoice-for-freelance-work',
              'https://onlineinvoicecreator.com/blog/invoice-vs-receipt',
              'https://onlineinvoicecreator.com/blog/what-is-a-pro-forma-invoice',
              'https://onlineinvoicecreator.com/changelog',
              'https://onlineinvoicecreator.com/contact',
              'https://onlineinvoicecreator.com/contractor-invoice-template',
              'https://onlineinvoicecreator.com/free-online-receipt-generator',
              'https://onlineinvoicecreator.com/free-rent-receipt-generator',
              'https://onlineinvoicecreator.com/invoice-generator-excel',
              'https://onlineinvoicecreator.com/invoice-generator-for-freelancers',
              'https://onlineinvoicecreator.com/photography-invoice-generator',
              'https://onlineinvoicecreator.com/privacy',
              'https://onlineinvoicecreator.com/receipt-maker-with-items',
              'https://onlineinvoicecreator.com/tax-invoice-template-australia',
              'https://onlineinvoicecreator.com/terms',
            ];

            const ptBrOrder = [
              'https://onlineinvoicecreator.com/pt-br',
              'https://onlineinvoicecreator.com/pt-br/gerador-de-recibo',
              'https://onlineinvoicecreator.com/pt-br/gerador-de-recibo-de-aluguel',
              'https://onlineinvoicecreator.com/pt-br/modelo-de-recibo',
              'https://onlineinvoicecreator.com/pt-br/sobre',
              'https://onlineinvoicecreator.com/pt-br/contato',
              'https://onlineinvoicecreator.com/pt-br/privacidade',
              'https://onlineinvoicecreator.com/pt-br/termos',
            ];

            const sortedBlocks = [];
            for (const url of englishOrder) {
              const found = englishUrls.find((u) => u.loc === url);
              if (found) sortedBlocks.push(found.block);
            }
            for (const u of englishUrls) {
              if (!englishOrder.includes(u.loc)) sortedBlocks.push(u.block);
            }

            for (const url of ptBrOrder) {
              const found = ptBrUrls.find((u) => u.loc === url);
              if (found) sortedBlocks.push(found.block);
            }
            for (const u of ptBrUrls) {
              if (!ptBrOrder.includes(u.loc)) sortedBlocks.push(u.block);
            }

            return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${sortedBlocks.join('\n')}\n</urlset>\n`;
          }

          function formatSitemapIndex(xml) {
            let clean = xml.replace(/<\?xml-stylesheet[^>]*\?>\s*/g, '');
            const sitemapRegex = /<sitemap>([\s\S]*?)<\/sitemap>/g;
            const sitemaps = [];
            let match;
            while ((match = sitemapRegex.exec(clean)) !== null) {
              const inner = match[1];
              const locMatch = inner.match(/<loc>([\s\S]*?)<\/loc>/);
              const loc = locMatch ? locMatch[1].trim() : '';
              const lastmodMatch = inner.match(/<lastmod>([\s\S]*?)<\/lastmod>/);
              const lastmod = lastmodMatch ? lastmodMatch[1].trim() : '';

              let block = '  <sitemap>\n';
              if (loc) {
                block += `    <loc>${loc}</loc>\n`;
              }
              if (lastmod) {
                block += `    <lastmod>${lastmod}</lastmod>\n`;
              }
              block += '  </sitemap>';
              sitemaps.push(block);
            }

            return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps.join('\n')}\n</sitemapindex>\n`;
          }

          const sitemap0Path = path.join(distDir, 'sitemap-0.xml');
          if (fs.existsSync(sitemap0Path)) {
            const content = fs.readFileSync(sitemap0Path, 'utf8');
            const formatted = formatSitemap0(content);
            fs.writeFileSync(sitemap0Path, formatted, 'utf8');
            fs.writeFileSync(path.join(publicDir, 'sitemap-0.xml'), formatted, 'utf8');
          }

          const sitemapIndexPath = path.join(distDir, 'sitemap-index.xml');
          if (fs.existsSync(sitemapIndexPath)) {
            const content = fs.readFileSync(sitemapIndexPath, 'utf8');
            const formatted = formatSitemapIndex(content);
            fs.writeFileSync(sitemapIndexPath, formatted, 'utf8');
            fs.writeFileSync(path.join(publicDir, 'sitemap-index.xml'), formatted, 'utf8');
          }

          const sitemapXmlPath = path.join(distDir, 'sitemap.xml');
          if (fs.existsSync(sitemapXmlPath)) {
            let content = fs.readFileSync(sitemapXmlPath, 'utf8');
            content = content.replace(/<\?xml-stylesheet[^>]*\?>\s*/g, '');
            fs.writeFileSync(sitemapXmlPath, content, 'utf8');
            fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), content, 'utf8');
          }
        },
      },
    },
  ],
});
