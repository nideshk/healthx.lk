"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { DateTime } from "luxon";
import BookAppointmentStep from "@/components/flow/BookAppointmentStep";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";

function ReschedulePage() {
  const params = useParams();
  const router = useRouter();

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState<any>(null);

  const stepRef = useRef<any>(null);

  /* ----------------------------------------------
     LOAD ORIGINAL APPOINTMENT
  ---------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    async function fetchAppointment() {
      try {
        if (mounted) setLoading(true);

        const res = await authFetch(
          `/api/booking/appointment/${params.id}`
        );

        if (!res.ok) {
          throw new Error(`Failed to load appointment: ${res.status}`);
        }

        const data = await res.json();

        if (!mounted) return;

        setAppointment(data);

        const bookingDataObj = {
          appointment_id: data.id,
          selectedDoctor: data.practitioner,
          appointmentType: data.appointmentType,
          selectedService: data.selectedService,
          selectedServiceId: data.selectedServiceId || "",
          selectedServiceTitle: data.selectedServiceTitle || "",
          attendeeCount: data.attendeeCount || 1,

          // keep UTC — step component handles conversions
          starts_at: data.starts_at,
          ends_at: data.ends_at,

          selectedAttendees: data.selectedAttendees || [],
          consent: data.consent || {},
          pre_consultation: data.pre_consultation || {},
          payment_status: data.payment_status,
        };

        setBookingData(bookingDataObj);
      } catch (err) {
        console.error("Failed to load appointment:", err);
        if (mounted) {
          toast.error("Failed to load appointment");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (params.id) {
      fetchAppointment();
    }

    return () => {
      mounted = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!appointment) {
    return <div className="p-10 text-red-500">Appointment not found</div>;
  }

  /* ----------------------------------------------
     TIMEZONE & 6-HOUR RULE
  ---------------------------------------------- */
  const practitionerTZ = appointment.practitioner?.timezone || "UTC";

  const appointmentUTC = DateTime.fromISO(appointment.starts_at, {
    zone: "utc",
  });

  const originalLocal = appointmentUTC.setZone(practitionerTZ);
  const userLocal = appointmentUTC.toLocal();

  const diffHours = appointmentUTC.diff(DateTime.utc(), "hours").hours;
  const canReschedule = diffHours >= 6;

  /* ----------------------------------------------
     RESCHEDULE SAVE
  ---------------------------------------------- */
  async function handleReschedule() {
    if (!stepRef.current?.validateStep()) return;

    try {
      const res = await authFetch(
        `/api/booking/appointment/${appointment.id}/reschedule`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            starts_at: bookingData.starts_at,
            ends_at: bookingData.ends_at,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to reschedule");
      }

      toast.success("Appointment rescheduled successfully ✨");

      setTimeout(() => {
        router.push("/dashboard/appointment");
      }, 1000);
    } catch (err: any) {
      console.error("Reschedule failed:", err);
      toast.error(err.message || "Failed to reschedule");
    }
  }


  /* ----------------------------------------------
     UI
  ---------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* HEADER */}
      <div className="bg-white shadow rounded-b-2xl p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-600 hover:text-black mb-3"
        >
          <ChevronLeft size={18} />
          Back
        </button>

        <h1 className="text-3xl font-bold">Reschedule Appointment</h1>

        <p className="text-gray-600 mt-1">
          Changing appointment with{" "}
          <strong>{appointment.practitioner?.full_name}</strong>
        </p>

        {!canReschedule && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            <ShieldAlert size={20} />
            <span>
              Rescheduling allowed only{" "}
              <strong>6+ hours before</strong> the appointment.
            </span>
          </div>
        )}
      </div>

      {/* ORIGINAL APPOINTMENT */}
      <div className="mx-auto max-w-4xl p-6">
        <div className="bg-white shadow-sm rounded-xl p-5">
          <h2 className="font-semibold text-lg mb-3">Current Appointment</h2>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <CalendarDays className="text-blue-700" size={24} />
            </div>

            <div>
              {/* PRACTITIONER LOCAL TIME */}
              <p className="text-gray-800 font-medium">
                {originalLocal.toFormat("cccc, dd LLL yyyy")}
              </p>

              <p className="text-gray-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs text-gray-500 mt-1">
                  Your time: {userLocal.toFormat("hh:mm a")} (
                  {userLocal.zoneName})
                </span>
              </p>

              {/* USER LOCAL TIME (SECONDARY) */}

            </div>

            {/* COUNTDOWN */}
            <div className="ml-auto">
              <span
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${canReschedule
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                  }`}
              >
                {diffHours < 0
                  ? "Already started"
                  : `${Math.floor(diffHours)}h ${Math.round(
                    (diffHours % 1) * 60
                  )}m left`}
              </span>
            </div>
          </div>
        </div>

        {/* RESELECT SLOT */}
        <div className="mt-6 bg-white rounded-xl shadow-sm">
          <BookAppointmentStep
            ref={stepRef}
            bookingData={bookingData}
            draftData={appointment}
            prevStep={() => router.back()}
            nextStep={() => { }}
            updateData={(newData) =>
              setBookingData((prev: any) => ({ ...prev, ...newData }))
            }
          />
        </div>
      </div>

      {/* FOOTER ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-end gap-3 shadow-lg">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>

        <button
          disabled={!canReschedule}
          onClick={handleReschedule}
          className={`px-6 py-2 rounded-lg text-white font-semibold flex items-center gap-2 ${canReschedule
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
            }`}
        >
          Reschedule <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default ReschedulePage;
