"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FilePlus } from 'lucide-react';

import { AppointmentCard } from '@/components/atom/AppointmentCard/AppointmentCard';
import NextAppointmentCard from '@/components/atom/NextAppointmentCard/NextAppointmentCard';
import { canJoinSession } from '@/utils/time';

type Appointment = {
  id: string;
  starts_at: string;
  status: string;
  appointment_type?: { name?: string; duration_mins?: number };
  practitioner?: { full_name?: string; specialization?: string[] };
};

/** Compare only date */
function isPastDate(iso: string) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);

  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);

  return d < t;
}

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/booking/appointment');
        const json = await res.json();
        setAppointments(json.appointments || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const upcoming = appointments.filter((a) => !isPastDate(a.starts_at));
  const past = appointments.filter((a) => isPastDate(a.starts_at));

  upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  past.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  const nextAppointment = upcoming[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef4ff] via-white to-[#fdf7ff] py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back 👋</h1>
            <p className="text-gray-600 mt-1">Your health schedule at a glance.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/booking"
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Book
            </Link>

            <Link
              href="/reports"
              className="px-4 py-2.5 rounded-xl bg-white border text-gray-700 shadow-sm hover:bg-gray-50 flex items-center"
            >
              <FilePlus className="w-4 h-4 mr-2" />
              Reports
            </Link>
          </div>
        </header>

        {/* GRID */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-1 space-y-5">

            {/* NEXT APPOINTMENT */}
            <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-lg border shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Next Appointment</h3>

              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : nextAppointment ? (
                <NextAppointmentCard appt={nextAppointment} />
              ) : (
                <p className="text-gray-500 text-sm">
                  No upcoming appointments.{' '}
                  <Link href="/booking" className="text-blue-600 underline">
                    Book now
                  </Link>
                </p>
              )}
            </div>

            {/* QUICK ACTIONS */}
            <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-lg border shadow">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Quick actions</h4>

              <div className="flex flex-col gap-2 text-gray-700 text-sm">
                <Link href="/appointments" className="hover:text-blue-600">
                  All Appointments
                </Link>
                <Link href="/chat" className="hover:text-blue-600">
                  Message Doctor
                </Link>
                <Link href="/reports" className="hover:text-blue-600">
                  My Reports
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-2 space-y-8">

            {/* UPCOMING */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-gray-900">Upcoming</h2>
                <span className="text-sm text-gray-500">{upcoming.length}</span>
              </div>

              {loading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="h-20 bg-white rounded-lg animate-pulse"></div>
                  <div className="h-20 bg-white rounded-lg animate-pulse"></div>
                </div>
              ) : upcoming.length === 0 ? (
                <p className="text-gray-500">No upcoming appointments.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {upcoming.map((a) => (
                    <AppointmentCard key={a.id} appt={a} isPast={false} />
                  ))}
                </div>
              )}
            </section>

            {/* PAST */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-gray-900">Past</h2>
                <span className="text-sm text-gray-500">{past.length}</span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <div className="h-20 bg-white rounded-lg animate-pulse"></div>
                  <div className="h-20 bg-white rounded-lg animate-pulse"></div>
                </div>
              ) : past.length === 0 ? (
                <p className="text-gray-500">No past appointments.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {past.map((a) => (
                    <AppointmentCard key={a.id} appt={a} isPast />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
