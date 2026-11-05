"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
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
  MessageCircleQuestion,
} from "lucide-react";
import { BadgeCheck } from "lucide-react";
import { ICON_MAP } from "@/lib/lucideIcons";
import { useFormatSpecialties, useServiceCardLabel } from "@/lib/specialtyLabels";

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
  specialization: string[];
  avg_rating: number;
  qualification: string | null;
  profile_bio: string | null;
  profile_picture_url: string | null;
  has_current_availability?: boolean;
};

/* ---------- Main Component ---------- */

export default function ServiceDoctorFlow() {
  const t = useTranslations("bookingFlow");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [selectedService, setSelectedService] =
    useState<Service | null>(null);
  const [selectedDoctor, setSelectedDoctor] =
    useState<Doctor | null>(null);
  const [doctorRequest, setDoctorRequest] = useState(0);
  const [doctorError, setDoctorError] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const pendingScroll = useRef(false);
  const pendingFocus = useRef(false);

  /* ---------- Fetch services ---------- */
  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/specialisation")
      .then((res) => {
        if (!cancelled) setServices(res.data.services || []);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Fetch doctors ---------- */
  useEffect(() => {
    if (!selectedService || doctorRequest === 0) return;

    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setDoctorError(false);

    axios
      .get(`/api/specialisation/${selectedService.slug.toLowerCase()}`, {
        signal: controller.signal,
      })
      .then((res) => {
        if (!active) return;
        const list = res.data?.practitioners;
        setDoctors(Array.isArray(list) ? list : []);
        setDoctorError(false);
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        if (axios.isCancel(err)) return;
        setDoctors([]);
        setDoctorError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedService, doctorRequest]);

  const assignHeading = (node: HTMLHeadingElement | null) => {
    headingRef.current = node;
    if (!node || !pendingFocus.current || pendingScroll.current) return;
    node.focus({ preventScroll: true });
    pendingFocus.current = false;
  };

  useLayoutEffect(() => {
    if (!pendingScroll.current) return;
    pendingScroll.current = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sectionRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    if (headingRef.current && pendingFocus.current) {
      headingRef.current.focus({ preventScroll: true });
      pendingFocus.current = false;
    }
  }, [step]);

  const openDoctorStep = (service: Service) => {
    pendingScroll.current = true;
    pendingFocus.current = true;
    setDoctors([]);
    setDoctorError(false);
    setLoading(true);
    setSelectedService(service);
    setDoctorRequest((n) => n + 1);
    setStep(2);
  };

  const openTimeStep = (doctor: Doctor) => {
    pendingScroll.current = true;
    pendingFocus.current = true;
    setSelectedDoctor(doctor);
    setStep(3);
  };

  const goBack = () => {
    if (step === 1) return;
    setStep((step - 1) as any);
  };

  return (
    <section ref={sectionRef} id="specialties" className="scroll-mt-24 py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Progress */}
        {step > 1 && <ProgressHeader step={step} />}

        {/* Back */}
        {step > 1 && (
          <button
            onClick={goBack}
            className="flex items-center gap-2 min-h-12 text-base text-cx-ink mb-6 hover:text-cx-primary"
          >
            <ArrowLeft size={16} />
            {t("back")}
          </button>
        )}

        {/* Content */}
        <div>
          {step === 1 && servicesLoading && <ServiceSkeleton />}

          {step === 1 && !servicesLoading && (
            <ServicePicker
              services={services}
              onSelect={openDoctorStep}
            />
          )}

          {step === 2 && loading && <DoctorSkeleton />}

          {step === 2 && selectedService && !loading && doctorError && (
            <DoctorFetchError
              headingRef={assignHeading}
              onBack={() => setStep(1)}
            />
          )}

          {step === 2 && selectedService && !loading && !doctorError && (
            <DoctorPicker
              doctors={doctors}
              service={selectedService}
              headingRef={assignHeading}
              onSelect={openTimeStep}
            />
          )}

          {step === 3 && selectedDoctor && selectedService && (
            <HomepageSlotPicker
              practitionerId={selectedDoctor.id}
              practitioner={selectedDoctor}
              selectedService={selectedService}
              headingRef={assignHeading}
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
            <div key={s.label} className="flex-1 min-w-0 flex flex-col items-center px-1">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center mb-2
                  ${active
                    ? "bg-cx-primary text-white"
                    : "bg-cx-tint text-cx-ink"
                  }`}
              >
                {s.icon}
              </div>
              <span
                className={`text-sm font-medium text-center leading-tight ${active ? "text-cx-primary" : "text-cx-ink"
                  }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-1 bg-cx-tint rounded mt-4">
        <div
          className="h-1 bg-cx-primary rounded transition-all"
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
  const serviceLabel = useServiceCardLabel();
  const router = useRouter();

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => a.name.localeCompare(b.name));
  }, [services]);

  return (
    <div className="w-full">
      <header className="mb-8 text-left">
        <h2 className="cx-heading">
          {t("title")}
        </h2>
        <p className="mt-4 text-base md:text-lg text-cx-ink max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedServices.map((s) => {
          const Icon = ICON_MAP[s.icon as string] || Stethoscope;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className="group flex flex-col justify-between p-6 text-left bg-white rounded-2xl border border-cx-border hover:border-cx-primary min-h-12"
            >
              <div className="flex flex-col gap-5">
                <div className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center bg-cx-tint text-cx-primary">
                  <Icon className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-cx-ink">
                    {serviceLabel(s)}
                  </h3>
                  <p className="text-base text-cx-ink text-left">
                    {locale === 'si' && s.sin_description ? s.sin_description : s.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-cx-border flex items-center justify-between gap-3">
                <span className="text-base font-semibold text-cx-primary">
                  {t("actionText") || "Select Service"}
                </span>
                <ChevronRight className="w-5 h-5 text-cx-primary shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Can't find your specialty? CTA */}
      <div className="mt-10">
        <button
          id="specialty-request-cta"
          type="button"
          onClick={() =>
            router.push(
              "/contact-us?reason=specialty_request&concern=" +
              encodeURIComponent(
                "Hi, I'm looking for a specialty that isn't listed on your platform yet. Could you help me find the right specialist?"
              )
            )
          }
          className="group w-full rounded-2xl border border-cx-border bg-white p-6 md:p-8 text-left"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center bg-cx-tint text-cx-primary">
              <MessageCircleQuestion className="w-7 h-7" strokeWidth={1.5} />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg md:text-xl font-semibold text-cx-ink">
                Can&apos;t find the specialty you need?
              </h3>
              <p className="text-base text-cx-ink">
                Let us know what you&apos;re looking for — we&apos;ll do our best to connect you with the right specialist.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-cx-primary shrink-0" />
          </div>
        </button>
      </div>
    </div>
  );
};

/* ---------- Doctor Picker ---------- */

interface DoctorPickerProps {
  doctors: Doctor[];
  service: Service;
  onSelect: (d: Doctor) => void;
  headingRef: (node: HTMLHeadingElement | null) => void;
}

const DoctorPicker = ({ doctors, service, onSelect, headingRef }: DoctorPickerProps) => {
  const tSelection = useTranslations("doctorSelection");
  const tPicker = useTranslations("bookingFlow.doctorPicker");
  const formatSpecialties = useFormatSpecialties();
  const serviceLabel = useServiceCardLabel();
  const serviceName = serviceLabel(service).replace(/\s+/g, " ").trim();

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
        <h2 ref={headingRef} tabIndex={-1} className="cx-heading">
          {tSelection("title")}
        </h2>
        <p className="text-base md:text-lg text-cx-ink mt-2">
          {tSelection("subtitle")}{" "}
          <span className="text-cx-primary font-semibold">{serviceName}</span>
        </p>

        {doctors.length > 0 && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <label htmlFor="doctor-price-sort" className="text-base text-cx-ink">
              {tSelection("sortBy")}
            </label>
            <select
              id="doctor-price-sort"
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "asc" | "desc")
              }
              className="min-h-12 text-base border border-cx-border rounded-xl px-3 bg-white text-cx-ink focus:outline-none focus:ring-2 focus:ring-cx-primary"
            >
              <option value="asc">{tSelection("priceLowHigh")}</option>
              <option value="desc">{tSelection("priceHighLow")}</option>
            </select>
          </div>
        )}
      </header>

      <div className="space-y-4">
        {sortedDoctors.length > 0 ? (
          sortedDoctors.map((d: any) => {
            const unavailable = d.has_current_availability === false;
            return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d)}
              className="group w-full text-left bg-white border border-cx-border rounded-2xl p-4 sm:p-5 hover:border-cx-primary"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {d.profile_picture_url ? (
                    <img
                      src={d.profile_picture_url}
                      alt={d.full_name}
                      className="w-16 h-16 rounded-xl object-cover border border-cx-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-cx-tint flex items-center justify-center text-cx-primary font-semibold text-xl">
                      {d.full_name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-cx-ink text-lg leading-tight whitespace-normal">
                        {d.full_name}
                      </h3>
                      <span className="text-cx-primary shrink-0">
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
                    <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-cx-tint text-cx-ink border border-cx-border shrink-0">
                      <span className="text-sm font-medium text-cx-ink mr-1.5">
                        {tSelection("consultationFee")}
                      </span>
                      <span className="text-base font-semibold">
                        <Price amount={d.starting_price ?? 1500} />
                      </span>
                    </div>
                  </div>

                  {/* Specializations */}
                  <div className="mt-0.5 min-w-0">
                    {d.specialization?.length > 0 ? (
                      <p className="text-cx-primary text-base font-semibold truncate">
                        {formatSpecialties(d.specialization)}
                      </p>
                    ) : (
                      <p className="text-cx-ink text-base">
                        {tPicker("fallbackQualification")}
                      </p>
                    )}
                  </div>

                  {unavailable && (
                    <p className="mt-2 inline-flex text-sm font-semibold text-cx-ink bg-cx-gold rounded-full px-3 py-1">
                      {tSelection("noCurrentAvailability")}
                    </p>
                  )}

                  {/* Bio */}
                  {d.profile_bio && (
                    <p className="mt-1 text-cx-ink text-base line-clamp-3">
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
                            className="text-sm font-medium bg-cx-tint text-cx-ink px-2 py-0.5 rounded"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>

                      <div className="hidden sm:flex items-center text-cx-primary">
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
            );
          })
        ) : (
          <div className="text-center py-12 border border-cx-border rounded-2xl bg-white">
            <p className="text-cx-ink font-semibold">
              {tSelection("noDoctors")}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 min-h-12 text-cx-primary underline font-semibold text-base"
            >
              {tSelection("tryAnotherService")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function DoctorFetchError({
  onBack,
  headingRef,
}: {
  onBack: () => void;
  headingRef: (node: HTMLHeadingElement | null) => void;
}) {
  const t = useTranslations("doctorSelection");

  return (
    <div className="max-w-2xl mx-auto">
      <h2 ref={headingRef} tabIndex={-1} className="cx-heading">
        {t("title")}
      </h2>
      <div className="mt-6 text-center py-12 border border-cx-border rounded-2xl bg-white">
        <p className="text-cx-ink font-semibold">{t("fetchDoctorError")}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-2 min-h-12 text-cx-primary underline font-semibold text-base"
        >
          {t("tryAnotherService")}
        </button>
      </div>
    </div>
  );
}

/* ---------- Loading ---------- */

const ServiceSkeleton = () => (
  <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-busy="true" aria-live="polite">
    <div className="mb-12 space-y-3">
      <div className="h-10 w-64 max-w-full rounded-lg bg-cx-tint animate-pulse" />
      <div className="h-4 w-96 max-w-full rounded bg-cx-tint animate-pulse" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-cx-border bg-white p-6 space-y-4">
          <div className="w-14 h-14 rounded-xl bg-cx-tint animate-pulse" />
          <div className="h-5 w-40 rounded bg-cx-tint animate-pulse" />
          <div className="h-4 w-full rounded bg-cx-tint animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-cx-tint animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

const DoctorSkeleton = () => (
  <div className="max-w-2xl mx-auto" aria-busy="true" aria-live="polite">
    <div className="mb-6 space-y-2">
      <div className="h-10 w-72 max-w-full rounded-lg bg-cx-tint animate-pulse" />
      <div className="h-4 w-56 max-w-full rounded bg-cx-tint animate-pulse" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex gap-4 border border-cx-border rounded-2xl bg-white p-5">
          <div className="w-16 h-16 rounded-xl bg-cx-tint animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-5 w-40 rounded bg-cx-tint animate-pulse" />
            <div className="h-4 w-56 rounded bg-cx-tint animate-pulse" />
            <div className="h-3 w-full rounded bg-cx-tint animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </div>
);