"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FilePlus, Stethoscope, ChevronRight } from "lucide-react";
import axios from "axios";

/* TYPES */
type Appointment = {
  id: string;
  starts_at: string;
  ends_at?: string;
  status: string;
  telehealth_url: string;
  cancellation_reason?: string | null;
  appointment_type?: { id?: string; name?: string; duration_mins?: number };
  practitioner?: {
    id?: string;
    full_name?: string;
    specialization?: string[];
  };
};

/* Utility: time left */
function formatTimeLeft(targetIso: string) {
  const now = Date.now();
  const then = new Date(targetIso).getTime();
  const diff = then - now;
  if (diff <= 0) return "Now";

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default function PatientDashboardApple() {
  const [ongoing, setOngoing] = useState<Appointment[]>([]);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [past, setPast] = useState<Appointment[]>([]);
  const [cancelled, setCancelled] = useState<Appointment[]>([]);
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  /* Load appointments */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/booking/appointment");
        const json = await res.json();

        setOngoing(json.ongoing || []);
        setUpcoming(json.upcoming || []);
        setPast(json.past || []);
        setCancelled(json.cancelled || []);
      } catch (err) {
        console.error("Error fetching appointments", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* Load draft */
  useEffect(() => {
    axios.get("/api/booking/appointment/draft").then((res) => {
      setDraft(res.data?.draft || null);
    });
  }, []);

  const next = ongoing[0] ?? upcoming[0] ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f2f7ff] via-white to-[#fff7fb] py-8 px-4">
      <div className="mx-auto">

        {/* HEADER */}
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Welcome back 👋</h1>
            <p className="text-gray-600 mt-1">Your schedule and quick actions at a glance.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/appointment"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium flex items-center gap-2 hover:bg-blue-700 shadow-md"
            >
              <Plus className="w-4 h-4" /> Book
            </Link>
            <Link
              href="/reports"
              className="px-3 py-2 rounded-xl bg-white shadow ring-1 ring-black/5 text-gray-700 flex items-center gap-2 hover:bg-gray-50"
            >
              <FilePlus className="w-4 h-4" /> Reports
            </Link>
          </div>
        </header>

        {/* GRID */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* SIDEBAR */}
          <aside className="lg:col-span-1 space-y-6">

            <div className="sticky top-6 p-6 rounded-2xl bg-white/70 backdrop-blur-md shadow-lg ring-1 ring-white/50">
              <h3 className="text-sm font-semibold text-gray-600">Next Appointment</h3>

              {loading && <LoadingSkeleton />}
              {!loading && next && <NextAppointmentCard appt={next} />}
              {!loading && !next && draft && <DraftCard />}
              {!loading && !next && !draft && (
                <p className="mt-4 text-gray-600">No upcoming appointments.</p>
              )}
            </div>

            <QuickActions
              upcoming={upcoming.length}
              past={past.length}
              cancelled={cancelled.length}
              ongoing={ongoing.length}
            />
          </aside>

          {/* MAIN CONTENT */}
          <main className="lg:col-span-2 space-y-10">

            {/* ONGOING */}
            <Section title="Ongoing" count={ongoing.length}>
              {loading ? <LoadingList /> :
                ongoing.length === 0 ? (
                  <p className="text-gray-600">No ongoing appointments.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ongoing.map((appt) => (
                      <AppointmentCard key={appt.id} appt={appt} isOngoing />
                    ))}
                  </div>
                )}
            </Section>

            {/* UPCOMING */}
            <Section title="Upcoming" count={upcoming.length}>
              {loading ? <LoadingGrid /> :
                upcoming.length === 0 ? (
                  <p className="text-gray-600">No upcoming appointments.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    
                    {upcoming.map((appt) => (
                      <AppointmentCard key={appt.id} appt={appt} />
                    ))}
                  </div>
                )}
            </Section>

            {/* PAST */}
            <Section title="Past" count={past.length}>
              {loading ? <LoadingList /> :
                past.length === 0 ? (
                  <p className="text-gray-600">No past appointments.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {past.map((appt) => (
                      <AppointmentCard key={appt.id} appt={appt} isPast />
                    ))}
                  </div>
                )}
            </Section>

            {/* CANCELLED */}
            <Section title="Cancelled" count={cancelled.length}>
              {loading ? <LoadingList /> :
                cancelled.length === 0 ? (
                  <p className="text-gray-600">No cancelled appointments.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cancelled.map((appt) => (
                      <AppointmentCard key={appt.id} appt={appt} isCancelled />
                    ))}
                  </div>
                )}
            </Section>
          </main>
        </div>
      </div>
    </div>
  );
}

/* Supporting Components */

function Section({ title, count, children }: any) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-500">{count}</span>
      </div>
      {children}
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-4 animate-pulse space-y-3">
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="h-28 bg-white/60 rounded-2xl animate-pulse"></div>
      <div className="h-28 bg-white/60 rounded-2xl animate-pulse"></div>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-3">
      <div className="h-20 bg-white/60 rounded-2xl animate-pulse"></div>
      <div className="h-20 bg-white/60 rounded-2xl animate-pulse"></div>
    </div>
  );
}

