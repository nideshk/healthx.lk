"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import { Patient, PatientDetailTab } from "@/types/Dashboard";

/* ----------------------------------
   Admin-only lean appointment type
----------------------------------- */
export interface AdminAppointment {
  id: string;
  date: string;
  time: string;
  info: string;
  doctorName: string;
  category: "upcoming" | "ongoing" | "previous";
}

interface PatientDetailViewProps {
  patient: Patient;
  appointments: AdminAppointment[];
  loadingAppointments?: boolean;
  onBack: () => void;
}

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

const PatientDetails: React.FC<PatientDetailViewProps> = ({
  patient,
  appointments,
  loadingAppointments = false,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<PatientDetailTab>("overview");
  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900"
      >
        <span>←</span>
        <span>Back to Patients</span>
      </button>

      {/* Patient Header */}
      <Card>
        <CardBody className="flex flex-col md:flex-row md:items-center md:justify-between bg-blue-50 rounded-xl">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-slate-900">
              {patient.full_name}
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-slate-700">
              <DetailLine label="Patient ID" value={patient.id} />
              <DetailLine label="Date of Birth" value={patient.dob} />
              <DetailLine label="Age" value={`${calculateAge(patient.dob)} years`} />
              <DetailLine label="Gender" value={patient.gender || "N/A"} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 text-xs bg-slate-50 rounded-full p-1 border border-slate-200">
        {renderTab("overview", "Overview")}
        {renderTab("appointments", "Appointments")}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <PatientOverviewTab patient={patient} />}

      {activeTab === "appointments" && (
        <AppointmentsTab
          appointments={appointments}
          loading={loadingAppointments}
        />
      )}
    </div>
  );

  function renderTab(id: PatientDetailTab, label: string) {
    const active = id === activeTab;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setActiveTab(id)}
        className={`flex-1 rounded-full px-3 py-2 flex items-center justify-center ${active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
          }`}
      >
        {label}
      </button>
    );
  }
};

export default PatientDetails;

/* ----------------------------------
   Helpers
----------------------------------- */

const DetailLine: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <span className="font-semibold">{label}: </span>
    <span>{value}</span>
  </div>
);

/* ----------------------------------
   Overview Tab
----------------------------------- */

const PatientOverviewTab: React.FC<{ patient: Patient }> = ({ patient }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card>
      <CardHeader>
        <div className="text-sm font-semibold text-slate-900">
          Patient Information
        </div>
      </CardHeader>
      <CardBody className="space-y-3 text-xs">
        <InfoRow label="Full Name" value={patient.full_name} />
        <InfoRow label="Date of Birth" value={patient.dob} />
        <InfoRow label="Gender" value={patient.gender || "N/A"} />
        <InfoRow label="Age" value={`${calculateAge(patient.dob)} years`} />
      </CardBody>
    </Card>

    <Card>
      <CardHeader>
        <div className="text-sm font-semibold text-slate-900">
          Contact Information
        </div>
      </CardHeader>
      <CardBody className="space-y-3 text-xs">
        <InfoRow label="Email" value={patient.email} />
        <InfoRow label="Phone" value={patient.contact_number} />
        <InfoRow label="Address" value={patient.addressLine1 || "-"} />
        <InfoRow label="City" value={patient.city || "-"} />
        <InfoRow label="Country" value={patient.country || "-"} />
      </CardBody>
    </Card>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] text-slate-500">{label}</span>
    <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800">
      {value}
    </div>
  </div>
);

/* ----------------------------------
   Appointments Tab (Admin view)
----------------------------------- */

const AppointmentsTab: React.FC<{
  appointments: AdminAppointment[];
  loading: boolean;
}> = ({ appointments, loading }) => {
  const upcoming = appointments.filter((a) => a.category === "upcoming");
  const ongoing = appointments.filter((a) => a.category === "ongoing");
  const previous = appointments.filter((a) => a.category === "previous");

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Upcoming Appointments
        </h3>

        {loading ? (
          <LoadingText />
        ) : upcoming.length ? (
          <AppointmentList appointments={upcoming} />
        ) : (
          <EmptyText />
        )}
      </div>

      {/* Ongoing */}
      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Ongoing Appointments
        </h3>

        {loading ? (
          <LoadingText />
        ) : ongoing.length ? (
          <AppointmentList appointments={ongoing} />
        ) : (
          <EmptyText />
        )}
      </div>

      {/* Previous */}
      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Previous Appointments
        </h3>

        {loading ? (
          <LoadingText />
        ) : previous.length ? (
          <AppointmentList appointments={previous} />
        ) : (
          <EmptyText />
        )}
      </div>
    </div>
  );
};

const AppointmentList: React.FC<{
  appointments: AdminAppointment[];
}> = ({ appointments }) => (
  <div className="space-y-3">
    {appointments.map((a) => (
      <Card key={a.id}>
        <CardBody className="text-xs">
          <div className="font-large text-slate-900">Dr. {a.doctorName}</div>
          <div className="text-slate-600">{a.info}</div>
        </CardBody>
      </Card>
    ))}
  </div>
);

const LoadingText = () => (
  <p className="text-xs text-slate-500">Loading appointments...</p>
);

const EmptyText = () => (
  <p className="text-xs text-slate-500">No appointments in this section.</p>
);
