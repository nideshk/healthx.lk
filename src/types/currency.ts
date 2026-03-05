export type CurrencyCode = string;

export interface Currency {
    code: CurrencyCode;
    name: string;
    symbol: string;
    rate: number; // Rate relative to LKR (1 LKR = X foreign currency, usually it's better to store 1 foreign = X LKR, but user said "multiply that with the price", and price is in LKR, so foreign_price = LKR_price * exchange_rate)
}

export interface CurrencyContextType {
    selectedCurrency: CurrencyCode;
    setCurrency: (code: CurrencyCode) => void;
    currencies: Record<CurrencyCode, Currency>;
    sortedCurrencies: CurrencyCode[];
    convert: (amountLKR: number) => number;
    format: (amountLKR: number) => string;
    isLoading: boolean;
}
