"use client";

import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

interface EarningsSummary {
  completedAppointments: number;
  grossAmount: number;
  platformFees: number;
  netAmount: number;
}

interface EarningsTabProps {
  clinicianId: string; // future API usage
}

/* ---------------- MOCK API RESPONSE ---------------- */
const MOCK_EARNINGS: EarningsSummary = {
  completedAppointments: 12,
  grossAmount: 18000,
  platformFees: 11400,
  netAmount: 6600,
};

const EarningsTab: React.FC<EarningsTabProps> = ({ clinicianId }) => {
  const startOfMonth = DateTime.now().startOf("month").toISODate();
  const endOfMonth = DateTime.now().endOf("month").toISODate();

  const [startDate, setStartDate] = useState<string | null>(startOfMonth);
  const [endDate, setEndDate] = useState<string | null>(endOfMonth);
  const [summary, setSummary] = useState<EarningsSummary>({
    completedAppointments: 0,
    grossAmount: 0,
    platformFees: 0,
    netAmount: 0,
  });

  /* ---------------- FETCH (MOCK for now) ---------------- */
  const fetchEarnings = async () => {
    /**
     * FUTURE API CALL:
     * GET /api/admin/clinicians/{id}/earnings
     * params: { startDate, endDate }
     */

    console.log("Fetching earnings with params:", {
      clinicianId,
      startDate,
      endDate,
    });

    // mock delay
    setTimeout(() => {
      setSummary(MOCK_EARNINGS);
    }, 300);
  };

  /* ---------------- DEFAULT LOAD (Current Month) ---------------- */
  useEffect(() => {
    fetchEarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- DATE FILTER HANDLER ---------------- */
  const handleApplyFilter = () => {
    fetchEarnings();
  };

  const handleClear = () => {
    setStartDate(startOfMonth);
    setEndDate(endOfMonth);
    fetchEarnings();
  };

  return (
    <div className="space-y-6">

      {/* ---------------- HEADER ---------------- */}
      <div>
        <div className="text-sm font-semibold text-slate-900">
          Earnings Summary
        </div>
        <div className="text-xs text-slate-500">
          Completed appointments and payouts with date filtering
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

          <Button size="sm" onClick={handleApplyFilter}>
            Apply
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
          value={summary.grossAmount}
          valueClass="text-green-600"
        />

        <StatCard
          label="Platform Fees (LKR)"
          value={summary.platformFees}
          valueClass="text-orange-600"
        />

        <StatCard
          label="Net Amount (LKR)"
          value={summary.netAmount}
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
  value: number;
  valueClass?: string;
}) => (
  <div className="border border-slate-200 rounded-xl p-4 bg-white">
    <div className="text-xs text-slate-500">{label}</div>
    <div className={`text-xl font-semibold mt-1 ${valueClass ?? ""}`}>
      {value}
    </div>
  </div>
);
