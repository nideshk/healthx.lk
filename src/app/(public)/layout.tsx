import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getLocaleFromCookie } from "@/utils/getLocale";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocaleFromCookie();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
