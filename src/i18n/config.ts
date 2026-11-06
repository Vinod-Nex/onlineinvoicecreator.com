/**
 * Internationalization (i18n) Configuration
 *
 * Defines supported locales, display names in their native languages,
 * publication status, and locale-specific defaults.
 */

export type Locale = 'en' | 'pt-br' | 'es' | 'fr' | 'de';

export interface LocaleConfig {
  code: Locale;
  /** BCP-47 language tag for <html lang="..."> and JSON-LD inLanguage */
  lang: string;
  /** Display name written in the language itself */
  displayName: string;
  /**
   * Published flag:
   * When false, the locale must NOT appear in sitemaps, hreflang tags,
   * language switchers, or any public links, and its routes must not be built.
   */
  published: boolean;
  /** Default currency setting for invoice generation */
  defaultCurrency: string;
  /** Regional formatting locale for numbers, dates, and currencies */
  regionalFormat: string;
  /** Text direction */
  dir: 'ltr' | 'rtl';
  /** Open Graph locale tag (e.g. en_US, pt_BR) */
  ogLocale: string;
}

export const LOCALES: readonly Locale[] = ['en', 'pt-br', 'es', 'fr', 'de'] as const;

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  en: {
    code: 'en',
    lang: 'en',
    displayName: 'English',
    published: true, // Live default
    defaultCurrency: 'USD',
    regionalFormat: 'en-US',
    dir: 'ltr',
    ogLocale: 'en_US',
  },
  'pt-br': {
    code: 'pt-br',
    lang: 'pt-BR',
    displayName: 'Português (Brasil)',
    published: true, // Published Brazilian Portuguese version
    defaultCurrency: 'BRL',
    regionalFormat: 'pt-BR',
    dir: 'ltr',
    ogLocale: 'pt_BR',
  },
  es: {
    code: 'es',
    lang: 'es',
    displayName: 'Español',
    published: false, // Ready for subsequent language prompt
    defaultCurrency: 'EUR',
    regionalFormat: 'es-ES',
    dir: 'ltr',
    ogLocale: 'es_ES',
  },
  fr: {
    code: 'fr',
    lang: 'fr',
    displayName: 'Français',
    published: false, // Ready for subsequent language prompt
    defaultCurrency: 'EUR',
    regionalFormat: 'fr-FR',
    dir: 'ltr',
    ogLocale: 'fr_FR',
  },
  de: {
    code: 'de',
    lang: 'de',
    displayName: 'Deutsch',
    published: false, // Ready for subsequent language prompt
    defaultCurrency: 'EUR',
    regionalFormat: 'de-DE',
    dir: 'ltr',
    ogLocale: 'de_DE',
  },
};

/**
 * Returns an array of locales that have published === true.
 */
export function getPublishedLocales(): Locale[] {
  return LOCALES.filter((loc) => LOCALE_CONFIGS[loc].published);
}

/**
 * Checks if a given locale string is currently published.
 */
export function isLocalePublished(locale: string): boolean {
  if (!isSupportedLocale(locale)) return false;
  return LOCALE_CONFIGS[locale].published;
}

/**
 * Type guard to check if a string is a supported locale code.
 */
export function isSupportedLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale.toLowerCase() as Locale);
}

/**
 * Gets the configuration for a given locale, falling back to default locale.
 */
export function getLocaleConfig(locale?: string): LocaleConfig {
  if (locale && isSupportedLocale(locale)) {
    return LOCALE_CONFIGS[locale.toLowerCase() as Locale];
  }
  return LOCALE_CONFIGS[DEFAULT_LOCALE];
}

