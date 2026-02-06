"use client";

import React, { useState, useEffect } from "react";
import { DateTime } from "luxon";
import { authFetch } from "@/lib/authFetch";
import { toast } from "react-toastify";
import AvailabilitySelector, {
  AvailabilityInput,
} from "@/components/dashboard/practitioner/AvailabilitySelector";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

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

interface AvailabilityWindow {
  id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
}

interface LeaveDay {
  date: string;
  leaveType: LeaveApi["leave_type"];
  reason: string;
  windows: { from: string; to: string }[];
}

interface AvailabilityTabProps {
  clinicianId: string;
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_DAYS_AHEAD = 28;

const AvailabilityTab: React.FC<AvailabilityTabProps> = ({
  clinicianId,
}) => {
  const today = DateTime.now().startOf("day");

  const [currentMonth, setCurrentMonth] = useState(
    today.startOf("month")
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    null
  );

  const [leaveMap, setLeaveMap] = useState<
    Record<string, LeaveDay>
  >({});
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, boolean>
  >({});

  const [availabilityList, setAvailabilityList] = useState<
    AvailabilityWindow[]
  >([]);

  const [availabilityInput, setAvailabilityInput] =
    useState<AvailabilityInput>({
      date: "",
      start_time: "09:00",
      end_time: "17:00",
      timezone: "Asia/Colombo",
    });

  const [loading, setLoading] = useState(false);

  /* -------------------- FETCH LEAVES -------------------- */
  const deleteAvailability = async (id: string) => {
    try {
      setLoading(true);

      const res = await authFetch(
        `/api/practitioner/availability/${id}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete");
      }

      // remove from local state
      setAvailabilityList((prev) =>
        prev.filter((slot) => slot.id !== id)
      );

      toast.success("Availability removed");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        setLoading(true);

        const startDate =
          currentMonth.startOf("month").toISODate();
        const endDate =
          currentMonth.endOf("month").toISODate();

        const res = await authFetch(
          `/api/practitioners/${clinicianId}/leaves?startDate=${startDate}&endDate=${endDate}`
        );

        if (!res.ok) throw new Error("Failed to fetch leaves");

        const data = await res.json();

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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [currentMonth, clinicianId]);

  /* -------------------- FETCH AVAILABILITY -------------------- */

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await authFetch(
          `/api/practitioner/availability?practitioner_id=${clinicianId}`
        );

        if (!res.ok)
          throw new Error("Failed to fetch availability");

        const data = await res.json();
        const slots: AvailabilityWindow[] =
          data.availability || [];

        const map: Record<string, boolean> = {};

        slots.forEach((slot) => {
          const date = DateTime.fromISO(slot.starts_at)
            .setZone(slot.timezone)
            .toISODate();

          if (date) map[date] = true;
        });

        setAvailabilityMap(map);

        if (selectedDate) {
          const filtered = slots.filter(
            (s) =>
              DateTime.fromISO(s.starts_at)
                .setZone(s.timezone)
                .toISODate() === selectedDate
          );
          setAvailabilityList(filtered);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchAvailability();
  }, [clinicianId, selectedDate]);

  /* -------------------- CALENDAR -------------------- */

  const renderCalendar = () => {
    const monthStart = currentMonth.startOf("month");
    const monthEnd = currentMonth.endOf("month");

    const startWeek = monthStart.minus({
      days: monthStart.weekday % 7,
    });
    const endWeek = monthEnd.plus({
      days: 6 - (monthEnd.weekday % 7),
    });

    const days: any[] = [];
    let day = startWeek;

    while (day <= endWeek) {
      const dateStr = day.toISODate()!;
      const isCurrentMonth =
        day.month === currentMonth.month;
      const leave = leaveMap[dateStr];
      const hasAvailability = availabilityMap[dateStr];
      const isSelected = selectedDate === dateStr;

      const isOutOfRange =
        day < today ||
        day > today.plus({ days: MAX_DAYS_AHEAD });

      days.push(
        <div
          key={dateStr}
          onClick={() => {
            if (!isCurrentMonth || isOutOfRange) return;

            setSelectedDate(dateStr);
            setAvailabilityInput((prev) => ({
              ...prev,
              date: dateStr,
            }));
          }}
          className={`
  h-9 w-9 flex items-center justify-center rounded-full
  text-sm transition select-none
  ${isOutOfRange
              ? "text-slate-300 cursor-not-allowed"
              : "cursor-pointer"
            }
  ${!isCurrentMonth ? "text-slate-300" : ""}

  ${isSelected
              ? "bg-blue-600 text-white font-semibold"
              : leave?.leaveType === "full_day"
                ? "bg-red-100 text-red-700 font-semibold"
                : leave?.leaveType === "first_half"
                  ? "bg-orange-100 text-orange-700 font-semibold"
                  : leave?.leaveType === "second_half"
                    ? "bg-yellow-100 text-yellow-700 font-semibold"
                    : hasAvailability
                      ? "bg-green-100 text-green-700 font-semibold"
                      : ""
            }

  ${isCurrentMonth &&
              !leave &&
              !isSelected &&
              !isOutOfRange &&
              !hasAvailability
              ? "hover:bg-slate-200"
              : ""
            }
`}

        >
          {day.day}
        </div>
      );

      day = day.plus({ days: 1 });
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() =>
              setCurrentMonth(
                currentMonth.minus({ months: 1 })
              )
            }
          >
            ←
          </button>

          <div className="text-sm font-semibold">
            {currentMonth.toFormat("LLLL yyyy")}
          </div>

          <button
            onClick={() =>
              setCurrentMonth(
                currentMonth.plus({ months: 1 })
              )
            }
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 text-center mb-2 text-[11px] font-medium text-slate-500">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
            (d) => (
              <div key={d}>{d}</div>
            )
          )}
        </div>

        <div className="grid grid-cols-7 gap-y-1 place-items-center">
          {days}
        </div>
      </div>
    );
  };

  /* -------------------- SAVE AVAILABILITY -------------------- */

  const saveAvailability = async () => {
    try {
      setLoading(true);

      const res = await authFetch(
        "/api/practitioner/availability",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            practitioner_id: clinicianId,
            ...availabilityInput,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save");
      }

      toast.success("Availability added");
      setSelectedDate(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedLeave = selectedDate
    ? leaveMap[selectedDate]
    : null;

  /* -------------------------------------------------------------------------- */
  /* UI                                                                         */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-slate-50 min-h-screen">
      {/* LEFT PANEL */}
      <aside className="col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 h-fit">
        <header className="mb-6">
          <h2 className="text-lg font-bold text-slate-800">Availability</h2>
          <p className="text-xs text-slate-500">Select a date from the calendar to manage your hours.</p>
        </header>

        <div className="calendar-wrapper bg-slate-50 rounded-lg p-2">
          {renderCalendar()}
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <main className="col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Details {selectedDate && `— ${DateTime.fromISO(selectedDate).toFormat("cccc, LLL dd")}`}
          </h3>
        </div>

        {!selectedDate ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <p className="text-sm text-slate-500 max-w-[200px]">
              Please select a date on the left to view or edit availability.
            </p>
          </div>
        ) : selectedLeave ? (
          /* LEAVE STATE */
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-1 rounded-md bg-amber-200 text-amber-800 text-[10px] font-bold uppercase mb-2 inline-block">
                    On Leave
                  </span>
                  <h4 className="text-lg font-semibold text-amber-900 capitalize">
                    {selectedLeave.leaveType.replace("_", " ")}
                  </h4>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-amber-200/50">
                <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Reason</p>
                <p className="text-sm text-amber-800 italic">"{selectedLeave.reason}"</p>
              </div>
            </div>
          </div>
        ) : (
          /* AVAILABILITY STATE */
          <div className="space-y-8 animate-in fade-in duration-300">
            <section>
              <AvailabilitySelector
                value={availabilityInput}
                onChange={setAvailabilityInput}
                onSave={saveAvailability}
                saving={loading}
              />
            </section>

            {/* Existing slots */}
            <section className="mt-8 pt-8 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                Existing Slots
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
                  {availabilityList.length}
                </span>
              </h4>

              {availabilityList.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-8 text-center">
                  <p className="text-xs text-slate-400">No time slots configured for this date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availabilityList.map((slot) => (
                    <div
                      key={slot.id}
                      className="group flex justify-between items-center border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white hover:border-indigo-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-medium text-slate-700">
                          {DateTime.fromISO(slot.starts_at).setZone(slot.timezone).toFormat("hh:mm a")}
                          {" – "}
                          {DateTime.fromISO(slot.ends_at).setZone(slot.timezone).toFormat("hh:mm a")}
                        </span>
                      </div>

                      <button
                        onClick={() => deleteAvailability(slot.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-all"
                        title="Delete Slot"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default AvailabilityTab;
