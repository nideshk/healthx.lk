import { NextIntlClientProvider } from "next-intl";
import { getLocaleFromCookie } from "@/utils/getLocale";

export default async function AppointmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocaleFromCookie();
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
