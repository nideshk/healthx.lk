import AppointmentBookingFlow from '@/components/flow/AppointmentBookingFlow';
import { NextIntlClientProvider } from 'next-intl';
import { getLocaleFromCookie } from '@/utils/getLocale';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default async function AppointmentPage() {
  const locale = await getLocaleFromCookie();
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <RoleGuard allowed={["patient"]} redirectTo="/">
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AppointmentBookingFlow />
      </NextIntlClientProvider>
    </RoleGuard>
  );
}
