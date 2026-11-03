/**
 * Global Currency Context & Hook
 * Provides application-wide state for the user's active currency,
 * initialized from localStorage or logged-in user preferences.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  type SupportedCurrency,
  type CurrencyConfig,
  SUPPORTED_CURRENCIES,
  CURRENCY_MAP,
  convertFromUSD as serviceConvertFromUSD,
  formatCurrency as serviceFormatCurrency,
  formatUSD as serviceFormatUSD,
} from '@/services/currencyService';

const STORAGE_KEY = 'voyana_preferred_currency';

interface CurrencyContextType {
  currency: SupportedCurrency;
  setCurrency: (code: SupportedCurrency) => void;
  currencyConfig: CurrencyConfig;
  supportedCurrencies: CurrencyConfig[];
  convertFromUSD: (amountUSD: number) => number;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  formatUSD: (amountUSD: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Initialize from localStorage first, then fallback to user's profile preference, else USD
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && CURRENCY_MAP[stored as SupportedCurrency]) {
        return stored as SupportedCurrency;
      }
    } catch (_e) {}
    return 'USD';
  });

  // Sync from user profile preference if user logs in and no prior localStorage override exists
  useEffect(() => {
    const userPref = user?.preferences?.preferredCurrency as SupportedCurrency | undefined;
    if (userPref && CURRENCY_MAP[userPref]) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setCurrencyState(userPref);
        localStorage.setItem(STORAGE_KEY, userPref);
      }
    }
  }, [user?.preferences?.preferredCurrency]);

  const setCurrency = useCallback((code: SupportedCurrency) => {
    if (CURRENCY_MAP[code]) {
      setCurrencyState(code);
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch (_e) {}
    }
  }, []);

  const currencyConfig = useMemo(() => CURRENCY_MAP[currency] || CURRENCY_MAP.USD, [currency]);

  const convert = useCallback(
    (amountUSD: number) => serviceConvertFromUSD(amountUSD, currency),
    [currency]
  );

  const format = useCallback(
    (amount: number, currencyCode?: string) =>
      serviceFormatCurrency(amount, currencyCode || currency),
    [currency]
  );

  const formatFromUSD = useCallback(
    (amountUSD: number) => serviceFormatUSD(amountUSD, currency),
    [currency]
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      currencyConfig,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      convertFromUSD: convert,
      formatCurrency: format,
      formatUSD: formatFromUSD,
    }),
    [currency, setCurrency, currencyConfig, convert, format, formatFromUSD]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
