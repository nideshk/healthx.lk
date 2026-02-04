"use client";

import { useEffect, useState } from "react";
import { AppointmentCard } from "../AppointmentCard";
import Loader from "@/components/atom/Loader/Loader";
import {
  Activity,
  CalendarClock,
  History,
  XCircle,
  CreditCard,
  Inbox
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { useTranslations } from "next-intl";

export default function AppointmentTab() {
  const t = useTranslations("appointmentTab");

  const [data, setData] = useState({
    ongoing: [],
    upcoming: [],
    past: [],
    cancelled: [],
    pending: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/booking/appointment")
      .then((r) => r.json())
      .then((j) => {
        console.log(j)
        setData({
          ongoing: j.ongoing || [],
          upcoming: j.upcoming || [],
          past: j.past || [],
          cancelled: j.cancelled || [],
          pending: j.pending_payment || [],
        });
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center gap-4">
        <Loader size="lg" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          {t("syncing")}
        </p>
      </div>
    );
  }

  const hasAnyData = Object.values(data).some(arr => arr.length > 0);

  if (!hasAnyData) {
    return <EmptyDashboardState />;
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {(data.ongoing.length > 0 || data.pending.length > 0) && (
        <div className="grid grid-cols-1 gap-6">
          <Section
            title={t("activeUrgent")}
            items={data.ongoing}
            icon={<Activity className="text-emerald-500" />}
            accent="emerald"
          >
            {(a: any) => <AppointmentCard appt={a} isOngoing />}
          </Section>

          <Section
            title={t("paymentRequired")}
            items={data.pending}
            icon={<CreditCard className="text-amber-500" />}
            accent="amber"
          >
            {(a: any) => <AppointmentCard appt={a} isPending />}
          </Section>
        </div>
      )}

      <Section
        title={t("upcoming")}
        items={data.upcoming}
        icon={<CalendarClock className="text-blue-500" />}
      >
        {(a: any) => <AppointmentCard appt={a} />}
      </Section>

      <div className="pt-8 border-t border-slate-200">
        <Section
          title={t("past")}
          items={data.past}
          icon={<History className="text-slate-400" />}
          gridCols="lg:grid-cols-3"
        >
          {(a: any) => <AppointmentCard appt={a} isPast />}
        </Section>
      </div>

      {data.cancelled.length > 0 && (
        <Section
          title={t("cancelled")}
          items={data.cancelled}
          icon={<XCircle className="text-slate-300" />}
          isCollapsedInitial
        >
          {(a: any) => <AppointmentCard appt={a} isCancelled />}
        </Section>
      )}
    </div>
  );
}

function Section({ title, items, children, icon, accent = "blue", gridCols = "lg:grid-cols-2" }: any) {
  if (items.length === 0) return null;

  const accentColors: any = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${accentColors[accent]}`}>
            {icon}
          </div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {title}
          </h2>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200">
          {items.length}
        </span>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-5`}>
        {items.map((item: any) => (
          <div key={item.id} className="transition-transform duration-200 hover:translate-y-[-2px]">
            {children(item)}
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyDashboardState() {
  const t = useTranslations("appointmentTab");

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center text-center shadow-sm">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-slate-300" />
      </div>
      <h3 className="text-xl font-bold text-slate-900">
        {t("emptyTitle")}
      </h3>
      <p className="text-slate-500 max-w-sm mt-2">
        {t("emptyDescription")}
      </p>
    </div>
  );
}
