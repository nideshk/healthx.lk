// src/components/dashboard/practitioner/tabs/analytics/TimestampsView.tsx
"use client";

import React from "react";
import { TimestampRow } from "@/types/Dashboard";

interface Props {
  rows: TimestampRow[];
  date: string;
  onChangeDate: (v: string) => void;
}

const TimestampsView: React.FC<Props> = ({ rows, date, onChangeDate }) => {
  return (
    <div className="space-y-4 text-xs">
      <div className="max-w-xs space-y-1">
        <div className="text-[11px] text-slate-500">Select Date</div>
        <input
          type="date"
          value={date}
          onChange={(e) => onChangeDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Patient ID</th>
              <th className="px-4 py-2 text-left">Scheduled Time</th>
              <th className="px-4 py-2 text-left">Actual Start</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Duration</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{r.patientId}</td>
                <td className="px-4 py-2">{r.scheduledTime}</td>
                <td className="px-4 py-2">{r.actualStartTime}</td>
                <td className="px-4 py-2">{r.appointmentType}</td>
                <td className="px-4 py-2">{r.duration}</td>
                <td className="px-4 py-2">
                  <StatusPill status={r.status} lateBy={r.lateByMinutes} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-slate-500">
                  No timestamp data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimestampsView;

/* ---------- helpers ---------- */

const StatusPill = ({
  status,
  lateBy,
}: {
  status: "on-time" | "late";
  lateBy?: number;
}) => {
  const isLate = status === "late";
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${
        isLate
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-green-50 text-green-700 border-green-200"
      }`}
    >
      {isLate ? `Late (${lateBy ?? 0} min)` : "On Time"}
    </span>
  );
};
  