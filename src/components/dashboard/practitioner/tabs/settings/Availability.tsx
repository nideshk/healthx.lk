"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/atom/Button/Button";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type LeaveType = "FULL_DAY" | "FIRST_HALF" | "SECOND_HALF";

interface LeaveRequest {
  date: string; // YYYY-MM-DD
  type: LeaveType;
  appliedAt: string; // ISO
}

/* -------------------------------------------------------------------------- */
/*                               CONSTANTS                                    */
/* -------------------------------------------------------------------------- */

const LEAVE_TYPES: { label: string; value: LeaveType }[] = [
  { label: "Full Day", value: "FULL_DAY" },
  { label: "First Half", value: "FIRST_HALF" },
  { label: "Second Half", value: "SECOND_HALF" },
];

const MAX_DAYS_AHEAD = 45;

/* -------------------------------------------------------------------------- */
/*                               HELPERS                                      */
/* -------------------------------------------------------------------------- */

const formatDate = (date: Date) => date.toISOString().split("T")[0];

const getLeaveColor = (type: LeaveType) => {
  if (type === "FULL_DAY") return "bg-red-400";
  if (type === "FIRST_HALF") return "bg-yellow-400";
  return "bg-blue-400";
};

const formatLeaveType = (type: LeaveType) => {
  if (type === "FULL_DAY") return "Full Day";
  if (type === "FIRST_HALF") return "First Half";
  return "Second Half";
};

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const Availability: React.FC = () => {
  const today = new Date();
  const maxAllowedDate = new Date();
  maxAllowedDate.setDate(today.getDate() + MAX_DAYS_AHEAD);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(today));
  const [leaveType, setLeaveType] = useState<LeaveType>("FULL_DAY");

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- FETCH EXISTING LEAVES ---------------- */

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        /**
         * FUTURE API:
         * GET /api/practitioner/availability/leaves
         */
        const res = await fetch("/api/mock/leaves");
        if (!res.ok) return;
        const data = await res.json();
        setLeaveRequests(data);
      } catch (err) {
        console.error("Failed to load leaves", err);
      }
    };

    fetchLeaves();
  }, []);

  /* ---------------- APPLY LEAVE ---------------- */

  const applyLeave = async () => {
    if (!selectedDate) return;

    /**
     * FUTURE API:
     * POST /api/practitioner/availability/leave
     */
    setLoading(true);

    setLeaveRequests((prev) => [
      ...prev,
      {
        date: selectedDate,
        type: leaveType,
        appliedAt: new Date().toISOString(),
      },
    ]);

    setLoading(false);
  };

  /* ---------------- CANCEL LEAVE ---------------- */

  const cancelLeave = async (date: string) => {
    /**
     * FUTURE API:
     * DELETE /api/practitioner/availability/leave?date=YYYY-MM-DD
     */
    setLeaveRequests((prev) => prev.filter((l) => l.date !== date));
  };

  /* ---------------- DERIVED DATA ---------------- */

  const existingLeaveForSelectedDate = leaveRequests.find(
    (l) => l.date === selectedDate
  );

  const daysInMonth = useMemo(() => {
    const start = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const end = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );

    const days: Date[] = [];
    for (let i = 1; i <= end.getDate(); i++) {
      days.push(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i)
      );
    }
    return days;
  }, [currentMonth]);

  /* -------------------------------------------------------------------------- */
  /*                                   UI                                       */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* -------------------- CALENDAR -------------------- */}
      <div className="border rounded-xl p-5 bg-white">
        <div className="text-sm font-semibold mb-1">Manage Availability</div>
        <div className="text-xs text-slate-500 mb-4">
          Select a date to apply leave
        </div>

        {/* Month Header */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1,
                  1
                )
              )
            }
          >
            ←
          </button>
          <div className="font-medium">
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                  1
                )
              )
            }
          >
            →
          </button>
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="text-slate-400">
              {d}
            </div>
          ))}

          {daysInMonth.map((date) => {
            const dateStr = formatDate(date);
            const isDisabled =
              date < today || date > maxAllowedDate;
            const leave = leaveRequests.find((l) => l.date === dateStr);

            return (
              <button
                key={dateStr}
                disabled={isDisabled}
                onClick={() => setSelectedDate(dateStr)}
                className={`relative h-9 rounded-full text-sm
                  ${
                    selectedDate === dateStr
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-100"
                  }
                  ${isDisabled ? "text-slate-300 cursor-not-allowed" : ""}
                `}
              >
                {date.getDate()}
                {leave && (
                  <span
                    className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ${getLeaveColor(
                      leave.type
                    )}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Leave Type */}
        <div className="mt-5">
          <div className="text-xs text-slate-500 mb-2">Leave Type</div>
          <div className="flex gap-2">
            {LEAVE_TYPES.map((t) => (
              <button
                key={t.value}
                disabled={!!existingLeaveForSelectedDate}
                onClick={() => setLeaveType(t.value)}
                className={`px-3 py-2 rounded-lg text-xs border
                  ${
                    leaveType === t.value
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-slate-200"
                  }
                  ${
                    existingLeaveForSelectedDate
                      ? "opacity-40 cursor-not-allowed"
                      : ""
                  }
                `}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Button
            className="mt-4"
            disabled={!!existingLeaveForSelectedDate || loading}
            onClick={applyLeave}
          >
            Apply Leave
          </Button>
        </div>
      </div>

      {/* -------------------- LEAVE DETAILS -------------------- */}
      <div className="border rounded-xl p-5 bg-white">
        <div className="text-sm font-semibold mb-3">Leave Details</div>

        {leaveRequests.length === 0 && (
          <div className="text-xs text-slate-500">
            No leave details available.
          </div>
        )}

        <div className="space-y-3">
          {leaveRequests.map((leave, i) => (
            <div
              key={i}
              className="border rounded-lg p-3 text-xs flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{leave.date}</div>
                <div className="text-slate-500">
                  {formatLeaveType(leave.type)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Applied on{" "}
                  {new Date(leave.appliedAt).toLocaleDateString()}
                </div>
              </div>

              <button
                onClick={() => cancelLeave(leave.date)}
                className="text-red-600 hover:underline text-[11px]"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Availability;
