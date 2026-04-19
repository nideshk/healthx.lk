"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import { Appointment } from "@/types/Dashboard";
import ManageAppointmentModal from "./ManageAppointmentModal";
import PatientDetailsModal from "./PatientDetailsModal";
import Link from "next/link";
import { LayoutGrid, List, Stethoscope, CalendarDays } from "lucide-react";

type ViewMode = "grid" | "list";

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onCompleteAppointment?: (id: string) => void;
  userRole?: "admin" | "superadmin" | "practitioner";
}

const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  appointments,
  onCompleteAppointment,
  userRole = "practitioner",
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
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

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Appointment Calendar
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                  }`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                  }`}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>

          </div>
        </CardHeader>

        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
              Active Schedule • Today + 7 Days
            </div>
          </div>

          {parsedAppointments.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <CalendarDays className="text-slate-400" size={24} />
              </div>
              <div className="text-sm font-medium text-slate-900">No upcoming appointments</div>
              <div className="text-xs text-slate-500 mt-1">There are no appointments scheduled for the next 8 days</div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parsedAppointments.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => setSelectedAppt(appt)}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-pointer overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity ${appt.status === "completed" ? "bg-slate-500" : "bg-blue-500"
                    }`} />

                  <div className="flex justify-between items-start mb-3 relative">
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                        {appt.time}
                      </div>
                      <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {appt.patient || "Guest Patient"}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter self-start ${appt.status === "completed"
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                      {appt.status}
                    </span>
                  </div>

                  <div className="space-y-2 relative">
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                      <Stethoscope size={14} className="text-slate-400" />
                      <span className="truncate">{appt.appointmentType || "General Consultation"}</span>
                    </div>
                    {appt.reason && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 italic leading-relaxed">
                        "{appt.reason}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm font-sans">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patient</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedAppointments.map((appt) => (
                    <tr
                      key={appt.id}
                      onClick={() => setSelectedAppt(appt)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-blue-600 tabular-nums">
                          {appt.time}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                          {appt.patient}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {appt.appointmentType}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border transition-colors ${appt.status === "completed"
                            ? "bg-slate-100 text-slate-500 border-slate-200"
                            : "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100"
                          }`}>
                          {appt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
          <DetailRow label="email" value={appointment.email || "-"} />
          <DetailRow label="contact_number" value={appointment.contact_number || "-"} />

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
