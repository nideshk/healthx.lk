"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { DateTime } from "luxon";
import axios from "axios";
import { toast } from "sonner";
import { ChevronLeft, Clock } from "lucide-react";
import Calendar from "../atom/Calendar/Calendar";
import { AppointmentFormInputs } from "@/types/FormType";

interface Props {
  nextStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
  prevStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
  draftData?: any;
}

const BookAppointmentStep = forwardRef(
  ({ prevStep, updateData, bookingData }: Props, ref) => {
    const practitionerId = bookingData?.selectedDoctor?.id;

    if (!practitionerId) {
      return (
        <div className="p-10 text-center text-red-500 font-semibold">
          No doctor selected. Please go back and choose a practitioner.
        </div>
      );
    }

    /* -------------------- STATE -------------------- */
    const [practitioner, setPractitioner] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<any>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    const [availability, setAvailability] = useState<any>(null);
    const [loadingInfo, setLoadingInfo] = useState(true);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    const availabilityCache = useRef<{ [key: string]: { ts: number; data: any } }>({});

    /* UX refs */
    const dateRef = useRef<HTMLDivElement>(null);
    const timeRef = useRef<HTMLDivElement>(null);

    /* -------------------- FETCH PRACTITIONER -------------------- */
    useEffect(() => {
      async function load() {
        try {
          const res = await axios.get(`/api/practitioners/${practitionerId}`);
          console.log(res.data.practitioner)
          setPractitioner(res.data.practitioner);
        } catch {
          toast.error("Failed to load practitioner details");
        } finally {
          setLoadingInfo(false);
        }
      }
      load();
    }, [practitionerId]);

    const initials = useMemo(() => {
      if (!practitioner?.full_name) return "DR";
      return practitioner.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }, [practitioner]);

    /* -------------------- FETCH AVAILABILITY -------------------- */
    async function fetchAvailability(force = false) {
      if (!selectedDate || !selectedType) return;

      const key = `${practitionerId}-${selectedDate}-${selectedType.id}`;
      const cached = availabilityCache.current[key];
      const now = Date.now();

      if (!force && cached && now - cached.ts < 30000) {
        setAvailability(cached.data);
        return;
      }

      setLoadingAvailability(true);
      try {
        const res = await axios.get(
          `/api/booking/${practitionerId}/availability?date=${selectedDate}`
        );
        availabilityCache.current[key] = { ts: now, data: res.data };
        setAvailability(res.data);
      } finally {
        setLoadingAvailability(false);
      }
    }

    useEffect(() => {
      if (selectedDate && selectedType) fetchAvailability();
    }, [selectedDate, selectedType]);

    const slots = useMemo(() => {
      if (!availability || !selectedType) return [];
      return availability.slots_by_type?.[selectedType.name] || [];
    }, [availability, selectedType]);

    /* -------------------- VALIDATION -------------------- */
    useImperativeHandle(ref, () => ({
      validateStep: () => {
        if (!selectedType) {
          console.log("no type");
          return toast.error("Select an appointment type"), false;

        }
        if (!selectedDate) return toast.error("Select a date"), false;
        if (!selectedTime) return toast.error("Select a slot"), false;
        return true;
      },
    }));

    if (loadingInfo) return  <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
            </div>;

    /* -------------------- RENDER -------------------- */
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 py-10">
        <div className="max-w-6xl mx-auto px-4">
          {/* Back */}
          <button
            onClick={() => prevStep()}
            className="flex items-center text-sm text-gray-500 hover:text-gray-800 mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </button>

          {/* Header */}
          <h1 className="text-3xl font-semibold text-gray-900">
            Book Appointment
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Choose a time that works for you with{" "}
            <span className="font-medium text-gray-700">
              {practitioner.full_name}
            </span>
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* LEFT: Practitioner Card */}
            <div className="bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 rounded-2xl shadow-sm p-6 h-fit">
              <div className="flex gap-5">
                <img
                  src={
                    practitioner.profile_image ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=ecfeff&textColor=0f172a`
                  }
                  alt={practitioner.full_name}
                  className="w-20 h-20 rounded-full border-2 border-white shadow bg-cyan-100"
                />

                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {practitioner.full_name}
                  </h2>
                  <p className="text-sm font-medium text-cyan-700">
                    Medical Practitioner
                  </p>

                  <p className="text-sm text-gray-600 mt-2">
                    {practitioner.profile_bio ||
                      "Licensed medical practitioner providing patient-focused and evidence-based consultations."}
                  </p>

                  <hr className="my-4 border-cyan-100" />

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {practitioner.experience_years && (
                      <span>🩺 {practitioner.experience_years}+ yrs experience</span>
                    )}
                    <span>💻 Online consultation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Booking Flow */}
            <div className="bg-white rounded-2xl shadow-md p-6 space-y-8">
              {/* STEP 1: Appointment Type */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                      ${
                        selectedType
                          ? "bg-green-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                  >
                    1
                  </span>
                  Select Appointment Type
                </h3>

                <div className="flex flex-wrap gap-3">
                  {practitioner.appointment_types?.map((type: any) => (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedType(type);
                        setSelectedDate(null);
                        setSelectedTime(null);
                        updateData({ appointmentType: type });

                        setTimeout(() => {
                          dateRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }, 150);
                      }}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition
                        ${
                          selectedType?.id === type.id
                            ? "bg-blue-600 text-white border-blue-600 shadow"
                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                        }`}
                    >
                      {type.name} ({type.duration_mins} min)
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 2: Date */}
              <div ref={dateRef}>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                      ${
                        selectedDate
                          ? "bg-green-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                  >
                    2
                  </span>
                  Select Date
                </h3>

                {!selectedType ? (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                    Select an appointment type to choose a date
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 p-3">
                    <Calendar
                      value={selectedDate ? new Date(selectedDate) : undefined}
                      minDate={new Date()}
                      onChange={(date) => {
                        if (!date) return;
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, "0");
                        const d = String(date.getDate()).padStart(2, "0");
                        setSelectedDate(`${y}-${m}-${d}`);
                        setSelectedTime(null);

                        setTimeout(() => {
                          timeRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }, 150);
                      }}
                      theme="light"
                    />
                  </div>
                )}
              </div>

              {/* STEP 3: Time */}
              <div ref={timeRef}>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                      ${
                        selectedTime
                          ? "bg-green-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                  >
                    3
                  </span>
                  <Clock className="w-4 h-4 text-blue-600" />
                  Select Time
                </h3>

                {!selectedDate ? (
                  <p className="text-sm text-gray-500">
                    Select a date to see available time slots
                  </p>
                ) : loadingAvailability ? (
                  <p className="text-sm text-gray-500">Loading slots…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-red-500">
                    No slots available for this date. Try another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((time: string) => (
                      <button
                        key={time}
                        onClick={() => {
                          const [H, M] = time.split(":").map(Number);
                          const [y, m, d] = selectedDate!.split("-").map(Number);

                          const tz =
                            availability?.timezone ||
                            practitioner?.timezone ||
                            "UTC";

                          const startLocal = DateTime.fromObject(
                            { year: y, month: m, day: d, hour: H, minute: M },
                            { zone: tz }
                          );

                          const startUTC = startLocal.toUTC();
                          const endUTC = startUTC.plus({
                            minutes: selectedType.duration_mins,
                          });

                          setSelectedTime(time);
                          updateData({
                            starts_at: startUTC.toISO(),
                            ends_at: endUTC.toISO(),
                          });
                        }}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition
                          ${
                            selectedTime === time
                              ? "bg-green-600 text-white border-green-600 shadow ring-2 ring-green-300"
                              : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
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
        </div>
      </div>
    );
  }
);

BookAppointmentStep.displayName = "BookAppointmentStep";
export default BookAppointmentStep;
