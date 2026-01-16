"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Stethoscope, Pill } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

type FollowUpRequest = {
  id: string;
  follow_up_needed: boolean;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  clinician_notes?: string | null;
  prescriptions?: string | null;
  appointment: {
    id: string;
    starts_at: string;
    ends_at: string;
    practitioner: {
      id: string;
      full_name: string;
      specialization: string[];
    };
  };
};

export default function FollowUpRequest() {
  const [followUps, setFollowUps] = useState<FollowUpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchFollowUps() {
      try {
        const res = await authFetch("/api/follow-up");

        if (!res.ok) {
          throw new Error("Failed to load follow-ups");
        }

        const data = await res.json();

        if (!mounted) return;

        setFollowUps(data?.data ?? []);
      } catch (err) {
        console.error("Unable to load follow-up requests:", err);
        if (mounted) {
          setError("Unable to load follow-up requests");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchFollowUps();

    return () => {
      mounted = false;
    };
  }, []);


  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Follow-Up Requests
        </h2>
        <p className="text-sm text-gray-500">
          Consultations that require a follow-up
        </p>
      </div>

      {followUps.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-gray-500">
          No follow-ups pending 🎉
        </div>
      ) : (
        <ul className="space-y-5">
          {followUps.map((req) => {
            const isOverdue =
              req.follow_up_date &&
              new Date(req.follow_up_date) < new Date();

            return (
              <li
                key={req.id}
                className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                {/* Header */}
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Dr. {req.appointment.practitioner.full_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {req.appointment.practitioner.specialization.join(", ")}
                    </p>
                  </div>

                  <span
                    className={`rounded-full flex justify-center items-center px-3 py-1 text-xs font-medium ${isOverdue
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                      }`}
                  >
                    {isOverdue ? "Overdue" : "Follow-Up Required"}
                  </span>
                </div>

                {/* Dates */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Original Appointment</p>
                    <p className="font-medium">
                      {new Date(
                        req.appointment.starts_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Follow-Up Date</p>
                    <p
                      className={`font-medium ${isOverdue ? "text-red-600" : ""
                        }`}
                    >
                      {req.follow_up_date
                        ? new Date(req.follow_up_date).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p className="font-medium">
                      {new Date(req.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {req.clinician_notes && (
                  <div className="mt-5 flex gap-2 text-sm text-gray-700">
                    <Stethoscope className="w-4 h-4 mt-0.5 text-gray-500" />
                    <p className="line-clamp-2">
                      {req.clinician_notes}
                    </p>
                  </div>
                )}

                {/* Prescriptions */}
                {req.prescriptions && (
                  <div className="mt-3 flex gap-2 text-sm text-gray-700">
                    <Pill className="w-4 h-4 mt-0.5 text-gray-500" />
                    <p className="line-clamp-2">
                      {req.prescriptions}
                    </p>
                  </div>
                )}

                {/* CTA */}
                <div className="mt-6 flex justify-end">
                  <Link
                    href={`/appointment?followUpFor=${req.appointment.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    <CalendarDays className="w-4 h-4" />
                    Book Follow-Up
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
