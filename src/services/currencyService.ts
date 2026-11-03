/**
 * Global Currency Exchange & Formatting Service
 * Provides static indicative offline exchange rates (USD base),
 * conversion functions, and Intl.NumberFormat localization.
 */

export type SupportedCurrency = 'USD' | 'EUR' | 'INR' | 'GBP' | 'AED' | 'JPY';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  label: string;
  rate: number; // Indicative offline exchange rate: 1 USD = rate in target currency
  decimals: number;
}

/**
 * Static Indicative Offline Exchange Rates Table (USD Base)
 * Rates are calibrated for realistic conversion without requiring live network APIs.
 */
export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', label: 'USD ($) - US Dollar', rate: 1.0, decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', label: 'EUR (€) - Euro', rate: 0.92, decimals: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', label: 'INR (₹) - Indian Rupee', rate: 86.5, decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', label: 'GBP (£) - British Pound', rate: 0.79, decimals: 2 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', label: 'AED (د.إ) - UAE Dirham', rate: 3.67, decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', label: 'JPY (¥) - Japanese Yen', rate: 152.0, decimals: 0 },
];

export const CURRENCY_MAP: Record<SupportedCurrency, CurrencyConfig> = SUPPORTED_CURRENCIES.reduce(
  (acc, curr) => {
    acc[curr.code] = curr;
    return acc;
  },
  {} as Record<SupportedCurrency, CurrencyConfig>
);

const LOCALE_MAP: Record<SupportedCurrency, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  INR: 'en-IN',
  GBP: 'en-GB',
  AED: 'en-AE',
  JPY: 'ja-JP',
};

/**
 * Convert a base USD amount to target currency using static indicative rate table.
 * JPY is rounded to nearest integer (0 decimals), while others round to 2 decimals.
 */
export function convertFromUSD(amountUSD: number, targetCurrency: string): number {
  if (!amountUSD || isNaN(amountUSD)) return 0;
  const upper = (targetCurrency || 'USD').toUpperCase() as SupportedCurrency;
  const config = CURRENCY_MAP[upper] || CURRENCY_MAP.USD;
  const converted = amountUSD * config.rate;

  if (config.decimals === 0) {
    return Math.round(converted);
  }
  return Math.round(converted * 100) / 100;
}

/**
 * Format any currency amount using Intl.NumberFormat with correct locale, symbol, and decimals.
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0';
  const upper = (currency || 'USD').toUpperCase() as SupportedCurrency;
  const config = CURRENCY_MAP[upper] || CURRENCY_MAP.USD;
  const locale = LOCALE_MAP[upper] || 'en-US';

  const isJPY = upper === 'JPY';
  const decimals = isJPY ? 0 : (amount % 1 === 0 ? 0 : 2);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: upper,
      minimumFractionDigits: decimals,
      maximumFractionDigits: isJPY ? 0 : 2,
    }).format(amount);
  } catch (_err) {
    return `${config.symbol}${amount.toLocaleString()}`;
  }
}

/**
 * Convert a base USD amount and immediately format it into target currency string.
 */
export function formatUSD(amountUSD: number, targetCurrency: string = 'USD'): string {
  const converted = convertFromUSD(amountUSD, targetCurrency);
  return formatCurrency(converted, targetCurrency);
}
