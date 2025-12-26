"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import AppointmentCalendar from "@/components/dashboard/admin/tabs/shared/AppointmentCalendar";
import { Appointment } from "@/types/Dashboard";
import Loader from "@/components/atom/Loader/Loader";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
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

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/* -------------------------------------------------------------------------- */
/*                                  MAIN FILE                                 */
/* -------------------------------------------------------------------------- */

const HomeTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const [stats, setStats] = useState<AdminStats>({
    upcoming: 0,
    completed: 0,
    activeClinicians: 0,
  });

  const [search, setSearch] = useState("");
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [selectedClinician, setSelectedClinician] =
    useState<Clinician | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  /* -------------------------------------------------------------------------- */
  /*                              FETCH OVERVIEW                                */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch("/api/overview", {
          credentials: "include",
        });

        const data = await res.json();

        if (data.success) {
          setStats({
            upcoming: data.upcoming ?? 0,
            completed: data.completed ?? 0,
            activeClinicians: data.active_clinicians ?? 0,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                          PRACTITIONER SEARCH (API 24)                      */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    const fetchPractitioners = async () => {
      try {
        const url = search
          ? `/api/practitioner-list?q=${encodeURIComponent(search)}`
          : `/api/practitioner-list`;

        const res = await fetch(url, { credentials: "include" });
        const data = await res.json();

        if (!data.success) return;

        setClinicians(
          data.data.map((d: any) => ({
            id: d.id,
            name: d.full_name,
            specialty: d.specialization?.join(", ") || "-",
          }))
        );
      } catch (err) {
        console.error(err);
      }
    };

    fetchPractitioners();
  }, [search]);

  /* -------------------------------------------------------------------------- */
  /*                   FETCH APPOINTMENTS (API 25)                              */
  /* -------------------------------------------------------------------------- */

  const fetchAppointments = async (
    practitionerId: string,
    view: "weekly" | "daily",
    date: string
  ) => {
    setCalendarLoading(true);

    try {
      const url =
        view === "weekly"
          ? `/api/practitioner/${practitionerId}/appointments?view=weekly&week_start=${date}`
          : `/api/practitioner/${practitionerId}/appointments?view=daily&date=${date}`;

      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();

      if (!data.success) return;

      const mapped: Appointment[] = data.data.map((a: any) => ({
        id: a.id,
        date: formatDate(a.starts_at),
        time: formatTime(a.starts_at),
        reason: a.reason,
        status: a.status,
        category: "upcoming",
        doctorName: selectedClinician?.name || "",
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
      }));

      setAppointments(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setCalendarLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                               SELECT DOCTOR                                */
  /* -------------------------------------------------------------------------- */

  const handleSelectClinician = (c: Clinician) => {
    setSelectedClinician(c);

    // default weekly view, current week
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    fetchAppointments(
      c.id,
      "weekly",
      weekStart.toISOString().split("T")[0]
    );
  };

  /* -------------------------------------------------------------------------- */
  /*                                  LOADER                                    */
  /* -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                  RENDER                                    */
  /* -------------------------------------------------------------------------- */

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

      {/* ---------------- Practitioner Search ---------------- */}
      <Card>
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">
            Appointment Calendar
          </div>
        </CardHeader>

        <CardBody className="space-y-3">
          <Input
            placeholder="Search doctor by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
            {clinicians.map((c) => (
              <button
                key={c.id}
                className="w-full text-left px-4 py-2 hover:bg-blue-50"
                onClick={() => handleSelectClinician(c)}
              >
                {c.name} — {c.specialty}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ---------------- Calendar ---------------- */}
      {selectedClinician && (
        <>
          {calendarLoading ? (
            <div className="flex justify-center py-10">
              <Loader size="md" />
            </div>
          ) : (
            <AppointmentCalendar
              appointments={appointments}
              userRole="admin"
            />
          )}
        </>
      )}
    </div>
  );
};

export default HomeTab;

/* -------------------------------------------------------------------------- */
/*                               STAT CARD                                     */
/* -------------------------------------------------------------------------- */

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
