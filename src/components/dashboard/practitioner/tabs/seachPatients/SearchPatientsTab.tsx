"use client";

import React from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";
import { Patient, Appointment } from "@/types/Dashboard";
import PatientDetails from "../seachPatients/PatientDetailView";

interface SearchPatientsTabProps {
  search: string;
  onSearchChange: (v: string) => void;

  // ✅ FIX: make optional
  patients?: Patient[];

  selectedPatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  onBackToDashboard: () => void;

  // ✅ FIX: make optional
  appointments?: Appointment[];
}

const SearchPatientsTab: React.FC<SearchPatientsTabProps> = ({
  search,
  onSearchChange,
  patients = [],              // ✅ default value
  selectedPatient,
  onSelectPatient,
  onBackToDashboard,
  appointments = [],          // ✅ default value
}) => {
  // 🔹 Patient details view
  if (selectedPatient) {
    return (
      <PatientDetails
        patient={selectedPatient}
        appointments={appointments}
        onBack={onBackToDashboard}
      />
    );
  }

  // 🔹 Search + list view
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

export default SearchPatientsTab;
