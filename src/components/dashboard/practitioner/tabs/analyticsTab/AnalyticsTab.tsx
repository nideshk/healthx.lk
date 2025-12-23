// src/components/dashboard/practitioner/tabs/analytics/AnalyticsTab.tsx
"use client";

import React, { useEffect, useState } from "react";
import { BookingStats, AnalyticsTabId, TimestampRow } from "@/types/Dashboard";
import TimestampsView from "./TimestampsView";
import RevenueBreakdownModal from "./RevenueBreakdownModal";

/* ---------- constants ---------- */

const EMPTY_BOOKING_STATS: BookingStats = {
  totalBookings: 0,
  completed: 0,
  cancelled: 0,
  refunds: 0,
  upcoming: 0,
  revenue: 0,
  currency: "LKR",
};

const MOCK_TIMESTAMP_ROWS: TimestampRow[] = [
  {
    id: "1",
    patientId: "pt-24",
    scheduledTime: "October 30th, 2025 09:00 AM",
    actualStartTime: "09:06 AM",
    appointmentType: "Short (10 min)",
    duration: "12 min",
    status: "late",
    lateByMinutes: 6,
  },
  {
    id: "2",
    patientId: "pt-25",
    scheduledTime: "October 30th, 2025 10:30 AM",
    actualStartTime: "10:30 AM",
    appointmentType: "Long (30 min)",
    duration: "28 min",
    status: "on-time",
  },
];

/* ---------- component ---------- */

const AnalyticsTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>("bookings");

  const [stats, setStats] = useState<BookingStats>(EMPTY_BOOKING_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [timestampDate, setTimestampDate] = useState("");

  const [showRevenueModal, setShowRevenueModal] = useState(false);

// mock for now – later comes from backend
const revenueBreakdownMock = {
  platformFees: 6800,
  doctorEarnings: 10200,
};


  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) throw new Error("Auth failed");

        const me = await res.json();
        const practitionerId =
          me?.user?.practitioner_id ?? me?.practitioner_id;

        if (!practitionerId) throw new Error("No practitioner id");

        const analyticsRes = await fetch(
          `/api/practitioners/${practitionerId}/analytics`,
          { credentials: "include" }
        );

        if (!analyticsRes.ok) throw new Error("Analytics fetch failed");

        const data = await analyticsRes.json();

        setStats({
          totalBookings: data.total_bookings ?? 0,
          completed: data.completed ?? 0,
          cancelled: data.cancelled ?? 0,
          refunds: data.refunds_requested ?? 0,
          upcoming: data.upcoming ?? 0,
          revenue: data.total_revenue ?? 0,
          currency: "LKR",
        });
      } catch (e: any) {
        setError(e.message);
        setStats(EMPTY_BOOKING_STATS);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold text-slate-900">Analytics</h1>
        <p className="text-xs text-slate-500">
          View your appointment analytics and timestamps
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-full bg-slate-100 p-1 text-xs">
        <AnalyticsTabButton
          id="bookings"
          label="Track Bookings"
          active={activeTab}
          onClick={setActiveTab}
        />
        <AnalyticsTabButton
          id="timestamps"
          label="Timestamps"
          active={activeTab}
          onClick={setActiveTab}
        />
      </div>

      {/* Content */}
      {activeTab === "bookings" ? (
        <>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-xs text-slate-500">Loading analytics…</div>
          ) : (
            <BookingsView
              stats={stats}
              fromDate={fromDate}
              toDate={toDate}
              onChangeFromDate={setFromDate}
              onChangeToDate={setToDate}
              onRevenueClick={() => setShowRevenueModal(true)}

            />
          )}
        </>
      ) : (
        <TimestampsView
          rows={MOCK_TIMESTAMP_ROWS}
          date={timestampDate}
          onChangeDate={setTimestampDate}
        />
      )}
      {showRevenueModal && (
  <RevenueBreakdownModal
    data={revenueBreakdownMock}
    onClose={() => setShowRevenueModal(false)}
  />
)}

    </div>
  );
};

export default AnalyticsTab;

/* ---------- sub components ---------- */

const AnalyticsTabButton = ({
  id,
  label,
  active,
  onClick,
}: {
  id: AnalyticsTabId;
  label: string;
  active: AnalyticsTabId;
  onClick: (id: AnalyticsTabId) => void;
}) => (
  <button
    onClick={() => onClick(id)}
    className={`flex-1 rounded-full px-3 py-2 font-medium ${
      id === active
        ? "bg-blue-600 text-white"
        : "text-slate-600 hover:text-slate-900"
    }`}
  >
    {label}
  </button>
);

const BookingsView = ({
  stats,
  fromDate,
  toDate,
  onChangeFromDate,
  onChangeToDate,
  onRevenueClick,
}: {
  stats: BookingStats;
  fromDate: string;
  toDate: string;
  onChangeFromDate: (v: string) => void;
  onChangeToDate: (v: string) => void;
  onRevenueClick: () => void;
}) => (
  <div className="space-y-4">
    {/* Date filters */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <DateInput label="From Date" value={fromDate} onChange={onChangeFromDate} />
      <DateInput label="To Date" value={toDate} onChange={onChangeToDate} />
    </div>

    {/* Stats cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Stat label="Total Bookings" value={stats.totalBookings} bg="bg-blue-500" />
      <Stat label="Appts. Completed" value={stats.completed} bg="bg-green-500" />
      <Stat label="Cancelled Bookings" value={stats.cancelled} bg="bg-red-500" />
      <Stat label="Refunds Requested" value={stats.refunds} bg="bg-amber-400" />
      <Stat label="Upcoming Appointments" value={stats.upcoming} bg="bg-orange-500" />
      <Stat
        label="Total Revenue"
        value={`${stats.currency} ${stats.revenue.toLocaleString()}`}
        bg="bg-purple-500"
        onClick={onRevenueClick}
      />
    </div>
  </div>
);

const DateInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-1">
    <div className="text-[11px] text-slate-500">{label}</div>
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
    />
  </div>
);

const Stat = ({
  label,
  value,
  bg,
  onClick,
}: {
  label: string;
  value: string | number;
  bg: string;
  onClick?: () => void;
}) => (
 <div
    onClick={onClick}
    className={`rounded-xl px-4 py-3 text-xs font-medium text-white ${bg} ${
      onClick ? "cursor-pointer hover:opacity-90" : ""
    }`}
  >    <div className="text-[11px] opacity-90">{label}</div>
    <div className="mt-1 text-sm">{value}</div>
  </div>
);
