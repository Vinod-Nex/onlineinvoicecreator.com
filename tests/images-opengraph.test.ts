import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

describe('Phase 27: Images, Open Graph, Favicons, and Web Manifest', () => {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(rootDir, 'dist');
  const publicDir = path.resolve(rootDir, 'public');
  const publicOgDir = path.resolve(publicDir, 'og');
  const distOgDir = path.resolve(distDir, 'og');

  const expected15Slugs = [
    'og-contractor-invoice-template',
    'og-free-online-receipt-generator',
    'og-free-rent-receipt-generator',
    'og-invoice-generator',
    'og-invoice-generator-excel',
    'og-invoice-generator-for-freelancers',
    'og-photography-invoice-generator',
    'og-receipt-maker-with-items',
    'og-tax-invoice-template-australia',
    'og-blog',
    'og-about',
    'og-contact',
    'og-privacy',
    'og-terms',
    'og-style-guide',
    'og-404',
  ];

  beforeAll(() => {
    // Ensure build has been run
    if (!fs.existsSync(distDir) || !fs.existsSync(distOgDir)) {
      execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
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

  describe('Open Graph Images (1200x630)', () => {
    it('generates 15 unique Open Graph images in public/og and dist/og', () => {
      expect(fs.existsSync(publicOgDir)).toBe(true);
      expect(fs.existsSync(distOgDir)).toBe(true);

      for (const slug of expected15Slugs) {
        const publicFile = path.join(publicOgDir, `${slug}.png`);
        const distFile = path.join(distOgDir, `${slug}.png`);
        expect(fs.existsSync(publicFile), `Missing in public/og: ${slug}.png`).toBe(true);
        expect(fs.existsSync(distFile), `Missing in dist/og: ${slug}.png`).toBe(true);
      }
    });

    it('verifies all 15 Open Graph images are exactly 1200x630 pixels in PNG format', async () => {
      for (const slug of expected15Slugs) {
        const imagePath = path.join(publicOgDir, `${slug}.png`);
        const metadata = await sharp(imagePath).metadata();
        const stat = fs.statSync(imagePath);

        expect(metadata.width, `${slug} width`).toBe(1200);
        expect(metadata.height, `${slug} height`).toBe(630);
        expect(metadata.format, `${slug} format`).toBe('png');
        expect(stat.size, `${slug} byte size`).toBeGreaterThan(20000); // real rendered content > 20KB
      }
    });

    it('verifies default fallback public/og-image.png exists at 1200x630', async () => {
      const defaultOg = path.join(publicDir, 'og-image.png');
      expect(fs.existsSync(defaultOg)).toBe(true);

      const metadata = await sharp(defaultOg).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(630);
      expect(metadata.format).toBe('png');
    });

    it('uses real, semantic file names for all OG images', () => {
      for (const slug of expected15Slugs) {
        expect(slug).not.toMatch(/\b(placeholder|generic|dummy|temp)\b/i);
        expect(slug.startsWith('og-')).toBe(true);
      }
    });
  });

  describe('Page Open Graph and Social Card Meta Tags', () => {
    it('ensures every built HTML page contains full Open Graph and Twitter Card tags', () => {
      const htmlFiles = getAllHtmlFiles(distDir);
      expect(htmlFiles.length).toBeGreaterThanOrEqual(16);

      for (const file of htmlFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relative = path.relative(distDir, file);

        // Open Graph Image & Dimensions
        const ogImageMatch = content.match(/<meta property="og:image" content="([^"]+)"/i);
        expect(ogImageMatch, `Missing og:image in /${relative}`).not.toBeNull();
        expect(content).toMatch(/<meta property="og:image:width" content="1200"/i);
        expect(content).toMatch(/<meta property="og:image:height" content="630"/i);

        // Open Graph Image Alt Text
        const ogAltMatch = content.match(/<meta property="og:image:alt" content="([^"]+)"/i);
        expect(ogAltMatch, `Missing og:image:alt in /${relative}`).not.toBeNull();
        expect(ogAltMatch![1].trim().length).toBeGreaterThan(10);

        // Twitter Card
        expect(content).toMatch(/<meta name="twitter:card" content="summary_large_image"/i);
        expect(content).toMatch(/<meta name="twitter:image" content="([^"]+)"/i);
        expect(content).toMatch(/<meta name="twitter:image:alt" content="([^"]+)"/i);

        // Referenced image must exist in dist/
        const ogUrl = ogImageMatch![1];
        const parsedUrl = new URL(ogUrl, 'https://onlineinvoicecreator.com');
        const localDistPath = path.join(distDir, parsedUrl.pathname.replace(/^\//, ''));
        expect(
          fs.existsSync(localDistPath),
          `Referenced OG image not found in dist: ${localDistPath}`
        ).toBe(true);
      }
    });

    it('ensures each page has a unique, tailored Open Graph image URL', () => {
      const htmlFiles = getAllHtmlFiles(distDir);
      const usedOgImages = new Set<string>();

      for (const file of htmlFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const ogImageMatch = content.match(/<meta property="og:image" content="([^"]+)"/i);
        expect(ogImageMatch).not.toBeNull();
        const ogImageUrl = ogImageMatch![1];
        usedOgImages.add(ogImageUrl);
      }

      // Every distinct page must map to a unique OG image
      expect(usedOgImages.size).toBe(htmlFiles.length);
    });
  });

  describe('Favicon Set and Web Manifest', () => {
    it('verifies all favicon files exist in public/ and dist/', () => {
      const requiredFavicons = [
        'favicon.svg',
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'android-chrome-192x192.png',
        'android-chrome-512x512.png',
        'site.webmanifest',
      ];

      for (const file of requiredFavicons) {
        expect(fs.existsSync(path.join(publicDir, file)), `public/${file}`).toBe(true);
        expect(fs.existsSync(path.join(distDir, file)), `dist/${file}`).toBe(true);
      }
    });

    it('verifies dimensions of PNG favicons', async () => {
      const meta16 = await sharp(path.join(publicDir, 'favicon-16x16.png')).metadata();
      expect(meta16.width).toBe(16);
      expect(meta16.height).toBe(16);

      const meta32 = await sharp(path.join(publicDir, 'favicon-32x32.png')).metadata();
      expect(meta32.width).toBe(32);
      expect(meta32.height).toBe(32);

      const meta180 = await sharp(path.join(publicDir, 'apple-touch-icon.png')).metadata();
      expect(meta180.width).toBe(180);
      expect(meta180.height).toBe(180);

      const meta192 = await sharp(path.join(publicDir, 'android-chrome-192x192.png')).metadata();
      expect(meta192.width).toBe(192);
      expect(meta192.height).toBe(192);

      const meta512 = await sharp(path.join(publicDir, 'android-chrome-512x512.png')).metadata();
      expect(meta512.width).toBe(512);
      expect(meta512.height).toBe(512);
    });

    it('validates site.webmanifest JSON structure and icon references', () => {
      const manifestPath = path.join(publicDir, 'site.webmanifest');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      expect(manifest.name).toBe('Online Invoice Creator');
      expect(manifest.short_name).toBe('InvoiceCreator');
      expect(manifest.theme_color).toBe('#494fdf');
      expect(manifest.background_color).toBe('#0a0a0c');
      expect(manifest.display).toBe('standalone');
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

      // Verify each referenced icon exists
      for (const icon of manifest.icons) {
        const iconPath = path.join(publicDir, icon.src.replace(/^\//, ''));
        expect(fs.existsSync(iconPath), `Manifest icon: ${icon.src}`).toBe(true);
      }
    });

    it('ensures every HTML page links to favicons and web manifest', () => {
      const htmlFiles = getAllHtmlFiles(distDir);
      for (const file of htmlFiles) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/i);
        expect(content).toMatch(
          /<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32x32\.png"/i
        );
        expect(content).toMatch(/<link rel="shortcut icon" href="\/favicon\.ico"/i);
        expect(content).toMatch(
          /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png"/i
        );
        expect(content).toMatch(/<link rel="manifest" href="\/site\.webmanifest"/i);
      }
    });
  });

  describe('Descriptive Image Alt Text & Responsive AVIF/WebP Formats', () => {
    it('verifies all <img> tags have non-empty, descriptive alt text and explicit dimensions', () => {
      const htmlFiles = getAllHtmlFiles(distDir);
      let totalImgCount = 0;

      for (const file of htmlFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const imgMatches = [...content.matchAll(/<img\b([^>]*)>/gi)];

        for (const match of imgMatches) {
          totalImgCount++;
          const attrs = match[1];

          // Alt attribute check
          const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
          expect(altMatch, `<img> missing alt in ${file}`).not.toBeNull();
          const altText = altMatch![1].trim();
          expect(altText.length, `Empty alt attribute in ${file}`).toBeGreaterThan(0);

          // Disallow generic placeholder alt text
          const genericWords = ['image', 'img', 'photo', 'picture', 'pic', 'logo'];
          expect(
            genericWords.includes(altText.toLowerCase()),
            `Generic alt text "${altText}" found in ${file}`
          ).toBe(false);

          // Dimension check to prevent layout shifts (CLS)
          expect(attrs).toMatch(/\bwidth=["']?\d+/i);
          expect(attrs).toMatch(/\bheight=["']?\d+/i);
        }
      }

      expect(totalImgCount).toBeGreaterThan(0);
    });

    it('serves responsive AVIF and WebP formats with astro:assets', () => {
      const aboutHtml = fs.readFileSync(path.join(distDir, 'about/index.html'), 'utf8');

      // Picture element with both AVIF and WebP sources
      expect(aboutHtml).toContain('type="image/avif"');
      expect(aboutHtml).toContain('type="image/webp"');

      // Responsive srcset with widths
      expect(aboutHtml).toMatch(/srcset="[^"]*BXfTQxJn[^"]*480w/);
      expect(aboutHtml).toMatch(/srcset="[^"]*BXfTQxJn[^"]*800w/);
      expect(aboutHtml).toMatch(/srcset="[^"]*BXfTQxJn[^"]*1200w/);

      // Verify lazy loading and asynchronous decoding
      expect(aboutHtml).toContain('loading="lazy"');
      expect(aboutHtml).toContain('decoding="async"');

      // Verify generated avif and webp files exist in dist/_astro
      const astroDir = path.join(distDir, '_astro');
      const astroFiles = fs.readdirSync(astroDir);
      const avifFiles = astroFiles.filter((f) => f.endsWith('.avif'));
      const webpFiles = astroFiles.filter((f) => f.endsWith('.webp'));

      expect(avifFiles.length).toBeGreaterThan(0);
      expect(webpFiles.length).toBeGreaterThan(0);
    });
  });
});
