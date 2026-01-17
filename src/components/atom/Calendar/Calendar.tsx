"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarProps = {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  minDate?: Date;
  theme?: "light" | "dark";
};

export default function Calendar({
  value,
  onChange,
  minDate = new Date(),
  theme = "light",
}: CalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(value?.getMonth() ?? today.getMonth());
  const [currentYear, setCurrentYear] = useState(value?.getFullYear() ?? today.getFullYear());

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const handleSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    onChange?.(newDate);
  };

  const shiftMonth = (step: number) => {
    let nextM = currentMonth + step;
    let nextY = currentYear;
    if (nextM < 0) { nextM = 11; nextY--; }
    else if (nextM > 11) { nextM = 0; nextY++; }
    setCurrentMonth(nextM);
    setCurrentYear(nextY);
  };

  return (
    <div className={cn("w-full max-w-sm select-none", theme === "dark" ? "text-white" : "text-slate-900")}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">
          {months[currentMonth]} {currentYear}
        </h3>
        <div className="flex gap-1">
          <button onClick={() => shiftMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
            <ChevronLeft size={16} className="text-slate-400" />
          </button>
          <button onClick={() => shiftMonth(1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(currentYear, currentMonth, day);
          const isSelected = value && date.toDateString() === value.toDateString();
          const isToday = date.toDateString() === today.toDateString();
          const isDisabled = date < new Date(today.setHours(0, 0, 0, 0));

          return (
            <button
              key={day}
              onClick={() => !isDisabled && handleSelect(day)}
              disabled={isDisabled}
              className={cn(
                "h-10 w-full flex items-center justify-center rounded-xl text-xs font-bold transition-all",
                isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-100" :
                isToday ? "border-2 border-blue-100 text-blue-600" :
                isDisabled ? "text-slate-200 cursor-not-allowed" : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
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