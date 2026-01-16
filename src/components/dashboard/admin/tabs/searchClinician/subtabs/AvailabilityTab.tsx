"use client";

import React, { useState } from "react";
import { DateTime } from "luxon";
import { useEffect } from "react";
import { authFetch } from "@/lib/authFetch";


// interface LeaveEntry {
//   date: string; // YYYY-MM-DD
//   type: "full" | "first-half" | "second-half";
//   reason: string;
// }

interface LeaveApi {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: "full_day" | "first_half" | "second_half";
  reason: string;
  applied_windows: {
    date: string;
    windows: {
      from: string;
      to: string;
    }[];
  }[];
}

interface LeaveDay {
  date: string; // YYYY-MM-DD
  leaveType: LeaveApi["leave_type"];
  reason: string;
  windows: { from: string; to: string }[];
}

interface AvailabilityTabProps {
  clinicianId: string; // for future API
}

// const mockLeaves: LeaveEntry[] = [
//   { date: "2025-10-05", type: "full", reason: "Medical Leave" },
//   { date: "2025-10-12", type: "first-half", reason: "Conference Attendance" },
//   { date: "2025-10-21", type: "second-half", reason: "Personal Work" },
//   { date: "2025-10-31", type: "full", reason: "Family Event" },
// ];


const AvailabilityTab: React.FC<AvailabilityTabProps> = ({ clinicianId }) => {

  
 const [currentMonth, setCurrentMonth] = useState(DateTime.now().startOf("month"));
const [selectedDate, setSelectedDate] = useState<string | null>(null);
const [leaveMap, setLeaveMap] = useState<Record<string, LeaveDay>>({});
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchLeaves = async () => {
    try {
      setLoading(true);

      const startDate = currentMonth.startOf("month").toISODate();
      const endDate = currentMonth.endOf("month").toISODate();

      const res = await authFetch(
        `/api/practitioners/${clinicianId}/leaves?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error("Failed to fetch leaves");

      const data = await res.json();

      // 🔁 Normalize API response → date-based map
      const map: Record<string, LeaveDay> = {};

      (data.leaves as LeaveApi[]).forEach((leave) => {
        leave.applied_windows.forEach((day) => {
          map[day.date] = {
            date: day.date,
            leaveType: leave.leave_type,
            reason: leave.reason,
            windows: day.windows,
          };
        });
      });

      setLeaveMap(map);
      setSelectedDate(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchLeaves();
}, [currentMonth, clinicianId]);

  /* ----------------- CALENDAR RENDER FUNCTION (Exact UI Match) ----------------- */
  const renderCalendar = () => {
    const monthStart = currentMonth.startOf("month");
    const monthEnd = currentMonth.endOf("month");

const startWeek = monthStart.minus({ days: monthStart.weekday % 7 });
const endWeek = monthEnd.plus({ days: 6 - (monthEnd.weekday % 7) });

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
${leave?.leaveType === "full_day" ? "bg-red-100 text-red-700 font-semibold" : ""}
${leave?.leaveType === "first_half" ? "bg-orange-100 text-orange-700 font-semibold" : ""}
${leave?.leaveType === "second_half" ? "bg-yellow-100 text-yellow-700 font-semibold" : ""}
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
    {loading
      ? "Loading leave details..."
      : "No leave details available for the selected date."}
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
        {selectedLeave.leaveType === "full_day" && "Full Day Leave"}
        {selectedLeave.leaveType === "first_half" && "First Half Leave"}
        {selectedLeave.leaveType === "second_half" && "Second Half Leave"}
      </span>
    </div>

    <div className="text-sm font-medium text-slate-900">
      Reason:
      <div className="mt-2 text-sm text-slate-700 bg-slate-100 p-3 rounded-lg">
        {selectedLeave.reason}
      </div>
    </div>

    {/* 🆕 Applied Windows */}
    <div className="text-sm font-medium text-slate-900">
      Time Windows:
      <div className="mt-2 space-y-2">
        {selectedLeave.windows.map((w, idx) => (
          <div
            key={idx}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md p-2"
          >
            {DateTime.fromISO(w.from).toFormat("hh:mm a")} –{" "}
            {DateTime.fromISO(w.to).toFormat("hh:mm a")}
          </div>
        ))}
      </div>
    </div>

  </div>
)}
      </div>

    </div>
  );
};

export default AvailabilityTab;
