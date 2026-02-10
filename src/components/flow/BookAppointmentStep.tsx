'use client';

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from "react";
import { DateTime } from "luxon";
import axios from "axios";
import { toast } from "sonner";
import {
  ChevronLeft,
  Clock,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
  Star,
  Languages,
  Stethoscope,
  ArrowRight,
  Loader2
} from "lucide-react";
import Calendar from "../atom/Calendar/Calendar";
import Loader from "@/components/atom/Loader/Loader";
import { useTranslations } from "next-intl";
import { authFetch } from "@/lib/authFetch";

const BookAppointmentStep = forwardRef(({ nextStep, prevStep, updateData, bookingData }: any, ref) => {
  const t = useTranslations("bookAppointment");

  const practitionerId = bookingData?.selectedDoctor?.id;
  const [availableDates, setAvailableDates] = useState<any>([]);

  const [practitioner, setPractitioner] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const timeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadAvailabilityDates() {
      if (!practitionerId) return;

      try {
        const res = await authFetch(
          `/api/practitioner/availability?practitioner_id=${practitionerId}`
        );
        const data = await res.json();

        const windows = data.availability || [];

        const dates = windows.map((w: any) =>
          DateTime.fromISO(w.starts_at)
            .setZone(w.timezone || "UTC")
            .toISODate()
        );

        // remove duplicates
        const uniqueDates = Array.from(new Set(dates));

        setAvailableDates(uniqueDates || []);
      } catch (err) {
        console.error(err);
        setAvailableDates([]);
      }
    }

    loadAvailabilityDates();
  }, [practitionerId]);

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`/api/practitioners/${practitionerId}`);
        const data = await res.json();
        setPractitioner(data.practitioner);
      } catch {
        toast.error(t("loadDoctorError"));
      } finally {
        setLoadingInfo(false);
      }
    }
    if (practitionerId) load();
  }, [practitionerId]);

  async function fetchAvailability(dateStr: string) {
    if (!practitionerId || !selectedType) return;
    setLoadingAvailability(true);
    try {
      const res = await axios.get(`/api/booking/${practitionerId}/availability?date=${dateStr}`);
      console.log(res.data);
      setAvailability(res.data);
    } catch {
      toast.error(t("loadSlotsError"));
    } finally {
      setLoadingAvailability(false);
    }
  }

  const handleFinalConfirm = async () => {
    if (!selectedTime || !selectedDate || !selectedType) {
      return toast.error(t("completeStepsError"));
    }

    setIsConfirming(true);
    try {
      await nextStep();
    } catch {
      setIsConfirming(false);
    }
  };

  useImperativeHandle(ref, () => ({
    validateStep: () => {
      if (!selectedType) return toast.error(t("selectTypeError")), false;
      if (!selectedDate) return toast.error(t("selectDateError")), false;
      if (!selectedTime) return toast.error(t("selectTimeError")), false;
      return true;
    },
  }));

  const slots = useMemo(() => {
    if (!availability || !selectedType) return [];
    return availability.slots_by_type?.[selectedType.name] || [];
  }, [availability, selectedType]);

  if (loadingInfo) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;

  return (
    <div className="pb-32 pt-6 md:pt-12 bg-[#FBFDFF] min-h-screen relative">
      <div className="max-w-6xl mx-auto px-4">

        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => prevStep()}
            className="group flex items-center gap-2 text-slate-400 hover:text-teal-600 transition-all"
          >
            <div className="p-2 rounded-full bg-white shadow-sm border border-slate-100 group-hover:bg-teal-50 group-hover:border-teal-100 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.15em]">
              {t("changeDoctor")}
            </span>
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-teal-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {t("secured")}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 items-start">

          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-10">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-teal-50 text-teal-600 px-5 py-2 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">
                {t("specialist")}
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  {/* Profile Image with Initials Fallback */}
                  {practitioner.profile_image ? (
                    <img
                      src={practitioner.profile_image}
                      className="w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-slate-50 shadow-md"
                      alt={practitioner.full_name}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-slate-100 to-slate-200 ring-8 ring-slate-50 shadow-md flex items-center justify-center text-3xl font-black text-slate-400">
                      {practitioner.full_name
                        ?.split(' ')
                        .map((n: any) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || "DR"}
                    </div>
                  )}
                </div>

                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                  Dr. {practitioner.full_name}
                </h2>
                <p className="text-sm font-bold text-slate-700">
                  {practitioner.profile_bios || " is specialised in " + practitioner.specialization.join(' • ') + " with over " + practitioner.experience_years + " years of experience"}
                </p>

                {/* Specialization Mapping */}
                <div className="flex items-center gap-1.5 mt-2 text-teal-600">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <p className="font-bold text-xs uppercase tracking-tighter">
                    {practitioner.specialization?.length > 0
                      ? practitioner.specialization.join(' • ')
                      : t("clinicalPractice")}
                  </p>
                </div>
              </div>

              {/* Experience and Rating Stats */}
              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">
                    {t("experience")}
                  </p>
                  <p className="text-sm font-black text-slate-700">
                    {practitioner.experience_years || '0'}+ {t("years")}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">
                    {t("rating")}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <p className="text-sm font-black text-slate-700">4.9</p>
                  </div>
                </div>
              </div>

              {/* Languages Section */}
              <div className="mt-6 space-y-4 pt-6 border-t border-slate-50">
                <div className="flex items-start gap-3">
                  <Languages className="w-4 h-4 text-slate-300 mt-1" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {t("languages")}
                    </p>
                    <p className="text-xs font-bold text-slate-600">
                      English, Sinhala, Tamil
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="lg:col-span-8 space-y-6">

            {/* Appointment Type */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-50">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-[10px]">01</span>
                {t("sessionType")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {practitioner.appointment_types?.map((type: any) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type);
                      setSelectedDate(null);
                      setSelectedTime(null);
                      updateData({ appointmentType: type });
                    }}
                    className={`group relative p-6 rounded-3xl border-2 text-left transition-all ${selectedType?.id === type.id
                      ? "border-teal-500 bg-teal-50/30"
                      : "border-slate-100 hover:border-teal-200 bg-white"
                      }`}
                  >
                    {selectedType?.id === type.id && (
                      <CheckCircle2 className="absolute top-6 right-6 w-6 h-6 text-teal-500 fill-teal-50" />
                    )}

                    <p className={`font-black text-lg ${selectedType?.id === type.id ? 'text-teal-900' : 'text-slate-800'}`}>
                      {type.name}{" "}
                      <span className="text-xs font-bold uppercase tracking-tight">
                        ({type.fee + type.platform_fee} LKR)
                      </span>
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-slate-400 group-hover:text-teal-600 transition-colors">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold uppercase tracking-tight">
                        {type.duration_mins} {t("minuteSession")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar & Time */}
            {selectedType && (
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-50 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="grid md:grid-cols-2 gap-12">

                  {/* Calendar */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-[10px]">02</span>
                      {t("chooseDate")}
                    </h3>

                    <div className="flex justify-center md:justify-start scale-110 origin-top-left">
                      <Calendar
                        highlightedDates={availableDates}
                        value={selectedDate ? new Date(selectedDate) : undefined}
                        onChange={(date) => {
                          if (!date) return;
                          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                          setSelectedDate(dateStr);
                          setSelectedTime(null);
                          fetchAvailability(dateStr);
                          setTimeout(() => timeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
                        }}
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div ref={timeRef}>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-[10px]">03</span>
                      {t("availableSlots")}
                    </h3>

                    {!selectedDate ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                        <CalendarDays className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                          {t("pickDate")}
                        </p>
                      </div>
                    ) : loadingAvailability ? (
                      <div className="h-64 flex items-center justify-center">
                        <Loader size="md" />
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-amber-50/50 rounded-[2rem] border-2 border-dashed border-amber-100">
                        <Clock className="w-8 h-8 text-amber-300 mb-3" />
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-tighter">
                          {t("fullyBooked")}
                        </p>
                        <p className="text-[10px] text-amber-600 mt-1">
                          {t("tryAnotherDate")}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5">
                        {slots.map((time: string) => (
                          <button
                            key={time}
                            onClick={() => {
                              setSelectedTime(time);
                              const [H, M] = time.split(":").map(Number);
                              const [y, m, d] = selectedDate!.split("-").map(Number);
                              const start = DateTime.fromObject(
                                { year: y, month: m, day: d, hour: H, minute: M },
                                { zone: availability?.timezone || "UTC" }
                              );
                              updateData({
                                starts_at: start.toUTC().toISO(),
                                ends_at: start.toUTC().plus({ minutes: selectedType.duration_mins }).toISO()
                              });
                            }}
                            className={`py-4 rounded-2xl text-[13px] font-black transition-all ${selectedTime === time
                              ? "bg-teal-500 text-white shadow-lg shadow-teal-100"
                              : "bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                              }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-4 z-50 transition-all duration-500 ${selectedTime ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-teal-50 items-center justify-center border border-teal-100">
              <CalendarDays className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-1">
                {t("summary")}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-sm font-black text-slate-900">
                  {selectedDate && DateTime.fromISO(selectedDate).toLocaleString(DateTime.DATE_HUGE)}
                </span>
                <div className="w-1 h-1 rounded-full bg-slate-300 hidden md:block" />
                <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {selectedTime}
                </span>
              </div>
            </div>
          </div>

          <button
            disabled={isConfirming}
            onClick={handleFinalConfirm}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-teal-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
          >
            {isConfirming ? (
              <>{t("confirming")} <Loader2 className="w-4 h-4 animate-spin" /></>
            ) : (
              <>{t("continuePayment")} <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

        </div>
      </div>

    </div>
  );
});

BookAppointmentStep.displayName = "BookAppointmentStep";
export default BookAppointmentStep;
