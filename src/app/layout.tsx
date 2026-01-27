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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang={"en"}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>

        <NextIntlClientProvider locale={locale} messages={messages}>

          <AuthProvider>

            {/* Adding this for blur effect while triggering payment */}
            <div id="main-app-layout" className="transition-all duration-500">
              <Header />
              {children}
            </div>

            <Script
              src="https://www.payhere.lk/lib/payhere.js"
              strategy="lazyOnload"
            />

            <ToastProvider />

          </AuthProvider>

        </NextIntlClientProvider>

      </body>
    </html>
  );
}
