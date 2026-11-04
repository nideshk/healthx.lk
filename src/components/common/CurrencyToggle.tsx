"use client";

import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyCode } from "@/types/currency";
import { ChevronDown, Globe } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";

export default function CurrencyToggle() {
    const { selectedCurrency, setCurrency, currencies, sortedCurrencies } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredCurrencies = useMemo(() => {
        return sortedCurrencies.filter(code => {
            const c = currencies[code];
            return code.toLowerCase().includes(search.toLowerCase()) ||
                c.name.toLowerCase().includes(search.toLowerCase());
        });
    }, [sortedCurrencies, currencies, search]);

    useEffect(() => {
        if (!isOpen) setSearch("");
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedData = currencies[selectedCurrency] || currencies.LKR;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 min-h-12 px-3 text-base font-semibold text-cx-ink hover:bg-cx-tint rounded-xl border border-cx-border bg-white"
            >
                    <span className="w-5 h-5 flex items-center justify-center bg-cx-tint rounded text-xs font-semibold text-cx-ink">
                    {selectedData.symbol}
                </span>
                <span className="uppercase">{selectedCurrency}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-cx-border rounded-2xl p-2 z-[100]">
                    <div className="px-3 py-2">
                        <input
                            type="text"
                            placeholder="Search currency..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 text-base font-medium border border-cx-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cx-primary bg-cx-bg text-cx-ink"
                            autoFocus
                        />
                    </div>
                    <div className="px-3 py-2 text-sm font-semibold text-cx-ink border-b border-cx-border mb-1">
                        Select Currency
                    </div>
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                        {filteredCurrencies.length > 0 ? (
                            filteredCurrencies.map((code) => {
                                const c = currencies[code];
                                return (
                                    <button
                                        key={code}
                                        onClick={() => {
                                            setCurrency(code);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-3 min-h-12 text-base font-semibold rounded-xl mb-0.5 ${selectedCurrency === code
                                            ? "bg-cx-tint text-cx-primary"
                                            : "text-cx-ink hover:bg-cx-tint"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-cx-tint rounded text-xs font-semibold text-cx-ink">
                                                {c.symbol}
                                            </span>
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="leading-tight">{code}</span>
                                                <span className="text-sm font-medium text-cx-ink truncate w-full">{c.name}</span>
                                            </div>
                                        </div>
                                        {selectedCurrency === code && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-cx-primary flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="px-3 py-8 text-center text-xs text-slate-400 font-medium">
                                No currencies found for "{search}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
