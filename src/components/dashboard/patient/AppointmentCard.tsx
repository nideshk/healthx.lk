"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Video } from "lucide-react";

export function AppointmentCard({
  appt,
  isPast,
  isCancelled,
  isOngoing,
}: any) {
  const router = useRouter();
  const start = new Date(appt.starts_at);

  const containerStyle = isCancelled
    ? "bg-red-50 border border-red-200"
    : isOngoing
    ? "bg-green-50 border border-green-300 shadow-green-200/40"
    : isPast
    ? "bg-gray-50 border border-gray-200"
    : "bg-white/70 border border-gray-200 hover:shadow-lg";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/dashboard/appointment/${appt.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          router.push(`/dashboard/appointment/${appt.id}`);
        }
      }}
      className={`
        group relative p-5 rounded-2xl transition cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-blue-500
        ${containerStyle}
      `}
    >
      {/* STATUS BADGE */}
      {isOngoing && (
        <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-600 text-white animate-pulse">
          Live
        </span>
      )}
      {isCancelled && (
        <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">
          Cancelled
        </span>
      )}
      {isPast && !isCancelled && (
        <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-500 text-white">
          Completed
        </span>
      )}

      {/* HEADER */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Video className="w-5 h-5 text-blue-700" />
        </div>

        <div className="flex-1">
          <p className="text-base font-semibold text-gray-900">
            {appt.practitioner?.full_name || "Practitioner"}
          </p>

          <p className="text-sm text-gray-600 mt-0.5">
            {appt.appointment_type?.name} ·{" "}
            {appt.appointment_type?.duration_mins} mins
          </p>
        </div>
      </div>

      {/* DATE & TIME */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
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

      {/* CTA — stop click bubbling */}
      {isOngoing && (
        <Link
          href={`/appointment/meeting?room=${appt.telehealth_url}`}
          onClick={(e) => e.stopPropagation()}
          className="
            mt-5 inline-flex items-center justify-center gap-2
            w-full px-4 py-2 rounded-xl
            bg-green-600 text-white font-semibold
            hover:bg-green-700
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
