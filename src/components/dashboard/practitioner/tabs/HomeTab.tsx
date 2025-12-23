// src/components/dashboard/practitioner/DashboardHome.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import { Appointment } from "@/types/Dashboard";
import AppointmentCalendar from "@/components/dashboard/practitioner/tabs/shared/AppointmentCalendar";
import { Calendar } from "lucide-react";

interface DashboardStats {
  todaysAppointments: number;
  completedAppointments: number;
}

interface DashboardHomeProps {
  clinicianName: string;
}

const HomeTab: React.FC<DashboardHomeProps> = ({ clinicianName }) => {
  const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [stats, setStats] = useState<DashboardStats>({
    todaysAppointments: 0,
    completedAppointments: 0,
  });
  const [calendarAppointments, setCalendarAppointments] = useState<
    Appointment[]
  >([]);

  const [statsDate, setStatsDate] = useState<string>(todayISO);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingsForDate = async () => {
      setLoading(true);
      setError(null);

      try {
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (!meRes.ok) {
          throw new Error("Failed to load current user");
        }

        const meJson = await meRes.json();
        const practitionerId =
          meJson?.user?.practitioner_id ?? meJson?.practitioner_id;

        if (!practitionerId) {
          throw new Error("No practitioner id found for current user");
        }

        const bookedRes = await fetch(
          `/api/practitioners/${practitionerId}/booked?from=${statsDate}&to=${statsDate}`,
          { credentials: "include" }
        );

        if (!bookedRes.ok) {
          throw new Error("Failed to load booked appointments");
        }

        const data = await bookedRes.json();

        setStats({
          todaysAppointments: data.scheduled_count ?? 0,
          completedAppointments: data.completed_count ?? 0,
        });

        const mappedAppointments: Appointment[] = (data.booked || []).map(
          (item: any) => {
            const [year, month, day] = (item.date as string).split("-");
            const formattedDate = `${day}/${month}/${year}`; // DD/MM/YYYY

            const statusFromApi: string = item.status || "scheduled";
            const status =
              statusFromApi === "completed"
                ? "completed"
                : statusFromApi === "cancelled"
                ? "cancelled"
                : "confirmed";

            return {
              id: item.id,
              category: status === "completed" ? "previous" : "upcoming",
              date: formattedDate,
              time: item.from,
              doctorName: clinicianName,
              reason: "General Appointment",
              status,
              appointmentType: "",
              telehealthConsent: false,
              termsAccepted: false,
              mainConcern: "",
              goal: "",
              durationOfConcern: "",
              documents: [],
              clinicianNotes: "",
              prescriptions: "",
              followUpNeeded: false,
              followUpDate: undefined,
            };
          }
        );

        setCalendarAppointments(mappedAppointments);
      } catch (err: any) {
        console.error("Error loading dashboard home data", err);
        setError(
          err?.message || "Unable to load appointments for this date."
        );
        setStats({
          todaysAppointments: 0,
          completedAppointments: 0,
        });
        setCalendarAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingsForDate();
  }, [statsDate, clinicianName]);

  const handleCompleteAppointment = (id: string) => {
    setCalendarAppointments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "completed", category: "previous" } : a
      )
    );
    // later: call API to mark as completed
  };

  return (
    <div className="space-y-4">
      {/* Welcome + stats row */}
      <div className="grid">
        <Card>
          <CardHeader>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Welcome Dr. {clinicianName}
              </div>
              <div className="text-xs text-slate-500">
                Today&apos;s appointment statistics
              </div>
            </div>
          </CardHeader>

          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatBox
              label="My appointments today"
              value={loading ? "…" : stats.todaysAppointments.toString()}
              helper="Scheduled for today"
              showDatePicker
              date={statsDate}
              onDateChange={setStatsDate}
            />
            <StatBox
              label="Completed Appointments"
              value={loading ? "…" : stats.completedAppointments.toString()}
              helper="Finished today"
            />
          </CardBody>
        </Card>
      </div>

      {error && (
        <div className="text-[11px] text-red-600">{error}</div>
      )}

      <AppointmentCalendar
        appointments={calendarAppointments}
        onCompleteAppointment={handleCompleteAppointment}
      />
    </div>
  );
};

export default HomeTab;

/* ---------- Small stat card ---------- */

interface StatBoxProps {
  label: string;
  value: string;
  helper: string;
  showDatePicker?: boolean;
  date?: string;
  onDateChange?: (v: string) => void;
}

const StatBox: React.FC<StatBoxProps> = ({
  label,
  value,
  helper,
  showDatePicker,
  date,
  onDateChange,
}) => (
  <div className="relative rounded-xl border border-slate-200 px-4 py-3">
    {showDatePicker && onDateChange && (
      <div className="absolute top-3 right-3">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Calendar
            size={18}
            className="text-slate-600 hover:text-slate-900 transition"
          />
        </label>
      </div>
    )}

    <div className="text-[11px] text-slate-500 mb-1">{label}</div>
    <div className="text-2xl font-semibold text-slate-900 mb-1">
      {value}
    </div>
    <div className="text-[11px] text-slate-400">{helper}</div>
  </div>
);
