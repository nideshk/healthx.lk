import { CalendarDays, Clock, Stethoscope } from "lucide-react";
import Link from "next/link";
import { getTimeUntil } from "@/utils/time";

export function AppointmentCard({
  appt,
  isPast = false,
}: {
  appt: any;
  isPast?: boolean;
}) {
  const start = new Date(appt.starts_at);
  const doctor = appt.practitioner;

  return (
    <div
      className="
        p-6 rounded-2xl
        bg-white shadow-md
        border border-gray-100
        hover:shadow-lg transition-all
      "
    >
      {/* Status row */}
      <div className="flex items-center justify-between mb-3">
        {/* Status badge */}
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ${
            isPast
              ? "bg-gray-100 text-gray-600"
              : appt.status === "confirmed"
              ? "bg-blue-100 text-blue-700"
              : appt.status === "completed"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {isPast ? "PAST" : appt.status.toUpperCase()}
        </span>

        {/* Countdown (only for upcoming) */}
        {!isPast && (
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            {getTimeUntil(appt.starts_at)}
          </span>
        )}
      </div>

      {/* Doctor Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-blue-700" />
        </div>

        <div>
          <p className="font-bold text-gray-900">{doctor.full_name}</p>
          <p className="text-sm text-gray-600">
            {doctor.specialization?.join(", ") || "Specialist"}
          </p>
        </div>
      </div>

      {/* Appointment details */}
      <div className="space-y-2 text-gray-700 text-sm">
        <p className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          {start.toLocaleDateString()}
        </p>

        <p className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
          {appt.appointment_type?.duration_mins} mins
        </p>

        <p className="">
          <strong>Type:</strong> {appt.appointment_type?.name}
        </p>
      </div>

      {/* CTA */}
      <div className="mt-4">
        <Link
          href={`/appointments/${appt.id}`}
          className="text-blue-600 text-sm font-medium hover:text-blue-800 underline"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
