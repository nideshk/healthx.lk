"use client";

import React, { useMemo } from "react";
import GenericTable, { Column } from "./GenericTable";
import { AuditLogRow } from "./AnalyticsTab";

interface Props {
  rows: AuditLogRow[];
  fromDate: string;
  toDate: string;
  onChangeFromDate: (v: string) => void;
  onChangeToDate: (v: string) => void;
  loading: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    perPage: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
}

const TimestampsView: React.FC<Props> = ({ 
  rows, 
  fromDate, 
  toDate, 
  onChangeFromDate, 
  onChangeToDate,
  loading,
  pagination
}) => {
  const columns = useMemo<Column<AuditLogRow>[]>(() => [
    {
      header: "Appointment ID",
      render: (r) => <span className="text-[10px] text-slate-400 font-mono select-all">{r.appointment_id}</span>,
    },
    {
      header: "Status",
      render: (r) => (
        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">
          {r.status}
        </span>
      ),
    },
    {
      header: "Schedule Start",
      render: (r) => <div className="text-slate-600">{r.schedule_start.replace("T", " ").split(".")[0]}</div>,
    },
    {
      header: "Patient Activity",
      render: (r) => (
        <div className="text-[11px] leading-tight">
          <div className="font-semibold text-slate-800">Joined: <span className="font-normal">{r.patient_activity.joined?.split("T")[1].split(".")[0] ?? "-"}</span></div>
          <div className="text-slate-500">Dur: {r.patient_activity.duration} | Ev: {r.patient_activity.events}</div>
        </div>
      ),
    },
    {
      header: "Practitioner Activity",
      render: (r) => (
        <div className="text-[11px] leading-tight">
          <div className="font-semibold text-slate-800">Joined: <span className="font-normal">{r.practitioner_activity.joined?.split("T")[1].split(".")[0] ?? "-"}</span></div>
          <div className="text-slate-500">Dur: {r.practitioner_activity.duration} | Ev: {r.practitioner_activity.events}</div>
        </div>
      ),
    },
    {
      header: "No Show",
      render: (r) => (
        <span className={r.no_show !== "-" ? "text-red-500 font-medium" : "text-slate-400"}>
          {r.no_show}
        </span>
      ),
    },
    {
      header: "Meeting Duration",
      render: (r) => <span className="font-bold text-slate-700">{r.meeting_duration}</span>,
    },
  ], []);

  return (
    <div className="space-y-4">
      {/* Date Filters Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="text-[11px] text-slate-500 font-medium">Audit From Date</div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onChangeFromDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="space-y-1">
          <div className="text-[11px] text-slate-500 font-medium">Audit To Date</div>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onChangeToDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <GenericTable
        columns={columns}
        data={rows}
        loading={loading}
        minWidth="1100px"
        pagination={pagination}
      />
    </div>
  );
};

export default TimestampsView;