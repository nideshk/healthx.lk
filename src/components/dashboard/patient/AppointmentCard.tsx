"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Video,
  Lock,
} from "lucide-react";

export function AppointmentCard({
  appt,
  isPast,
  isCancelled,
  isOngoing,
  isPending,
}: any) {
  const router = useRouter();
  const start = new Date(appt.starts_at);

  const canNavigate = !isPending && !isCancelled;

  const hasBadge = isPending || isOngoing || isCancelled || isPast;

  const containerStyle = isCancelled
    ? "bg-red-50 border-red-200 opacity-75"
    : isPending
    ? "bg-yellow-50 border-yellow-200"
    : isOngoing
    ? "bg-green-50 border-green-300 shadow-green-200/40"
    : isPast
    ? "bg-gray-50 border-gray-200 opacity-80"
    : "bg-white/80 border-gray-200 hover:shadow-lg";

  return (
    <article
      role={canNavigate ? "button" : undefined}
      aria-disabled={!canNavigate}
      tabIndex={canNavigate ? 0 : -1}
      onClick={() => {
        if (!canNavigate) return;
        router.push(`/dashboard/appointment/${appt.id}`);
      }}
      onKeyDown={(e) => {
        if (!canNavigate) return;
        if (e.key === "Enter") {
          router.push(`/dashboard/appointment/${appt.id}`);
        }
      }}
      className={`
        group relative rounded-2xl border transition
        focus:outline-none focus:ring-2 focus:ring-blue-500
        ${canNavigate ? "cursor-pointer" : "cursor-default"}
        ${hasBadge ? "pt-10" : "pt-5"}
        px-5 pb-5
        ${containerStyle}
      `}
    >
      {/* STATUS BADGE */}
      <div className="absolute top-3 right-3">
        {isPending && (
          <Badge color="yellow" icon={<Lock className="w-3 h-3" />}>
            Payment Pending
          </Badge>
        )}
        {isOngoing && (
          <Badge color="green" pulse>
            Live
          </Badge>
        )}
        {isCancelled && (
          <Badge color="red">Cancelled</Badge>
        )}
        {isPast && !isCancelled && (
          <Badge color="gray">Completed</Badge>
        )}
      </div>

      {/* HEADER */}
      <div className="flex items-start gap-4">
        <div
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center shrink-0
            ${isOngoing ? "bg-green-100" : "bg-blue-50"}
          `}
        >
          <Video
            className={`w-5 h-5 ${
              isOngoing ? "text-green-700" : "text-blue-700"
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">
            {appt.practitioner?.full_name || "Practitioner"}
          </p>

          <p className="text-sm text-gray-600 mt-0.5">
            {appt.appointment_type?.name} ·{" "}
            {appt.appointment_type?.duration_mins} mins
          </p>
        </div>
      </div>

      {/* DATE & TIME */}
      <div className="mt-4 flex items-center gap-5 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {start.toLocaleDateString()}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* 🔒 PENDING PAYMENT CTA */}
      {isPending && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(
              `/payments/checkout?appointment_id=${appt.id}`
            );
          }}
          className="
            mt-5 w-full px-4 py-2 rounded-xl
            bg-yellow-600 text-white font-semibold
            hover:bg-yellow-700 active:scale-[0.98]
            transition
          "
        >
          Complete Payment
        </button>
      )}

      {/* ▶️ JOIN APPOINTMENT */}
      {isOngoing && (
        <Link
          href={`/appointment/meeting?room=${appt.room_key}`}
          onClick={(e) => e.stopPropagation()}
          className="
            mt-5 inline-flex items-center justify-center gap-2
            w-full px-4 py-2 rounded-xl
            bg-green-600 text-white font-semibold
            hover:bg-green-700 active:scale-[0.98]
            shadow-md shadow-green-600/30
            transition
          "
        >
          Join Appointment
        </Link>
      )}
    </article>
  );
}

/* ---------------------------------------
   Badge Component
--------------------------------------- */
function Badge({
  children,
  color,
  icon,
  pulse,
}: {
  children: React.ReactNode;
  color: "green" | "yellow" | "red" | "gray";
  icon?: React.ReactNode;
  pulse?: boolean;
}) {
  const colors = {
    green: "bg-green-600",
    yellow: "bg-yellow-600",
    red: "bg-red-600",
    gray: "bg-gray-500",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1
        text-xs font-semibold px-2 py-0.5
        rounded-full text-white
        ${colors[color]}
        ${pulse ? "animate-pulse" : ""}
      `}
    >
      {icon}
      {children}
    </span>
  );
}
