"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Calendar, Clock, Stethoscope, AlertCircle } from "lucide-react";
import Loader from "@/components/atom/Loader/Loader";

/* ------------------------------------------------------ */
/* MAIN PAGE */
/* ------------------------------------------------------ */
export default function AllAppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [cancelled, setCancelled] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await axios.get("/api/booking/appointment");
        setUpcoming(res.data.upcoming || []);
        setPast(res.data.past || []);
        setCancelled(res.data.cancelled || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-lg text-gray-600">
        <Loader size="lg"></Loader>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 via-white to-gray-50 px-6 py-14">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 mb-10">
          Your Appointments
        </h1>

        <div className="space-y-14">

          <Section title="Upcoming" items={upcoming} emptyText="No upcoming appointments" />

          <Section title="Past" items={past} emptyText="No past appointments" />

          <Section
            title="Cancelled"
            items={cancelled}
            cancelled
            emptyText="No cancelled appointments"
          />

        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ */
/* SECTION */
/* ------------------------------------------------------ */
function Section({ title, items, emptyText, cancelled = false }: any) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-500">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((appt: any) => (
            <AppointmentCard key={appt.id} appt={appt} cancelled={cancelled} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------ */
/* APPOINTMENT CARD */
/* ------------------------------------------------------ */
function AppointmentCard({ appt, cancelled }: any) {
  const start = new Date(appt.starts_at);
  const time = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <Link
      href={`/dashboard/appointment/${appt.id}`}
      className={`
        block p-5 rounded-2xl border backdrop-blur
        transition-all duration-200 hover:shadow-lg
        ${
          cancelled
            ? "border-red-200 bg-red-50 hover:bg-red-100/70"
            : "border-gray-200 bg-white hover:bg-gray-50"
        }
      `}
    >
      <div className="flex items-start justify-between">

        {/* Left side */}
        <div className="flex items-start gap-4">
          {/* IconBubble */}
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6 text-blue-700" />
          </div>

          {/* Text */}
          <div>
            <p className="font-semibold text-gray-900">
              {appt.practitioner?.full_name || "Doctor"}
            </p>

            <p className="text-sm text-gray-600">
              {appt.appointment_type?.name} • {appt.appointment_type?.duration_mins} mins
            </p>

            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Calendar className="w-4 h-4" />
              {start.toLocaleDateString()}
              <span className="mx-1">•</span>
              <Clock className="w-4 h-4" />
              {time}
            </div>

            {cancelled && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-2">
                <AlertCircle className="w-3 h-3" />
                {appt.cancellation_reason || "Cancelled by user"}
              </p>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="text-gray-400">›</div>
      </div>
    </Link>
  );
}
