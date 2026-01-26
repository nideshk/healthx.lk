"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DateTime } from "luxon";
import { Clock } from "lucide-react";
import Button from "@/components/atom/Button/Button";
import { useModalStore } from "@/store/useModalStore";
import { toast } from "sonner";
import Calendar from "@/components/atom/Calendar/Calendar";
import { useBookingDraftStore } from "@/stores/useBookingDraftStore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Props {
  practitionerId: string;
  selectedService: any;
}

const HomepageSlotPicker = ({ practitionerId, selectedService }: Props) => {
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
      openLoginModal();
      return;
    }
    else {
      router.push('/appointment');
    }
  };

  if (!practitioner) return null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
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
              {type.name} · {type.duration_mins} {t("minLabel")}
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
            value={selectedDate ? new Date(selectedDate) : undefined}
            onChange={(date) => {
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