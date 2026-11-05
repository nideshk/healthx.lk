"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarProps = {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  minDate?: Date;
  highlightedDates?: string[];
  theme?: "light" | "dark";
  /** Fires with YYYY-MM when the visible month changes, including the first paint. */
  onMonthChange?: (month: string) => void;
};

export default function Calendar({
  value,
  onChange,
  minDate = new Date(),
  highlightedDates = [],
  theme = "light",
  onMonthChange,
}: CalendarProps) {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    value?.getMonth() ?? today.getMonth()
  );
  const [currentYear, setCurrentYear] = useState(
    value?.getFullYear() ?? today.getFullYear()
  );

  const onMonthChangeRef = useRef(onMonthChange);
  onMonthChangeRef.current = onMonthChange;

  useEffect(() => {
    const month = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    onMonthChangeRef.current?.(month);
  }, [currentYear, currentMonth]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  // Normalize minDate to start of day
  const minDateStart = new Date(minDate);
  minDateStart.setHours(0, 0, 0, 0);

  const handleSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    onChange?.(newDate);
  };

  const shiftMonth = (step: number) => {
    let nextM = currentMonth + step;
    let nextY = currentYear;

    if (nextM < 0) {
      nextM = 11;
      nextY--;
    } else if (nextM > 11) {
      nextM = 0;
      nextY++;
    }

    setCurrentMonth(nextM);
    setCurrentYear(nextY);
  };

  const getLocalISO = (date: Date) => {
    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "w-full max-w-sm select-none",
        theme === "dark" ? "text-white" : "text-slate-900"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-cx-primary">
          {months[currentMonth]} {currentYear}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => shiftMonth(-1)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <ChevronLeft size={16} className="text-slate-400" />
          </button>
          <button
            onClick={() => shiftMonth(1)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-[10px] font-black uppercase tracking-tighter text-slate-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(currentYear, currentMonth, day);

          const iso = getLocalISO(date);
          const isAvailable = highlightedDates.includes(iso);

          const isSelected =
            value && date.toDateString() === value.toDateString();

          const isToday =
            date.toDateString() === today.toDateString();

          const isPast = date < minDateStart;

          // Past days are treated as unavailable
          const isDisabled = isPast || !isAvailable;

          return (
            <button
              key={day}
              onClick={() => !isDisabled && handleSelect(day)}
              disabled={isDisabled}
              className={cn(
                "h-10 w-full flex items-center justify-center rounded-xl text-xs font-bold transition-all",
                isSelected
                  ? "bg-cx-primary text-white shadow-lg shadow-cx-primary/15"
                  : !isPast && isAvailable
                    ? "bg-cx-primary text-white hover:bg-cx-deep"
                    : isToday
                      ? "border-2 border-cx-border text-cx-primary"
                      : "text-slate-300 cursor-not-allowed"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
