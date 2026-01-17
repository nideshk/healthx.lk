"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Loader from "@/components/atom/Loader/Loader";
import { authFetch } from "@/lib/authFetch";
import { CalendarDays, Clock, ChevronRight, AlertCircle, User } from "lucide-react";

export default function RescheduleTab() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/booking/appointment")
      .then((r) => r.json())
      .then((j) => {
        setAppointments(j.upcoming || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="w-[90vh] h-[90vh] flex justify-center items-center">
      <Loader size="lg"></Loader>;
    </div>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Reschedule Appointment
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          Select an upcoming session to adjust your care schedule.
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-white rounded-3xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-slate-900 font-bold">No sessions found</h3>
          <p className="text-slate-500 text-sm max-w-xs">
            You don't have any upcoming appointments available for rescheduling.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="group relative p-5 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 leading-tight mb-1">
                      Dr. {appt.practitioner?.full_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <CalendarDays className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {new Date(appt.starts_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {new Date(appt.starts_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/dashboard/reschedule/${appt.id}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-100"
                >
                  Reschedule
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}