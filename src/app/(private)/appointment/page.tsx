import AppointmentBookingFlow from '@/components/flow/AppointmentBookingFlow';
import { NextIntlClientProvider } from 'next-intl';
import { getLocaleFromCookie } from '@/utils/getLocale';

export default async function AppointmentPage() {
  const locale = await getLocaleFromCookie();
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppointmentBookingFlow />
    </NextIntlClientProvider>
  );
}
