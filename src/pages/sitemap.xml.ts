import type { APIRoute } from 'astro';

/**
 * Standard /sitemap.xml Static File Endpoint
 *
 * Provides a canonical sitemap index at /sitemap.xml pointing to Astro's
 * generated sitemap-index.xml and sitemap-0.xml for search engines, web
 * crawlers, and technical SEO monitoring tools.
 */
export const GET: APIRoute = ({ site }) => {
  const baseUrl = site ? site.origin : 'https://onlineinvoicecreator.com';
  const indexUrl = `${baseUrl}/sitemap-index.xml`;
  const sitemap0Url = `${baseUrl}/sitemap-0.xml`;
  const nowIso = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${indexUrl}</loc>
    <lastmod>${nowIso}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${sitemap0Url}</loc>
    <lastmod>${nowIso}</lastmod>
  </sitemap>
</sitemapindex>
`;

  return new Response(xml.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
