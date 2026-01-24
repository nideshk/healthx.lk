"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Loader from "@/components/atom/Loader/Loader";
import { authFetch } from "@/lib/authFetch";
import {
  CalendarDays,
  Clock,
  ChevronRight,
  AlertCircle,
  User
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function RescheduleTab() {
  const t = useTranslations("rescheduleTab");

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
    return (
      <div className="w-[90vh] h-[90vh] flex justify-center items-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {t("title")}
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          {t("subtitle")}
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-white rounded-3xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-slate-900 font-bold">
            {t("emptyTitle")}
          </h3>
          <p className="text-slate-500 text-sm max-w-xs">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="group p-5 rounded-3xl bg-white border border-slate-100 hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 mb-1">
                      Dr. {appt.practitioner?.full_name}
                    </p>
                    <div className="flex gap-4 text-slate-500">
                      <span className="text-xs font-bold uppercase">
                        {new Date(appt.starts_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-bold uppercase">
                        {new Date(appt.starts_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/dashboard/reschedule/${appt.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold"
                >
                  {t("reschedule")}
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
