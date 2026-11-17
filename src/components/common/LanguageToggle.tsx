"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notifyLocaleChange, readLocaleCookie } from "@/components/providers/LocaleProvider";

export default function LanguageToggle({
  compact = false,
  fullWidth = false,
  className,
}: {
  compact?: boolean;
  fullWidth?: boolean;
  className?: string;
}) {
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

  const shell = [
    "inline-flex items-center h-11 p-1 gap-1 rounded-xl border border-cx-border bg-white",
    fullWidth ? "w-full" : "w-fit",
    compact && !fullWidth ? "shrink-0" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const option = `h-full px-3 rounded-lg text-sm font-semibold whitespace-nowrap ${fullWidth ? "flex-1" : ""}`;

  return (
    <div className={shell}>
      <button
        type="button"
        onClick={() => switchLang("en")}
        className={`${option} ${lang === "en"
          ? "bg-cx-tint text-cx-primary"
          : "text-cx-ink hover:bg-cx-tint"
          }`}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => switchLang("si")}
        className={`${option} ${lang === "si"
          ? "bg-cx-tint text-cx-primary"
          : "text-cx-ink hover:bg-cx-tint"
          }`}
      >
        සිං
      </button>
    </div>
  );
}
