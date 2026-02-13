// healthx.lk\src\components\dashboard\practitioner\tabs\shared\AppointmentCalendar.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import { Appointment } from "@/types/Dashboard";
import ManageAppointmentModal from "./ManageAppointmentModal";
import PatientDetailsModal from "./PatientDetailsModal";
import Link from "next/link";

type ViewMode = "weekly" | "daily";

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onCompleteAppointment?: (id: string) => void;
  onRangeChange?: (from: string, to: string) => void;
  userRole?: "admin" | "superadmin" | "practitioner";
}

const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  appointments,
  onCompleteAppointment,
  onRangeChange,
  userRole = "practitioner",
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [selectedAppt, setSelectedAppt] = useState<CalendarAppointment | null>(
    null,
  );
  const [confirmAppt, setConfirmAppt] = useState<CalendarAppointment | null>(
    null,
  );
  const [showManage, setShowManage] = useState(false);

  // State for Patient Detail Modal
  const [viewPatientId, setViewPatientId] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const parsedAppointments = useMemo<CalendarAppointment[]>(() => {
    return appointments.map((a) => ({
      ...a,
      start: parseAppointmentDateTime(a),
    }));
  }, [appointments]);

  const weekStart = getWeekStart(anchorDate);

  const daysInView: Date[] =
    viewMode === "weekly"
      ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      : [startOfDay(anchorDate)];

  // Robust Range Syncing for Parent API calls
  useEffect(() => {
    if (onRangeChange && daysInView.length > 0) {
      const fromDate = daysInView[0];
      const toDate = daysInView[daysInView.length - 1];

      const formatLocal = (d: Date) => {
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60 * 1000);
        return local.toISOString().split("T")[0];
      };

      onRangeChange(formatLocal(fromDate), formatLocal(toDate));
    }
  }, [anchorDate, viewMode]);

  const timeSlots = generateHourSlots(0, 24); // 00:00 – 24:00

  const headerLabel =
    viewMode === "weekly"
      ? `Week of ${formatDate(weekStart)}`
      : formatDate(anchorDate);

  const changePeriod = (direction: -1 | 1) => {
    const delta = viewMode === "weekly" ? 7 : 1;
    setAnchorDate((d) => addDays(d, delta * direction));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Appointment Calendar
            </div>
          </div>

          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("weekly")}
              className={`rounded-full px-3 py-1 border text-xs ${
                viewMode === "weekly"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setViewMode("daily")}
              className={`rounded-full px-3 py-1 border text-xs ${
                viewMode === "daily"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              Daily
            </button>
          </div>
        </CardHeader>

        <CardBody className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="px-2"
                onClick={() => changePeriod(-1)}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="px-2"
                onClick={() => setAnchorDate(new Date())}
              >
                Today
              </Button>
            </div>
            <div className="font-medium text-slate-900">{headerLabel}</div>
            <Button
              variant="outline"
              size="sm"
              className="px-2"
              onClick={() => changePeriod(1)}
            >
              →
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-slate-50 border-b border-slate-200">
              <div className="px-2 py-2" />
              {daysInView.map((day) => (
                <div
                  key={day.toISOString()}
                  className="px-2 py-2 text-center border-l border-slate-200"
                >
                  <div className="font-medium text-slate-900">
                    {formatDayName(day)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatDayMonth(day)}
                  </div>
                </div>
              ))}
              {viewMode === "daily" &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="border-l border-slate-200"
                  />
                ))}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {timeSlots.map((slot) => (
                <div
                  key={slot.hour}
                  className="grid grid-cols-[60px_repeat(7,1fr)]"
                >
                  <div className="px-2 py-3 border-t border-slate-100 text-[11px] text-slate-500">
                    {slot.label}
                  </div>

                  {daysInView.map((day, dayIndex) => {
                    const cellAppointments = parsedAppointments.filter((a) => {
                      if (!a.start) return false;
                      if (!isSameDay(a.start, day)) return false;
                      return a.start.getHours() === slot.hour;
                    });

                    return (
                      <div
                        key={dayIndex}
                        className="border-t border-l border-slate-100 h-12 relative px-1"
                      >
                        {cellAppointments.map((appt) => {
                          const isCompleted = appt.status === "completed";
                          const colorClasses = isCompleted
                            ? "bg-slate-200 text-slate-600"
                            : "bg-blue-500 text-white";

                          return (
                            <button
                              key={appt.id}
                              type="button"
                              className={`w-full h-[22px] rounded-md text-[11px] px-2 truncate ${colorClasses}`}
                              onClick={() => setSelectedAppt(appt)}
                            >
                              {appt.patient || "Patient"} • {appt.time}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}

                  {viewMode === "daily" &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={`row-empty-${slot.hour}-${i}`}
                        className="border-t border-l border-slate-100 h-12"
                      />
                    ))}
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {selectedAppt && (
        <DetailsModal
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onMarkCompleted={() => setConfirmAppt(selectedAppt)}
          onManage={() => setShowManage(true)}
          onViewPatient={(id, name) => setViewPatientId({ id, name })}
        />
      )}

      {confirmAppt && (
        <ConfirmCompleteModal
          onCancel={() => setConfirmAppt(null)}
          onConfirm={() => {
            if (onCompleteAppointment) {
              onCompleteAppointment(confirmAppt.id);
            }
            setConfirmAppt(null);
            setSelectedAppt(null);
          }}
        />
      )}

      {showManage && selectedAppt && (
        <ManageAppointmentModal
          open={showManage}
          appointment={selectedAppt}
          onClose={() => setShowManage(false)}
        />
      )}

      {/* Patient Details Modal */}
      {viewPatientId && (
        <PatientDetailsModal
          patientId={viewPatientId.id}
          patientName={viewPatientId.name}
          onClose={() => setViewPatientId(null)}
        />
      )}
    </>
  );
};

export default AppointmentCalendar;

/* ---------- Helpers ---------- */

type CalendarAppointment = Appointment & { start: Date | null };

const generateHourSlots = (startHour: number, endHour: number) => {
  const slots: { hour: number; label: string }[] = [];
  for (let h = startHour; h < endHour; h++) {
    slots.push({ hour: h, label: formatHour(h) });
  }
  return slots;
};

const formatHour = (hour24: number) => {
  const ampm = hour24 >= 12 ? "PM" : "AM";
  let h = hour24 % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:00 ${ampm}`;
};

const parseAppointmentDateTime = (appt: Appointment): Date | null => {
  if (!appt.date || !appt.time) return null;

  try {
    const [dayStr, monthStr, yearStr] = appt.date.split("/");
    const [timePart, meridiem] = appt.time.split(" ");
    const [hourStr, minuteStr] = timePart.split(":");

    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const year = parseInt(yearStr, 10);
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr || "0", 10);

    if (meridiem?.toUpperCase() === "PM" && hour < 12) hour += 12;
    if (meridiem?.toUpperCase() === "AM" && hour === 12) hour = 0;

    return new Date(year, month, day, hour, minute);
  } catch {
    return null;
  }
};

const getWeekStart = (date: Date): Date => {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}/${d.getFullYear()}`;

const formatDayName = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short" });

const formatDayMonth = (d: Date) =>
  d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });

/* ---------- Modals ---------- */

interface DetailsModalProps {
  appointment: CalendarAppointment;
  onClose: () => void;
  onMarkCompleted: () => void;
  onManage: () => void;
  onViewPatient: (id: string, name: string) => void;
}

const DetailsModal: React.FC<DetailsModalProps> = ({
  appointment,
  onClose,
  onMarkCompleted,
  onManage,
  onViewPatient,
}) => {
  const isCompleted = appointment.status === "completed";
  // Check if appointment is in the past
  const isPastAppointment = () => {
    if (!appointment.start) return false;
    const today = startOfDay(new Date());
    return appointment.start < today;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md text-xs">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="text-sm font-semibold text-slate-900">
            Appointment Details
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="flex gap-4 text-xs">
            <div className="w-24 text-[11px] font-medium text-slate-600">
              Patient
            </div>
            <div className="flex-1">
              <button
                type="button"
                onClick={() =>
                  onViewPatient(
                    appointment.id || "",
                    appointment.patient || "",
                  )
                }
                className="text-blue-600 font-semibold hover:underline cursor-pointer text-left"
              >
                {appointment.patient}
              </button>
            </div>
          </div>
          <DetailRow label="Time" value={`${appointment.time}`} />
          <DetailRow
            label="Appointment Type"
            value={`${appointment.appointmentType}`}
          />
          <DetailRow label="Participants" value="1" />
          <DetailRow label="Reason" value={appointment.reason || "-"} />
          <DetailRow label="email" value={appointment.email || "-"}/>
          <DetailRow label="contact_number" value={appointment.contact_number || "-"}/>

          <DetailRow
            label="Status"
            value={appointment.status ? capitalize(appointment.status) : "-"}
          />
        </div>

        {!isPastAppointment() && (
          <div className="flex justify-end gap-2 px-5 py-4 border-t">
            <Link href={`/appointment/meeting?room=${appointment.room_key}`}>
              <Button variant="outline" size="sm" className="text-xs">
                Join Meeting
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={onManage}
            >
              Manage Appointment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex gap-4 text-xs">
    <div className="w-24 text-[11px] font-medium text-slate-600">{label}</div>
    <div className="flex-1 text-slate-800">{value}</div>
  </div>
);

interface ConfirmCompleteModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmCompleteModal: React.FC<ConfirmCompleteModalProps> = ({
  onCancel,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm text-xs">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="text-sm font-semibold text-slate-900">
            Complete Appointment
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-lg"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          <p className="text-xs text-slate-800">
            Are you sure you want to mark this appointment as completed?
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onCancel}
          >
            No
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="text-xs"
            onClick={onConfirm}
          >
            Yes
          </Button>
        </div>
      </div>
    </div>
  );
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
