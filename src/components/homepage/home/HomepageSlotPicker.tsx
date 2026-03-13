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

interface Props {
  practitionerId: string;
  practitioner: any;
  selectedService: any;
}

const HomepageSlotPicker = ({ practitionerId,  practitioner: initialDoctor, selectedService }: Props) => {
  const t = useTranslations("slotFlow.slotPicker");
  const { openLoginModal } = useModalStore();
  const { user } = useAuth();
  const [practitioner, setPractitioner] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const updateDraft = useBookingDraftStore((s) => s.update);
  const router = useRouter();
  /* ---------- Load practitioner ---------- */
  useEffect(() => {
    axios
      .get(`/api/practitioners/${practitionerId}`)
      .then((res) => setPractitioner(res.data.practitioner))
      .catch(() => toast.error(t("errors.loadDoctor")));
  }, [practitionerId, t]);


  /* ---------- Load availability ---------- */
  useEffect(() => {
    if (!selectedDate || !selectedType) return;

    setLoadingSlots(true);
    axios
      .get(`/api/booking/${practitionerId}/availability?date=${selectedDate}`)
      .then((res) => setAvailability(res.data))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedType, practitionerId]);

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
      Intl.DateTimeFormat().resolvedOptions().timeZone;

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

  if (!practitioner) return null;
  function extractAvailableDates(availableDays: any[]) {
    return availableDays.map((day) => {
      const d = new Date(day.starts_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
      {/* Doctor Info Card */}
      <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">

          {/* Profile Image */}
          {practitioner.profile_picture_url ? (
            <img
              src={practitioner.profile_picture_url}
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
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {practitioner.full_name}
            </h2>

            {/* Specialization */}
            {practitioner.specialization?.length > 0 && (
              <p className="text-sm text-cyan-600 font-medium mt-1">
                {practitioner.specialization.join(" • ")}
              </p>
            )}

            {/* Qualification */}
            {practitioner.qualifications && (
              <p className="text-sm text-gray-500 mt-1">
                {practitioner.qualifications}
              </p>
            )}

            {practitioner.qualification && (
              <p className="text-sm text-gray-600 mt-1">
                {practitioner.qualification}
              </p>
            )}

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
        {practitioner.profile_bio && (
          <p className="text-sm text-gray-600 mt-4 leading-relaxed line-clamp-3">
            {practitioner.profile_bio}
          </p>
        )}
      </div>
      {/* Step Header */}
      <div className="mb-6">
        <p className="text-sm font-medium text-cyan-600">
          {t("stepLabel")}
        </p>
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
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-white border-gray-300 hover:border-cyan-500"
                }`}
            >
              {type.name} · {type.duration_mins} {t("minLabel")} · {type.fee} <span className="text-xs">LKR</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date */}
        <div>
          <h4 className="font-medium mb-2">{t("dateLabel")}</h4>
          <Calendar
            minDate={new Date()}
            highlightedDates={extractAvailableDates(practitioner.available_days)}
            value={selectedDate ? new Date(selectedDate) : undefined}
            onChange={(date) => {
              if (!selectedType) {
                toast.error("Please select type");
                return;
              }
              if (!date) return;

              const tz =
                practitioner?.timezone ||
                availability?.timezone ||
                Intl.DateTimeFormat().resolvedOptions().timeZone;

              // ✅ FIX: Preserve local/practitioner timezone
              const formattedDate = DateTime.fromJSDate(date)
                .setZone(tz)
                .toFormat("yyyy-MM-dd");

              setSelectedDate(formattedDate);
              setSelectedTime(null);
            }}
            theme="light"
          />
        </div>

        {/* Time */}
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" />
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
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white border-gray-300 hover:border-cyan-500"
                    }`}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Continue */}
      <Button
        className="mt-8 w-full"
        disabled={!selectedType || !selectedDate || !selectedTime}
        onClick={handleContinue}
      >
        {t("buttonText")}
      </Button>

      <p className="text-xs text-gray-500 mt-3 text-center">
        {t("footerNote")}
      </p>
    </div>
  );
};

export default HomepageSlotPicker;