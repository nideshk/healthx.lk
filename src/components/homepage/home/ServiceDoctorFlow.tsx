"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import HomepageSlotPicker from "./HomepageSlotPicker";
import { useTranslations, useLocale } from "next-intl";
import Price from "@/components/common/Price";
import {
  Stethoscope,
  User,
  Clock,
  ArrowLeft,
  Star,
  ChevronRight,
} from "lucide-react";
import { BadgeCheck } from "lucide-react";
import { ICON_MAP } from "@/lib/lucideIcons";

/* ---------- Types ---------- */

type Service = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string;
  sin_description: string;
  sin_slug?: string;
};

type Doctor = {
  id: string;
  full_name: string;
  specialization: string;
  avg_rating: number;
  qualification: string | null;
  profile_bio: string | null;
  profile_picture_url: string | null;
};

/* ---------- Main Component ---------- */

export default function ServiceDoctorFlow() {
  const t = useTranslations("bookingFlow");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedService, setSelectedService] =
    useState<Service | null>(null);
  const [selectedDoctor, setSelectedDoctor] =
    useState<Doctor | null>(null);

  /* ---------- Fetch services ---------- */
  useEffect(() => {
    axios.get("/api/specialisation").then((res) => {
      setServices(res.data.services || []);
    });
  }, []);

  /* ---------- Fetch doctors ---------- */
  useEffect(() => {
    if (!selectedService) return;

    setLoading(true);
    axios
      .get(`/api/specialisation/${selectedService.slug.toLowerCase()}`)
      .then((res) => {
        setDoctors(res.data.practitioners || []);
      })
      .finally(() => setLoading(false));
  }, [selectedService]);

  const goBack = () => {
    if (step === 1) return;
    setStep((step - 1) as any);
  };

  return (
    <section className="py-16 bg-gradient-to-b from-white to-cyan-50">
      <div className="max-w-5xl mx-auto px-6">
        {/* Progress */}
        <ProgressHeader step={step} />

        {/* Back */}
        {step > 1 && (
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-sm text-gray-600 mb-6 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            {t("back")}
          </button>
        )}

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          {loading && <LoadingState />}

          {step === 1 && !loading && (
            <ServicePicker
              services={services}
              onSelect={(s) => {
                setSelectedService(s);
                setStep(2);
              }}
            />
          )}

          {step === 2 && selectedService && !loading && (
            <DoctorPicker
              doctors={doctors}
              onSelect={(d) => {
                setSelectedDoctor(d);
                setStep(3);
              }}
            />
          )}

          {step === 3 && selectedDoctor && selectedService && (
            <HomepageSlotPicker
              practitionerId={selectedDoctor.id}
              practitioner={selectedDoctor}
              selectedService={selectedService}
            />
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Progress Header ---------- */

const ProgressHeader = ({ step }: { step: number }) => {
  const t = useTranslations("bookingFlow.progress");
  const steps = [
    { label: t("service"), icon: <Stethoscope size={16} /> },
    { label: t("doctor"), icon: <User size={16} /> },
    { label: t("time"), icon: <Clock size={16} /> },
  ];

  return (
    <div className="mb-10">
      <div className="flex justify-between items-center">
        {steps.map((s, i) => {
          const active = i + 1 <= step;
          return (
            <div key={s.label} className="flex-1 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center mb-2
                  ${active
                    ? "bg-cyan-600 text-white"
                    : "bg-gray-200 text-gray-500"
                  }`}
              >
                {s.icon}
              </div>
              <span
                className={`text-xs font-medium ${active ? "text-cyan-600" : "text-gray-400"
                  }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-1 bg-gray-200 rounded mt-4">
        <div
          className="h-1 bg-cyan-600 rounded transition-all"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
    </div>
  );
};

/* ---------- Service Picker ---------- */

const ServicePicker = ({
  services,
  onSelect,
}: {
  services: Service[];
  onSelect: (s: Service) => void;
}) => {
  const t = useTranslations("bookingFlow.servicePicker");
  const locale = useLocale();

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => a.name.localeCompare(b.name));
  }, [services]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header with Decorative Element */}
      <header className="relative mb-12 text-center md:text-left">
        <div className="absolute -top-6 -left-4 w-24 h-24 bg-cyan-100 rounded-full blur-3xl opacity-50 -z-10" />
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-600">
          {t("title")}
        </h2>
        <p className="mt-4 text-lg text-slate-500 max-w-2xl leading-relaxed">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {sortedServices.map((s) => {
          const Icon = ICON_MAP[s.icon as string] || Stethoscope;

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="
                group relative overflow-hidden flex flex-col justify-between p-8
                bg-white rounded-3xl border border-slate-100
                shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
                hover:shadow-[0_20px_40px_-12px_rgba(6,182,212,0.15)]
                hover:border-cyan-100 hover:-translate-y-2
                active:scale-[0.98]
                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
              "
            >
              {/* Animated Hover Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 flex flex-col gap-6">
                {/* Icon with Soft Glow */}
                <div className="
                  relative shrink-0 w-16 h-16 rounded-2xl 
                  flex items-center justify-center
                  bg-slate-50 text-slate-600
                  group-hover:bg-cyan-500 group-hover:text-white
                  group-hover:shadow-[0_8px_20px_-4px_rgba(6,182,212,0.4)]
                  transition-all duration-500
                ">
                  <Icon className="w-8 h-8 relative z-10" strokeWidth={1.5} />
                  {/* Subtle inner glow for icon */}
                  <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 scale-75 group-hover:scale-110 transition-all duration-500" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                      {locale === 'si' && s.sin_slug ? s.sin_slug : s.name}
                    </h3>
                  </div>

                  <p className="text-[15px] text-slate-500 text-left group-hover:text-slate-600 transition-colors">
                    {locale === 'si' && s.sin_description ? s.sin_description : s.description}
                  </p>
                </div>
              </div>

              {/* Action Bar - Replaced simple border with a subtle badge style */}
              <div className="relative z-10 mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <span className="
                  px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase
                  bg-slate-50 text-slate-400
                  group-hover:bg-cyan-50 group-hover:text-cyan-600
                  transition-all duration-300
                ">
                  {t("actionText") || "Select Service"}
                </span>
                <div className="
                  w-8 h-8 rounded-full flex items-center justify-center
                  bg-slate-50 text-slate-300
                  group-hover:bg-cyan-500 group-hover:text-white group-hover:rotate-[360deg]
                  transition-all duration-700
                ">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- Doctor Picker ---------- */

interface DoctorPickerProps {
  doctors: Doctor[];
  onSelect: (d: Doctor) => void;
}

const DoctorPicker = ({ doctors, onSelect }: DoctorPickerProps) => {
  const tSelection = useTranslations("doctorSelection");
  const tPicker = useTranslations("bookingFlow.doctorPicker");

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // 🔥 Memoized sorted doctors
  const sortedDoctors = useMemo(() => {
    return [...doctors].sort((a: any, b: any) => {
      const priceA = a.starting_price ?? 0;
      const priceB = b.starting_price ?? 0;

      return sortOrder === "asc"
        ? priceA - priceB
        : priceB - priceA;
    });
  }, [doctors, sortOrder]);

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-6">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          {tSelection("title")}
        </h2>
        <p className="text-slate-500 font-medium mt-1">
          {tSelection("subtitle")}
        </p>

        {/* 🔥 Sort Control */}
        {doctors.length > 0 && (
          <div className="mt-4 flex items-center justify-end">
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "asc" | "desc")
              }
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="asc">Price: Low → High</option>
              <option value="desc">Price: High → Low</option>
            </select>
          </div>
        )}
      </header>

      <div className="space-y-4">
        {sortedDoctors.length > 0 ? (
          sortedDoctors.map((d: any) => (
            <button
              key={d.id}
              onClick={() => onSelect(d)}
              className="group w-full text-left bg-white
                border border-slate-200 rounded-2xl p-4 sm:p-5
                hover:border-cyan-500 hover:shadow-lg
                active:scale-[0.99]
                transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {d.profile_picture_url ? (
                    <img
                      src={d.profile_picture_url}
                      alt={d.full_name}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-100"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 font-bold text-xl">
                      {d.full_name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight whitespace-normal">
                        {d.full_name}
                      </h3>
                      <span className="text-cyan-600 shrink-0">
                        <BadgeCheck
                          size={18}
                          fill="currentColor"
                          className="text-white"
                        />
                        <span className="sr-only">
                          {tPicker("verified")}
                        </span>
                      </span>
                    </div>

                    {/* Price Badge */}
                    <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 text-slate-900 border border-slate-100 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1.5">
                        From
                      </span>
                      <span className="text-sm font-black">
                        <Price amount={d.starting_price ?? 1500} />
                      </span>
                    </div>
                  </div>

                  {/* Specializations */}
                  <div className="mt-0.5 min-w-0">
                    {d.specialization?.length > 0 ? (
                      <p className="text-cyan-600 text-sm font-semibold truncate">
                        {d.specialization.join(", ")}
                      </p>
                    ) : (
                      <p className="text-slate-400 text-sm italic">
                        {tPicker("fallbackQualification")}
                      </p>
                    )}
                  </div>

                  {/* Bio */}
                  {d.profile_bio && (
                    <p className="mt-1 text-gray-500 text-sm line-clamp-3">
                      {d.profile_bio}
                    </p>
                  )}

                  {/* Languages */}
                  {d.languages?.length > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex gap-1 overflow-hidden">
                        {d.languages.slice(0, 2).map((lang: any) => (
                          <span
                            key={lang}
                            className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>

                      <div className="hidden sm:flex items-center text-cyan-500 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                        <span className="text-xs font-bold mr-1">
                          {tPicker("actionText").replace(" →", "")}
                        </span>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl">
            <p className="text-slate-500 font-bold">
              {tSelection("noDoctors")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-cyan-600 underline font-bold text-sm"
            >
              {tSelection("tryAnotherService")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Loading ---------- */

const LoadingState = () => {
  const t = useTranslations("bookingFlow");
  return (
    <div className="text-center py-16 text-gray-500">
      {t("loadingText")}
    </div>
  );
};