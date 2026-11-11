"use client";

import { useCurrency } from "@/contexts/CurrencyContext";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

type CurrencyToggleProps = {
    className?: string;
    fullWidth?: boolean;
};

export default function CurrencyToggle({ className, fullWidth = false }: CurrencyToggleProps) {
    const { selectedCurrency, setCurrency, currencies, sortedCurrencies } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuStyle, setMenuStyle] = useState<{
        top?: number;
        bottom?: number;
        left: number;
        width: number;
        maxHeight: number;
    } | null>(null);

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
        if (!isOpen) return;

        const place = () => {
            const btn = buttonRef.current;
            if (!btn) return;
            const rect = btn.getBoundingClientRect();
            const margin = 8;
            const width = Math.min(280, Math.max(rect.width, 240));
            let left = fullWidth ? rect.left : rect.right - width;
            left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
            const spaceBelow = window.innerHeight - rect.bottom - margin;
            const spaceAbove = rect.top - margin;
            const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(160, Math.min(360, (openUp ? spaceAbove : spaceBelow) - margin));
            if (openUp) {
                setMenuStyle({
                    bottom: window.innerHeight - rect.top + margin,
                    left,
                    width,
                    maxHeight,
                });
            } else {
                setMenuStyle({
                    top: rect.bottom + margin,
                    left,
                    width,
                    maxHeight,
                });
            }
        };

        place();

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (dropdownRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            setIsOpen(false);
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.stopImmediatePropagation();
            setIsOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKey);
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKey);
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [isOpen, fullWidth]);

    const selectedData = currencies[selectedCurrency] || currencies.LKR;

    const menu = isOpen && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
                ref={menuRef}
                data-currency-menu="open"
                style={{
                    position: "fixed",
                    top: menuStyle.top,
                    bottom: menuStyle.bottom,
                    left: menuStyle.left,
                    width: menuStyle.width,
                    maxHeight: menuStyle.maxHeight,
                    zIndex: 80,
                }}
                className="bg-white border border-cx-border rounded-2xl p-2 shadow-lg flex flex-col"
            >
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
                <div className="overflow-y-auto custom-scrollbar min-h-0">
                    {filteredCurrencies.length > 0 ? (
                        filteredCurrencies.map((code) => {
                            const c = currencies[code];
                            return (
                                <button
                                    key={code}
                                    type="button"
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
            </div>,
            document.body,
        )
        : null;

    return (
        <div className={`relative ${fullWidth ? "w-full min-w-0" : ""} ${className ?? ""}`} ref={dropdownRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className={`inline-flex items-center gap-1.5 h-11 px-3 text-sm font-semibold text-cx-ink rounded-xl border border-cx-border bg-white ${fullWidth ? "w-full justify-between" : ""}`}
            >
                <span className="inline-flex items-center gap-1.5 min-w-0">
                    <span className="w-5 h-5 flex items-center justify-center bg-cx-tint rounded text-xs font-semibold text-cx-ink shrink-0">
                        {selectedData.symbol}
                    </span>
                    <span className="uppercase truncate">{selectedCurrency}</span>
                </span>
                <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {menu}
        </div>
    );
}
