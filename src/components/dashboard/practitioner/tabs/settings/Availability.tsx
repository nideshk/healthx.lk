"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/atom/Button/Button";
import Loader from "@/components/atom/Loader/Loader";
import { toast } from "react-toastify";
import { authFetch } from "@/lib/authFetch";
import AvailabilitySelector, { AvailabilityInput } from "../../AvailabilitySelector";
import { userAgent } from "next/server";
import { Calendar, CalendarX2, Clock, Trash2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
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
  cancelled_appointments?: any[];
  error?: string;
  explanation?: string;
}

interface ConflictAppointment {
  id: string;
  starts_at: string;
  status: string;
  patient: {
    full_name: string;
    email: string;
  };
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
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */
interface AvailabilityWindow {
  id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
}
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

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
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


/* -------------------------------------------------------------------------- */
/* CANCEL LEAVE MODAL COMPONENT                                               */
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

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-all duration-300"
        onClick={onCancel}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm mx-auto p-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

          {/* Header - Soft and Clean */}
          <div className="px-6 pt-6 pb-2 text-center">
            <h2 className="text-lg font-semibold text-slate-900">Cancel Leave?</h2>
            <p className="text-sm text-slate-500 mt-1">
              Are you sure you want to remove this from your schedule?
            </p>
          </div>

