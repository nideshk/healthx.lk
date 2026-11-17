"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarCheck,
  Clock,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/atom/Modal/Modal";
import ServiceDoctorFlow from "@/components/homepage/home/ServiceDoctorFlow";
import MeetDoctors from "@/components/homepage/home/MeetDoctors";
import { openSpecialties } from "@/lib/homeNavigation";

const stepIcons = [Stethoscope, User, CalendarCheck];

const HeroSection = () => {
  const t = useTranslations("homepage.hero");
  const tHow = useTranslations("howto");
  const tHome = useTranslations("homeRedesign");
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const book = () => openSpecialties(pathname, (href) => router.push(href));

  return (
    <section className="pt-10 pb-16 md:pt-16 md:pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <h1 className="cx-heading" suppressHydrationWarning>
            {t("title")}
          </h1>
          <p
            className="mt-4 text-base md:text-lg text-cx-ink max-w-xl"
            suppressHydrationWarning
          >
            {t("subtitle")}
          </p>

          <ul className="mt-6 flex flex-col gap-3 text-base text-cx-ink">
            <TrustItem icon={<BadgeCheck size={18} />} text={t("trust.verified")} />
            <TrustItem icon={<ShieldCheck size={18} />} text={t("trust.secure")} />
            <TrustItem icon={<Clock size={18} />} text={t("trust.instant")} />
          </ul>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button type="button" className="cx-btn inline-flex" onClick={book}>
              {tHome("bookConsultation")}
            </button>
            <a href="#how-it-works" className="cx-btn-secondary inline-flex">
              {tHow("title")}
            </a>
          </div>

          {user ? (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-4 min-h-12 text-base font-semibold text-cx-primary underline-offset-4 hover:underline"
            >
              {t("cta.dashboard")}
            </button>
          ) : null}
        </div>

        <div className="min-w-0">
          <Image
            src="/images/clinecxa-hero.webp"
            alt={tHome("heroImageAlt")}
            width={1454}
            height={977}
            priority
            sizes="(max-width: 767px) calc(100vw - 2rem), 33rem"
            className="h-auto w-full"
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      </div>
    </section>
  );
};

const TrustItem = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <li className="flex items-center gap-3">
    <span className="text-cx-primary shrink-0">{icon}</span>
    <span>{text}</span>
  </li>
);

const HowItWorksSection = () => {
  const t = useTranslations("howto");
  const tHome = useTranslations("homeRedesign");
  const steps = [1, 2, 3] as const;

  return (
    <section id="how-it-works" className="scroll-mt-24 py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="cx-heading">{t("title")}</h2>
        <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step, index) => {
            const Icon = stepIcons[index] ?? Stethoscope;
            return (
              <li
                key={step}
                className="rounded-2xl border border-cx-border bg-white p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cx-tint text-cx-primary">
                    <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-cx-primary">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-cx-ink">
                  {tHome(`howItWorks.step${step}Title`)}
                </h3>
                <p className="mt-2 text-base md:text-lg text-cx-ink">
                  {tHome(`howItWorks.step${step}Text`)}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

const FamilyAndWhySection = () => {
  const t = useTranslations("homepage.features");
  const tHome = useTranslations("homeRedesign");
  const items = [
    { key: "verified", icon: BadgeCheck },
    { key: "secure", icon: ShieldCheck },
    { key: "fast", icon: Clock },
  ] as const;

  return (
    <section className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <article className="rounded-2xl border border-cx-border bg-white p-6 md:p-8">
          <h2 className="cx-heading">{tHome("family.title")}</h2>
          <p className="mt-4 text-base md:text-lg text-cx-ink">
            {tHome("family.text")}
          </p>
        </article>

        <article className="rounded-2xl border border-cx-border bg-white p-6 md:p-8">
          <h2 className="cx-heading">{t("title")}</h2>
          <ul className="mt-6 space-y-5">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key} className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cx-tint text-cx-primary">
                    <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-cx-ink">
                      {t(`items.${item.key}.title`)}
                    </p>
                    <p className="mt-1 text-base md:text-lg text-cx-ink">
                      {t(`items.${item.key}.text`)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
};

const DisclaimerModal = () => {
  const t = useTranslations("footer");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const disclaimerDismissed = localStorage.getItem("disclaimerModalDismissed");

    if (disclaimerDismissed !== "true") {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("disclaimerModalDismissed", "true");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("disclaimerTitle")}
      width="2xl"
      maxHeight="90vh"
      footer={
        <button type="button" onClick={handleClose} className="cx-btn inline-flex">
          I Understand
        </button>
      }
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="bg-cx-gold p-2 rounded-xl">
          <AlertTriangle className="text-cx-ink flex-shrink-0" size={22} />
        </div>
        <p className="text-cx-ink leading-relaxed whitespace-pre-wrap text-base">
          {t("disclaimerText")}
        </p>
      </div>
    </Modal>
  );
};

const DisclaimerSection = () => {
  const t = useTranslations("footer");

  return (
    <section className="py-12 bg-cx-gold text-cx-ink">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-cx-ink flex-shrink-0 mt-1" size={28} />
          <div>
            <h2 className="text-[2rem] md:text-[2.5rem] font-semibold leading-tight mb-3">
              {t("disclaimerTitle")}
            </h2>
            <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">
              {t("disclaimerText")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const PractitionerSection = () => {
  const t = useTranslations("homepage.practitioner");
  const tHome = useTranslations("homeRedesign");
  const router = useRouter();
  const benefits = [
    tHome("practitioner.benefit1"),
    tHome("practitioner.benefit2"),
    tHome("practitioner.benefit3"),
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-cx-border bg-white px-6 py-10 md:px-10 text-center">
          <h2 className="cx-heading">{t("title")}</h2>
          <p className="mt-4 text-base md:text-lg text-cx-ink max-w-2xl mx-auto">
            {tHome("practitioner.subtitle")}
          </p>
          <ul className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="rounded-2xl border border-cx-border p-5"
              >
                <BadgeCheck className="text-cx-primary mb-3" size={24} strokeWidth={1.5} />
                <p className="text-base md:text-lg text-cx-ink">{benefit}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="cx-btn inline-flex mt-8"
            onClick={() => router.push("/register")}
          >
            {t("cta")}
          </button>
        </div>
      </div>
    </section>
  );
};

const MobileBookBar = () => {
  const tHome = useTranslations("homeRedesign");
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-cx-border bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        className="cx-btn inline-flex w-full"
        onClick={() => openSpecialties(pathname, (href) => router.push(href))}
      >
        {tHome("bookConsultation")}
      </button>
    </div>
  );
};

const Body = () => {
  return (
    <main>
      <DisclaimerModal />
      <HeroSection />
      <div id="book">
        <ServiceDoctorFlow />
      </div>
      <HowItWorksSection />
      <MeetDoctors />
      <FamilyAndWhySection />
      <DisclaimerSection />
      <PractitionerSection />
      <div className="h-24 md:hidden" aria-hidden="true" />
      <MobileBookBar />
    </main>
  );
};

export default Body;
