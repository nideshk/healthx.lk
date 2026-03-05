"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CurrencyCode, Currency, CurrencyContextType } from '@/types/currency';

const EXCHANGE_RATES: Record<CurrencyCode, Currency> = {
    LKR: { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs.', rate: 1 },
    USD: { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 / 295 },
    EUR: { code: 'EUR', name: 'Euro', symbol: '€', rate: 1 / 315 },
    GBP: { code: 'GBP', name: 'British Pound', symbol: '£', rate: 1 / 375 },
    AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1 / 195 },
    SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 1 / 220 },
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('LKR');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('selectedCurrency') as CurrencyCode;
        if (saved && EXCHANGE_RATES[saved]) {
            setSelectedCurrency(saved);
        }
        setMounted(true);
    }, []);

    const setCurrency = (code: CurrencyCode) => {
        setSelectedCurrency(code);
        localStorage.setItem('selectedCurrency', code);
    };

    const convert = useCallback((amountLKR: number) => {
        const currency = EXCHANGE_RATES[selectedCurrency];
        return amountLKR * currency.rate;
    }, [selectedCurrency]);

    const format = useCallback((amountLKR: number) => {
        const currency = EXCHANGE_RATES[selectedCurrency];
        const converted = amountLKR * currency.rate;

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: selectedCurrency === 'LKR' ? 'LKR' : selectedCurrency,
            currencyDisplay: 'symbol',
            minimumFractionDigits: selectedCurrency === 'LKR' ? 0 : 2,
            maximumFractionDigits: selectedCurrency === 'LKR' ? 0 : 2,
        }).format(converted).replace('LKR', 'Rs.'); // Fix for Intl.numberFormat LKR symbol
    }, [selectedCurrency]);

    const value = {
        selectedCurrency,
        setCurrency,
        currencies: EXCHANGE_RATES,
        convert,
        format,
    };

    // Skip rendering children until mounted to avoid hydration mismatch if needed
    // But usually for currency it's better to render default (LKR) first
    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
