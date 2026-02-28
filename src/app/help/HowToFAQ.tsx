"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react"; // Assuming you have lucide-react installed

export default function HowToFAQ() {
    const t = useTranslations("howto.sections");
    const [openItem, setOpenItem] = useState<string | null>(null);

    const sections = [
        "gettingStarted",
        "booking",
        "consultation",
        "payments",
        "technical",
        "clinicians"
    ];

    const toggleAccordion = (id: string) => {
        setOpenItem(openItem === id ? null : id);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-12 py-10 px-4">
            {sections.map((sectionKey) => {
                const items = t.raw(`${sectionKey}.items`) as { q: string; a: string }[];

                return (
                    <section key={sectionKey} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <span className="h-1 w-8 bg-blue-600 rounded-full" />
                            {t(`${sectionKey}.title`)}
                        </h2>

                        <div className="space-y-3">
                            {items.map((item, idx) => {
                                const itemId = `${sectionKey}-${idx}`;
                                const isOpen = openItem === itemId;

                                return (
                                    <div
                                        key={itemId}
                                        className={`border transition-all duration-200 rounded-2xl overflow-hidden ${isOpen ? "border-blue-200 shadow-sm bg-blue-50/30" : "border-slate-200 bg-white hover:border-slate-300"
                                            }`}
                                    >
                                        <button
                                            onClick={() => toggleAccordion(itemId)}
                                            className="w-full flex items-center justify-between p-5 text-left transition-colors"
                                        >
                                            <span className={`font-medium pr-4 ${isOpen ? "text-blue-700" : "text-slate-800"}`}>
                                                {item.q}
                                            </span>
                                            <ChevronDown
                                                className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-600" : ""
                                                    }`}
                                            />
                                        </button>

                                        <div
                                            className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                                }`}
                                        >
                                            <div className="overflow-hidden">
                                                <div className="p-5 pt-0 text-slate-600 leading-relaxed border-t border-blue-100/50 mt-1">
                                                    {item.a}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}