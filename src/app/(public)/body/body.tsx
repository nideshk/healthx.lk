"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/atom/Button/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  ShieldCheck,
  Clock,
  BadgeCheck,
} from "lucide-react";
import ServiceDoctorFlow from "@/components/homepage/home/ServiceDoctorFlow";

/* ================= HERO ================= */

const HeroSection = () => {
  const router = useRouter();
  const { openLoginModal } = useModalStore();

  return (
    <section className="pt-24 pb-20 bg-gradient-to-b from-white to-cyan-50">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          Consult verified doctors in minutes
        </h1>

        <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
          Book online consultations with trusted specialists.
          Browse services, doctors and availability — no login required.
        </p>

        {/* Trust strip */}
        <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
          <TrustItem
            icon={<BadgeCheck size={16} />}
            text="Verified doctors"
          />
          <TrustItem
            icon={<ShieldCheck size={16} />}
            text="Secure & private"
          />
          <TrustItem
            icon={<Clock size={16} />}
            text="Instant booking"
          />
        </div>

        {/* Secondary CTA */}
        <div className="mt-10 flex justify-center gap-4">
          <Button onClick={() => router.push("#book")}>
            Book now
          </Button>

          <Button variant="outline" onClick={openLoginModal}>
            Log in
          </Button>
        </div>
      </div>
    </section>
  );
};

const TrustItem = ({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-cyan-600">{icon}</span>
    <span>{text}</span>
  </div>
);

/* ================= WHY CLINICO ================= */

const FeaturesSection = () => (
  <section className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-6 text-center">
      <h2 className="text-3xl font-bold text-gray-900 mb-12">
        Why Clinico?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <Feature
          title="Verified doctors"
          text="All doctors are vetted and approved before listing"
        />
        <Feature
          title="Secure platform"
          text="HIPAA-compliant, privacy-first healthcare experience"
        />
        <Feature
          title="Fast booking"
          text="Book consultations in under a minute"
        />
      </div>
    </div>
  </section>
);

const Feature = ({
  title,
  text,
}: {
  title: string;
  text: string;
}) => (
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
    </main>
  );
};

export default Body;
