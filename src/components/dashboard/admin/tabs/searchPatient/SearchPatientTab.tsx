"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";
import Loader from "@/components/atom/Loader/Loader"; // ✅ Added Loader
import PatientDetails from "./PatientDetails";
import { Patient } from "@/types/Dashboard";

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
  loading?: boolean; // ✅ New loading prop
  selectedPatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  onBackToDashboard: () => void;
}

// Global Time Formatter (Robust for Sri Lanka or Worldwide)
const formatGlobalTime = (timeStr: string) => {
  if (!timeStr) return "";
  try {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return timeStr;
  }
};

const SearchPatientTab: React.FC<SearchPatientTabProps> = ({
  search,
  onSearchChange,
  patients = [],
  loading = false,
  selectedPatient,
  onSelectPatient,
  onBackToDashboard,
}) => {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  useEffect(() => {
    if (!selectedPatient) return;

    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true);
        const res = await fetch(`/api/patient/${selectedPatient.id}/appointments`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch appointments");
        const json = await res.json();

        const mapped: AdminAppointment[] = [
          ...(json.scheduled ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: formatGlobalTime(a.start_time), // ✅ Robust time formatting
            doctorName: a.doctor?.name || "Unknown",
            category: "upcoming",
          })),
          ...(json.completed ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: formatGlobalTime(a.start_time), // ✅ Robust time formatting
            doctorName: a.doctor?.name || "Unknown",
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 w-full">
            <div className="text-sm font-semibold text-slate-900">Search Patients</div>
            <div className="text-xs text-slate-500">Find records and manage data.</div>
            <div className="mt-2">
              <Input
                placeholder="Search by name, email, or phone"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-2 relative min-h-[200px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Loader />
            </div>
          ) : (
            <>
              {patients.length > 0 ? (
                patients.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50">
                    <div className="flex flex-col text-sm">
                      <button type="button" className="text-blue-600 font-semibold text-left hover:underline" onClick={() => onSelectPatient(p)}>
                        {p.name}
                      </button>
                      <span className="text-xs text-slate-500">{p.email}</span>
                      <span className="text-xs text-slate-500">{p.phone}</span>
                    </div>
                    <Button variant="danger" size="sm" className="text-xs px-4">🗑 Delete Permanent</Button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-10">
                  {search.length > 0 ? "No patients found for this search." : "No patients available."}
                </p>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default SearchPatientTab;