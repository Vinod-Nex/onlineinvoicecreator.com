/**
 * Schema.org Structured Data (JSON-LD) Generator
 *
 * Implements schema generation adhering strictly to Schema.org standards
 * and Google Search Central Rich Results guidelines.
 *
 * Requirements:
 * - Home page: Organization and WebSite
 * - Tool pages: WebApplication (free offer, applicationCategory BusinessApplication, operatingSystem Any)
 * - FAQ pages: FAQPage matching visible FAQ questions & answers
 * - Everywhere: BreadcrumbList matching visible navigation hierarchy
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface WebApplicationOptions {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  features?: string[];
  inLanguage?: string;
}

export interface PageSchemaOptions {
  canonicalUrl?: string;
  siteUrl?: string;
  title: string;
  description: string;
  isHomePage?: boolean;
  isToolPage?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  faqItems?: FAQItem[];
  customSchemas?: Record<string, unknown>[];
  webAppOptions?: Partial<WebApplicationOptions>;
  inLanguage?: string;
}

export const SITE_URL_DEFAULT = 'https://onlineinvoicecreator.com';

/**
 * Creates Schema.org Organization structured data for Online Invoice Creator.
 */
export function createOrganizationSchema(siteUrl: string = SITE_URL_DEFAULT) {
  const base = siteUrl.replace(/\/$/, '');
  return {
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: 'Online Invoice Creator',
    url: base,
    logo: {
      '@type': 'ImageObject',
      url: `${base}/favicon.svg`,
      width: 512,
      height: 512,
    },
    description:
      'Free online invoice and receipt generator. Create professional, watermark-free invoices and receipts directly in your browser with zero signup required.',
    email: 'support@onlineinvoicecreator.com',
    foundingDate: '2026',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@onlineinvoicecreator.com',
        url: `${base}/contact`,
        availableLanguage: ['en'],
      },
    ],
    knowsAbout: [
      'Invoicing Software',
      'Receipt Generation',
      'Tax Compliance',
      'Small Business Accounting',
      'Client-Side Data Privacy',
    ],
  };
}

/**
 * Creates Schema.org WebSite structured data with site name and publisher reference.
 */
export function createWebSiteSchema(siteUrl: string = SITE_URL_DEFAULT, inLanguage: string = 'en-US') {
  const base = siteUrl.replace(/\/$/, '');
  return {
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    url: base,
    name: 'Online Invoice Creator',
    alternateName: ['Free Online Invoice Generator', 'OnlineInvoiceCreator'],
    description:
      'Free online invoice and receipt generator with instant PDF download and zero watermarks.',
    publisher: {
      '@id': `${base}/#organization`,
    },
    inLanguage,
  };
}

/**
 * Creates Schema.org WebApplication structured data for in-browser tools.
 * Conforms to Google SoftwareApplication / WebApplication rich result specifications.
 */
export function createWebApplicationSchema({
  name,
  description,
  url,
  applicationCategory = 'BusinessApplication',
  operatingSystem = 'Any',
  features = [
    'Zero Watermarks',
    'Local Draft Auto-Save',
    'Instant Print & PDF Download',
    'No Signup Required',
  ],
  inLanguage,
}: WebApplicationOptions) {
  const cleanUrl = url.replace(/\/$/, '') || SITE_URL_DEFAULT;
  return {
    '@type': 'WebApplication',
    '@id': `${cleanUrl}/#webapp`,
    name,
    url: cleanUrl,
    description,
    ...(inLanguage ? { inLanguage } : {}),
    applicationCategory,
    operatingSystem,
    browserRequirements: 'Requires JavaScript and HTML5 canvas/PDF support',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: inLanguage === 'pt-BR' ? 'BRL' : 'USD',
    },
    featureList: features,
  };
}

/**
 * Creates Schema.org FAQPage structured data from visible FAQ questions and answers.
 */
export function createFAQSchema(items: FAQItem[]) {
  if (!items || items.length === 0) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Creates Schema.org BreadcrumbList structured data matching visible breadcrumbs.
 * Ensures every ListItem contains a unique, absolute URL and valid sequential position.
 */
export function createBreadcrumbSchema(
  items: BreadcrumbItem[],
  currentUrl: string,
  siteUrl: string = SITE_URL_DEFAULT
) {
  if (!items || items.length === 0) return null;

  const base = siteUrl.replace(/\/$/, '');
  const cleanCurrentUrl = currentUrl.replace(/\/$/, '') || base;

  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const isLast = index === items.length - 1;
      let targetUrl: string;

      if (item.href) {
        if (item.href.startsWith('http')) {
          targetUrl = item.href.replace(/\/$/, '');
        } else {
          const cleanPath = item.href === '/' ? '' : item.href.replace(/\/$/, '');
          targetUrl = cleanPath === '' ? base : `${base}${cleanPath}`;
        }
      } else {
        targetUrl = isLast ? cleanCurrentUrl : base;
      }

      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: targetUrl,
      };
    }),
  };
}

/**
 * Builds a unified Schema.org graph object combining all relevant schemas for a page.
 */
export function buildPageSchemaGraph(options: PageSchemaOptions): {
  '@context': string;
  '@graph': Record<string, unknown>[];
} {
  const siteUrl = options.siteUrl || SITE_URL_DEFAULT;
  const canonicalUrl = options.canonicalUrl ? options.canonicalUrl.replace(/\/$/, '') : siteUrl;
  const graph: Record<string, unknown>[] = [];

  // Home Page: Organization and WebSite
  if (options.isHomePage) {
    graph.push(createOrganizationSchema(siteUrl));
    graph.push(createWebSiteSchema(siteUrl, options.inLanguage || 'en-US'));
  }

  // Tool Page: WebApplication
  if (options.isToolPage) {
    graph.push(
      createWebApplicationSchema({
        name: options.webAppOptions?.name || options.title,
        description: options.webAppOptions?.description || options.description,
        url: canonicalUrl,
        applicationCategory: options.webAppOptions?.applicationCategory || 'BusinessApplication',
        operatingSystem: options.webAppOptions?.operatingSystem || 'Any',
        features: options.webAppOptions?.features,
        inLanguage: options.inLanguage,
      })
    );
  }

  // FAQPage on pages with FAQs
  if (options.faqItems && options.faqItems.length > 0) {
    const faqSchema = createFAQSchema(options.faqItems);
    if (faqSchema) graph.push(faqSchema);
  }

  // BreadcrumbList everywhere
  if (options.breadcrumbs && options.breadcrumbs.length > 0) {
    const breadcrumbSchema = createBreadcrumbSchema(options.breadcrumbs, canonicalUrl, siteUrl);
    if (breadcrumbSchema) graph.push(breadcrumbSchema);
  }

  // Any custom additional schemas (e.g. AboutPage, ContactPage, WebPage)
  if (options.customSchemas && options.customSchemas.length > 0) {
    options.customSchemas.forEach((s) => {
      if (s) graph.push(s);
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
