"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarProps = {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  onClose?: () => void;
  minDate?: Date;
  maxDate?: Date;
  availableDates?: string[]; // 👈 highlight available days
  theme?: "light" | "dark";
};

export default function Calendar({
  value,
  onChange,
  onClose,
  minDate = new Date(),
  maxDate,
  availableDates = [],
  theme = "light",
}: CalendarProps) {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    value?.getMonth() ?? today.getMonth()
  );
  const [currentYear, setCurrentYear] = useState(
    value?.getFullYear() ?? today.getFullYear()
  );
  const [tempDate, setTempDate] = useState<Date | undefined>(value);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // calculate days
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const handleSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setTempDate(newDate);
    onChange?.(newDate);
    onClose?.();
  };

  const handleClear = () => {
    setTempDate(undefined);
    onChange?.(undefined);
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // theme classes
  const containerStyles =
    theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900";
  const headerTextStyles =
    theme === "dark" ? "text-gray-400" : "text-gray-500";
  const weekdayTextStyles =
    theme === "dark" ? "text-gray-300" : "text-gray-600";

  return (
    <div
      className={cn(
        "rounded-2xl shadow-lg w-full max-w-sm p-4 select-none",
        containerStyles
      )}
    >
      {/* Header */}
      <div className="mb-4">
        <p className={cn("text-sm", headerTextStyles)}>Select Date</p>
        <h2 className="text-lg font-semibold">
          {tempDate
            ? tempDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "No date selected"}
        </h2>
      </div>

      {/* Month + Year */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className={cn(
            "p-2 rounded-full",
            theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100"
          )}
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-base font-medium">
          {months[currentMonth]} {currentYear}
        </h3>
        <button
          onClick={goToNextMonth}
          className={cn(
            "p-2 rounded-full",
            theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100"
          )}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekdays */}
      <div
        className={cn(
          "grid grid-cols-7 text-center text-sm font-medium mb-2",
          weekdayTextStyles
        )}
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
          <div key={idx}>{d}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {/* Empty placeholders for offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(currentYear, currentMonth, day);
          const dateKey = date.toISOString().split("T")[0];

          const isToday = date.toDateString() === today.toDateString();
          const isSelected =
            tempDate && date.toDateString() === tempDate.toDateString();
          const isAvailable = availableDates.includes(dateKey);

          // Disable past or out-of-range days
          const isBeforeMin = minDate && date < new Date(minDate.setHours(0, 0, 0, 0));
          const isAfterMax =
            maxDate && date > new Date(maxDate.setHours(23, 59, 59, 999));
          const isDisabled = isBeforeMin || isAfterMax;

          return (
            <button
              key={day}
              onClick={() => !isDisabled && handleSelect(day)}
              disabled={isDisabled}
              className={cn(
                "relative w-10 h-10 flex items-center justify-center rounded-full transition",
                isSelected
                  ? "bg-[#018BB5] text-white font-semibold"
                  : isToday
                  ? "border border-[#018BB5] text-[#018BB5] font-medium"
                  : isDisabled
                  ? "text-gray-400 cursor-not-allowed"
                  : isAvailable
                  ? "hover:bg-blue-50 text-blue-600"
                  : theme === "dark"
                  ? "hover:bg-gray-800 text-gray-200"
                  : "hover:bg-gray-100 text-gray-700"
              )}
            >
              {day}

              {/* availability indicator dot */}
              {isAvailable && !isSelected && !isDisabled && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handleClear}
          className="text-sm text-[#018BB5] hover:underline"
        >
          Clear
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm bg-[#018BB5] text-white px-3 py-1 rounded-md hover:bg-[#02789b]"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}
