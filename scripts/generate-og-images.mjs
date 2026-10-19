#!/usr/bin/env node

/**
 * Build-time Open Graph Image Generator
 *
 * Uses `satori` and `@resvg/resvg-js` with local Inter fonts
 * to render a unique, pixel-perfect 1200x630 Open Graph image
 * for every page on onlineinvoicecreator.com at build time.
 *
 * Outputs:
 * - public/og/og-[slug].png (1200x630)
 * - public/og-image.png (default fallback 1200x630)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_OG_DIR = path.resolve(ROOT_DIR, 'public/og');
const DATA_PAGES_DIR = path.resolve(ROOT_DIR, 'src/data/pages');

// Ensure destination directories exist
if (!fs.existsSync(PUBLIC_OG_DIR)) {
  fs.mkdirSync(PUBLIC_OG_DIR, { recursive: true });
}

// Load fonts deterministically from local node_modules
const fontRegularPath = path.resolve(
  ROOT_DIR,
  'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff'
);
const fontBoldPath = path.resolve(
  ROOT_DIR,
  'node_modules/@fontsource/inter/files/inter-latin-700-normal.woff'
);

if (!fs.existsSync(fontRegularPath) || !fs.existsSync(fontBoldPath)) {
  throw new Error('Inter woff font files not found in @fontsource/inter');
}

const fontRegular = fs.readFileSync(fontRegularPath);
const fontBold = fs.readFileSync(fontBoldPath);

// Define static pages metadata
const staticPages = [
  {
    slug: 'og-blog',
    title: 'Invoicing & Billing Guides',
    badge: 'Free Guides & Tutorials',
    description:
      'Explore expert guides on invoicing, client billing terms, contractor rates, and statutory tax compliance.',
    tags: ['Freelance Billing', 'Contractor Rates', 'Tax Compliance'],
  },
  {
    slug: 'og-about',
    title: 'About Online Invoice Creator',
    badge: '100% Client-Side Privacy',
    description:
      'Learn why we built Online Invoice Creator: free, private, watermark-free invoicing running entirely in your browser.',
    tags: ['Zero Server Storage', '100% Watermark-Free', 'No Ads or Tracking'],
  },
  {
    slug: 'og-contact',
    title: 'Contact & Support',
    badge: 'Direct Support & Feedback',
    description:
      'Get in touch with the Online Invoice Creator team. Send feedback, report bugs, or request custom features.',
    tags: ['Support Requests', 'Feedback Welcome', 'Fast Response'],
  },
  {
    slug: 'og-privacy',
    title: 'Privacy Policy',
    badge: 'Zero Data Collection',
    description:
      'Our client-side privacy guarantee: no server uploads, no cookies, no third-party tracking scripts, 100% private.',
    tags: ['Zero Server Uploads', 'No Tracking Cookies', 'Local Storage Only'],
  },
  {
    slug: 'og-terms',
    title: 'Terms of Service',
    badge: 'Transparent & Free Terms',
    description:
      'Terms of service and usage conditions for generating invoices, receipts, and commercial billing documents.',
    tags: ['Commercial Use Allowed', 'Unrestricted Exports', 'Clear Guidelines'],
  },
  {
    slug: 'og-style-guide',
    title: 'Design System & Style Guide',
    badge: 'Brand & UI Tokens',
    description:
      'Interactive design tokens, color swatches, typography hierarchy, and UI component specifications.',
    tags: ['Design Tokens', 'Typography Specs', 'WCAG AAA Contrast'],
  },
  {
    slug: 'og-404',
    title: '404: Page Not Found',
    badge: 'Page Not Found',
    description:
      'The requested page could not be found. Explore our 100% free, private online tools to generate invoices and receipts instantly.',
    tags: ['Free Invoices', 'Instant PDF Export', 'Zero Watermarks'],
  },
];

// Read tool page JSON files
function getToolPages() {
  const jsonFiles = fs.readdirSync(DATA_PAGES_DIR).filter((f) => f.endsWith('.json'));
  return jsonFiles.map((filename) => {
    const raw = fs.readFileSync(path.join(DATA_PAGES_DIR, filename), 'utf8');
    const data = JSON.parse(raw);
    const slug = data.slug === 'index' ? 'og-invoice-generator' : `og-${data.slug}`;
    const tags =
      Array.isArray(data.trustBadges) && data.trustBadges.length >= 3
        ? data.trustBadges.slice(0, 3)
        : ['Zero Watermarks', 'Instant Print / PDF', '100% Client-Side'];

    return {
      slug,
      title: data.h1,
      badge: data.badge ? data.badge.split('•')[0].trim() : 'Free Online Billing Tool',
      description: data.intro || data.metaDescription,
      tags,
    };
  });
}

function buildCardVNode({ title, badge, description, tags }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        backgroundColor: '#07080C',
        padding: '36px 44px',
        display: 'flex',
        fontFamily: 'Inter',
      },
      children: {
        type: 'div',
        props: {
          style: {
            width: '100%',
            height: '100%',
            backgroundColor: '#0D0F18',
            borderRadius: '24px',
            border: '1px solid #1F2438',
            padding: '44px 52px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
          children: [
            // Top Row
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', alignItems: 'center', gap: '16px' },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: {
                              width: '46px',
                              height: '46px',
                              borderRadius: '12px',
                              backgroundColor: '#494FDF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              fontSize: '22px',
                              fontWeight: 700,
                            },
                            children: 'OI',
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: { display: 'flex', flexDirection: 'column' },
                            children: [
                              {
                                type: 'span',
                                props: {
                                  style: {
                                    fontSize: '22px',
                                    fontWeight: 700,
                                    color: '#FFFFFF',
                                    letterSpacing: '-0.02em',
                                  },
                                  children: 'Online Invoice Creator',
                                },
                              },
                              {
                                type: 'span',
                                props: {
                                  style: { fontSize: '14px', color: '#818CF8', fontWeight: 500 },
                                  children: 'onlineinvoicecreator.com',
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 18px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(73, 79, 223, 0.16)',
                        border: '1px solid rgba(99, 102, 241, 0.45)',
                        color: '#A5B4FC',
                        fontSize: '14px',
                        fontWeight: 600,
                      },
                      children: badge,
                    },
                  },
                ],
              },
            },
            // Center Content
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  maxWidth: '980px',
                },
                children: [
                  {
                    type: 'h1',
                    props: {
                      style: {
                        fontSize: title.length > 36 ? '46px' : '52px',
                        fontWeight: 700,
                        lineHeight: 1.15,
                        letterSpacing: '-0.03em',
                        color: '#FFFFFF',
                        margin: 0,
                      },
                      children: title,
                    },
                  },
                  {
                    type: 'p',
                    props: {
                      style: {
                        fontSize: '22px',
                        lineHeight: 1.45,
                        color: '#94A3B8',
                        margin: 0,
                      },
                      children: description,
                    },
                  },
                ],
              },
            },
            // Bottom Row
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '24px',
                  borderTop: '1px solid #1E2335',
                  width: '100%',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', alignItems: 'center', gap: '12px' },
                      children: tags.map((tag) => ({
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            backgroundColor: '#141824',
                            border: '1px solid #232738',
                            color: '#CBD5E1',
                            fontSize: '14px',
                            fontWeight: 500,
                          },
                          children: tag,
                        },
                      })),
                    },
                  },
                  {
                    type: 'span',
                    props: {
                      style: { fontSize: '15px', color: '#64748B', fontWeight: 500 },
                      children: '100% Free Forever • Watermark-Free',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  };
}

async function renderCardToPng(cardData) {
  const vnode = buildCardVNode(cardData);
  const svg = await satori(vnode, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fontBold, weight: 700, style: 'normal' },
    ],
  });

  const resvg = new Resvg(svg);
  return resvg.render().asPng();
}

async function main() {
  console.log('🖼️  Generating unique 1200x630 Open Graph images for all pages...');

  const toolPages = getToolPages();
  const allPages = [...toolPages, ...staticPages];

  let count = 0;
  for (const page of allPages) {
    const pngBuffer = await renderCardToPng(page);
    const destPath = path.join(PUBLIC_OG_DIR, `${page.slug}.png`);
    fs.writeFileSync(destPath, pngBuffer);
    count++;
    console.log(`   ✓ [${count}/${allPages.length}] ${page.slug}.png (1200x630, ${pngBuffer.length} bytes)`);

    // If this is the home page, also update public/og-image.png as standard fallback
    if (page.slug === 'og-invoice-generator') {
      fs.writeFileSync(path.resolve(ROOT_DIR, 'public/og-image.png'), pngBuffer);
      console.log('   ✓ Synced default fallback -> public/og-image.png');
    }
  }

  console.log(`\n🎉 Successfully generated ${count} unique Open Graph images in public/og/!\n`);
}

main().catch((err) => {
  console.error('❌ Failed to generate Open Graph images:', err);
  process.exit(1);
});
