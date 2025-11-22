"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import axios from "axios";
import { toast } from "sonner";
import { ChevronLeft, Clock, Mail, Phone, RotateCcw } from "lucide-react";
import Calendar from "../atom/Calendar/Calendar";
import { AppointmentFormInputs } from "@/types/FormType";

interface BookAppointmentStepProps {
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
  draftData?: any;
}

const BookAppointmentStep = forwardRef(
  (
    { nextStep, prevStep, updateData, bookingData, draftData }: BookAppointmentStepProps,
    ref
  ) => {
    const practitionerId = bookingData?.selectedDoctor?.id;

    if (!practitionerId) {
      return (
        <div className="p-10 text-center text-red-500 font-semibold">
          No doctor selected. Please go back and choose a practitioner.
        </div>
      );
    }

    // -------------------------------
    // Local State
    // -------------------------------
    const [practitioner, setPractitioner] = useState<any>(null);
    const [availability, setAvailability] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<any>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    const [loadingInfo, setLoadingInfo] = useState(true);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    // -------------------------------
    // SHORT-LIVED AVAILABILITY CACHE (30 seconds)
    // -------------------------------
    const availabilityCache = useRef<{
      [key: string]: { data: any; ts: number };
    }>({});

    // -------------------------------
    // Fetch practitioner info
    // -------------------------------
    useEffect(() => {
      async function load() {
        try {
          setLoadingInfo(true);
          const res = await axios.get(`/api/practitioners/${practitionerId}`);
          setPractitioner(res.data.practitioner);

          const types = res.data?.appointment_types || [];
          if (types.length > 0) setSelectedType(types[0]);
        } catch (err) {
          toast.error("Failed to load practitioner details");
        } finally {
          setLoadingInfo(false);
        }
      }

      load();
    }, [practitionerId]);

    // -------------------------------
    // Fetch availability (with short caching)
    // -------------------------------
    async function loadAvail(force = false) {
      if (!selectedDate) return;

      const key = `${practitionerId}-${selectedDate}-${selectedType?.id}`;
      const now = Date.now();
      const maxAge = 30 * 1000; // 30 seconds

      if (!force && availabilityCache.current[key]) {
        const cached = availabilityCache.current[key];
        if (now - cached.ts < maxAge) {
          setAvailability(cached.data);
          return;
        }
      }

      setLoadingAvailability(true);
      try {
        const res = await axios.get(
          `/api/booking/${practitionerId}/availability?date=${selectedDate}`
        );

        availabilityCache.current[key] = {
          data: res.data,
          ts: now,
        };

        setAvailability(res.data);
      } catch (err) {
        console.error("Availability error:", err);
      } finally {
        setLoadingAvailability(false);
      }
    }

    // -------------------------------
    // Auto fetch availability when date changes
    // -------------------------------
    useEffect(() => {
      if (selectedDate) loadAvail();
    }, [selectedDate, selectedType]);

    // -------------------------------
    // Build slots for selected type
    // -------------------------------
    const slots = useMemo(() => {
      if (!availability || !selectedType) return [];
      return availability.slots_by_type?.[selectedType.name] || [];
    }, [availability, selectedType]);

    // -------------------------------
    // Expose validation to parent flow
    // -------------------------------
    useImperativeHandle(ref, () => ({
      validateStep: () => {
        if (!selectedType) {
          toast.error("Select appointment type");
          return false;
        }
        if (!selectedDate) {
          toast.error("Select a date");
          return false;
        }
        if (!selectedTime) {
          toast.error("Select a time slot");
          return false;
        }
        return true;
      },
    }));

    // -------------------------------
    // Render UI
    // -------------------------------
    if (loadingInfo) {
      return (
        <div className="p-8 text-center text-gray-500">
          Loading practitioner…
        </div>
      );
    }

    if (!practitioner) {
      return (
        <div className="p-8 text-center text-red-500">
          Unable to load practitioner.
        </div>
      );
    }

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
            {/* LEFT SIDE */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex gap-4">
                <img
                  src={practitioner.profile_image || "/images/default-doctor.png"}
                  alt={practitioner.full_name}
                  className="w-20 h-20 rounded-full object-cover border"
                />
                <div>
                  <h2 className="text-xl font-semibold">{practitioner.full_name}</h2>
                  <p className="text-sm text-gray-600">
                    {practitioner.qualifications || "Qualified Practitioner"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1 text-sm">
                {practitioner.contact_email && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" /> {practitioner.contact_email}
                  </p>
                )}
                {practitioner.contact_number && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" /> {practitioner.contact_number}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="bg-white rounded-xl shadow-md p-6">

              {/* Appointment Types */}
              <h3 className="font-semibold mb-2">Appointment Type</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {practitioner.appointment_types?.map((type: any) => (
                  <button
                    key={type.id}
                    className={`px-3 py-1.5 text-sm rounded-md border ${
                      selectedType?.id === type.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                    onClick={() => {
                      setSelectedType(type);
                      setSelectedTime(null);
                      updateData({ appointmentType: type });
                    }}
                  >
                    {type.name} ({type.duration_mins} min)
                  </button>
                ))}
              </div>

              {/* Calendar */}
              <h3 className="font-semibold mb-2">Select Date</h3>

              <Calendar
                value={selectedDate ? new Date(selectedDate) : undefined}
                minDate={new Date()}
                onChange={(date) => {
                  if (!date) return;

                  // No timezone shifting
                  const yr = date.getFullYear();
                  const mo = String(date.getMonth() + 1).padStart(2, "0");
                  const da = String(date.getDate()).padStart(2, "0");

                  const dateStr = `${yr}-${mo}-${da}`;
                  setSelectedDate(dateStr);
                  setSelectedTime(null);
                }}
                theme="light"
              />

              {/* Slots */}
              {selectedDate && (
                <div className="mt-6">

                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold flex items-center gap-1">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Available Slots
                    </h3>

                    <button
                      onClick={() => loadAvail(true)}
                      className="text-xs px-2 py-1 border rounded-md hover:bg-gray-100 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Refresh
                    </button>
                  </div>

                  {loadingAvailability ? (
                    <p className="text-gray-500">Loading slots…</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slots.length === 0 && (
                        <p className="text-gray-500">No slots available.</p>
                      )}

                      {slots.map((time: string) => (
                        <button
                          key={time}
                          className={`px-3 py-1.5 rounded-md border text-sm ${
                            selectedTime === time
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-300"
                          }`}
                          onClick={() => {
                            setSelectedTime(time);

                            const [H, M] = time.split(":").map(Number);
                            const [yr, mo, da] = selectedDate.split("-").map(Number);

                            const start = new Date(Date.UTC(yr, mo - 1, da, H, M));
                            const duration = selectedType.duration_mins;
                            const end = new Date(start.getTime() + duration * 60 * 1000);

                            updateData({
                              starts_at: start.toISOString(),
                              ends_at: end.toISOString(),
                            });
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

BookAppointmentStep.displayName = "BookAppointmentStep";
export default BookAppointmentStep;
