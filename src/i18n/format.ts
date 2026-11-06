/**
 * Locale-Aware Formatting Utilities
 *
 * All dates, numbers, and currencies must go through standard Intl APIs
 * using the page locale or an explicit regional format override.
 * Hardcoded separators (commas, dots, spaces) are strictly prohibited.
 */

import { getLocaleConfig, type Locale } from './config';

/**
 * Formats a monetary amount using Intl.NumberFormat according to the given locale and currency.
 * Currency default per locale is a setting, not a fixed rule.
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      currencyDisplay: 'narrowSymbol',
    }).format(safeAmount);
  } catch {
    // Fallback if currency code is unrecognized
    return `${currency.toUpperCase()} ${safeAmount.toFixed(2)}`;
  }
}

/**
 * Formats a numeric value with specified decimal precision using Intl.NumberFormat.
 * Locale-specific thousands and decimal separators are automatically applied.
 */
export function formatNumber(
  value: number,
  decimals = 2,
  locale = 'en-US'
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(safeValue);
  } catch {
    return safeValue.toFixed(decimals);
  }
}

/**
 * Formats a percentage value (e.g. 10 -> "10%" in en-US or "10 %" in fr-FR) using Intl.
 */
export function formatPercentage(
  rate: number,
  locale = 'en-US'
): string {
  const safeRate = Number.isFinite(rate) ? rate / 100 : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(safeRate);
  } catch {
    return `${(rate || 0).toFixed(2)}%`;
  }
}

/**
 * Formats a Date object or ISO string according to the given locale.
 */
export function formatDate(
  date: Date | string,
  locale = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return typeof date === 'string' ? date : date.toISOString().split('T')[0];
  }
}

/**
 * Resolves the effective formatting locale, allowing for a regional format override.
 */
export function resolveFormattingLocale(
  pageLocale: Locale | string = 'en',
  regionalOverride?: string
): string {
  if (regionalOverride && regionalOverride.trim()) {
    return regionalOverride.trim();
  }
  return getLocaleConfig(pageLocale).regionalFormat;
}

