"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Calendar, Clock, Stethoscope, AlertCircle, ChevronRight, History, CalendarCheck, Ban } from "lucide-react";
import Loader from "@/components/atom/Loader/Loader";

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader size="lg" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-6 py-14">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
            Your Appointments
          </h1>
          <p className="text-slate-500 font-medium">View and manage your entire care history with MedX.</p>
        </div>

        <div className="space-y-16">
          <Section 
            title="Upcoming Sessions" 
            items={upcoming} 
            icon={<CalendarCheck className="w-5 h-5 text-blue-600" />}
            emptyText="No upcoming appointments scheduled." 
          />

          <Section 
            title="Past Visits" 
            items={past} 
            icon={<History className="w-5 h-5 text-slate-500" />}
            emptyText="Your completed appointments will appear here." 
          />

          <Section
            title="Cancelled"
            items={cancelled}
            icon={<Ban className="w-5 h-5 text-red-500" />}
            cancelled
            emptyText="No cancelled appointments."
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ */
/* SECTION */
/* ------------------------------------------------------ */
function Section({ title, items, emptyText, icon, cancelled = false }: any) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <span className="ml-auto px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-black">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-8 px-6 rounded-3xl border-2 border-dashed border-slate-200 text-center">
          <p className="text-slate-400 text-sm font-medium">{emptyText}</p>
        </div>
      ) : (
        <div className="grid gap-4">
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
        group relative block p-5 rounded-2xl border transition-all duration-300
        ${
          cancelled
            ? "border-red-100 bg-red-50/30 hover:bg-red-50 hover:border-red-200"
            : "border-slate-100 bg-white hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-200"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          {/* Practitioner Avatar Logic */}
          <div className={`
            w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105
            ${cancelled ? "bg-red-100 border-red-200 text-red-600" : "bg-blue-50 border-blue-100 text-blue-600"}
          `}>
            <Stethoscope className="w-7 h-7" />
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
              Dr. {appt.practitioner?.full_name || "Medical Professional"}
            </h4>
            
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                {appt.appointment_type?.name}
              </span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{time}</span>
              </div>
            </div>

            {cancelled && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-red-100/50 rounded-lg text-[10px] font-black uppercase tracking-wider text-red-600">
                <AlertCircle className="w-3 h-3" />
                Reason: {appt.cancellation_reason || "Cancelled by user"}
              </div>
            )}
          </div>
        </div>

        <div className="p-2 rounded-full bg-slate-50 text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </Link>
  );
}