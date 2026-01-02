import Link from "next/link";
import { Calendar, Clock, Stethoscope } from "lucide-react";

function formatTimeLeft(targetIso: string) {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return "Now";

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;

  return `${Math.floor(hours / 24)}d`;
}

export function NextAppointmentCard({ appt }: any) {
    console.log(appt)
  const start = new Date(appt.starts_at);
  const timeLeft = formatTimeLeft(appt.starts_at);
  const isLive = timeLeft === "Now";

  return (
    <div
      className="
        mt-4 p-4 rounded-2xl
        bg-white/80 backdrop-blur
        ring-1 ring-black/5
        shadow-sm
      "
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-blue-700" />
        </div>

        <div className="flex-1">
          <p className="text-base font-semibold text-gray-900">
            {appt.practitioner?.full_name || "Your Practitioner"}
          </p>
          <p className="text-sm text-gray-600">
            {appt.appointment_type?.name}
          </p>
        </div>
      </div>

      {/* Date & Time */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
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

      {/* Countdown */}
      <div className="mt-3">
        <span
          className={`
            inline-block px-3 py-1 rounded-full text-xs font-semibold
            ${
              isLive
                ? "bg-green-600 text-white animate-pulse"
                : "bg-blue-50 text-blue-700"
            }
          `}
        >
          {isLive ? "Happening now" : `Starts in ${timeLeft}`}
        </span>
      </div>
      {/* CTA */}
      {isLive && (
        <Link
          href={`/appointment/meeting?room=${appt.telehealth_url}`}
          className="
            mt-4 block w-full text-center
            rounded-xl bg-green-600
            py-2 text-sm font-semibold text-white
            shadow-md shadow-green-600/30
            hover:bg-green-700 transition
          "
        >
          Join Appointment
        </Link>
      )}
    </div>
  );
}
