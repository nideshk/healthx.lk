"use client";

import { useCurrency } from "@/contexts/CurrencyContext";
import { useEffect, useState } from "react";

interface PriceProps {
    amount: number;
    className?: string;
    showCode?: boolean;
}

export default function Price({ amount, className = "", showCode = false }: PriceProps) {
    const { format, selectedCurrency } = useCurrency();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <span className={className}>Rs. {amount.toLocaleString()}</span>;
    }

    return (
        <span className={className}>
            {format(amount)}
            {showCode && selectedCurrency !== 'LKR' && (
                <span className="ml-1 text-[0.8em] font-black text-slate-400 opacity-60 uppercase">
                    {selectedCurrency}
                </span>
            )}
        </span>
    );
}
