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
import { AppointmentFormInputs } from "@/types/FormType";
import Loader from "@/components/atom/Loader/Loader";

const BookAppointmentStep = forwardRef(({ nextStep, prevStep, updateData, bookingData }: any, ref) => {
  const practitionerId = bookingData?.selectedDoctor?.id;

  // --- State Management ---
  const [practitioner, setPractitioner] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const timeRef = useRef<HTMLDivElement>(null);

  // --- Load Practitioner Data ---
  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`/api/practitioners/${practitionerId}`);
        setPractitioner(res.data.practitioner);
      } catch {
        toast.error("Failed to load practitioner details");
      } finally {
        setLoadingInfo(false);
      }
    }
    if (practitionerId) load();
  }, [practitionerId]);

  // --- Load Availability ---
  async function fetchAvailability(dateStr: string) {
    if (!practitionerId || !selectedType) return;
    setLoadingAvailability(true);
    try {
      const res = await axios.get(`/api/booking/${practitionerId}/availability?date=${dateStr}`);
      setAvailability(res.data);
    } catch {
      toast.error("Could not load available slots");
    } finally {
      setLoadingAvailability(false);
    }
  }

  // --- Final Confirmation Logic ---
  const handleFinalConfirm = async () => {
    if (!selectedTime || !selectedDate || !selectedType) {
      return toast.error("Please complete all selection steps");
    }

    setIsConfirming(true);
    // Data is already updated in updateData via sub-selections
    // but we call nextStep to move to the summary/payment step
    try {
      await nextStep();
    } catch (err) {
      setIsConfirming(false);
    }
  };

  useImperativeHandle(ref, () => ({
    validateStep: () => {
      if (!selectedType) return toast.error("Please select an appointment type"), false;
      if (!selectedDate) return toast.error("Please select a date"), false;
      if (!selectedTime) return toast.error("Please select a time slot"), false;
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
            <span className="text-xs font-black uppercase tracking-[0.15em]">Change Practitioner</span>
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-teal-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">HIPAA Secured</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 items-start">

          {/* LEFT SIDE: Practitioner Profile Summary */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-10">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-teal-50 text-teal-600 px-5 py-2 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">
                Specialist
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <img
                    src={practitioner?.profile_image || "/images/default-doctor.png"}
                    className="w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-slate-50 shadow-md"
                    alt={practitioner.full_name}
                  />
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Dr. {practitioner.full_name}</h2>
                <div className="flex items-center gap-1.5 mt-2 text-teal-600">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <p className="font-bold text-xs uppercase tracking-tighter">{practitioner.specialization || "Clinical Practice"}</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Experience</p>
                  <p className="text-sm font-black text-slate-700">{practitioner.experience_years || '10'}+ Yrs</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Rating</p>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <p className="text-sm font-black text-slate-700">4.9</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4 pt-6 border-t border-slate-50">
                <div className="flex items-start gap-3">
                  <Languages className="w-4 h-4 text-slate-300 mt-1" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Languages</p>
                    <p className="text-xs font-bold text-slate-600">English, Sinhala, Tamil</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Selection Workspace */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. Appointment Type */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-50">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-[10px]">01</span>
                Session Type
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
                      {type.name}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-slate-400 group-hover:text-teal-600 transition-colors">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold uppercase tracking-tight">{type.duration_mins} Minute Session</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2 & 3: Calendar & Time */}
            {selectedType && (
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-50 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="grid md:grid-cols-2 gap-12">

                  {/* Calendar Column */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-[10px]">02</span>
                      Choose Date
                    </h3>
                    <div className="flex justify-center md:justify-start scale-110 origin-top-left">
                      <Calendar
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

                  {/* Time Column */}
                  <div ref={timeRef}>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-[10px]">03</span>
                      Available Slots
                    </h3>

                    {!selectedDate ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                        <CalendarDays className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                          Pick a date to<br />view availability
                        </p>
                      </div>
                    ) : loadingAvailability ? (
                      <div className="h-64 flex items-center justify-center"><Loader size="md" /></div>
                    ) : slots.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-amber-50/50 rounded-[2rem] border-2 border-dashed border-amber-100">
                        <Clock className="w-8 h-8 text-amber-300 mb-3" />
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-tighter">Fully Booked</p>
                        <p className="text-[10px] text-amber-600 mt-1">Try another date</p>
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

      {/* --- STICKY CONFIRMATION BAR --- */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-4 z-50 transition-all duration-500 ${selectedTime ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-teal-50 items-center justify-center border border-teal-100">
              <CalendarDays className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-1">Appointment Summary</p>
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

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              disabled={isConfirming}
              onClick={handleFinalConfirm}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-teal-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
            >
              {isConfirming ? (
                <>Confirming... <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : (
                <>Continue to Payment <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

BookAppointmentStep.displayName = "BookAppointmentStep";
export default BookAppointmentStep;