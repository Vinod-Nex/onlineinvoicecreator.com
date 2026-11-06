/**
 * i18n Core Module
 *
 * Central export for configurations, route mappings, translations, and dictionary helpers.
 */

import { type Locale, DEFAULT_LOCALE, isSupportedLocale } from './config';
import en from './en.json';
import ptBr from './pt-br.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';

export * from './config';
export * from './routes';

export type TranslationDictionary = typeof en;

export const DICTIONARIES: Record<Locale, TranslationDictionary> = {
  en,
  'pt-br': ptBr,
  es,
  fr,
  de,
};

/**
 * Returns the dictionary for a given locale, falling back to default locale (English).
 */
export function getDictionary(locale?: string): TranslationDictionary {
  if (locale && isSupportedLocale(locale)) {
    return DICTIONARIES[locale as Locale];
  }
  return DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Retrieves a nested translation string by dot notation path (e.g. 'buttons.downloadPdf').
 * Supports variable interpolation with {param}.
 */
export function t(
  locale: string | undefined,
  path: string,
  params?: Record<string, string | number>
): string {
  const dict = getDictionary(locale);
  const parts = path.split('.');
  let current: any = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to English dictionary if key is missing in localized dictionary
      let fallback: any = DICTIONARIES[DEFAULT_LOCALE];
      for (const p of parts) {
        if (fallback && typeof fallback === 'object' && p in fallback) {
          fallback = fallback[p];
        } else {
          fallback = undefined;
          break;
        }
      }
      current = fallback ?? path;
      break;
    }
  }

  let result = typeof current === 'string' ? current : path;

  if (params) {
    for (const [key, val] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
    }
  }

  return result;
}

