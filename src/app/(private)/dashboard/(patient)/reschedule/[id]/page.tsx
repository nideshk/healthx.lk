"use client";

import axios from "axios";
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
    axios
      .get(`/api/booking/appointment/${params.id}`)
      .then((res) => {
        setAppointment(res.data);

        const practitionerTZ = res.data.practitioner?.timezone || "UTC";

        // Convert stored UTC → pract. local
        const startLocal = DateTime.fromISO(res.data.starts_at, {
          zone: "utc",
        }).setZone(practitionerTZ);

        // Build form payload
        const bookingDataObj = {
          appointment_id: res.data.id,
          selectedDoctor: res.data.practitioner,
          appointmentType: res.data.appointmentType,
          selectedService: res.data.selectedService,
          selectedServiceId: res.data.selectedServiceId || "",
          selectedServiceTitle: res.data.selectedServiceTitle || "",
          attendeeCount: res.data.attendeeCount || 1,

          // Keep UTC timestamps — Step component converts back & forth
          starts_at: res.data.starts_at,
          ends_at: res.data.ends_at,

          selectedAttendees: res.data.selectedAttendees || [],
          consent: res.data.consent || {},
          pre_consultation: res.data.pre_consultation || {},
          payment_status: res.data.payment_status,
        };

        setBookingData(bookingDataObj);
      })
      .catch(() => toast.error("Failed to load appointment"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10">Loading…</div>;
  if (!appointment) return <div className="p-10 text-red-500">Appointment not found</div>;

  /* ----------------------------------------------
     6-HOUR RULE CHECK
  ---------------------------------------------- */
  const nowUTC = DateTime.utc();
  const appointmentUTC = DateTime.fromISO(appointment.starts_at).toUTC();
  const diffHours = appointmentUTC.diff(nowUTC, "hours").hours;
  const canReschedule = diffHours >= 6;

  /* ----------------------------------------------
     HANDLE RESCHEDULE SAVE
  ---------------------------------------------- */
  async function handleReschedule() {
    if (!stepRef.current?.validateStep()) return;

    try {
      const payload = {
        starts_at: bookingData.starts_at,
        ends_at: bookingData.ends_at,
      };

      await axios.patch(
        `/api/booking/appointment/${appointment.id}/reschedule`,
        payload
      );

      toast.success("Appointment rescheduled successfully ✨");

      setTimeout(() => {
        router.push("/dashboard/appointment");
      }, 1000);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to reschedule");
    }
  }

  /* ----------------------------------------------
     ORIGINAL TIME (LOCAL)
  ---------------------------------------------- */
  const practitionerTZ = appointment.practitioner?.timezone || "UTC";
  const originalLocal = DateTime.fromISO(appointment.starts_at, { zone: "utc" }).setZone(
    practitionerTZ
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ---------------- HEADER ---------------- */}
      <div className="bg-white border-b p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-600 hover:text-black mb-3"
        >
          <ChevronLeft size={18} />
          Back
        </button>

        <h1 className="text-3xl font-bold">Reschedule Appointment</h1>

        <p className="text-gray-600 mt-1">
          Changing your appointment with{" "}
          <strong>{appointment.practitioner?.full_name}</strong>
        </p>
        {!canReschedule && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            <ShieldAlert size={20} />
            <span>
              You cannot reschedule. Only allowed **6+ hours before** appointment.
            </span>
          </div>
        )}
      </div>

      {/* ---------------- ORIGINAL APPT SUMMARY ---------------- */}
      <div className="mx-auto max-w-4xl p-6">
        <div className="bg-white shadow-sm rounded-xl p-5 border">
          <h2 className="font-semibold text-lg mb-3">Current Appointment</h2>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <CalendarDays className="text-blue-700" size={24} />
            </div>

            <div>
              <p className="text-gray-800 font-medium">
                {originalLocal.toFormat("cccc, dd LLL yyyy")}
              </p>
              <p className="text-gray-600">
                <Clock className="inline w-4 h-4 mr-1" />
                {originalLocal.toFormat("hh:mm a")} ({practitionerTZ})
              </p>
            </div>

            {/* Countdown */}
            <div className="ml-auto">
              <span
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  canReschedule
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {diffHours < 0
                  ? "Already Started"
                  : `${Math.floor(diffHours)}h ${Math.round(
                      (diffHours % 1) * 60
                    )}m left`}
              </span>
            </div>
          </div>
        </div>

        {/* ---------------- RESELECTION UI ---------------- */}
        <div className="mt-6 bg-white border rounded-xl shadow-sm">
          <BookAppointmentStep
            ref={stepRef}
            bookingData={bookingData}
            draftData={appointment}
            prevStep={() => router.back()}
            nextStep={() => {}}
            updateData={(newData) => {
              setBookingData((prev: any) => ({ ...prev, ...newData }));
            }}
          />
        </div>
      </div>

      {/* ---------------- FOOTER ACTION BAR ---------------- */}
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
          className={`px-6 py-2 rounded-lg text-white font-semibold flex items-center gap-2 ${
            canReschedule
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
