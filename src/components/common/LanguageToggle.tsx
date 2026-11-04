"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notifyLocaleChange, readLocaleCookie } from "@/components/providers/LocaleProvider";

export default function LanguageToggle() {
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

  return (
    <div className="flex items-center gap-1 bg-cx-tint p-1 rounded-xl w-fit">
      <button
        type="button"
        onClick={() => switchLang("en")}
        className={`min-h-12 px-4 py-2 rounded-lg text-sm font-semibold ${lang === "en"
          ? "bg-white text-cx-primary"
          : "text-cx-ink hover:bg-white"
          }`}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => switchLang("si")}
        className={`min-h-12 px-4 py-2 rounded-lg text-sm font-semibold ${lang === "si"
          ? "bg-white text-cx-primary"
          : "text-cx-ink hover:bg-white"
          }`}
      >
        සිං
      </button>
    </div>
  );
}