import Link from "next/link";
import { Calendar, Clock, Stethoscope } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDate, formatTime, formatTimeLeft } from "@/utils/formatters";
import { getLocaleFromCookie } from "@/utils/getLocale";

export function NextAppointmentCard({ appt }: any) {
  const t = useTranslations("nextAppointment");

  const start = new Date(appt.starts_at);
  const locale = getLocaleFromCookie();
  const timeLeft = formatTimeLeft(appt.starts_at, locale);
  const isLive = timeLeft === "now";

  return (
    <div className="mt-4 p-4 rounded-2xl bg-white/80 backdrop-blur ring-1 ring-black/5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-blue-700" />
        </div>

        <div className="flex-1">
          <p className="text-base font-semibold text-gray-900">
            {appt.practitioner?.full_name || t("defaultPractitioner")}
          </p>
          <p className="text-sm text-gray-600">{appt.appointment_type?.name}</p>
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
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {isLive ? t("live") : t("startsIn", { time: timeLeft })}
        </span>
      </div>

      {isLive && (
        <Link
          href={`/appointment/meeting?room=${appt.telehealth_url}`}
          className="mt-4 block w-full text-center rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
        >
          {t("join")}
        </Link>
      )}
    </div>
  );
}