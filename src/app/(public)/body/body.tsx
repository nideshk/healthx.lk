"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/atom/Button/Button";
import { useModalStore } from "@/store/useModalStore";
import { ShieldCheck, Clock, BadgeCheck } from "lucide-react";
import ServiceDoctorFlow from "@/components/homepage/home/ServiceDoctorFlow";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";

/* ================= HERO ================= */

const HeroSection = () => {
  const t = useTranslations("homepage.hero");

  const { user } = useAuth();
  const router = useRouter();
  const { openLoginModal } = useModalStore();

  return (
    <section className="pt-24 pb-20 bg-gradient-to-b from-white to-cyan-50">
      <div className="max-w-7xl mx-auto px-6 text-center">

        <h1
          className="text-4xl md:text-5xl font-bold text-gray-900"
          suppressHydrationWarning
        >
          {t("title")}
        </h1>

        <p
          className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto"
          suppressHydrationWarning
        >
          {t("subtitle")}
        </p>

        {/* Trust strip */}
        <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
          <TrustItem
            icon={<BadgeCheck size={16} />}
            text={t("trust.verified")}
          />
          <TrustItem
            icon={<ShieldCheck size={16} />}
            text={t("trust.secure")}
          />
          <TrustItem icon={<Clock size={16} />} text={t("trust.instant")} />
        </div>

        {/* Secondary CTA */}
        <div className="mt-10 flex justify-center gap-4">
          {!user ? (
            <Button onClick={() => router.push("#booking")}>
              {t("cta.bookNow")}
            </Button>
          ) : (
            <Button onClick={() => router.push("/appointment")}>
              {t("cta.bookNow")}
            </Button>
          )}

          {user ? (
            <Button onClick={() => router.push("/dashboard")}>
              {t("cta.dashboard")}
            </Button>
          ) : (
            <Button variant="outline" onClick={openLoginModal}>
              {t("cta.login")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

const TrustItem = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-cyan-600">{icon}</span>
    <span>{text}</span>
  </div>
);

/* ================= WHY Clinecxa ================= */

const FeaturesSection = () => {
  const t = useTranslations("homepage.features");

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-12">{t("title")}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <Feature
            title={t("items.verified.title")}
            text={t("items.verified.text")}
          />
          <Feature
            title={t("items.secure.title")}
            text={t("items.secure.text")}
          />
          <Feature title={t("items.fast.title")} text={t("items.fast.text")} />
        </div>
      </div>
    </section>
  );
};

const Feature = ({ title, text }: { title: string; text: string }) => (
  <div>
    <p className="font-semibold text-gray-900">{title}</p>
    <p className="text-sm text-gray-600 mt-2">{text}</p>
  </div>
);

/* ================= PAGE ================= */

const Body = () => {
  return (
    <main>
      {/* HERO */}
      <HeroSection />

      {/* PRIMARY BOOKING FLOW */}
      <section id="book">
        <ServiceDoctorFlow />
      </section>

      {/* TRUST / FEATURES */}
      <FeaturesSection />

      {/* PRACTITIONER CTA */}
      <PractitionerSection />
    </main>
  );
};

/* ================= PRACTITIONER CTA ================= */

const PractitionerSection = () => {
  const t = useTranslations("homepage.practitioner");
  const router = useRouter();

  return (
    <section className="py-24 bg-cyan-900 text-white relative overflow-hidden">
      {/* Subtle Background Decorative Circles */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-cyan-800 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-cyan-950 rounded-full blur-3xl opacity-50" />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              {t("title")}
            </h2>
            <p className="text-cyan-100 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          {/* Benefits Grid - Better for text-only layouts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm"
              >
                <BadgeCheck className="text-cyan-400 mx-auto mb-3" size={28} />
                <p className="text-sm md:text-base font-medium text-cyan-50">
                  {t(`benefits.${key}`)}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Button
              className="bg-white text-cyan-900 hover:bg-cyan-50 border-none px-10 py-7 text-lg font-bold shadow-xl transition-all hover:scale-105 active:scale-95"
              onClick={() => router.push("/register")}
            >
              {t("cta")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Body;
