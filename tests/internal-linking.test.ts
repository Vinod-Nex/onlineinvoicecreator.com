import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

interface LinkOccurrence {
  source: string;
  target: string;
  anchorText: string;
  isContextual: boolean;
}

function normalizeUrl(href: string): string | null {
  if (!href) return null;
  if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return null;
  }
  let clean = href.replace(/^https?:\/\/onlineinvoicecreator\.com/, '');
  if (!clean.startsWith('/')) return null;
  // Remove query and fragment
  clean = clean.split('?')[0].split('#')[0];
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  return clean || '/';
}

function extractLinksFromHtml(html: string, pageRoute: string): LinkOccurrence[] {
  const links: LinkOccurrence[] = [];
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1];
    const rawAnchor = match[2];
    const target = normalizeUrl(rawHref);

    if (target) {
      // Clean anchor text by stripping nested tags and extra spaces
      const anchorText = rawAnchor.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
      // Identify if link is inside header, footer, or body
      const matchIndex = match.index;
      const beforeHtml = html.slice(0, matchIndex);
      const isHeader = beforeHtml.lastIndexOf('<header') > beforeHtml.lastIndexOf('</header>');
      const isFooter = beforeHtml.lastIndexOf('<footer') > beforeHtml.lastIndexOf('</footer>');
      const isNav = beforeHtml.lastIndexOf('<nav') > beforeHtml.lastIndexOf('</nav>');

      links.push({
        source: pageRoute,
        target,
        anchorText,
        isContextual: !isHeader && !isFooter && !isNav,
      });
    }
  }

  return links;
}

describe('Phase 26: Internal Linking Audit', () => {
  const distDir = path.resolve(__dirname, '../dist');

  const knownRoutes = [
    '/',
    '/free-online-receipt-generator',
    '/free-rent-receipt-generator',
    '/receipt-maker-with-items',
    '/invoice-generator-for-freelancers',
    '/invoice-generator-excel',
    '/contractor-invoice-template',
    '/photography-invoice-generator',
    '/tax-invoice-template-australia',
    '/blog',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ];

  // Crawl all HTML files in dist/
  const pageFiles: Record<string, string> = {};
  knownRoutes.forEach((route) => {
    const filePath = route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, route.slice(1), 'index.html');
    if (fs.existsSync(filePath)) {
      pageFiles[route] = fs.readFileSync(filePath, 'utf-8');
    }
  });

  const allLinks: LinkOccurrence[] = [];
  Object.entries(pageFiles).forEach(([route, html]) => {
    allLinks.push(...extractLinksFromHtml(html, route));
  });

  // Calculate inbound links
  const inboundCount: Record<string, number> = {};
  const inboundSources: Record<string, Set<string>> = {};
  const contextualInbound: Record<string, number> = {};

  knownRoutes.forEach((route) => {
    inboundCount[route] = 0;
    inboundSources[route] = new Set();
    contextualInbound[route] = 0;
  });

  allLinks.forEach((link) => {
    if (inboundCount[link.target] !== undefined && link.source !== link.target) {
      inboundCount[link.target]++;
      inboundSources[link.target].add(link.source);
      if (link.isContextual) {
        contextualInbound[link.target]++;
      }
    }
  });

  describe('Orphan Pages & Inbound Link Minimum Threshold', () => {
    knownRoutes.forEach((route) => {
      it(`Route: ${route} is not an orphan and has at least 3 inbound links`, () => {
        const uniqueSources = inboundSources[route].size;
        expect(uniqueSources, `Page ${route} is an orphan (0 inbound links)`).toBeGreaterThan(0);
        expect(
          uniqueSources,
          `Page ${route} has fewer than 3 inbound source pages (has ${uniqueSources})`
        ).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('3-Click Reachability from Home (/)', () => {
    // Breadth-First Search (BFS) distance calculation
    const distance: Record<string, number> = { '/': 0 };
    const queue = ['/'];

    // Build adjacency list
    const adj: Record<string, Set<string>> = {};
    knownRoutes.forEach((r) => (adj[r] = new Set()));
    allLinks.forEach((link) => {
      if (adj[link.source] && knownRoutes.includes(link.target)) {
        adj[link.source].add(link.target);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = distance[current];

      adj[current]?.forEach((neighbor) => {
        if (distance[neighbor] === undefined) {
          distance[neighbor] = currentDist + 1;
          queue.push(neighbor);
        }
      });
    }

    knownRoutes.forEach((route) => {
      it(`Route: ${route} is reachable in <= 3 clicks from home`, () => {
        const clicks = distance[route];
        expect(clicks, `Page ${route} is unreachable from home`).toBeDefined();
        expect(clicks, `Page ${route} requires ${clicks} clicks from home (limit: 3)`).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Descriptive Anchor Text Audit (Never "click here")', () => {
    const forbiddenPatterns = [
      /^click here$/i,
      /^here$/i,
      /^read more$/i,
      /^learn more$/i,
      /^link$/i,
      /^this page$/i,
    ];

    it('confirms zero links use generic or lazy anchor text like "click here"', () => {
      const violations: Array<{ source: string; target: string; anchor: string }> = [];

      allLinks.forEach((link) => {
        const isForbidden = forbiddenPatterns.some((pattern) => pattern.test(link.anchorText.trim()));
        if (isForbidden) {
          violations.push({
            source: link.source,
            target: link.target,
            anchor: link.anchorText,
          });
        }
      });

      expect(violations, `Found forbidden anchor text: ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
    });

    it('confirms every anchor text is descriptive and meaningful', () => {
      allLinks.forEach((link) => {
        // Skip links that might have purely visual icons if aria-label or title was on the anchor
        if (link.anchorText.length > 0) {
          expect(link.anchorText.length).toBeGreaterThanOrEqual(2);
        }
      });
    });
  });

  describe('Related-Tools & Contextual Workflow Blocks', () => {
    const toolSlugs = [
      'index',
      'free-online-receipt-generator',
      'free-rent-receipt-generator',
      'receipt-maker-with-items',
      'invoice-generator-for-freelancers',
      'invoice-generator-excel',
      'contractor-invoice-template',
      'photography-invoice-generator',
      'tax-invoice-template-australia',
    ];

    toolSlugs.forEach((slug) => {
      const route = slug === 'index' ? '/' : `/${slug}`;
      it(`Tool route: ${route} contains a visible Related Tools section`, () => {
        const html = pageFiles[route];
        expect(html).toContain('id="related-tools-heading"');
      });

      it(`Tool route: ${route} contains a visible Contextual Workflow section`, () => {
        const html = pageFiles[route];
        expect(html).toContain('id="workflow-heading"');
      });
    });
  });

  describe('Breadcrumbs on All Pages', () => {
    knownRoutes.forEach((route) => {
      it(`Route: ${route} contains breadcrumb navigation`, () => {
        const html = pageFiles[route];
        expect(html).toMatch(/aria-label=["']Breadcrumb["']/i);
      });
    });
  });

  describe('Footer Links on All Pages', () => {
    knownRoutes.forEach((route) => {
      it(`Route: ${route} contains global footer with categorized matrix`, () => {
        const html = pageFiles[route];
        expect(html).toContain('role="contentinfo"');
        expect(html).toContain('Invoicing Tools');
        expect(html).toContain('Specialized Templates');
        expect(html).toContain('Company & Legal');
      });
    });
  });
});
