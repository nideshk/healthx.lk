import type { Metadata } from "next";
import { Suspense } from "react";
import { Noto_Sans, Noto_Sans_Sinhala } from "next/font/google";
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

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoSansSinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sinhala",
  display: "swap",
});

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
    <html
      lang="en"
      className={`${notoSans.variable} ${notoSansSinhala.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">

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
