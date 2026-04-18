"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { CurrencyCode, Currency, CurrencyContextType } from '@/types/currency';

const INITIAL_EXCHANGE_RATES: Record<string, Currency> = {
    LKR: { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs.', rate: 1 },
    USD: { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 / 310 },
    EUR: { code: 'EUR', name: 'Euro', symbol: '€', rate: 1 / 328 },
    GBP: { code: 'GBP', name: 'British Pound', symbol: '£', rate: 1 / 392 },
    AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1 / 202 },
};

// Common currencies to prioritize in list
const PRIORITY_CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP', 'AUD', 'SGD', 'CAD', 'AED', 'SAR', 'JPY'];

const CACHE_KEY = 'exchangeRatesCache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheData {
    rates: Record<string, number>;
    timestamp: number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const COUNTRY_TO_CURRENCY: Record<string, string> = {
    'LK': 'LKR', 'US': 'USD', 'GB': 'GBP', 'AU': 'AUD', 'SG': 'SGD',
    'CA': 'CAD', 'AE': 'AED', 'SA': 'SAR', 'JP': 'JPY', 'IN': 'INR',
    'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NZ': 'NZD',
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('LKR');
    const [currencies, setCurrencies] = useState<Record<string, Currency>>(INITIAL_EXCHANGE_RATES);
    const [isLoading, setIsLoading] = useState(true);

    const updateRatesFromApi = useCallback((apiRates: Record<string, number>) => {
        const displayNames = new Intl.DisplayNames(['en'], { type: 'currency' });

        setCurrencies(prev => {
            const next: Record<string, Currency> = { ...prev };

            Object.entries(apiRates).forEach(([code, rate]) => {
                // If it exists in initial/prev, just update rate
                if (next[code]) {
                    next[code] = { ...next[code], rate };
                } else {
                    // Create new currency entry
                    try {
                        const name = displayNames.of(code) || code;
                        // Try to get symbol using Intl
                        const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: code });
                        const symbol = formatter.format(0).replace(/[0-9.,\s-]/g, '') || code;

                        next[code] = {
                            code,
                            name,
                            symbol,
                            rate
                        };
                    } catch (e) {
                        // Fallback if code isn't valid for Intl
                        next[code] = {
                            code,
                            name: code,
                            symbol: code,
                            rate
                        };
                    }
                }
            });

            return next;
        });
    }, []);

    const detectCurrencyClient = useCallback(async () => {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.country_code) {
                const detected = COUNTRY_TO_CURRENCY[data.country_code] || 'LKR';
                setSelectedCurrency(detected);
            }
        } catch (e) {
            console.error('[Currency] Client-side detection failed:', e);
        }
    }, []);

    const fetchRates = useCallback(async () => {
        setIsLoading(true);
        try {
            const manualChoice = localStorage.getItem('selectedCurrency');

            // 1. Check cache for rates
            const cached = localStorage.getItem(CACHE_KEY);
            let ratesUpdated = false;

            if (cached) {
                const { rates, timestamp }: CacheData = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL) {
                    updateRatesFromApi(rates);
                    ratesUpdated = true;
                }
            }

            // 2. Fetch fresh rates if needed
            if (!ratesUpdated) {
                const response = await fetch('/api/currency');
                const data = await response.json();
                if (data.rates) {
                    updateRatesFromApi(data.rates);
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        rates: data.rates,
                        timestamp: Date.now()
                    }));
                }
            }

            // 3. Handle initial currency selection (detection)
            if (!manualChoice) {
                await detectCurrencyClient();
            } else {
                setSelectedCurrency(manualChoice as CurrencyCode);
            }

        } catch (error) {
            console.error('Failed to resolve currency setup:', error);
        } finally {
            setIsLoading(false);
        }
    }, [updateRatesFromApi, detectCurrencyClient]);

    useEffect(() => {
        fetchRates();
    }, [fetchRates]);

    const setCurrency = (code: CurrencyCode) => {
        setSelectedCurrency(code);
        localStorage.setItem('selectedCurrency', code);
    };

    const convert = useCallback((amountLKR: number) => {
        const currency = currencies[selectedCurrency] || INITIAL_EXCHANGE_RATES.LKR;
        return amountLKR * currency.rate;
    }, [selectedCurrency, currencies]);

    const format = useCallback((amountLKR: number) => {
        const currency = currencies[selectedCurrency] || INITIAL_EXCHANGE_RATES.LKR;
        const converted = amountLKR * currency.rate;

        // Special handling for LKR symbol fix
        if (selectedCurrency === 'LKR') {
            return `Rs. ${Math.round(converted).toLocaleString()}`;
        }

        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: selectedCurrency,
                currencyDisplay: 'symbol',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(converted);
        } catch (e) {
            // Fallback for codes that Intl doesn't like or fail
            return `${currency.symbol} ${converted.toFixed(2)}`;
        }
    }, [selectedCurrency, currencies]);

    // Derived sorted list for UI usage if needed
    const sortedCurrencies = useMemo(() => {
        const allCodes = Object.keys(currencies);
        const priority = PRIORITY_CURRENCIES.filter(c => allCodes.includes(c));
        const others = allCodes.filter(c => !PRIORITY_CURRENCIES.includes(c)).sort();
        return [...priority, ...others];
    }, [currencies]);

    const value = useMemo(() => ({
        selectedCurrency,
        setCurrency,
        currencies,
        sortedCurrencies,
        convert,
        format,
        isLoading,
    }), [selectedCurrency, currencies, sortedCurrencies, convert, format, isLoading]);

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
