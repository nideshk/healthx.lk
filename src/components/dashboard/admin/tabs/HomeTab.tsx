"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import AppointmentCalendar from "@/components/dashboard/shared/AppointmentCalendar";
import { Appointment } from "@/types/Dashboard";

/* -------------------------------------------------------------------------- */
/*                               MOCK DATA                                     */
/* -------------------------------------------------------------------------- */

const MOCK_STATS = {
  upcoming: 12,
  completed: 3,
  activeClinicians: 5,
};

const MOCK_CLINICIANS = [
  { id: "c1", name: "Dr. Rohan Fernando", specialty: "Cardiologist" },
  { id: "c2", name: "Dr. Arjuna Liyanage", specialty: "Cardiologist" },
  { id: "c3", name: "Dr. Priya Wijesinghe", specialty: "Psychiatrist" },
  {
    id: "c4",
    name: "Dr. Lasantha Amarasinghe",
    specialty: "Clinical Psychologist",
  },
  { id: "c5", name: "Dr. Saman Jayawardena", specialty: "Ophthalmologist" },
  { id: "c6", name: "Dr. Sunitha Abeywardena", specialty: "Ophthalmologist" },
];

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "a1",
    category: "upcoming",
    date: "16/12/2025",
    time: "09:00 AM",
    doctorName: "Dr. Rohan Fernando",
    reason: "General Health Checkup",
    status: "confirmed",
    appointmentType: "Short (10 min)",
    telehealthConsent: true,
    termsAccepted: true,
    mainConcern: "",
    goal: "",
    durationOfConcern: "",
    documents: [],
    clinicianNotes: "",
    prescriptions: "",
    followUpNeeded: false,
  },
  {
    id: "a2",
    category: "upcoming",
    date: "27/10/2025",
    time: "10:30 AM",
    doctorName: "Dr. Rohan Fernando",
    reason: "Follow-up Visit",
    status: "confirmed",
    appointmentType: "Long (20 min)",
    telehealthConsent: true,
    termsAccepted: true,
    mainConcern: "",
    goal: "",
    durationOfConcern: "",
    documents: [],
    clinicianNotes: "",
    prescriptions: "",
    followUpNeeded: false,
  },
  {
    id: "a3",
    category: "upcoming",
    date: "28/12/2025",
    time: "03:00 PM",
    doctorName: "Dr. Priya Wijesinghe",
    reason: "Psychiatry Consultation",
    status: "confirmed",
    appointmentType: "Long (30 min)",
    telehealthConsent: false,
    termsAccepted: false,
    mainConcern: "",
    goal: "",
    durationOfConcern: "",
    documents: [],
    clinicianNotes: "",
    prescriptions: "",
    followUpNeeded: false,
  },
];

/* -------------------------------------------------------------------------- */
/*                                  MAIN FILE                                 */
/* -------------------------------------------------------------------------- */

interface Clinician {
  id: string;
  name: string;
  specialty: string;
}

interface AdminStats {
  upcoming: number;
  completed: number;
  activeClinicians: number;
}

const HomeTab: React.FC = () => {
  const [stats, setStats] = useState<AdminStats>(MOCK_STATS);
  const [search, setSearch] = useState("");
  const [clinicians, setClinicians] = useState<Clinician[]>(MOCK_CLINICIANS);
  const [filtered, setFiltered] = useState<Clinician[]>(MOCK_CLINICIANS);

  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(
    null
  );

  const [appointments, setAppointments] =
    useState<Appointment[]>(MOCK_APPOINTMENTS);

  /* ---------------- Filter clinicians by search ---------------- */
  useEffect(() => {
    const s = search.toLowerCase();

    setFiltered(
      clinicians.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.specialty.toLowerCase().includes(s)
      )
    );
  }, [search, clinicians]);

  /* ---------------- Select Clinician + Load Mock Calendar ---------------- */
  const handleSelectClinician = (c: Clinician) => {
    setSelectedClinician(c);

    // Assign doctor name to mock appointment list for realism
    const mapped = MOCK_APPOINTMENTS.map((a) => ({
      ...a,
      doctorName: c.name,
    }));

    setAppointments(mapped);
  };

  return (
    <div className="space-y-6">
      {/* ---------------- Dashboard Stats ---------------- */}
      <Card>
        <CardHeader>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Dashboard Overview
            </div>
            <div className="text-xs text-slate-500">
              Today&apos;s appointment statistics
            </div>
          </div>
        </CardHeader>

        <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Upcoming Appointments"
            value={stats.upcoming}
            helper="Scheduled for today"
          />
          <StatCard
            label="Completed Appointments"
            value={stats.completed}
            helper="Finished today"
          />
          <StatCard
            label="Active Clinicians"
            value={stats.activeClinicians}
            helper="With appointments today"
          />
        </CardBody>
      </Card>

      {/* ---------------- Clinician Search ---------------- */}
      <Card>
        <CardHeader>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Appointment Calendar
            </div>
            <div className="text-xs text-slate-500">
              Select a clinician to view their weekly schedule
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-4">
          <Input
            placeholder="Search doctor by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-4 py-2 hover:bg-blue-50"
                onClick={() => handleSelectClinician(c)}
              >
                {c.name} — {c.specialty}
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="text-xs p-3 text-slate-500">
                No clinicians found.
              </div>
            )}
          </div>

          {selectedClinician && (
            <div className="text-xs text-slate-600">
              <span className="font-medium text-slate-900">Selected:</span>{" "}
              {selectedClinician.name} — {selectedClinician.specialty}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ---------------- Appointment Calendar ---------------- */}
      {selectedClinician && (
        <AppointmentCalendar
          appointments={appointments}
          onCompleteAppointment={(id) =>
            setAppointments((prev) =>
              prev.map((a) => (a.id === id ? { ...a, status: "completed" } : a))
            )
          }
        />
      )}
    </div>
  );
};

export default HomeTab;

/* ------------------------------ Small Stat Card ------------------------------ */
const StatCard = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <div className="text-[11px] text-slate-500">{label}</div>
    <div className="text-xl font-semibold text-slate-900">{value}</div>
    <div className="text-[11px] text-slate-500">{helper}</div>
  </div>
);
