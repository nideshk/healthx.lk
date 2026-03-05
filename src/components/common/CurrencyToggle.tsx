"use client";

import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyCode } from "@/types/currency";
import { ChevronDown, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function CurrencyToggle() {
    const { selectedCurrency, setCurrency, currencies } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 bg-white"
            >
                <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-black text-slate-500">
                    {currencies[selectedCurrency].symbol}
                </span>
                <span className="uppercase">{selectedCurrency}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 z-[100] animate-in fade-in zoom-in duration-200">
                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                        Select Currency
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {(Object.keys(currencies) as CurrencyCode[]).map((code) => (
                            <button
                                key={code}
                                onClick={() => {
                                    setCurrency(code);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold rounded-xl transition-all ${selectedCurrency === code
                                        ? "bg-teal-50 text-teal-600"
                                        : "text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-black text-slate-400">
                                        {currencies[code].symbol}
                                    </span>
                                    <span>{code}</span>
                                </div>
                                {selectedCurrency === code && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
