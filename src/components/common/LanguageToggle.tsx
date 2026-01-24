"use client";

import { useEffect, useState } from "react";

export default function LanguageToggle() {
  const [lang, setLang] = useState<"en" | "si">("en");

  useEffect(() => {
    const match = document.cookie.match(/locale=(en|si)/);
    if (match) setLang(match[1] as "en" | "si");
  }, []);

  const switchLang = (next: "en" | "si") => {
    if (lang === next) return;
    document.cookie = `locale=${next}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 w-fit">
      <button
        onClick={() => switchLang("en")}
        className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all duration-200 ${lang === "en"
            ? "bg-white text-teal-600 shadow-sm ring-1 ring-slate-200/50"
            : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
          }`}
      >
        EN
      </button>

      <button
        onClick={() => switchLang("si")}
        className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all duration-200 ${lang === "si"
            ? "bg-white text-teal-600 shadow-sm ring-1 ring-slate-200/50"
            : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
          }`}
      >
        සිං
      </button>
    </div>
  );
}