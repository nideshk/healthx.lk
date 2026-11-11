"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DateTime } from "luxon";
import { Clock } from "lucide-react";
import Button from "@/components/atom/Button/Button";
import { useModalStore } from "@/store/useModalStore";
import { toast } from "react-toastify";
import Calendar from "@/components/atom/Calendar/Calendar";
import { useBookingDraftStore } from "@/stores/useBookingDraftStore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authFetch } from "@/lib/authFetch";
import Price from "@/components/common/Price";
import { useFormatSpecialties } from "@/lib/specialtyLabels";

interface Props {
  practitionerId: string;
  practitioner: any;
  selectedService: any;
  hideStepCounter?: boolean;
  headingRef?: React.Ref<HTMLHeadingElement>;
}

function credentialLines(practitioner: any) {
  const values = [practitioner?.qualifications, practitioner?.qualification];
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(text);
  }
  return lines;
}

function normalizeDoctor(doctor: any) {
  if (!doctor) return null;
  return {
    ...doctor,
    profile_image: doctor.profile_image || doctor.profile_picture_url || null,
    full_name: doctor.full_name || doctor.name || "",
  };
}

const HomepageSlotPicker = ({ practitionerId, practitioner: initialDoctor, selectedService, hideStepCounter, headingRef }: Props) => {
  const t = useTranslations("slotFlow.slotPicker");
  const formatSpecialties = useFormatSpecialties();
  const { openLoginModal } = useModalStore();
  const { user } = useAuth();
  const [practitioner, setPractitioner] = useState<any>(() => normalizeDoctor(initialDoctor));
  const initialHasTypes = Array.isArray(initialDoctor?.appointment_types) && initialDoctor.appointment_types.length > 0;
  const [detailsLoading, setDetailsLoading] = useState(!initialHasTypes);
  const [detailsError, setDetailsError] = useState(false);
  const [detailsAttempt, setDetailsAttempt] = useState(0);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [slotAttempt, setSlotAttempt] = useState(0);
  const [visibleMonth, setVisibleMonth] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesError, setDatesError] = useState(false);
  const [datesAttempt, setDatesAttempt] = useState(0);

  const updateDraft = useBookingDraftStore((s) => s.update);
  const router = useRouter();
  const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  function isInHomeType(type: any) {
    if (!type) return false;
    const slug = (type.slug || type.sin_slug || "").toString().toLowerCase();
    if (slug) {
      if (slug === "in-home-visit" || slug === "in-home" || slug.includes("home")) return true;
    }
    const name = (type.name || "").toString().toLowerCase();
    if (name.includes("in-home") || name.includes("home visit") || name.includes("home")) return true;
    return false;
  }
  const hasAppointmentTypes =
    Array.isArray(practitioner?.appointment_types) &&
    practitioner.appointment_types.length > 0;

  /* ---------- Load practitioner ---------- */
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const knownTypes =
      Array.isArray(initialDoctor?.appointment_types) &&
      initialDoctor.appointment_types.length > 0;
    if (!knownTypes) {
      setDetailsLoading(true);
    }
    setDetailsError(false);

    axios
      .get(`/api/practitioners/${practitionerId}`, {
        signal: controller.signal,
        timeout: 15000,
      })
      .then((res) => {
        if (cancelled) return;
        const next = normalizeDoctor(res.data?.practitioner);
        if (!next) {
          if (!knownTypes) setDetailsError(true);
          return;
        }
        setPractitioner(next);
      })
      .catch(() => {
        if (cancelled || knownTypes) return;
        setDetailsError(true);
        toast.error(t("errors.loadDoctor"));
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [practitionerId, detailsAttempt, initialDoctor, t]);

  useEffect(() => {
    const types = practitioner?.appointment_types;
    if (!Array.isArray(types) || types.length !== 1) return;
    const only = types[0];
    setSelectedType((current: any) => {
      if (
        current?.id === only.id &&
        current?.fee === only.fee &&
        current?.duration_mins === only.duration_mins &&
        current?.platform_fee === only.platform_fee
      ) {
        return current;
      }
      return only;
    });
  }, [practitioner]);

  /* ---------- Bookable dates for the visible month ---------- */
  useEffect(() => {
    if (!practitionerId || !visibleMonth) return;

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setAvailableDates([]);
    setDatesError(false);

    axios
      .get(`/api/booking/${practitionerId}/available-dates?month=${visibleMonth}`, {
        signal: controller.signal,
        timeout: 15000,
      })
      .then((res) => {
        if (cancelled || res.data?.month !== visibleMonth) return;
        setAvailableDates(Array.isArray(res.data?.dates) ? res.data.dates : []);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableDates([]);
        setDatesError(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [practitionerId, visibleMonth, datesAttempt]);

  /* ---------- Load availability ---------- */
  useEffect(() => {
    if (!selectedDate || !selectedType) return;

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setLoadingSlots(true);
    setSlotsError(false);
    axios
      .get(`/api/booking/${practitionerId}/availability?date=${selectedDate}`, {
        signal: controller.signal,
        timeout: 15000,
      })
      .then((res) => {
        if (!cancelled) setAvailability(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailability(null);
        setSlotsError(true);
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedDate, selectedType, practitionerId, slotAttempt]);

  /* ---------- Slots by type ---------- */
  const slots = useMemo(() => {
    if (!availability || !selectedType) return [];
    return availability.slots_by_type?.[selectedType.name] || [];
  }, [availability, selectedType]);

  /* ---------- Continue ---------- */
  const handleContinue = () => {
    if (!selectedType || !selectedDate || !selectedTime) {
      toast.error(t("errors.missingSelection"));
      return;
    }

    const [hour, minute] = selectedTime.split(":").map(Number);
    const [year, month, day] = selectedDate.split("-").map(Number);

    const tz =
      availability?.timezone ||
      practitioner?.timezone ||
      "Asia/Colombo";

    const startLocal = DateTime.fromObject(
      {
        year,
        month,
        day,
        hour,
        minute,
      },
      { zone: tz }
    );

    const startUTC = startLocal.toUTC();
    const endUTC = startUTC.plus({
      minutes: selectedType.duration_mins,
    });

    // ✅ SINGLE SOURCE OF TRUTH
    updateDraft({
      selectedDoctor: practitioner,
      appointmentType: selectedType,
      starts_at: startUTC.toISO(),
      ends_at: endUTC.toISO(),
      selectedService,
      last_visited_step: 3,
    });

    if (!user) {
      openLoginModal("/appointment");
      return;
    }
    else {
      router.push('/appointment');
    }
  };

  if (!practitioner && detailsLoading) {
    return <SlotPickerSkeleton />;
  }

  if (!practitioner) {
    return (
      <SlotPickerError
        message={t("errors.loadDoctor")}
        onRetry={() => setDetailsAttempt((n) => n + 1)}
      />
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-cx-border p-6 md:p-8">
      {/* Doctor Info Card */}
      <div className="mb-8 bg-white border border-cx-border rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">

          {/* Profile Image */}
          {practitioner.profile_image ? (
            <img
              src={practitioner.profile_image}
              alt={practitioner.full_name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg sm:text-xl">
              {practitioner.full_name?.charAt(0)}
            </div>
          )}

          {/* Doctor Details */}
          <div className="flex-1">

            {/* Name */}
            <h2
              ref={headingRef}
              tabIndex={headingRef ? -1 : undefined}
              className="text-lg sm:text-xl font-semibold text-gray-900"
            >
              {practitioner.full_name}
            </h2>

            {/* Specialization */}
            {practitioner.specialization?.length > 0 && (
              <p className="text-sm text-cx-primary font-medium mt-1">
                {formatSpecialties(practitioner.specialization, " • ")}
              </p>
            )}

            {/* Experience */}
            {practitioner.experience_years && (
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <span className="text-gray-500">Experience</span>

                <span className="px-2 py-0.5 text-xs rounded-md bg-gray-100 text-gray-700 font-medium">
                  {practitioner.experience_years}+ Years
                </span>
              </p>
            )}

            {credentialLines(practitioner).map((line) => (
              <p key={line} className="text-sm text-gray-600 mt-1">
                {line}
              </p>
            ))}

            {/* License */}
            {practitioner.license_number && (
              <p className="text-xs text-gray-400 mt-1">
                Registration: {practitioner.license_number}
              </p>
            )}
          </div>
        </div>

        {/* Languages */}
        {practitioner.languages?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">
              Languages
            </p>

            <div className="flex flex-wrap gap-2">
              {practitioner.languages.slice(0, 3).map((lang: string) => (
                <span
                  key={lang}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700"
                >
                  {lang}
                </span>
              ))}

              {practitioner.languages.length > 3 && (
                <span className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-500">
                  +{practitioner.languages.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bio */}
        {practitioner.profile_bio &&
          !credentialLines(practitioner).some(
            (line) =>
              line.toLowerCase() === String(practitioner.profile_bio).trim().toLowerCase()
          ) && (
          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            {practitioner.profile_bio}
          </p>
        )}
      </div>
      {detailsLoading && !hasAppointmentTypes ? (
        <SlotControlsSkeleton />
      ) : detailsError && !hasAppointmentTypes ? (
        <SlotPickerError
          message={t("errors.loadDoctor")}
          onRetry={() => setDetailsAttempt((n) => n + 1)}
        />
      ) : (
      <>
      {/* Step Header */}
      <div className="mb-6">
        {!hideStepCounter && (
          <p className="text-sm font-medium text-cx-primary">
            {t("stepLabel")}
          </p>
        )}
        <h3 className="text-xl font-semibold text-gray-900">
          {t("title")}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Appointment Type */}
      <div className="mb-8">
        <h4 className="font-medium mb-3">{t("typeLabel")}</h4>
        <div className="flex flex-wrap gap-3">
          {practitioner.appointment_types?.map((type: any) => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type);
                setSelectedDate(null);
                setSelectedTime(null);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition
                ${selectedType?.id === type.id
                  ? "bg-cx-primary text-white border-cx-primary"
                  : "bg-white border-cx-border hover:border-cx-primary"
                }`}
            >
              {type.name} · {type.duration_mins} {t("minLabel")} · <Price amount={type.fee} />
            </button>
          ))}
        </div>
      </div>

      {/* Date & Time or In-Home CTA */}
      {isInHomeType(selectedType) ? (
        <div className="mb-6 p-6 border border-dashed rounded-lg bg-gray-50 text-center">
          <p className="text-sm text-gray-700 mb-4">
            In-Home Visits are arranged manually through WhatsApp. Please contact us to request an In-Home Visit and we'll coordinate the details.
          </p>
          <div className="flex items-center justify-center gap-3">
                {WHATSAPP_NUMBER ? (
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I'd like to book an In-Home Visit consultation with Dr. ${practitioner?.full_name || ''}${practitioner?.specialization?.length ? ' (' + formatSpecialties(practitioner.specialization) + ')' : ''}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 min-h-12 rounded-lg font-semibold inline-flex items-center"
                  >
                    Contact on WhatsApp
                  </a>
                ) : (
                  <button
                    onClick={() => toast.error("WhatsApp number not configured.")}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold"
                  >
                    Contact on WhatsApp
                  </button>
                )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date */}
          <div>
            <h4 className="font-medium mb-2">{t("dateLabel")}</h4>
            <Calendar
              minDate={new Date()}
              highlightedDates={availableDates}
              onMonthChange={setVisibleMonth}
              value={selectedDate ? new Date(selectedDate) : undefined}
              onChange={(date) => {
                if (!selectedType) {
                  toast.error("Please select type");
                  return;
                }
                if (!date) return;

                const formattedDate = DateTime.fromJSDate(date).toFormat("yyyy-MM-dd");

                setSelectedDate(formattedDate);
                setSelectedTime(null);
              }}
              theme="light"
            />
            {datesError && (
              <button
                type="button"
                onClick={() => setDatesAttempt((n) => n + 1)}
                className="mt-3 text-sm font-semibold text-cx-primary underline"
              >
                {t("errors.loadDates")}
              </button>
            )}
          </div>

          {/* Time */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cx-primary" />
              {t("timeLabel")}
            </h4>

            {!selectedDate ? (
              <p className="text-sm text-gray-400 mt-4">
                {t("messages.selectDatePrompt")}
              </p>
            ) : loadingSlots ? (
              <p className="text-sm text-gray-500 mt-4">
                {t("messages.loading")}
              </p>
            ) : slotsError ? (
              <button
                type="button"
                onClick={() => setSlotAttempt((n) => n + 1)}
                className="mt-4 text-sm font-semibold text-cx-primary underline"
              >
                {t("errors.loadTimes")}
              </button>
            ) : slots.length === 0 ? (
              <div className="text-sm text-gray-500 mt-4">
                {t("messages.noSlots")}
                <br />
                {t("messages.tryAnotherDay")}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {slots.map((time: string) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`px-4 py-2 rounded-lg text-sm border transition
                      ${selectedTime === time
                        ? "bg-cx-primary text-white border-cx-primary"
                        : "bg-white border-cx-border hover:border-cx-primary"
                      }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Continue - hidden for In-Home Visit types */}
      {!isInHomeType(selectedType) && (
        <Button
          className="mt-8 w-full cx-force-primary min-h-12"
          disabled={!selectedType || !selectedDate || !selectedTime}
          onClick={handleContinue}
        >
          {t("buttonText")}
        </Button>
      )}

      <p className="text-xs text-gray-500 mt-3 text-center">
        {t("footerNote")}
      </p>
      </>
      )}
    </div>
  );
};

const SlotPickerError = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => {
  const tRetry = useTranslations("actions");
  return (
    <div className="bg-white rounded-2xl border border-cx-border p-6 md:p-8 text-center">
      <p className="text-base text-cx-ink">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-cx-primary px-5 font-semibold text-white hover:bg-cx-deep"
      >
        {tRetry("retry")}
      </button>
    </div>
  );
};

const SlotPickerSkeleton = () => (
  <div className="bg-white rounded-2xl border border-cx-border p-6 md:p-8" aria-busy="true" aria-live="polite">
    <div className="mb-8 flex gap-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 animate-pulse" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-5 w-48 max-w-full rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-64 max-w-full rounded bg-slate-100 animate-pulse" />
        <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
      </div>
    </div>
    <SlotControlsSkeleton />
  </div>
);

const SlotControlsSkeleton = () => (
  <div className="space-y-6" aria-hidden="true">
    <div className="space-y-2">
      <div className="h-6 w-56 rounded bg-slate-200 animate-pulse" />
      <div className="h-4 w-72 max-w-full rounded bg-slate-100 animate-pulse" />
    </div>
    <div className="flex flex-wrap gap-3">
      <div className="h-10 w-40 rounded-full bg-slate-100 animate-pulse" />
      <div className="h-10 w-44 rounded-full bg-slate-100 animate-pulse" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
      <div className="h-64 rounded-2xl bg-slate-50 border border-dashed border-slate-200" />
    </div>
    <div className="h-11 w-full rounded-xl bg-slate-200 animate-pulse" />
  </div>
);

export default HomepageSlotPicker;