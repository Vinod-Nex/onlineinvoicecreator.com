/**
 * Canonical Route Mapping & URL Translation
 *
 * Defines the mapping from canonical page keys to translated slugs for each locale.
 * Ensures strict slug uniqueness per locale and provides helpers for localized URL
 * generation, canonical URLs, and hreflang alternates.
 */

import { type Locale, LOCALES, DEFAULT_LOCALE, isLocalePublished, LOCALE_CONFIGS } from './config';

export type RouteKey =
  | 'home'
  | 'receipt'
  | 'rent-receipt'
  | 'receipt-template'
  | 'pt-invoice-generator'
  | 'pt-estimate-generator'
  | 'pt-recibo-mei'
  | 'invoice-freelance'
  | 'invoice-excel'
  | 'contractor-invoice'
  | 'photography-invoice'
  | 'receipt-items'
  | 'tax-invoice-australia'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'changelog'
  | 'blog'
  | 'blog-freelance'
  | 'blog-pro-forma'
  | 'blog-invoice-vs-receipt'
  | 'blog-numbering';

export const ROUTES: Record<RouteKey, Record<Locale, string>> = {
  home: {
    en: '',
    'pt-br': '',
    es: '',
    fr: '',
    de: '',
  },
  receipt: {
    en: 'free-online-receipt-generator',
    'pt-br': 'gerador-de-recibo',
    es: 'generador-de-recibos',
    fr: 'generateur-de-recu',
    de: 'quittung-erstellen',
  },
  'rent-receipt': {
    en: 'free-rent-receipt-generator',
    'pt-br': 'gerador-de-recibo-de-aluguel',
    es: 'generador-de-recibos-de-alquiler',
    fr: 'generateur-de-quittance-de-loyer',
    de: 'mietquittung-erstellen',
  },
  'receipt-template': {
    en: 'receipt-template',
    'pt-br': 'modelo-de-recibo',
    es: 'modelo-de-recibos',
    fr: 'modele-de-recu',
    de: 'quittungsmuster',
  },
  'pt-invoice-generator': {
    en: 'invoice-generator-pt',
    'pt-br': 'gerador-de-fatura',
    es: 'generador-de-facturas-pt',
    fr: 'generateur-de-factures-pt',
    de: 'rechnungs-generator-pt',
  },
  'pt-estimate-generator': {
    en: 'estimate-generator-pt',
    'pt-br': 'gerador-de-orcamento',
    es: 'generador-de-presupuestos',
    fr: 'generateur-de-devis',
    de: 'kostenvoranschlag-erstellen',
  },
  'pt-recibo-mei': {
    en: 'mei-receipt',
    'pt-br': 'recibo-mei',
    es: 'recibo-autonomo',
    fr: 'recu-auto-entrepreneur',
    de: 'kleinunternehmer-quittung',
  },
  'invoice-freelance': {
    en: 'invoice-generator-for-freelancers',
    'pt-br': 'gerador-de-fatura-para-freelancers',
    es: 'generador-de-facturas-para-freelancers',
    fr: 'generateur-de-facture-freelance',
    de: 'rechnungsprogramm-fuer-freiberufler',
  },
  'invoice-excel': {
    en: 'invoice-generator-excel',
    'pt-br': 'gerador-de-fatura-excel',
    es: 'generador-de-facturas-excel',
    fr: 'generateur-de-facture-excel',
    de: 'rechnungsvorlage-excel',
  },
  'contractor-invoice': {
    en: 'contractor-invoice-template',
    'pt-br': 'modelo-de-fatura-de-prestador-de-servicos',
    es: 'plantilla-de-factura-para-contratistas',
    fr: 'modele-de-facture-auto-entrepreneur',
    de: 'rechnungsvorlage-fuer-dienstleister',
  },
  'photography-invoice': {
    en: 'photography-invoice-generator',
    'pt-br': 'gerador-de-fatura-para-fotografos',
    es: 'generador-de-facturas-para-fotografos',
    fr: 'generateur-de-facture-photographe',
    de: 'rechnungsvorlage-fotograf',
  },
  'receipt-items': {
    en: 'receipt-maker-with-items',
    'pt-br': 'criador-de-recibo-com-itens',
    es: 'creador-de-recibos-con-articulos',
    fr: 'createur-de-recu-detaille',
    de: 'quittung-mit-artikeln',
  },
  'tax-invoice-australia': {
    en: 'tax-invoice-template-australia',
    'pt-br': 'modelo-de-fatura-fiscal-australia',
    es: 'plantilla-de-factura-fiscal-australia',
    fr: 'modele-de-facture-fiscale-australie',
    de: 'steuerrechnungsvorlage-australien',
  },
  about: {
    en: 'about',
    'pt-br': 'sobre',
    es: 'sobre-nosotros',
    fr: 'a-propos',
    de: 'ueber-uns',
  },
  contact: {
    en: 'contact',
    'pt-br': 'contato',
    es: 'contacto',
    fr: 'contact',
    de: 'kontakt',
  },
  privacy: {
    en: 'privacy',
    'pt-br': 'privacidade',
    es: 'privacidad',
    fr: 'confidentialite',
    de: 'datenschutz',
  },
  terms: {
    en: 'terms',
    'pt-br': 'termos',
    es: 'terminos',
    fr: 'conditions',
    de: 'agb',
  },
  changelog: {
    en: 'changelog',
    'pt-br': 'atualizacoes',
    es: 'cambios',
    fr: 'journal-des-modifications',
    de: 'aenderungsprotokoll',
  },
  blog: {
    en: 'blog',
    'pt-br': 'blog',
    es: 'articulos',
    fr: 'guides',
    de: 'magazin',
  },
  'blog-freelance': {
    en: 'blog/how-to-write-an-invoice-for-freelance-work',
    'pt-br': 'blog/como-fazer-uma-fatura-freelancer',
    es: 'articulos/como-hacer-una-factura-freelance',
    fr: 'guides/comment-faire-une-facture-freelance',
    de: 'magazin/rechnung-schreiben-freiberufler',
  },
  'blog-pro-forma': {
    en: 'blog/what-is-a-pro-forma-invoice',
    'pt-br': 'blog/o-que-e-uma-fatura-pro-forma',
    es: 'articulos/que-es-una-factura-proforma',
    fr: 'guides/qu-est-ce-qu-une-facture-pro-forma',
    de: 'magazin/was-ist-eine-proforma-rechnung',
  },
  'blog-invoice-vs-receipt': {
    en: 'blog/invoice-vs-receipt',
    'pt-br': 'blog/fatura-vs-recibo',
    es: 'articulos/factura-vs-recibo',
    fr: 'guides/facture-ou-recu',
    de: 'magazin/rechnung-vs-quittung',
  },
  'blog-numbering': {
    en: 'blog/how-to-number-invoices',
    'pt-br': 'blog/como-numerar-faturas',
    es: 'articulos/como-numerar-facturas',
    fr: 'guides/comment-numeroter-les-factures',
    de: 'magazin/rechnungsnummern-vergeben',
  },
};

