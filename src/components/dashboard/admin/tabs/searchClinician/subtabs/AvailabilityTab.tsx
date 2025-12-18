"use client";

import React, { useState } from "react";
import { DateTime } from "luxon";

interface LeaveEntry {
  date: string; // YYYY-MM-DD
  type: "full" | "first-half" | "second-half";
  reason: string;
}

interface AvailabilityTabProps {
  clinicianId: string; // for future API
}

const mockLeaves: LeaveEntry[] = [
  { date: "2025-10-05", type: "full", reason: "Medical Leave" },
  { date: "2025-10-12", type: "first-half", reason: "Conference Attendance" },
  { date: "2025-10-21", type: "second-half", reason: "Personal Work" },
  { date: "2025-10-31", type: "full", reason: "Family Event" },
];

const AvailabilityTab: React.FC<AvailabilityTabProps> = ({ clinicianId }) => {
  const [currentMonth, setCurrentMonth] = useState(
    DateTime.fromISO("2025-10-01")
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const leaveMap = mockLeaves.reduce((acc, leave) => {
    acc[leave.date] = leave;
    return acc;
  }, {} as Record<string, LeaveEntry>);

  /* ----------------- CALENDAR RENDER FUNCTION (Exact UI Match) ----------------- */
  const renderCalendar = () => {
    const monthStart = currentMonth.startOf("month");
    const monthEnd = currentMonth.endOf("month");

    const startWeek = monthStart.startOf("week"); // calendar starts Sunday
    const endWeek = monthEnd.endOf("week");

    const days: any[] = [];
    let day = startWeek;

    while (day <= endWeek) {
      const dateStr = day.toISODate()!;
      const isCurrentMonth = day.month === currentMonth.month;
      const leave = leaveMap[dateStr];
      const isSelected = selectedDate === dateStr;

      days.push(
        <div
          key={dateStr}
          onClick={() => isCurrentMonth && setSelectedDate(dateStr)}
          className={`
            h-9 w-9 flex items-center justify-center rounded-full cursor-pointer 
            text-sm transition select-none
            ${!isCurrentMonth ? "text-slate-300" : ""}
            ${leave ? "bg-red-100 text-red-700 font-semibold" : ""}
            ${isSelected ? "bg-blue-600 text-white font-semibold" : ""}
            ${isCurrentMonth && !leave && !isSelected ? "hover:bg-slate-200" : ""}
          `}
        >
          {day.day}
        </div>
      );

      day = day.plus({ days: 1 });
    }

    return (
      <div>
        {/* Month Header */}
        <div className="flex justify-between items-center mb-4">
          <button
            className="text-sm text-slate-600 hover:text-slate-900"
            onClick={() => setCurrentMonth(currentMonth.minus({ months: 1 }))}
          >
            ←
          </button>

          <div className="text-sm font-semibold text-slate-900">
            {currentMonth.toFormat("LLLL yyyy")}
          </div>

          <button
            className="text-sm text-slate-600 hover:text-slate-900"
            onClick={() => setCurrentMonth(currentMonth.plus({ months: 1 }))}
          >
            →
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 text-center mb-2 text-[11px] font-medium text-slate-500">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-y-1 place-items-center">
          {days}
        </div>
      </div>
    );
  };

  /* --------------------------- SELECTED LEAVE DETAILS --------------------------- */

  const selectedLeave = selectedDate ? leaveMap[selectedDate] : null;

  return (
    <div className="grid grid-cols-3 gap-6">

      {/* --------------------------- LEFT PANEL (Calendar) --------------------------- */}
      <div className="col-span-1 border border-slate-200 rounded-xl p-4">
        <div className="text-sm font-semibold text-slate-900 mb-1">
          Manage Availability
        </div>
        <div className="text-xs text-slate-500 mb-4">
          Select a date to view leave details
        </div>

        {renderCalendar()}
      </div>

      {/* --------------------------- RIGHT PANEL (Details) --------------------------- */}
      <div className="col-span-2 border border-slate-200 rounded-xl p-4">
        <div className="text-sm font-semibold text-slate-900 mb-1">
          Leave Details
        </div>

        {!selectedLeave ? (
          <div className="text-xs text-slate-500 mt-4">
            No leave details available for the selected date.
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="text-sm font-medium text-slate-900">
              Date:{" "}
              <span className="font-normal">
                {DateTime.fromISO(selectedLeave.date).toFormat("dd LLL yyyy")}
              </span>
            </div>

            <div className="text-sm font-medium text-slate-900">
              Leave Type:{" "}
              <span className="font-normal capitalize">
                {selectedLeave.type === "full" && "Full Day Leave"}
                {selectedLeave.type === "first-half" && "First Half Leave"}
                {selectedLeave.type === "second-half" && "Second Half Leave"}
              </span>
            </div>

            <div className="text-sm font-medium text-slate-900">
              Reason:
              <div className="mt-2 text-sm text-slate-700 bg-slate-100 p-3 rounded-lg">
                {selectedLeave.reason}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default AvailabilityTab;
