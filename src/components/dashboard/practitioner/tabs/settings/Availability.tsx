"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/atom/Button/Button";
import Loader from "@/components/atom/Loader/Loader";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type LeaveType = "full_day" | "first_half" | "second_half";

interface TimeWindow {
  from: string;
  to: string;
}

interface AppliedWindow {
  date: string;
  windows: TimeWindow[];
}

interface LeaveRequest {
  id: string;
  practitioner_id: string;
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  reason: string;
  created_at: string;
  updated_at: string;
  applied_windows: AppliedWindow[];
}

interface ApiResponse {
  leaves?: LeaveRequest[];
  success?: boolean;
  warning?: string;
  conflicts?: ConflictAppointment[];
  leave?: LeaveRequest;
  cancelled_appointments?: CancelledAppointment[];
  error?: string;
  explanation?: string;
}

interface ConflictAppointment {
  id: string;
  starts_at: string;
  status: string;
  patient_name: string;
}

interface CancelledAppointment {
  id: string;
  starts_at: string;
  patient_name: string;
  reason?: string;
}

interface UndoState {
  leaveId: string;
  appointmentIds: string[];
  timestamp: number;
}

interface CancelModalState {
  isOpen: boolean;
  leaveId: string | null;
  leaveDetails: LeaveRequest | null;
}

/* -------------------------------------------------------------------------- */
/*                               CONSTANTS                                    */
/* -------------------------------------------------------------------------- */

const LEAVE_TYPES: {
  label: string;
  value: LeaveType;
  color: string;
  bgColor: string;
}[] = [
  { label: "Full Day", value: "full_day", color: "bg-red-400", bgColor: "bg-red-50" },
  { label: "First Half", value: "first_half", color: "bg-yellow-400", bgColor: "bg-yellow-50" },
  { label: "Second Half", value: "second_half", color: "bg-blue-400", bgColor: "bg-blue-50" },
];

const MAX_DAYS_AHEAD = 45;
const UNDO_TIMEOUT = 30000; // 30 seconds

/* -------------------------------------------------------------------------- */
/*                               HELPERS                                      */
/* -------------------------------------------------------------------------- */

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getLeaveColor = (type: LeaveType): string => {
  return LEAVE_TYPES.find((t) => t.value === type)?.color || "bg-gray-400";
};

const getLeaveByTypeColor = (type: LeaveType): string => {
  return LEAVE_TYPES.find((t) => t.value === type)?.bgColor || "bg-gray-50";
};

const formatLeaveType = (type: LeaveType): string => {
  return LEAVE_TYPES.find((t) => t.value === type)?.label || type;
};

const getLeaveShorthand = (type: LeaveType): string => {
  if (type === "full_day") return "FD";
  if (type === "first_half") return "1H";
  return "2H";
};

const isDateInRange = (date: Date, today: Date, maxDate: Date): boolean => {
  return date >= today && date <= maxDate;
};

const getDaysDifference = (startDate: string, endDate: string): number => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/* -------------------------------------------------------------------------- */
/*                        CANCEL LEAVE MODAL COMPONENT                        */
/* -------------------------------------------------------------------------- */