          <div className="px-6 py-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Period</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${getLeaveColor(leave.leave_type)}`}>
                  {formatLeaveType(leave.leave_type)}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-800">
                {leave.start_date === leave.end_date
                  ? leave.start_date
                  : `${leave.start_date} → ${leave.end_date}`}
              </div>
              <div className="text-xs text-slate-500 italic border-t border-slate-200 pt-2 mt-2">
                "{leave.reason}"
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 flex flex-col gap-2">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader /> : "Confirm Cancellation"}
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-2.5 bg-white text-slate-500 font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Keep Leave
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const Availability: React.FC = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxAllowedDate = new Date();
  maxAllowedDate.setDate(today.getDate() + MAX_DAYS_AHEAD);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [availability, setAvailability] = useState({
    start_time: "09:00",
    end_time: "17:00",
    days_unavailable: ["Saturday", "Sunday", "Monday"],
    timezone: "Asia/Colombo",
  });
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedStartDate, setSelectedStartDate] = useState<string>("");
  const [selectedEndDate, setSelectedEndDate] = useState<string>("");
  const [selectingPhase, setSelectingPhase] = useState<"start" | "end">("start");
  const [leaveType, setLeaveType] = useState<LeaveType>("full_day");
  const [reason, setReason] = useState("");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState<string>("");
  const [warning, setWarning] = useState<string>("");
  const [conflicts, setConflicts] = useState<ConflictAppointment[]>([]);
  const [forceApply, setForceApply] = useState(false);
  const [practitionerId, setPractitionerId] = useState<string>("");
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [undoTimeLeft, setUndoTimeLeft] = useState<number>(0);
  const [cancelModal, setCancelModal] = useState<CancelModalState>({ isOpen: false, leaveId: null, leaveDetails: null });
  const [availabilityInput, setAvailabilityInput] =
    useState<AvailabilityInput>({
      date: "",
      start_time: "09:00",
      end_time: "17:00",
      timezone: "Asia/Colombo",
    });

  const [availabilityList, setAvailabilityList] =
    useState<AvailabilityWindow[]>([]);

  const saveAvailability = async () => {
    if (!availabilityInput.date) {
      toast.error("Select a date");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/api/practitioner/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(availabilityInput),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setAvailabilityList((prev) => [...prev, data.availability]);
      setAvailabilityInput({ ...availabilityInput, date: "" });

      toast.success("Availability added");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };


  /* -------------------- DELETE AVAILABILITY -------------------- */

  const deleteAvailability = async (id: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/practitioner/availability/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();

      setAvailabilityList((prev) =>
        prev.filter((a) => a.id !== id)
      );
      toast.success("Availability removed");
    } catch {
      toast.error("Failed to delete availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAvailability = async () => {
      const res = await authFetch(`/api/practitioner/availability`);
      const data = await res.json();
      setAvailability(data.availability);
    };
    fetchAvailability();
  }, [])
  useEffect(() => {
    const fetchData = async () => {
      const authRes = await authFetch("/api/auth/me");
      const authData = await authRes.json();
      setPractitionerId(authData.user.practitioner_id);

      const availRes = await authFetch("/api/practitioner/availability");
      const availData = await availRes.json();
      setAvailabilityList(availData.availability || []);

      const leaveRes = await authFetch(
        `/api/practitioners/${authData.user.practitioner_id}/leaves`
      );
      const leaveData = await leaveRes.json();
      setLeaveRequests(leaveData.leaves || []);

      setInitialLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!undoState) return;
    const interval = setInterval(() => {
      setUndoTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      if (undoTimeLeft <= 1) setUndoState(null);
    }, 1000);
    return () => clearInterval(interval);
  }, [undoState, undoTimeLeft]);

  const { calendarDays, emptyDaysBefore } = useMemo(() => {
    const days: Date[] = [];
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return { calendarDays: days, emptyDaysBefore: Array(firstDayOfMonth).fill(null) };
  }, [currentMonth]);

  const handleDateClick = (dateStr: string) => {
    setWarning("");
    setConflicts([]);
    setForceApply(false);

    if (selectingPhase === "start") {
      setSelectedStartDate(dateStr);
      setSelectedEndDate(dateStr);
      setSelectingPhase("end");
    } else {
      if (dateStr < selectedStartDate) {
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(dateStr);
      } else {
        setSelectedEndDate(dateStr);
      }
      setSelectingPhase("start");
    }
  };

  const applyLeave = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`/api/practitioners/${practitionerId}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: selectedStartDate,
          end_date: selectedEndDate,
          leave_type: leaveType,
          reason,
          force: forceApply,
        }),
      });

      const data: ApiResponse = await res.json();

      if (res.status === 409) {
        setWarning(data.warning || "Conflicts detected.");
        setConflicts(data.conflicts || []);
        toast.warning("Appointment conflicts detected.");
      } else if (!res.ok) {
        throw new Error(data.error || "Failed to apply leave");
      } else {
        setLeaveRequests(prev => [...prev, data.leave!]);

        // Handle Undo State if appointments were cancelled
        if (data.cancelled_appointments && data.cancelled_appointments.length > 0) {
          setUndoState({
            leaveId: data.leave!.id,
            appointmentIds: data.cancelled_appointments.map(a => a.id),
            timestamp: Date.now()
          });
          setUndoTimeLeft(30);
        }

        toast.success("Leave applied successfully!");
        setWarning("");
        setConflicts([]);
        setForceApply(false);
        setSelectedStartDate("");
        setSelectedEndDate("");
        setReason("");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const undoForceApply = async () => {
    if (!undoState) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/practitioners/${practitionerId}/leaves/${undoState.leaveId}/undo-force`, { method: "POST" });
      if (!res.ok) throw new Error("Undo failed");
      setLeaveRequests(prev => prev.filter(l => l.id !== undoState.leaveId));
      setUndoState(null);
      toast.success("Restored appointments successfully.");
    } catch (err) {
      toast.error("Could not undo action.");
    } finally {
      setLoading(false);
    }
  };

  const confirmCancelLeave = async () => {
    if (!cancelModal.leaveId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/practitioners/${practitionerId}/leaves?leave_id=${cancelModal.leaveId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion failed");
      setLeaveRequests(prev => prev.filter(l => l.id !== cancelModal.leaveId));
      toast.success("Leave cancelled successfully");
      setCancelModal({ isOpen: false, leaveId: null, leaveDetails: null });
    } catch (err) {
      toast.error("Unable to cancel leave");
    } finally {
      setLoading(false);
    }
  };

  const canCancelLeave = (leave: LeaveRequest): { can: boolean; msg?: string } => {
    const end = parseDate(leave.end_date);
    const now = new Date();
    if (end < today) return { can: false, msg: "Past data cannot be deleted" };
    if (formatDate(today) === leave.start_date && leave.leave_type === "first_half" && now.getHours() >= 12) {
      return { can: false, msg: "First half has already passed" };
    }
    return { can: true };
  };

  if (initialLoading) return <div className="p-12 flex justify-center"><Loader /></div>;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });


  return (
    <>
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        {/* 1. Page Header: Context is key */}
        <div className="max-w-5xl mx-auto mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Manage Availability</h1>
          <p className="text-slate-600 mt-1">Set the dates and times you are free to meet.</p>
        </div>

        {/* 2. Main Layout: Stacks on mobile, 2 columns on desktop */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: The Input (Selector) - Takes 5/12 width */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Add New Slot</h2>
              <AvailabilitySelector
                value={availabilityInput}
                onChange={setAvailabilityInput}
                onSave={saveAvailability}
                saving={loading}
              />
            </div>

            {/* Optional: Helper text or illustration could go here */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Adding specific time blocks helps reduce back-and-forth scheduling emails.
              </p>
            </div>
          </div>

          {/* Right Column: The List (Output) - Takes 7/12 width */}
          <div className="lg:col-span-7">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Current Schedule
                </h2>
                <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                  {availabilityList.length} Slots
                </span>
              </div>

              {availabilityList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                  <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                    <CalendarX2 className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">No slots added yet</p>
                  <p className="text-sm text-slate-500 mt-1 max-w-xs">
                    Use the form on the left to add your first availability window.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availabilityList.map((a) => (
                    <div
                      key={a.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-slate-800 font-medium">
                          <span>{formatDate(new Date(a.starts_at))}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {formatTime(a.starts_at)} – {formatTime(a.ends_at)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteAvailability(a.id)}
                        className="mt-3 sm:mt-0 flex items-center justify-center p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label="Delete slot"
                        title="Remove this slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-lg font-bold text-gray-800">Manage Availability</div>
              <div className="text-sm text-slate-500">Apply leave for up to {MAX_DAYS_AHEAD} days ahead</div>
            </div>
            {(selectedStartDate || selectedEndDate) && (
              <button
                onClick={() => { setSelectedStartDate(""); setSelectedEndDate(""); setWarning(""); setConflicts([]) }}
                className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition"
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition">← Prev</button>
            <div className="font-semibold text-gray-800">{currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}</div>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition">Next →</button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center mb-6">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="text-xs font-semibold text-slate-600 py-2">{d}</div>)}
            {emptyDaysBefore.map((_, i) => <div key={`empty-${i}`} className="h-10" />)}
            {calendarDays.map(date => {
              const ds = formatDate(date);
              const leaves = leaveRequests.filter(l => ds >= l.start_date && ds <= l.end_date);
              const isActive = ds === selectedStartDate || ds === selectedEndDate;
              const inRange = selectedStartDate && selectedEndDate && ds >= selectedStartDate && ds <= selectedEndDate;
              return (
                <button
                  key={ds}
                  disabled={!isDateInRange(date, today, maxAllowedDate)}
                  onClick={() => handleDateClick(ds)}
                  className={`relative h-10 rounded-lg text-sm font-medium transition flex items-center justify-center
                  ${isActive ? "bg-blue-600 text-white shadow-md" : inRange ? "bg-blue-100 text-blue-900" : "hover:bg-slate-100"}
                  ${!isDateInRange(date, today, maxAllowedDate) ? "text-slate-300 cursor-not-allowed" : "cursor-pointer"}
                  ${formatDate(today) === ds ? "border-2 border-blue-400" : ""}`}
                >
                  {date.getDate()}
                  <div className="absolute bottom-1 flex gap-0.5">
                    {leaves.map((l, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${getLeaveColor(l.leave_type)}`} />)}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Start Date</label>
                <input type="date" value={selectedStartDate} onChange={e => setSelectedStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">End Date</label>
                <input type="date" value={selectedEndDate} onChange={e => setSelectedEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>

            <div className="flex gap-2">
              {LEAVE_TYPES.map(t => (
                <button key={t.value} onClick={() => setLeaveType(t.value)} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${leaveType === t.value ? `border-blue-500 text-blue-700 ${t.bgColor}` : "border-slate-200"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for leave..." rows={2} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />

            {undoState && undoTimeLeft > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center animate-pulse">
                <span className="text-xs font-bold text-green-800">Leave Applied & Appointments Cancelled</span>
                <button onClick={undoForceApply} className="text-xs bg-green-600 text-white px-3 py-1 rounded font-bold">Undo ({undoTimeLeft}s)</button>
              </div>
            )}

            {warning && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-xs font-bold text-yellow-900 flex items-start gap-2">⚠️ {warning}</div>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-white p-2 rounded border border-yellow-100">
                  {conflicts.map(c => (
                    <div key={c.id} className="text-[10px] flex justify-between p-1 border-b last:border-0">
                      <span className="font-semibold text-slate-700">{c.patient?.full_name || "Patient"}</span>
                      <span className="text-slate-500">{new Date(c.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-yellow-100 rounded-xl border border-yellow-200 transition active:scale-[0.98]">
                  <input type="checkbox" checked={forceApply} onChange={e => setForceApply(e.target.checked)} className="w-4 h-4 rounded accent-yellow-600" />
                  <span className="text-xs font-bold text-yellow-900">Confirm cancellation of these appointments</span>
                </label>
              </div>
            )}

            <Button
              disabled={loading || reason.trim() === "" || !selectedStartDate || !selectedEndDate || (warning !== "" && !forceApply)}
              onClick={applyLeave}
              className="w-full h-11"
            >
              {loading ? "Processing..." : warning ? "Force Apply Leave" : "Apply Leave"}
            </Button>
          </div>
        </div>

        <div className="border rounded-xl p-6 bg-white shadow-sm flex flex-col h-fit">
          <div className="text-lg font-bold text-gray-800 mb-4">Leave Details</div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {leaveRequests.length === 0 ? <div className="text-sm text-slate-500 text-center py-8">No leaves recorded</div> :
              leaveRequests.sort((a, b) => b.start_date.localeCompare(a.start_date)).map(l => {
                const { can, msg } = canCancelLeave(l);
                return (
                  <div key={l.id} className={`rounded-xl p-3 border ${getLeaveByTypeColor(l.leave_type)} border-slate-200 transition hover:shadow-sm`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-sm text-gray-800">{l.start_date === l.end_date ? l.start_date : `${l.start_date} → ${l.end_date}`}</div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${getLeaveColor(l.leave_type)}`}>{getLeaveShorthand(l.leave_type)}</span>
                    </div>
                    <div className="text-xs text-slate-600 italic mb-2">"{l.reason}"</div>
                    {can ? (
                      <button onClick={() => setCancelModal({ isOpen: true, leaveId: l.id, leaveDetails: l })} className="text-xs text-red-600 font-bold hover:underline">Cancel Leave</button>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-medium italic">{msg}</div>
                    )}
                  </div>
                );
              })
            }
          </div>
        </div>

        <CancelLeaveModal
          isOpen={cancelModal.isOpen}
          leave={cancelModal.leaveDetails}
          onConfirm={confirmCancelLeave}
          onCancel={() => setCancelModal({ isOpen: false, leaveId: null, leaveDetails: null })}
          isLoading={loading}
        />

      </div>
    </>
  );
};

export default Availability;