/**
 * Returns the slug for a route key in a specified locale.
 */
export function getRouteSlug(key: RouteKey, locale: Locale = DEFAULT_LOCALE): string {
  const mapping = ROUTES[key];
  if (!mapping) return '';
  return mapping[locale] ?? mapping[DEFAULT_LOCALE] ?? '';
}

/**
 * Returns the normalized URL path for a route key in a specified locale.
 * Default locale (en) has no prefix. Other locales are prefixed with /locale/.
 * Follows trailingSlash: 'never'.
 */
export function getRouteUrl(key: RouteKey, locale: Locale = DEFAULT_LOCALE): string {
  const slug = getRouteSlug(key, locale);
  if (locale === DEFAULT_LOCALE) {
    return slug ? `/${slug}` : '/';
  }
  return slug ? `/${locale}/${slug}` : `/${locale}`;
}

/**
 * Resolves the canonical RouteKey and Locale from a given URL pathname.
 */
export function getRouteKeyFromPath(pathname: string): { key: RouteKey; locale: Locale } | undefined {
  const clean = pathname.replace(/\/$/, '').replace(/^\//, '');

  // Check if starts with a supported non-default locale prefix
  for (const loc of LOCALES) {
    if (loc === DEFAULT_LOCALE) continue;
    if (clean === loc) {
      return { key: 'home', locale: loc };
    }
    if (clean.startsWith(`${loc}/`)) {
      const rest = clean.slice(loc.length + 1);
      for (const [key, slugs] of Object.entries(ROUTES) as [RouteKey, Record<Locale, string>][]) {
        if (slugs[loc] === rest) {
          return { key, locale: loc };
        }
      }
    }
  }

  // Default locale (en)
  if (clean === '') {
    return { key: 'home', locale: DEFAULT_LOCALE };
  }

  for (const [key, slugs] of Object.entries(ROUTES) as [RouteKey, Record<Locale, string>][]) {
    if (slugs[DEFAULT_LOCALE] === clean) {
      return { key, locale: DEFAULT_LOCALE };
    }
  }

  return undefined;
}

/**
 * Registry of routes that actually exist (are built and published) in each locale.
 * Ensures hreflang alternates are strictly reciprocal and only point to pages that actually exist.
 */
export const BUILT_ROUTES: Record<Locale, Set<RouteKey>> = {
  en: new Set<RouteKey>([
    'home',
    'receipt',
    'rent-receipt',
    'invoice-freelance',
    'invoice-excel',
    'contractor-invoice',
    'photography-invoice',
    'receipt-items',
    'tax-invoice-australia',
    'about',
    'contact',
    'privacy',
    'terms',
    'changelog',
    'blog',
    'blog-freelance',
    'blog-pro-forma',
    'blog-invoice-vs-receipt',
    'blog-numbering',
  ]),
  'pt-br': new Set<RouteKey>([
    'home',
    'receipt',
    'rent-receipt',
    'receipt-template',
    'about',
    'contact',
    'privacy',
    'terms',
  ]),
  es: new Set<RouteKey>(['home', 'about', 'contact', 'privacy', 'terms']),
  fr: new Set<RouteKey>(['home', 'about', 'contact', 'privacy', 'terms']),
  de: new Set<RouteKey>(['home', 'about', 'contact', 'privacy', 'terms']),
};

/**
 * Generates hreflang alternate links for SEO.
 * ONLY includes published locales that actually have the route built, plus x-default.
 */
export function getHreflangAlternates(
  routeKey: RouteKey,
  siteUrl = 'https://onlineinvoicecreator.com'
): Array<{ lang: string; href: string }> {
  const base = siteUrl.replace(/\/$/, '');
  const alternates: Array<{ lang: string; href: string }> = [];

  // English URL if built in English
  const isBuiltInEn = BUILT_ROUTES.en.has(routeKey);
  const enUrl = isBuiltInEn ? `${base}${getRouteUrl(routeKey, 'en')}` : `${base}/`;

  // Published locales that have this route built
  for (const loc of LOCALES) {
    if (isLocalePublished(loc) && BUILT_ROUTES[loc].has(routeKey)) {
      const config = LOCALE_CONFIGS[loc];
      const localizedUrl = `${base}${getRouteUrl(routeKey, loc)}`;
      alternates.push({
        lang: config.lang,
        href: localizedUrl,
      });
    }
  }

  // x-default always points to the English version
  alternates.push({
    lang: 'x-default',
    href: enUrl,
  });

  return alternates;
}

/**
 * Given the current pathname and a target locale:
 * 1. Resolves the current page's RouteKey.
 * 2. If the RouteKey exists in the target locale and is built, returns the translated URL.
 * 3. If no equivalent exists, falls back to the target locale's homepage.
 */
export function getLocalizedEquivalentUrl(currentPathname: string, targetLocale: Locale): string {
  const resolved = getRouteKeyFromPath(currentPathname);
  if (resolved && BUILT_ROUTES[targetLocale].has(resolved.key)) {
    return getRouteUrl(resolved.key, targetLocale);
  }
  // Fallback to target locale home
  return targetLocale === DEFAULT_LOCALE ? '/' : `/${targetLocale}`;
}

