"use client";

import axios from "axios";
import { useEffect, useState } from "react";

type FollowUpRequest = {
  id: string;
  follow_up_needed: boolean;
  created_at: string;
  follow_up_date: string | null;
  updated_at: string;
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
    axios
      .get("/api/follow-up")
      .then((res) => setFollowUps(res.data?.data ?? []))
      .catch((err) => {
        console.error("Failed to fetch follow-ups", err);
        setError("Unable to load follow-up requests");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500">
        Loading follow-up requests…
      </div>
    );
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
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Follow-Up Requests
        </h2>
        <p className="text-sm text-gray-500">
          Appointments that require a follow-up consultation
        </p>
      </div>

      {/* Empty */}
      {followUps.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-gray-500">
          No follow-up requests found 🎉
        </div>
      ) : (
        <ul className="space-y-4">
          {followUps.map((req) => {
            const isOverdue =
              req.follow_up_date &&
              new Date(req.follow_up_date) < new Date();

            return (
              <li
                key={req.id}
                className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-col gap-4">
                  {/* Top row */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Dr. {req?.appointment?.practitioner?.full_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {req?.appointment?.practitioner?.specialization?.join(", ")}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        isOverdue
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {isOverdue ? "Overdue Follow-Up" : "Follow-Up Required"}
                    </span>
                  </div>

                  {/* Appointment info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Original Appointment</p>
                      <p className="font-medium">
                        {new Date(req.appointment.starts_at).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Follow-Up Date</p>
                      <p
                        className={`font-medium ${
                          isOverdue ? "text-red-600" : ""
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
