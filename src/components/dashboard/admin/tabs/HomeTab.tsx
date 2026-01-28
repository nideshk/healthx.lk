"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import AppointmentCalendar from "@/components/dashboard/admin/tabs/shared/AppointmentCalendar";
import { Appointment } from "@/types/Dashboard";
import Loader from "@/components/atom/Loader/Loader";
import { ChevronLeft, ChevronRight, User, Stethoscope, Search, SearchCode } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

/* -------------------------------------------------------------------------- */
/* TYPES                                     */
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
/* HELPERS                                   */
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
    timeZone: "Asia/Colombo",
  });
};

/* -------------------------------------------------------------------------- */
/* MAIN FILE                                 */
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
  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(
    null
  );

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Ref for auto-scroll
  const calendarSectionRef = useRef<HTMLDivElement>(null);

  /* -------------------------------------------------------------------------- */
  /* FETCH OVERVIEW                                */
  /* -------------------------------------------------------------------------- */

  if (loading) {
    return <Loader />;
  }

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await authFetch("/api/overview", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Overview fetch failed: ${res.status}`);
        }

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
  /* PRACTITIONER SEARCH (Only fires when search is not empty)                  */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    // Check if search is empty or just whitespace
    if (!search.trim()) {
      setClinicians([]);
      return;
    }

    const fetchPractitioners = async () => {
      try {
        const url = `/api/practitioner-list?q=${encodeURIComponent(search)}`;

        const res = await authFetch(url, { credentials: "include" });
        if (!res.ok) {
          throw new Error(`practitioner-list fetch failed: ${res.status}`);
        }
        const data = await res.json();

        if (!data.success) return;

        setClinicians(
          data.data.map((d: any) => ({
            id: d.id,
            name: d.full_name,
            specialty: d.specialization?.join(", ") || "-",
          }))
        );
        setCurrentPage(1);
      } catch (err) {
        console.error(err);
      }
    };

    // Optional: add a small debounce here if you want to prevent rapid API calls
    const delayDebounceFn = setTimeout(() => {
      fetchPractitioners();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  /* -------------------------------------------------------------------------- */
  /* FETCH APPOINTMENTS                                                        */
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

      const res = await authFetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Appointments view fetch failed: ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) return;

      const mapped: Appointment[] = data.data.map((a: any) => {
        return {
          id: a.id,
          date: formatDate(a.starts_at),
          time: formatTime(a.starts_at),
          reason: a.reason,
          status: a.status,
          category: "upcoming",
          doctorName: selectedClinician?.name || "",
          appointmentType: a.appointment_type || "Not specified",
          telehealthConsent: false,
          termsAccepted: false,
          mainConcern: "",
          goal: "",
          durationOfConcern: "",
          documents: [],
          clinicianNotes: "",
          prescriptions: "",
          followUpNeeded: false,
          patient: a.patient,
        };
      });

      setAppointments(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setCalendarLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* SELECT DOCTOR                                */
  /* -------------------------------------------------------------------------- */

  const handleSelectClinician = (c: Clinician) => {
    setSelectedClinician(c);

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    fetchAppointments(c.id, "weekly", weekStart.toISOString().split("T")[0]);
  };

  /* -------------------------------------------------------------------------- */
  /* AUTO SCROLL                                  */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (selectedClinician && calendarSectionRef.current) {
      calendarSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedClinician, calendarLoading]);

  /* -------------------------------------------------------------------------- */
  /* PAGINATION LOGIC                              */
  /* -------------------------------------------------------------------------- */

  const totalPages = Math.ceil(clinicians.length / itemsPerPage);
  const currentData = clinicians.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* -------------------------------------------------------------------------- */
  /* LOADER                                    */
  /* -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* RENDER                                    */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-6 pb-10">
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

      {/* ---------------- Practitioner Search & List ---------------- */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Appointment Calendar
              </div>
              <div className="text-xs text-slate-500">
                Search a clinician to view their appointment schedule.
              </div>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-4">
          {/* Green Search Bar in the Red Box Area */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search size={16} className="text-emerald-500" />
            </div>
            <Input
              className="pl-10 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all duration-200 bg-emerald-50/30"
              placeholder="Find a specialist by name or expertise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {search.trim() === "" ? (
              /* State 1: Initial load / No search query */
              <div className="p-12 text-center flex flex-col items-center justify-center bg-slate-50/50">
                <SearchCode size={32} className="text-slate-300 mb-2" />
                <div className="text-slate-500 text-sm font-medium">Ready to search</div>
                <div className="text-slate-400 text-xs mt-1">Start typing above to find a clinician</div>
              </div>
            ) : currentData.length > 0 ? (
              /* State 2: Results found */
              currentData.map((c) => (
                <button
                  key={c.id}
                  className={`w-full text-left px-5 py-3 transition-colors flex items-center justify-between group ${selectedClinician?.id === c.id
                    ? "bg-blue-50"
                    : "hover:bg-slate-50"
                    }`}
                  onClick={() => handleSelectClinician(c)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${selectedClinician?.id === c.id
                        ? "bg-blue-100 text-blue-600"
                        : "bg-slate-100 text-slate-400 group-hover:text-blue-500 transition-colors"
                        }`}
                    >
                      <User size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 text-sm">
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Stethoscope size={12} />
                        {c.specialty}
                      </div>
                    </div>
                  </div>
                  {selectedClinician?.id === c.id && (
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-2 py-1 rounded">
                      Selected
                    </div>
                  )}
                </button>
              ))
            ) : (
              /* State 3: Search active but no results */
              <div className="p-10 text-center text-slate-500 text-sm">
                No clinicians found for "{search}". Try a different term.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2">
              <div className="text-xs text-slate-500 font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ---------------- Calendar Section ---------------- */}
      <div ref={calendarSectionRef} className="scroll-mt-10">
        {selectedClinician && (
          <>
            <div className="mb-4 flex items-center gap-3 px-1">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800">
                Viewing Schedule: {selectedClinician.name}
              </h3>
            </div>
            {calendarLoading ? (
              <div className="flex justify-center py-20 bg-white border border-slate-200 rounded-2xl">
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
    </div>
  );
};

export default HomeTab;

/* -------------------------------------------------------------------------- */
/* STAT CARD                                     */
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