"use client";

import React, { useEffect, useState, useRef } from "react";
import { DateTime } from "luxon";
import { Calendar } from "lucide-react";

import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import AppointmentCalendar from "@/components/dashboard/practitioner/tabs/shared/AppointmentCalendar";
import Loader from "@/components/atom/Loader/Loader";
import { Appointment } from "@/types/Dashboard";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/contexts/AuthContext";
import { email } from "zod";

/* ---------- Date helpers ---------- */

const toISODate = (d: Date) =>
  DateTime.fromJSDate(d).setZone("Asia/Colombo").toISODate()!;

const getWeekStartISO = (date: Date) => {
  const d = DateTime.fromJSDate(date).setZone("Asia/Colombo");
  return d.startOf("week").toISODate()!;
};

const getWeekEndISO = (date: Date) => {
  const d = DateTime.fromJSDate(date).setZone("Asia/Colombo");
  return d.endOf("week").toISODate()!;
};

/* ---------- Types ---------- */

interface DashboardStats {
  todaysAppointments: number;
  completedAppointments: number;
}

interface Props {
  clinicianName: string;
}

/* ---------- Component ---------- */

const HomeTab: React.FC<Props> = ({ clinicianName }) => {
  const { user } = useAuth();

  const today = new Date();

  const [dateRange, setDateRange] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    todaysAppointments: 0,
    completedAppointments: 0,
  });

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const practitionerId = user?.practitioner_id;

  const fullName =
    user?.profile?.first_name && user?.profile?.last_name
      ? `${user.profile.first_name} ${user.profile.last_name}`
      : clinicianName;

  /* ---------- Fetch appointments ---------- */

  useEffect(() => {
if (!practitionerId || !dateRange) return;

    const fetchData = async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const view = dateRange.from === dateRange.to ? "daily" : "weekly";
        const url =
          view === "weekly"
            ? `/api/practitioner/${practitionerId}/appointments?view=weekly&week_start=${dateRange.from}`
            : `/api/practitioner/${practitionerId}/appointments?view=daily&date=${dateRange.from}`;

        const res = await authFetch(url);
        const json = await res.json();

        if (requestId !== requestIdRef.current) return;

        if (!res.ok || !json.success) {
          throw new Error("Failed to load appointments");
        }

        setStats({
          todaysAppointments: json.counts?.confirmed ?? 0,
          completedAppointments: json.counts?.completed ?? 0,
        });

        const mapped: Appointment[] = json.data.map((item: any) => {
          const start = DateTime.fromISO(item.starts_at, {
            zone: "utc",
          }).setZone("Asia/Colombo");

          const status =
            item.status === "completed"
              ? "completed"
              : item.status === "cancelled"
                ? "cancelled"
                : "confirmed";

          return {
            id: item.id,
            category: status === "completed" ? "previous" : "upcoming",
            date: start.toFormat("dd/MM/yyyy"),
            time: start.toFormat("hh:mm a"),
            patient: item.patient || "—",
            email: item.email || "-",
            contact_number: item.contact_number || "-",
            patientId: item.id,
            doctorName: fullName,
            reason: item.reason || "—",
            status,
            appointmentType: item.appointment_type || "-",
            room_key: item.room_key,
          };
        });

        setAppointments(mapped);
      } catch (e: any) {
        if (requestId !== requestIdRef.current) return;
        setError(e.message || "Failed to load appointments");
        setStats({ todaysAppointments: 0, completedAppointments: 0 });
        setAppointments([]);
      } finally {
         if (requestId === requestIdRef.current) {
            setLoading(false);
          }
      }
    };

    fetchData();
  }, [dateRange, practitionerId]);

  /* ---------- UI ---------- */

  const isSingleDay = dateRange?.from === dateRange?.to;

  const rangeLabel = isSingleDay
    ? `Appointments on ${dateRange?.from}`
    : `Appointments (${dateRange?.from} – ${dateRange?.to})`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <div className="text-sm font-semibold">Welcome Dr. {fullName}</div>
            <div className="text-xs text-slate-500">
              Today&apos;s appointment statistics
            </div>
          </div>
        </CardHeader>

        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatBox
            label={rangeLabel}
            value={loading ? <Loader size="sm" /> : stats.todaysAppointments}
            helper={
              isSingleDay
                ? "Scheduled for selected day"
                : "Scheduled in selected range"
            }
          />

          <StatBox
            label="Completed Appointments"
            value={loading ? <Loader size="sm" /> : stats.completedAppointments}
            helper={
              isSingleDay
                ? "Completed on selected day"
                : "Completed in selected range"
            }
          />
        </CardBody>
      </Card>

      {error && <div className="text-xs text-red-600">{error}</div>}

      <AppointmentCalendar
        appointments={appointments}
        onRangeChange={(from, to) => setDateRange({ from, to })}
      />
    </div>
  );
};

export default HomeTab;

/* ---------- StatBox ---------- */

const StatBox = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: React.ReactNode;
  helper: string;
}) => (
  <div className="rounded-xl border px-4 py-3">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
    <div className="text-xs text-slate-400">{helper}</div>
  </div>
);
