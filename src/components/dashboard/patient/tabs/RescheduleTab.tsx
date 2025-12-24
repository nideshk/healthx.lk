"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function RescheduleTab() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/booking/appointment")
      .then((r) => r.json())
      .then((j) => {
        setAppointments(j.upcoming || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Reschedule Appointment</h2>

      {appointments.length === 0 ? (
        <p className="text-gray-600">
          No upcoming appointments to reschedule.
        </p>
      ) : (
        appointments.map((appt) => (
          <div
            key={appt.id}
            className="p-4 rounded-2xl bg-white/70 ring-1 ring-black/5 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">
                {appt.practitioner?.full_name}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(appt.starts_at).toLocaleDateString()} ·{" "}
                {new Date(appt.starts_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <Link
              href={`/dashboard/reschedule/${appt.id}`}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              Reschedule
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
