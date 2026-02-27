"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import HomepageSlotPicker from "./HomepageSlotPicker";
import { useTranslations } from "next-intl";
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
      <div className="max-w-4xl mx-auto px-6">
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

  // Memoize sorted services to prevent mutation and unnecessary re-sorts
  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => a.name.localeCompare(b.name));
  }, [services]);

  return (
    <div className="max-w-4xl mx-auto px-4">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
          {t("title")}
        </h2>
        <p className="mt-2 text-lg text-gray-600">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedServices.map((s) => {
          const Icon = ICON_MAP[s.icon as string] || Stethoscope;

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="
                group relative flex flex-col text-left p-6 
                bg-white rounded-2xl border-2 border-transparent
                shadow-sm ring-1 ring-gray-200
                hover:ring-cyan-500 hover:shadow-md
                active:scale-[0.98]
                transition-all duration-200 ease-out
              "
            >
              <div className="flex items-start gap-5">
                {/* Icon Container with subtle animation */}
                <div className="
                  shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center
                  bg-cyan-50 text-cyan-600
                  group-hover:bg-cyan-500 group-hover:text-white
                  group-hover:rotate-3
                  transition-all duration-300
                ">
                  <Icon className="w-7 h-7" strokeWidth={1.5} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {s.name}
                    </h3>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Descriptions with improved typography */}
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {s.description}
                    </p>
                    {s.sin_description && (
                      <p className="text-xs font-medium text-cyan-700/70 italic">
                        {s.sin_description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Hint */}
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-sm font-semibold text-cyan-600">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {t("actionText")}
                </span>
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
                        Rs.
                        {(d.starting_price ?? 1500).toLocaleString()}
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