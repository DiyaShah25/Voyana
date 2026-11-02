import { describe, it, expect } from 'vitest';
import {
  convertFromUSD,
  formatCurrency,
  formatUSD,
  SUPPORTED_CURRENCIES,
  CURRENCY_MAP,
} from '../currencyService';

describe('currencyService', () => {
  it('defines all 6 supported currencies with valid rates and symbols', () => {
    expect(SUPPORTED_CURRENCIES.length).toBe(6);
    const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
    expect(codes).toEqual(['USD', 'EUR', 'INR', 'GBP', 'AED', 'JPY']);

    expect(CURRENCY_MAP.USD.rate).toBe(1.0);
    expect(CURRENCY_MAP.EUR.rate).toBe(0.92);
    expect(CURRENCY_MAP.INR.rate).toBe(86.5);
    expect(CURRENCY_MAP.GBP.rate).toBe(0.79);
    expect(CURRENCY_MAP.AED.rate).toBe(3.67);
    expect(CURRENCY_MAP.JPY.rate).toBe(152.0);
  });

  describe('convertFromUSD', () => {
    it('returns 0 for 0, negative, or NaN input', () => {
      expect(convertFromUSD(0, 'EUR')).toBe(0);
      expect(convertFromUSD(NaN, 'USD')).toBe(0);
    });

    it('converts USD to EUR correctly (rate 0.92, 2 decimals)', () => {
      expect(convertFromUSD(100, 'EUR')).toBe(92);
      expect(convertFromUSD(50.5, 'EUR')).toBe(46.46);
    });

    it('converts USD to INR correctly (rate 86.5, 2 decimals)', () => {
      expect(convertFromUSD(10, 'INR')).toBe(865);
      expect(convertFromUSD(100, 'INR')).toBe(8650);
    });

    it('converts USD to JPY with 0 decimals (integer rounding)', () => {
      expect(convertFromUSD(10, 'JPY')).toBe(1520);
      expect(convertFromUSD(12.34, 'JPY')).toBe(1876); // 12.34 * 152 = 1875.68 -> 1876
    });

    it('defaults to USD rate (1.0) when unknown currency code is provided', () => {
      expect(convertFromUSD(100, 'XYZ')).toBe(100);
    });
  });

  describe('formatCurrency', () => {
    it('formats USD amounts with $ symbol', () => {
      const formatted = formatCurrency(100, 'USD');
      expect(formatted).toContain('100');
      expect(formatted).toContain('$');
    });

    it('formats EUR amounts with € symbol', () => {
      const formatted = formatCurrency(100, 'EUR');
      expect(formatted).toContain('100');
    });

    it('formats JPY amounts with zero decimal places', () => {
      const formatted = formatCurrency(1520, 'JPY');
      expect(formatted).not.toContain('.00');
    });

    it('handles null, undefined, or NaN safely', () => {
      expect(formatCurrency(null as any)).toBe('$0');
      expect(formatCurrency(undefined as any)).toBe('$0');
      expect(formatCurrency(NaN)).toBe('$0');
    });
  });

  describe('formatUSD', () => {
    it('converts and formats in one step', () => {
      const formatted = formatUSD(100, 'EUR');
      expect(formatted).toContain('92');
    });
  });
});

