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
import { ChevronLeft, Clock, Mail, Phone, RotateCcw } from "lucide-react";
import Calendar from "../atom/Calendar/Calendar";
import { AppointmentFormInputs } from "@/types/FormType";

interface Props {
  nextStep: () => void;
  prevStep: () => void;
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

    /* -------------------- FETCH PRACTITIONER -------------------- */
    useEffect(() => {
      async function load() {
        try {
          const res = await axios.get(`/api/practitioners/${practitionerId}`);
          setPractitioner(res.data.practitioner);

          const types = res.data?.appointment_types || [];
          if (types.length > 0) {
            // DON'T preselect — user must choose manually
          }
        } catch (e) {
          toast.error("Failed to load practitioner details");
        } finally {
          setLoadingInfo(false);
        }
      }

      load();
    }, [practitionerId]);

    /* -------------------- FETCH AVAILABILITY -------------------- */
    async function fetchAvailability(force = false) {
      if (!selectedDate || !selectedType) return;

      const key = `${practitionerId}-${selectedDate}-${selectedType?.id}`;
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
        if (!selectedType) return toast.error("Select appointment type"), false;
        if (!selectedDate) return toast.error("Select a date"), false;
        if (!selectedTime) return toast.error("Select a slot"), false;
        return true;
      },
    }));

    /* -------------------- RENDER -------------------- */
    if (loadingInfo) return <div className="p-10">Loading...</div>;

    return (
      <div className="min-h-screen py-10 bg-gradient-to-b from-blue-50 via-white to-blue-50">
        <div className="max-w-5xl mx-auto px-4">
          <button
            onClick={prevStep}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Book Appointment</h1>
          <p className="text-gray-600 mt-1">
            Schedule a consultation with <strong>{practitioner.full_name}</strong>.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            {/* LEFT: Practitioner Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex gap-4">
                <img
                  src={practitioner.profile_image || "/images/default-doctor.png"}
                  className="w-20 h-20 rounded-full object-cover border"
                />
                <div>
                  <h2 className="text-xl font-semibold">{practitioner.full_name}</h2>
                  <p className="text-sm text-gray-600">
                    {practitioner.qualifications || "Qualified Practitioner"}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: Booking Form */}
            <div className="bg-white rounded-xl shadow-md p-6">
              {/* ------- Appointment Type ------- */}
              <h3 className="font-semibold mb-2">Appointment Type</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {practitioner.appointment_types?.map((type: any) => (
                  <button
                    key={type.id}
                    className={`px-3 py-1.5 rounded-md border text-sm ${
                      selectedType?.id === type.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                    onClick={() => {
                      setSelectedType(type);
                      setSelectedDate(null);
                      setSelectedTime(null);
                      updateData({ appointmentType: type });
                    }}
                  >
                    {type.name} ({type.duration_mins} min)
                  </button>
                ))}
              </div>

              {/* ------- DATE PICKER ------- */}
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                Select Date
                {!selectedType && (
                  <span className="text-xs text-red-500">(Select type first)</span>
                )}
              </h3>

              <div className={`${!selectedType ? "opacity-40 pointer-events-none" : ""}`}>
                <Calendar
                  value={selectedDate ? new Date(selectedDate) : undefined}
                  minDate={new Date()}
                  onChange={(date) => {
                    if (!date) return;
                    const yr = date.getFullYear();
                    const mo = String(date.getMonth() + 1).padStart(2, "0");
                    const da = String(date.getDate()).padStart(2, "0");
                    setSelectedDate(`${yr}-${mo}-${da}`);
                    setSelectedTime(null);
                  }}
                  theme="light"
                />
              </div>

              {/* ------- TIME SLOTS ------- */}
              <h3 className="font-semibold mt-6 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-600" />
                Select Time
                {!selectedDate && selectedType && (
                  <span className="text-xs text-red-500">(Select date first)</span>
                )}
              </h3>

              <div
                className={`${
                  !selectedType || !selectedDate
                    ? "opacity-40 pointer-events-none"
                    : ""
                }`}
              >
                {loadingAvailability ? (
                  <p className="text-gray-500">Loading slots…</p>
                ) : slots.length === 0 ? (
                  <p className="text-gray-500">No slots available.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((time: string) => (
                      <button
                        key={time}
                        className={`px-3 py-1.5 rounded-md border text-sm ${
                          selectedTime === time
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-700 border-gray-300"
                        }`}
                       onClick={() => {
  const [H, M] = time.split(":").map(Number);
  const [yr, mo, da] = selectedDate!.split("-").map(Number);

  const practitionerTZ =
    availability?.timezone ||
    practitioner?.timezone ||
    "UTC"; // fallback

  const startLocal = DateTime.fromObject(
    { year: yr, month: mo, day: da, hour: H, minute: M },
    { zone: practitionerTZ }
  );

  const startUTC = startLocal.toUTC();
  const endUTC = startUTC.plus({ minutes: selectedType.duration_mins });

  setSelectedTime(time);

  updateData({
    starts_at: startUTC.toISO(),
    ends_at: endUTC.toISO(),
  });
}}

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
