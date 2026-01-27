"use client";

import { NextIntlClientProvider } from "next-intl";

export default function LocaleProvider({
  messages,
  children,
}: {
  messages: any;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
