"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState } from "react";
import en from "@/messages/en.json";

// Catalogs include arrays (FAQ items). next-intl accepts them at runtime;
// its exported message type does not, so the provider state stays untyped.
type MessageCatalog = Record<string, unknown>;

export type AppLocale = "en" | "si";

export function readLocaleCookie(): AppLocale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/locale=(en|si)/);
  return match?.[1] === "si" ? "si" : "en";
}

export const LOCALE_CHANGE_EVENT = "clinecxa-locale-change";

export function notifyLocaleChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}

/**
 * Locale is resolved on the client so the root layout does not call cookies().
 * The server render (and the first client render) is English, which keeps
 * hydration stable. A stored Sinhala cookie is applied after mount.
 */
export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<AppLocale>("en");
  const [messages, setMessages] = useState<MessageCatalog>(
    en as unknown as MessageCatalog
  );

  useEffect(() => {
    let request = 0;

    async function applyLocale() {
      const current = ++request;
      const next = readLocaleCookie();
      if (next === "si") {
        const mod = await import("@/messages/si.json");
        if (current !== request) return;
        setMessages(mod.default as unknown as MessageCatalog);
        setLocale("si");
        document.documentElement.lang = "si";
        return;
      }

      if (current !== request) return;
      setMessages(en as unknown as MessageCatalog);
      setLocale("en");
      document.documentElement.lang = "en";
    }

    void applyLocale();
    window.addEventListener(LOCALE_CHANGE_EVENT, applyLocale);
    return () => {
      request += 1;
      window.removeEventListener(LOCALE_CHANGE_EVENT, applyLocale);
    };
  }, []);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages as never}
      timeZone="Asia/Colombo"
    >
      {children}
    </NextIntlClientProvider>
  );
}
