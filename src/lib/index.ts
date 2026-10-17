/**
 * Core utility functions and invoice calculation helpers
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  position: 'prefix' | 'suffix';
  decimals: number;
}

export function formatCurrency(amount: number, config: CurrencyConfig): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  return config.position === 'prefix'
    ? `${config.symbol}${formatted}`
    : `${formatted} ${config.symbol}`;
}