interface CancelLeaveModalProps {
  isOpen: boolean;
  leave: LeaveRequest | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const CancelLeaveModal: React.FC<CancelLeaveModalProps> = ({
  isOpen,
  leave,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  if (!isOpen || !leave) return null;

  const dayCount = getDaysDifference(leave.start_date, leave.end_date);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4 animate-in fade-in zoom-in-95">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 border-b border-red-200 px-6 py-4">
            <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Cancel Leave Request
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Leave Period
                  </div>
                  <div className="text-sm font-semibold text-gray-800 mt-1">
                    {leave.start_date === leave.end_date
                      ? leave.start_date
                      : `${leave.start_date} → ${leave.end_date}`}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {dayCount} {dayCount === 1 ? "day" : "days"} • {formatLeaveType(leave.leave_type)}
                  </div>
                </div>

                <div className="pt-2 border-t border-red-200">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Reason
                  </div>
                  <div className="text-sm text-gray-700 mt-1 italic">"{leave.reason}"</div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-xs text-yellow-900 font-semibold flex items-start gap-2">
                <span>⚠️</span>
                <div>
                  <div>This action cannot be undone.</div>
                  <div className="font-normal mt-0.5">
                    The leave will be permanently removed from your schedule.
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600">
              Are you sure you want to cancel this leave request?
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Leave"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const Availability: React.FC = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxAllowedDate = new Date();
  maxAllowedDate.setDate(today.getDate() + MAX_DAYS_AHEAD);
  maxAllowedDate.setHours(23, 59, 59, 999);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  // Date selection
  const [selectedStartDate, setSelectedStartDate] = useState<string>("");
  const [selectedEndDate, setSelectedEndDate] = useState<string>("");
  const [selectingPhase, setSelectingPhase] = useState<"start" | "end">("start");

  const [leaveType, setLeaveType] = useState<LeaveType>("full_day");
  const [reason, setReason] = useState("");

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [warning, setWarning] = useState<string>("");
  const [conflicts, setConflicts] = useState<ConflictAppointment[]>([]);
  const [forceApply, setForceApply] = useState(false);
  const [practitionerId, setPractitionerId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // New states for undo and cancelled appointments
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [undoTimeLeft, setUndoTimeLeft] = useState<number>(0);
  const [cancelledAppointments, setCancelledAppointments] = useState<CancelledAppointment[]>([]);

  // Cancel leave modal state
  const [cancelModal, setCancelModal] = useState<CancelModalState>({
    isOpen: false,
    leaveId: null,
    leaveDetails: null,
  });

  /* -------- GET PRACTITIONER ID FROM AUTH -------- */

  const getPractitionerId = async (): Promise<string> => {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) throw new Error("Failed to fetch practitioner info");
      const data = await response.json();
      return data?.user?.practitioner_id || "";
    } catch (err) {
      console.error("Failed to get practitioner ID:", err);
      throw err;
    }
  };

  /* -------- FETCH PRACTITIONER ID & LEAVES -------- */

  useEffect(() => {
    const fetchPractitionerData = async () => {
      try {
        setInitialLoading(true);

        const id = await getPractitionerId();

        if (!id) {
          setError("Unable to fetch practitioner information");
          return;
        }

        setPractitionerId(id);
        console.log("✓ Practitioner ID:", id);

        const res = await fetch(`/api/practitioners/${id}/leaves`);
        if (!res.ok) throw new Error("Failed to fetch leaves");

        const data: ApiResponse = await res.json();
        console.log("✓ Leaves fetched:", data);

        if (data.leaves) {
          setLeaveRequests(data.leaves);
        }
        setError("");
      } catch (err) {
        console.error("Failed to load leaves", err);
        setError("Failed to load leave requests");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchPractitionerData();
  }, []);

  /* -------- UNDO TIMER -------- */

  useEffect(() => {
    if (!undoState) return;

    const interval = setInterval(() => {
      setUndoTimeLeft((prev) => {
        if (prev <= 1) {
          setUndoState(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [undoState]);

  /* -------- HANDLE DATE SELECTION -------- */

  const handleDateClick = (dateStr: string) => {
    if (selectingPhase === "start") {
      setSelectedStartDate(dateStr);
      setSelectedEndDate(dateStr);
      setSelectingPhase("end");
    } else {
      if (dateStr < selectedStartDate) {
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(dateStr);
        setSelectingPhase("end");
      } else {
        setSelectedEndDate(dateStr);
        setSelectingPhase("start");
      }
    }
  };

  const resetDateSelection = () => {
    setSelectedStartDate("");
    setSelectedEndDate("");
    setSelectingPhase("start");
    setWarning("");
    setConflicts([]);
    setForceApply(false);
  };

  /* -------- UNDO FORCE APPLY -------- */

  const undoForceApply = async () => {
    if (!undoState) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/practitioners/${practitionerId}/leaves/${undoState.leaveId}/undo-force`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error("Failed to undo force apply");

      setLeaveRequests((prev) => prev.filter((l) => l.id !== undoState.leaveId));
      setUndoState(null);
      setUndoTimeLeft(0);
      setCancelledAppointments([]);
      setSuccessMessage("Force apply undone. Appointments restored.");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("Failed to undo:", err);
      setError("Failed to undo force apply. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* -------- CONFIRM FORCE APPLY -------- */

  const confirmForceApply = () => {
    const confirmed = window.confirm(
      `This will cancel ${conflicts.length} appointment(s) for your leave from ${selectedStartDate} to ${selectedEndDate}.\n\nPatients will be notified of the cancellation.\n\nDo you want to proceed?`
    );

    if (confirmed) {
      setForceApply(true);
    }
  };

  /* -------- OPEN CANCEL LEAVE MODAL -------- */

  const openCancelModal = (leave: LeaveRequest) => {
    setCancelModal({
      isOpen: true,
      leaveId: leave.id,
      leaveDetails: leave,
    });
  };

  /* -------- CLOSE CANCEL LEAVE MODAL -------- */

  const closeCancelModal = () => {
    setCancelModal({
      isOpen: false,
      leaveId: null,
      leaveDetails: null,
    });
  };

  /* -------- CONFIRM CANCEL LEAVE -------- */

  const confirmCancelLeave = async () => {
    if (!cancelModal.leaveId) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/practitioners/${practitionerId}/leaves?leave_id=${cancelModal.leaveId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to cancel leave");

      setLeaveRequests((prev) => prev.filter((l) => l.id !== cancelModal.leaveId));
      closeCancelModal();
      setSuccessMessage("Leave cancelled successfully");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("Failed to cancel leave", err);
      setError("Failed to cancel leave");
      closeCancelModal();
    } finally {
      setLoading(false);
    }
  };

  /* -------- APPLY LEAVE WITH CONFLICT HANDLING -------- */

  const applyLeave = async () => {
    setError("");
    setSuccessMessage("");

    if (!selectedStartDate || !selectedEndDate || !reason.trim()) {
      setError("Please select dates and fill in all fields");
      return;
    }

    if (leaveType !== "full_day" && selectedStartDate !== selectedEndDate) {
      setError("Half-day leave can only be applied for a single date");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        start_date: selectedStartDate,
        end_date: selectedEndDate,
        leave_type: leaveType,
        reason,
        force: forceApply,
      };

      const res = await fetch(`/api/practitioners/${practitionerId}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse = await res.json();

      if (!res.ok) {
        if (data.error) {
          setError(data.error);
          if (data.explanation) setError(`${data.error}\n${data.explanation}`);
        }
        return;
      }

      if (data.warning && data.conflicts && !forceApply) {
        setWarning(data.warning);
        setConflicts(data.conflicts);
        return;
      }

      if (data.success && data.leave) {
        setLeaveRequests((prev) => [...prev, data.leave!]);

        if (data.cancelled_appointments && data.cancelled_appointments.length > 0) {
          setCancelledAppointments(data.cancelled_appointments);

          const appointmentIds = data.cancelled_appointments.map((a) => a.id);
          setUndoState({
            leaveId: data.leave.id,
            appointmentIds,
            timestamp: Date.now(),
          });
          setUndoTimeLeft(Math.ceil(UNDO_TIMEOUT / 1000));

          setSuccessMessage(
            `Leave applied successfully! ${data.cancelled_appointments.length} appointment(s) cancelled.`
          );
        } else {
          setSuccessMessage(
            `Leave applied successfully for ${getDaysDifference(
              data.leave.start_date,
              data.leave.end_date
            )} day(s)`
          );
        }

        resetDateSelection();
        setReason("");
        setTimeout(() => setSuccessMessage(""), 5000);
      }
    } catch (err) {
      console.error("Failed to apply leave", err);
      setError("An error occurred while applying leave");
    } finally {
      setLoading(false);
    }
  };

  /* -------- DERIVED DATA -------- */

  const daysInMonth = useMemo(() => {
    const days: Date[] = [];
    const lastDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate();

    for (let i = 1; i <= lastDay; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  }, [currentMonth]);

  const getLeaveForDate = (dateStr: string): LeaveRequest[] => {
    return leaveRequests.filter((l) => {
      const start = parseDate(l.start_date);
      const end = parseDate(l.end_date);
      const current = parseDate(dateStr);
      return current >= start && current <= end;
    });
  };

  const navigateMonth = (direction: number) => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + direction,
        1
      )
    );
  };

  const totalLeaveDays = useMemo(() => {
    return leaveRequests.reduce((sum, leave) => {
      return sum + getDaysDifference(leave.start_date, leave.end_date);
    }, 0);
  }, [leaveRequests]);

  /* ---------- LOADING STATE ---------- */

  if (initialLoading) {
    return (
      <div className="border rounded-xl p-6 bg-white shadow-sm">
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      </div>
    );
  }

  /* ---------- ERROR STATE ---------- */

  if (error && leaveRequests.length === 0) {
    return (
      <div className="border rounded-xl p-6 bg-white shadow-sm">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  /* ---------- MAIN UI ---------- */

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* -------- CALENDAR -------- */}
        <div className="lg:col-span-2 border rounded-xl p-6 bg-white shadow-sm">
          <div className="text-lg font-bold mb-1 text-gray-800">
            Manage Availability
          </div>
          <div className="text-sm text-slate-500 mb-6">
            Apply leave for up to 45 days from today
          </div>

          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              ← Prev
            </button>
            <div className="font-semibold text-gray-800">
              {currentMonth.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </div>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              Next →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 text-center mb-6">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-xs font-semibold text-slate-600 py-2">
                {d}
              </div>
            ))}

            {daysInMonth.map((date) => {
              const dateStr = formatDate(date);
              const isDisabled = !isDateInRange(date, today, maxAllowedDate);
              const leaves = getLeaveForDate(dateStr);
              const isStartDate = selectedStartDate === dateStr;
              const isEndDate = selectedEndDate === dateStr;
              const isInRange =
                selectedStartDate &&
                selectedEndDate &&
                parseDate(selectedStartDate) <= date &&
                date <= parseDate(selectedEndDate);
              const isToday = formatDate(today) === dateStr;

              return (
                <button
                  key={dateStr}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleDateClick(dateStr)}
                  className={`relative h-10 rounded-lg text-sm font-medium transition ${
                    isStartDate || isEndDate
                      ? "bg-blue-600 text-white shadow-md"
                      : isInRange
                        ? "bg-blue-100 text-blue-900"
                        : isToday
                        ? "border-2 border-blue-400"
                        : "hover:bg-slate-100"
                  } ${isDisabled ? "text-slate-300 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {date.getDate()}
                  {leaves.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {leaves.slice(0, 2).map((l, i) => (
                        <span
                          key={i}
                          title={`${formatLeaveType(l.leave_type)} - ${l.reason}`}
                          className={`h-1.5 w-1.5 rounded-full ${getLeaveColor(
                            l.leave_type
                          )}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selection Status */}
          {(selectedStartDate || selectedEndDate) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <div className="font-semibold mb-1">
                {selectingPhase === "start"
                  ? "📍 Click to select start date"
                  : "📍 Click to select end date"}
              </div>
              {selectedStartDate && (
                <div className="text-blue-600">
                  Start: <span className="font-semibold">{selectedStartDate}</span>
                  {selectedEndDate && (
                    <>
                      {" "} → End: <span className="font-semibold">{selectedEndDate}</span>
                    </>
                  )}
                </div>
              )}
              <button
                onClick={resetDateSelection}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold mt-1 underline"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Leave Form */}
          <div className="space-y-4 border-t pt-6">
            {/* Manual Date Input */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => {
                    setSelectedStartDate(e.target.value);
                    if (e.target.value > selectedEndDate) {
                      setSelectedEndDate(e.target.value);
                    }
                  }}
                  min={formatDate(today)}
                  max={formatDate(maxAllowedDate)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                  min={selectedStartDate}
                  max={formatDate(maxAllowedDate)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">
                Leave Type
              </label>
              <div className="flex gap-2">
                {LEAVE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setLeaveType(t.value)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium border transition ${
                      leaveType === t.value
                        ? `border-blue-500 text-blue-700 ${t.bgColor}`
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Medical appointment, Personal work..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Success Message with Undo */}
            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span>✓</span>
                    <div>{successMessage}</div>
                  </div>
                </div>

                {/* Cancelled Appointments Details */}
                {cancelledAppointments.length > 0 && (
                  <details className="mt-2 text-[10px] cursor-pointer">
                    <summary className="font-semibold hover:text-green-800">
                      📋 View {cancelledAppointments.length} cancelled appointment(s)
                    </summary>
                    <div className="mt-2 space-y-1 pl-2 bg-white rounded p-2 border border-green-100">
                      {cancelledAppointments.map((a) => (
                        <div key={a.id} className="text-green-700">
                          • {a.patient_name} - {new Date(a.starts_at).toLocaleString()}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Undo Button */}
                {undoState && undoTimeLeft > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={undoForceApply}
                      disabled={loading}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
                    >
                      ↶ Undo ({undoTimeLeft}s)
                    </button>
                    <span className="text-[10px] text-green-600">
                      Undo available for {undoTimeLeft} seconds
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Error Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 whitespace-pre-line font-medium flex items-start gap-2">
                <span>✕</span>
                <div>{error}</div>
              </div>
            )}

            {/* Warning & Conflict Handling */}
            {warning && conflicts.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
                <div className="text-xs font-semibold text-yellow-900 flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <div>{warning}</div>
                    <div className="text-yellow-800 text-[10px] font-normal mt-1">
                      The following appointments will be cancelled if you proceed.
                    </div>
                  </div>
                </div>

                <div className="space-y-2 bg-white rounded-lg p-3 border border-yellow-100 max-h-40 overflow-y-auto">
                  {conflicts.map((c) => (
                    <div key={c.id} className="flex items-start justify-between text-xs">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{c.patient_name}</div>
                        <div className="text-yellow-700 text-[10px]">
                          {new Date(c.starts_at).toLocaleString()}
                        </div>
                        <div className="text-slate-500 text-[10px] mt-0.5">
                          Status: {c.status}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-semibold whitespace-nowrap ml-2">
                        Will Cancel
                      </span>
                    </div>
                  ))}
                </div>

                {!forceApply ? (
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <div className="text-xs text-yellow-900 mb-2">
                      ⚠️ This action will cancel patient appointments. Patients will be notified.
                    </div>
                    <button
                      onClick={confirmForceApply}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                    >
                      I Understand, Proceed to Cancel Appointments
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-3 bg-yellow-100 rounded-lg cursor-pointer hover:bg-yellow-150 transition">
                    <input
                      type="checkbox"
                      checked={forceApply}
                      onChange={(e) => setForceApply(e.target.checked)}
                      className="w-4 h-4 rounded accent-yellow-600 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-yellow-900">
                        ✓ I confirm cancellation of {conflicts.length} appointment(s)
                      </div>
                      <div className="text-[10px] text-yellow-700">
                        Patients will receive cancellation notifications
                      </div>
                    </div>
                  </label>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={resetDateSelection}
                    className="px-3 py-2 border border-yellow-300 text-yellow-900 rounded-lg text-xs font-semibold hover:bg-yellow-100 transition"
                  >
                    Choose Different Dates
                  </button>
                  <Button
                    disabled={!forceApply || loading}
                    onClick={applyLeave}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Force Apply Leave"}
                  </Button>
                </div>
              </div>
            )}

            {/* Apply Button - Normal State */}
            {!warning && (
              <Button
                disabled={loading || !reason.trim() || !selectedStartDate || !selectedEndDate}
                onClick={applyLeave}
                className="w-full"
              >
                {loading ? "Processing..." : "Apply Leave"}
              </Button>
            )}
          </div>
        </div>

        {/* -------- LEAVE DETAILS -------- */}
        <div className="border rounded-xl p-6 bg-white shadow-sm flex flex-col">
          <div className="mb-4">
            <div className="text-lg font-bold text-gray-800 mb-1">
              Leave Details
            </div>
            <div className="text-xs text-slate-500">
              Total leave days: <span className="font-semibold text-gray-700">{totalLeaveDays}</span>
            </div>
          </div>

          {leaveRequests.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8 flex-1 flex items-center justify-center">
              No leave requests yet
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto">
              {leaveRequests
                .sort(
                  (a, b) =>
                    parseDate(a.start_date).getTime() -
                    parseDate(b.start_date).getTime()
                )
                .map((leave) => {
                  const dayCount = getDaysDifference(
                    leave.start_date,
                    leave.end_date
                  );

                  return (
                    <div
                      key={leave.id}
                      className={`rounded-lg p-3 border transition hover:shadow-sm ${getLeaveByTypeColor(
                        leave.leave_type
                      )} border-slate-200`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-800">
                            {leave.start_date === leave.end_date
                              ? leave.start_date
                              : `${leave.start_date} → ${leave.end_date}`}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {dayCount} {dayCount === 1 ? "day" : "days"} • {formatLeaveType(leave.leave_type)}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold text-white ${getLeaveColor(
                            leave.leave_type
                          )}`}
                        >
                          {getLeaveShorthand(leave.leave_type)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mb-2 line-clamp-2 italic">
                        "{leave.reason}"
                      </div>
                      <div className="text-[10px] text-slate-500 mb-2">
                        Applied on{" "}
                        {parseDate(leave.created_at).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => openCancelModal(leave)}
                        disabled={loading}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold transition disabled:opacity-50"
                      >
                        Cancel Leave
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Legend */}
          <div className="border-t mt-4 pt-4">
            <div className="text-xs font-semibold text-gray-700 mb-2">Legend</div>
            <div className="space-y-1">
              {LEAVE_TYPES.map((t) => (
                <div key={t.value} className="flex items-center gap-2 text-xs">
                  <span className={`h-2 w-2 rounded-full ${t.color}`} />
                  <span className="text-slate-600">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Leave Modal */}
      <CancelLeaveModal
        isOpen={cancelModal.isOpen}
        leave={cancelModal.leaveDetails}
        onConfirm={confirmCancelLeave}
        onCancel={closeCancelModal}
        isLoading={loading}
      />
    </>
  );
};

export default Availability;