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
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 bg-white"
            >
                <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-black text-slate-500">
                    {selectedData.symbol}
                </span>
                <span className="uppercase">{selectedCurrency}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 z-[100] animate-in fade-in zoom-in duration-200">
                    <div className="px-3 py-2">
                        <input
                            type="text"
                            placeholder="Search currency..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-medium border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50"
                            autoFocus
                        />
                    </div>
                    <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
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
                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-bold rounded-xl transition-all mb-0.5 ${selectedCurrency === code
                                            ? "bg-teal-50 text-teal-600"
                                            : "text-slate-600 hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded text-[10px] font-black text-slate-400">
                                                {c.symbol}
                                            </span>
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="leading-tight">{code}</span>
                                                <span className="text-[10px] font-medium text-slate-400 truncate w-full">{c.name}</span>
                                            </div>
                                        </div>
                                        {selectedCurrency === code && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
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
