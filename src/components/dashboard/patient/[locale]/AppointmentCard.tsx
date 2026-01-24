"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Video,
  Lock,
  ChevronRight,
  User,
  AlertCircle,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  formatDate,
  formatTime
} from "@/utils/formatters";

export function AppointmentCard({
  appt,
  isPast,
  isCancelled,
  isOngoing,
  isPending,
}: any) {
  const t = useTranslations("appointmentCard");
  const locale = useLocale() as "en" | "si";
  const router = useRouter();
  const start = new Date(appt.starts_at);

  const canNavigate = !isPending && !isCancelled;

  const config = {
    cancelled: {
      container: "bg-white border-red-100 opacity-70",
      iconBg: "bg-red-50 text-red-500",
      badge: {
        bg: "bg-red-50 text-red-600 border-red-100",
        label: t("cancelled"),
      },
    },
    pending: {
      container: "bg-amber-50/50 border-amber-200 shadow-sm",
      iconBg: "bg-amber-100 text-amber-600",
      badge: {
        bg: "bg-amber-600 text-white",
        label: t("actionRequired"),
      },
    },
    ongoing: {
      container: "bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500",
      iconBg: "bg-emerald-100 text-emerald-600",
      badge: {
        bg: "bg-emerald-600 text-white animate-pulse",
        label: t("liveNow"),
      },
    },
    past: {
      container: "bg-slate-50 border-slate-200 grayscale-[0.5]",
      iconBg: "bg-slate-200 text-slate-500",
      badge: {
        bg: "bg-slate-100 text-slate-500 border-slate-200",
        label: t("completed"),
      },
    },
    upcoming: {
      container: "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md",
      iconBg: "bg-blue-50 text-blue-600",
      badge: null,
    },
  };

  const current = isCancelled
    ? config.cancelled
    : isPending
    ? config.pending
    : isOngoing
    ? config.ongoing
    : isPast
    ? config.past
    : config.upcoming;

  return (
    <article
      onClick={() =>
        canNavigate && router.push(`/dashboard/appointment/${appt.id}`)
      }
      className={`group relative rounded-2xl border p-5 transition-all duration-200 ${
        canNavigate ? "cursor-pointer active:scale-[0.99]" : "cursor-default"
      } ${current.container}`}
    >
      {/* Status */}
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${current.iconBg}`}>
          <Video className="w-5 h-5" />
        </div>
        {current.badge && (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${current.badge.bg}`}
          >
            {current.badge.label}
          </span>
        )}
      </div>

      {/* Doctor */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
          {appt.practitioner?.profile_picture_url ? (
            <img
              src={appt.practitioner.profile_picture_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900 truncate">
            Dr. {appt.practitioner?.full_name || t("specialist")}
          </h4>
          <p className="text-xs text-slate-500 truncate font-medium">
            {appt.appointment_type?.name}
          </p>
        </div>
      </div>

      {/* Date / Time */}
      <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-100">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold">
            {formatDate(start, locale)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold">
            {formatTime(start, locale)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4">
        {isPending && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(
                `/payments/checkout?appointment_id=${appt.id}`
              );
            }}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
          >
            <Lock className="w-3 h-3" /> {t("completePayment")}
          </button>
        )}

        {isOngoing && (
          <Link
            href={`/appointment/meeting?room=${appt.room_key}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            {t("joinConsultation")}
          </Link>
        )}

        {canNavigate && !isOngoing && !isPending && (
          <div className="flex items-center justify-between text-blue-600 group-hover:translate-x-1 transition-transform">
            <span className="text-[11px] font-bold uppercase">
              {t("viewDetails")}
            </span>
            <ChevronRight className="w-4 h-4" />
          </div>
        )}

        {isCancelled && (
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">
              {t("cancelledMessage")}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
