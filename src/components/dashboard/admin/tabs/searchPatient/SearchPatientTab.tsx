"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";

import PatientDetails from "./PatientDetails";
import { Patient } from "@/types/Dashboard";

/* ----------------------------------
   Admin-only lean appointment type
----------------------------------- */
export interface AdminAppointment {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  category: "upcoming" | "previous";
}

interface SearchPatientTabProps {
  search: string;
  onSearchChange: (v: string) => void;

  patients?: Patient[];

  selectedPatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  onBackToDashboard: () => void;
}

const SearchPatientTab: React.FC<SearchPatientTabProps> = ({
  search,
  onSearchChange,
  patients = [],
  selectedPatient,
  onSelectPatient,
  onBackToDashboard,
}) => {
  /* ---------------- Appointments state ---------------- */

  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  /* ---------------- Fetch appointments on patient select ---------------- */

  useEffect(() => {
    if (!selectedPatient) return;

    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true);

        const res = await fetch(
          `/api/patient/${selectedPatient.id}/appointments`,
          { credentials: "include" }
        );

        if (!res.ok) throw new Error("Failed to fetch appointments");

        const json = await res.json();

        const mapped: AdminAppointment[] = [
          ...(json.scheduled ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: a.start_time,
            doctorName: a.doctor.name,
            category: "upcoming",
          })),
          ...(json.completed ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: a.start_time,
            doctorName: a.doctor.name,
            category: "previous",
          })),
        ];

        setAppointments(mapped);
      } catch (err) {
        console.error("Error fetching appointments", err);
        setAppointments([]);
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchAppointments();
  }, [selectedPatient]);

  /* ---------------- Patient details view ---------------- */

  if (selectedPatient) {
    return (
      <PatientDetails
        patient={selectedPatient}
        appointments={appointments}
        loadingAppointments={loadingAppointments}
        onBack={onBackToDashboard}
      />
    );
  }

  /* ---------------- Search + list view ---------------- */

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Search Patients
            </div>
            <div className="text-xs text-slate-500">
              Find patient records and manage data. Use delete permanent with
              caution.
            </div>
          </div>

          <div className="w-72">
            <Input
              placeholder="Search by name, email, or phone"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardBody className="space-y-2">
          {patients.length > 0 ? (
            patients.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex flex-col text-sm">
                  <button
                    type="button"
                    className="text-blue-600 font-semibold text-left hover:underline"
                    onClick={() => onSelectPatient(p)}
                  >
                    {p.name}
                  </button>
                  <span className="text-xs text-slate-500">{p.email}</span>
                  <span className="text-xs text-slate-500">{p.phone}</span>
                </div>

                <Button variant="danger" size="sm" className="text-xs px-4">
                  🗑 Delete Permanent
                </Button>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">
              No patients found. Try a different search.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default SearchPatientTab;
