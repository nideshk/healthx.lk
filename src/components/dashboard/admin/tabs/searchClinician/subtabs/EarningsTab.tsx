"use client";

import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { authFetch } from "@/lib/authFetch";

interface EarningsSummary {
  completedAppointments: number;
  grossAmount: number;
  platformFees: number;
  netAmount: number;
  consultationFees?: number; // Optional, in case we want to display it later
}

interface EarningsTabProps {
  clinicianId: string; // The practitioner ID passed from the search list
}

const EarningsTab: React.FC<EarningsTabProps> = ({ clinicianId }) => {
  const startOfMonth = DateTime.now().startOf("month").toISODate();
  const endOfMonth = DateTime.now().endOf("month").toISODate();

  const [startDate, setStartDate] = useState<string | null>(startOfMonth);
  const [endDate, setEndDate] = useState<string | null>(endOfMonth);
  const [loading, setLoading] = useState(false);
  
  const [summary, setSummary] = useState<EarningsSummary>({
    completedAppointments: 0,
    grossAmount: 0,
    platformFees: 0,
    netAmount: 0,
    consultationFees: 0,
  });

  /* ---------------- FETCH REAL TRANSACTION DATA ---------------- */
 const fetchEarnings = async () => {
    setLoading(true);
    try {
      // API 2: Analytics Transactions endpoint with practitioner filter
      // Note: Assuming the backend filters by practitioner_id when passed as a query param
      const url = `/api/analytics/transactions?from=${startDate}&to=${endDate}&practitionerId=${clinicianId}`;
      
      const res = await authFetch(url, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch earnings");

      const json = await res.json();

      if (json.analytics) {
        setSummary({
          completedAppointments: json.analytics.totalCompletedTransactions || 0,
          grossAmount: json.analytics.totalGrossAmount || 0,
          platformFees: json.analytics.totalPlatformFees || 0,
          netAmount: json.analytics.netAmount || 0,
          consultationFees: json.analytics.totalConsultationFees || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching clinician earnings:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- DEFAULT LOAD (Current Month) ---------------- */
  useEffect(() => {
    if (clinicianId) {
      fetchEarnings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicianId]);

  /* ---------------- DATE FILTER HANDLER ---------------- */
  const handleApplyFilter = () => {
    fetchEarnings();
  };

  const handleClear = () => {
    setStartDate(startOfMonth);
    setEndDate(endOfMonth);
    // Use a small timeout or functional state update to ensure fetch uses reset values
    setTimeout(() => fetchEarnings(), 0);
  };

  return (
    <div className="space-y-6">

      {/* ---------------- HEADER ---------------- */}
      <div>
        <div className="text-sm font-semibold text-slate-900">
          Earnings Summary
        </div>
        <div className="text-xs text-slate-500">
          {loading ? "Fetching data..." : "Completed appointments and payouts with date filtering"}
        </div>
      </div>

      {/* ---------------- DATE FILTER ---------------- */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="text-xs font-medium text-slate-600 mb-3">
          Filter by Date Range
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={startDate ?? ""}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <span className="text-xs text-slate-500">to</span>

          <Input
            type="date"
            value={endDate ?? ""}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <Button size="sm" onClick={handleApplyFilter} disabled={loading}>
            {loading ? "..." : "Apply"}
          </Button>

          <button
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ---------------- SUMMARY CARDS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Completed Appointments"
          value={summary.completedAppointments}
          valueClass="text-blue-600"
        />

        <StatCard
          label="Gross Amount (LKR)"
          value={summary.grossAmount.toLocaleString()}
          valueClass="text-green-600"
        />

        <StatCard
          label="Platform Fees (LKR)"
          value={summary.platformFees.toLocaleString()}
          valueClass="text-orange-600"
        />

        <StatCard
          label="Net Amount (LKR)"
          value={(summary.consultationFees ?? 0).toLocaleString()}
          valueClass="text-blue-600"
        />
      </div>

    </div>
  );
};

export default EarningsTab;

/* ---------------- SMALL STAT CARD (DRY) ---------------- */
const StatCard = ({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) => (
  <div className="border border-slate-200 rounded-xl p-4 bg-white">
    <div className="text-xs text-slate-500">{label}</div>
    <div className={`text-xl font-semibold mt-1 ${valueClass ?? ""}`}>
      {value}
    </div>
  </div>
);