export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const TOP_30_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2 },
  { code: 'CNY', symbol: 'CN¥', name: 'Chinese Yuan', decimals: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar', decimals: 2 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2 },
  { code: 'SEK', symbol: 'SEK', name: 'Swedish Krona', decimals: 2 },
  { code: 'NOK', symbol: 'NOK', name: 'Norwegian Krone', decimals: 2 },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', decimals: 2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2 },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', decimals: 2 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', decimals: 2 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', decimals: 2 },
  { code: 'DKK', symbol: 'DKK', name: 'Danish Krone', decimals: 2 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimals: 2 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 0 },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', decimals: 2 },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', decimals: 2 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0 },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', decimals: 0 },
];
