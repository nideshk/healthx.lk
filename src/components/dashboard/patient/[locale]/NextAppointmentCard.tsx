"use client";

import Link from "next/link";
import { Calendar, Clock, Stethoscope } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate, formatTime, formatTimeLeft } from "@/utils/formatters";
import {
  resolveNextAppointmentJoin,
  type JoinableAppointment,
} from "@/lib/meetings/joinLink";

export function NextAppointmentCard({
  appt,
  appointments,
}: {
  appt?: JoinableAppointment | null;
  appointments?: readonly JoinableAppointment[] | null;
}) {
  const t = useTranslations("nextAppointment");
  const locale = useLocale() as "en" | "si";
  const resolved = resolveNextAppointmentJoin({ appt, appointments });
  if (!resolved) return null;

  const { appointment, joinPath } = resolved;
  const start = new Date(appointment.starts_at);
  const timeLeft = formatTimeLeft(appointment.starts_at, locale);
  const isLive = timeLeft === "now";

  return (
    <div className="mt-4 p-4 rounded-2xl bg-white/80 backdrop-blur ring-1 ring-black/5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-cx-tint flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-cx-deep" />
        </div>

        <div className="flex-1">
          <p className="text-base font-semibold text-gray-900">
            {appointment.practitioner?.full_name || t("defaultPractitioner")}
          </p>
          <p className="text-sm text-gray-600">{appointment.appointment_type?.name}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(start, locale)}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatTime(start, locale)}
        </div>
      </div>

      <div className="mt-3">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
            isLive
              ? "bg-green-600 text-white animate-pulse"
              : "bg-cx-tint text-cx-deep"
          }`}
        >
          {isLive ? t("live") : t("startsIn", { time: timeLeft })}
        </span>
      </div>

      {isLive && joinPath && (
        <Link
          href={joinPath}
          className="mt-4 block w-full text-center rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
        >
          {t("join")}
        </Link>
      )}
    </div>
  );
}