import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import ToastProvider from "./toast-provider";
import Header from "@/components/homepage/header/header";
import { AuthProvider } from "@/contexts/AuthContext";

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getLocaleFromCookie } from "@/utils/getLocale";
import IdleLogoutProvider from "@/components/providers/IdleLogoutProvider";

export const metadata: Metadata = {
  title: "clinecxa.com",
  description: "ClinicaXa is a telehealth platform that provides remote medical consultations and virtual care services.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const locale = await getLocaleFromCookie();
  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider
          locale={locale}
          timeZone="Asia/Colombo" // 👈 REQUIRED HERE
          messages={messages}
        >
          <IdleLogoutProvider>

<<<<<<< Updated upstream
            <AuthProvider>
              <Script
                src="https://www.payhere.lk/lib/payhere.js"
                strategy="lazyOnload"
              />
              <ToastProvider />
              <Header />
              {children}
            </AuthProvider>
=======
            <CurrencyProvider>
              <AuthProvider>
                {process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === "payhere" && (
                  <Script
                    src="https://www.payhere.lk/lib/payhere.js"
                    strategy="lazyOnload"
                  />
                )}
                <ToastProvider />
                <Header />
                {children}
              </AuthProvider>
            </CurrencyProvider>
>>>>>>> Stashed changes
          </IdleLogoutProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
