// src/components/dashboard/practitioner/SearchPatientsPanel.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";
import { Patient, Appointment } from "@/types/Dashboard";
import PatientDetailView from "@/components/dashboard/practitioner/PatientDetailView";

interface SearchPatientsPanelProps {
  search: string;
  onSearchChange: (v: string) => void;
  patients: Patient[];
  selectedPatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  onBackToDashboard: () => void;
  appointments: Appointment[];
}

const SearchPatientsPanel: React.FC<SearchPatientsPanelProps> = ({
  search,
  onSearchChange,
  patients,
  selectedPatient,
  onSelectPatient,
  onBackToDashboard,
  appointments,         // 👈 add this

}) => {
  // If a patient is selected → show detail view
  if (selectedPatient) {
    return (
      <PatientDetailView patient={selectedPatient}  onBack={onBackToDashboard} appointments={appointments} />
    );
  }

  // Otherwise show the search + list
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
              placeholder="Search by name, ID, or phone"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardBody className="space-y-2">
          {patients.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
            >
              <div className="flex flex-col text-sm">
                {/* CLICKABLE NAME → opens detail view */}
                <button
                  type="button"
                  className="text-blue-600 font-semibold text-sm text-left hover:underline"
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
          ))}

          {patients.length === 0 && (
            <p className="text-xs text-slate-500">
              No patients found. Try a different search.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default SearchPatientsPanel;
