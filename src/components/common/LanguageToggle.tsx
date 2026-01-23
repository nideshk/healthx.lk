"use client";

import { useEffect, useState } from "react";

export default function LanguageToggle() {
  const [lang, setLang] = useState<"en" | "si">("en");

  useEffect(() => {
    const match = document.cookie.match(/locale=(en|si)/);
    if (match) setLang(match[1] as "en" | "si");
  }, []);

  const switchLang = (next: "en" | "si") => {
    document.cookie = `locale=${next}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
      <button
        onClick={() => switchLang("en")}
        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
          lang === "en"
            ? "bg-blue-600 text-white"
            : "text-slate-600 hover:bg-white"
        }`}
      >
        EN
      </button>

      <button
        onClick={() => switchLang("si")}
        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
          lang === "si"
            ? "bg-blue-600 text-white"
            : "text-slate-600 hover:bg-white"
        }`}
      >
        සිං
      </button>
    </div>
  );
}