function QuickActions({ upcoming, past, cancelled , ongoing }: any) {
  return (
    <>
      <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md shadow ring-1 ring-white/50">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Quick actions</h4>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/dashboard/appointment" className="px-3 py-2 rounded-lg bg-white/60 ring-1 ring-black/5 text-gray-700 hover:bg-gray-50">
            All appointments
          </Link>
          <Link href="/chat" className="px-3 py-2 rounded-lg bg-white/60 ring-1 ring-black/5 text-gray-700 hover:bg-gray-50">
            Message doctor
          </Link>
          <Link href="/reports" className="px-3 py-2 rounded-lg bg-white/60 ring-1 ring-black/5 text-gray-700 hover:bg-gray-50">
            My reports
          </Link>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-md shadow ring-1 ring-white/40">
        <h5 className="text-sm font-medium text-gray-700">This week</h5>
        <div className="mt-3 text-sm text-gray-800">
          <p>{ongoing} ongoing appointments</p>
          <p className="mt-1">{upcoming} upcoming appointments</p>
          <p className="mt-1">{past} past appointments</p>
          <p className="mt-1">{cancelled} cancelled appointments</p>
        </div>
      </div>
    </>
  );
}

function DraftCard() {
  return (
    <div className="mt-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-100 backdrop-blur-lg shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center">
          <Stethoscope className="w-7 h-7 text-blue-700" />
        </div>

        <div className="flex-1">
          <p className="text-lg font-semibold text-gray-900">You have a draft appointment</p>
          <p className="text-sm text-gray-600 mt-1">Continue booking your appointment.</p>

          <Link href="/appointment" className="inline-flex items-center gap-1 text-blue-600 font-medium mt-2 text-sm hover:underline">
            Continue <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function NextAppointmentCard({ appt }: { appt: Appointment }) {
  const start = new Date(appt.starts_at);
  const doctor = appt.practitioner || {};

  console.log("Next appointment:", appt);
  return (
    <div className="mt-4">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center">
          <Stethoscope className="w-7 h-7 text-blue-700" />
        </div>

        <div className="flex-1">
          <p className="text-lg font-semibold text-gray-900">{doctor.full_name || "Your Practitioner"}</p>
          <p className="text-sm text-gray-600">{doctor.specialization?.join(", ")}</p>

          <p className="text-sm text-gray-500 mt-2">
            <strong>{start.toLocaleDateString()}</strong>{" "}
            • {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>

          <div className="mt-3 text-xs text-gray-500">
            Starts in <strong>{formatTimeLeft(appt.starts_at)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({ appt, isPast = false, isCancelled = false, isOngoing = false }: any) {
  const start = new Date(appt.starts_at);
  const doc = appt.practitioner || {};

  console.log("ongoing appointment:", appt);
  const style = isCancelled
    ? "bg-red-50 border border-red-200"
    : isOngoing
    ? "bg-green-50 border border-green-300 animate-pulse"
    : "bg-white/60 ring-white/40 hover:shadow-lg";

  return (
    <article className={`p-4 rounded-2xl backdrop-blur-sm shadow ring-1 transition ${style}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-blue-700" />
          </div>

          <div>
            <p className="font-semibold text-gray-900">
              {doc.full_name || "Practitioner"}
            </p>

            <p className="text-sm text-gray-600">
              {appt.appointment_type?.name} · {appt.appointment_type?.duration_mins} mins
            </p>

            <p className="text-xs text-gray-500 mt-1">
              {(doc.specialization || []).join(", ")}
            </p>

            {isCancelled && (
              <p className="text-xs text-red-600 mt-1">
                Reason: {appt.cancellation_reason || "No reason provided"}
              </p>
            )}

            {isOngoing && (
              <p className="text-xs text-green-700 mt-1 font-medium">
                In progress now
              </p>
            )}
          </div>
        </div>

        <div className="text-right text-sm">
          <p className="font-semibold text-gray-800">
            {start.toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-500">
            {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* JOIN BUTTON FOR ONGOING APPOINTMENT */}
      {isOngoing && (
        <div className="mt-4">
          <Link
            href={`/appointment/meeting?room=${appt.telehealth_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 w-full block text-center rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition"
          >
            Join Appointment
          </Link>
        </div>
      )}

      {/* Only show reschedule/details when not ongoing/past/cancelled */}
      {!isPast && !isCancelled && !isOngoing && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Link
            href={`/dashboard/reschedule/${appt.id}`}
            className="px-3 py-1 rounded-md bg-white ring-1 ring-black/5 text-gray-700 hover:bg-gray-100"
          >
            Reschedule
          </Link>

          <Link
            href={`/dashboard/appointment/${appt.id}`}
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            Details
          </Link>
        </div>
      )}
    </article>
  );
}
