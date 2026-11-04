import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import ToastProvider from "./toast-provider";
import Header from "@/components/homepage/header/header";
import { AuthProvider } from "@/contexts/AuthContext";
import { Analytics } from "@vercel/analytics/next"
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import IdleLogoutProvider from "@/components/providers/IdleLogoutProvider";
import LocaleProvider from "@/components/providers/LocaleProvider";
import Footer from "@/components/homepage/footer/footer";

export const metadata: Metadata = {
  title: "clinecxa.lk",
  description: "Clinecxa is a telehealth platform that provides remote medical consultations and virtual care services.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body>

        <LocaleProvider>
          <IdleLogoutProvider>

            <CurrencyProvider>
              <AuthProvider>
                <Script
                  src="https://www.payhere.lk/lib/payhere.js"
                  strategy="lazyOnload"
                />
                <ToastProvider />
                <Suspense fallback={null}>
                  <Header />
                </Suspense>
                <Analytics />
                {children}
                <Footer />
              </AuthProvider>
            </CurrencyProvider>
          </IdleLogoutProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
