// src/components/dashboard/practitioner/DashboardHome.tsx
"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import { ClinicianStats, Appointment } from "@/types/Dashboard";
import AppointmentCalendar from "./AppointmentCalendar";

interface DashboardHomeProps {
  stats: ClinicianStats;
  appointments: Appointment[];
}

const DashboardHome: React.FC<DashboardHomeProps> = ({
  stats,
  appointments,
}) => {
  // Local state so we can grey out completed ones on the calendar
  const [calendarAppointments, setCalendarAppointments] =
    useState<Appointment[]>(appointments);

  const handleCompleteAppointment = (id: string) => {
    setCalendarAppointments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "completed" } : a
      )
    );
    // hook for API later:
    // await api.markAppointmentCompleted(id)
  };

  return (
    <div className="space-y-4">
      {/* Welcome + stats row */}
      <div className="grid">
        <Card>
          <CardHeader>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Welcome Dr. Kumari Silva
              </div>
              <div className="text-xs text-slate-500">
                Today&apos;s appointment statistics
              </div>
            </div>
          </CardHeader>
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatBox
              label="My appointments today"
              value={stats.todaysAppointments.toString()}
              helper="Scheduled for today"
            />
            <StatBox
              label="Completed Appointments"
              value={stats.completedAppointments.toString()}
              helper="Finished today"
            />
          </CardBody>
        </Card>
      </div>

      {/* Appointment Calendar (new) */}
      <AppointmentCalendar
        appointments={calendarAppointments}
        onCompleteAppointment={handleCompleteAppointment}
      />
    </div>
  );
};

export default DashboardHome;

const StatBox: React.FC<{ label: string; value: string; helper: string }> = ({
  label,
  value,
  helper,
}) => (
  <div className="rounded-xl border border-slate-200 px-4 py-3">
    <div className="text-[11px] text-slate-500 mb-1">{label}</div>
    <div className="text-2xl font-semibold text-slate-900 mb-1">{value}</div>
    <div className="text-[11px] text-slate-400">{helper}</div>
  </div>
);
