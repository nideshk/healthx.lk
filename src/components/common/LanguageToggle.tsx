"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notifyLocaleChange, readLocaleCookie } from "@/components/providers/LocaleProvider";

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const [lang, setLang] = useState<"en" | "si">("en");
  const router = useRouter();

  useEffect(() => {
    setLang(readLocaleCookie());
  }, []);

  const switchLang = (next: "en" | "si") => {
    if (lang === next) return;
    document.cookie = `locale=${next}; path=/; max-age=31536000`;
    setLang(next);
    notifyLocaleChange();

    // Refresh server components that still read the locale cookie.
    router.refresh();
  };

  const shell = compact
    ? "flex items-center gap-0.5 bg-cx-tint p-0.5 rounded-lg w-fit shrink-0"
    : "flex items-center gap-1 bg-cx-tint p-1 rounded-xl w-fit";
  const option = compact
    ? "min-h-11 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap"
    : "min-h-12 px-4 py-2 rounded-lg text-sm font-semibold";

  return (
    <div className={shell}>
      <button
        type="button"
        onClick={() => switchLang("en")}
        className={`${option} ${lang === "en"
          ? "bg-white text-cx-primary"
          : "text-cx-ink hover:bg-white"
          }`}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => switchLang("si")}
        className={`${option} ${lang === "si"
          ? "bg-white text-cx-primary"
          : "text-cx-ink hover:bg-white"
          }`}
      >
        සිං
      </button>
    </div>
  );
}