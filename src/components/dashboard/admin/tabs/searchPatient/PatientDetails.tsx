// src/components/dashboard/practitioner/PatientDetailView.tsx
"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";
import {
  Patient,
  PatientDetailTab,
  Appointment,
} from "@/types/Dashboard";

interface PatientDetailViewProps {
  patient: Patient;
  appointments: Appointment[];
  onBack: () => void;
}

const PatientDetails: React.FC<PatientDetailViewProps> = ({
  patient,
  appointments,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<PatientDetailTab>("overview");

  return (
    <div className="space-y-4">
      {/* 1. Back to Dashboard/Patients */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900"
      >
        <span>←</span>
        <span>Back to Patients</span>
      </button>

      {/* 2. Patient header bar */}
      <Card>
        <CardBody className="flex flex-col md:flex-row md:items-center md:justify-between bg-blue-50 rounded-xl">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-slate-900">
              {patient.name}
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-slate-700">
              <DetailLine label="Patient ID" value={patient.patientId} />
              <DetailLine label="Date of Birth" value={patient.dob} />
              <DetailLine label="Age" value={`${patient.age} years`} />
              <DetailLine label="Gender" value={patient.gender} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 3. Tabs */}
      <div className="flex gap-2 text-xs bg-slate-50 rounded-full p-1 border border-slate-200">
        {renderTab("overview", "Overview", activeTab, setActiveTab)}
        {renderTab("appointments", "Appointments", activeTab, setActiveTab)}
        {/* {renderTab("settings", "Settings", activeTab, setActiveTab)} */}
        {renderTab("audit", "Audit Log", activeTab, setActiveTab)}
      </div>

      {/* 4. Tab content */}
      {activeTab === "overview" && <PatientOverviewTab patient={patient} />}
      {activeTab === "appointments" && (
        <AppointmentsTab appointments={appointments} patient={patient} />
      )}
      {/* {activeTab === "settings" && <PatientSettingsTab />} */}
      {activeTab === "audit" && <AuditLogTab />}
    </div>
  );
};

export default PatientDetails;

/* ---------- Helpers ---------- */

const renderTab = (
  id: PatientDetailTab,
  label: string,
  activeTab: PatientDetailTab,
  setActiveTab: (t: PatientDetailTab) => void
) => {
  const active = id === activeTab;
  return (
    <button
      key={id}
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex-1 rounded-full px-3 py-2 flex items-center justify-center gap-2 ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
};

const DetailLine: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <span className="font-semibold">{label}: </span>
    <span>{value}</span>
  </div>
);

/* ---------- Overview tab ---------- */

const PatientOverviewTab: React.FC<{ patient: Patient }> = ({ patient }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Patient Information */}
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">
          Patient Information
        </div>
      </CardHeader>
      <CardBody className="space-y-3 text-xs">
        <InfoRow label="Full Name" value={patient.name} />
        <InfoRow label="Date of Birth" value={patient.dob} />
        <InfoRow label="Gender" value={patient.gender} />
        <InfoRow label="Age" value={`${patient.age} years`} />
      </CardBody>
    </Card>

    {/* Contact Information */}
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">
          Contact Information
        </div>
      </CardHeader>
      <CardBody className="space-y-3 text-xs">
        <InfoRow label="Email" value={patient.email} />
        <InfoRow label="Phone" value={patient.phone} />
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
    <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 whitespace-pre-wrap">
      {value}
    </div>
  </div>
);

/* ---------- Appointments tab ---------- */

const AppointmentsTab: React.FC<{
  appointments: Appointment[];
  patient: Patient;
}> = ({ appointments, patient }) => {
  const upcoming = appointments.filter((a) => a.category === "upcoming");
  const previous = appointments.filter((a) => a.category === "previous");

    const [showCreateModal, setShowCreateModal] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Header row with title + create button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Upcoming Appointments
        </h3>
        <Button variant="primary" size="sm" className="text-xs px-4" onClick={() => setShowCreateModal(true)}>
          + Create New Appointment
        </Button>
      </div>

      <AppointmentSection appointments={upcoming} patient={patient} />

      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">
          Previous Appointments
        </h3>
      </div>

      <AppointmentSection appointments={previous} patient={patient} />
    
      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        patient={patient}
      />
    </div>
  );
};

const AppointmentSection: React.FC<{
  appointments: Appointment[];
  patient: Patient;
}> = ({ appointments, patient }) => {
  if (!appointments.length) {
    return (
      <p className="text-xs text-slate-500">
        No appointments in this section.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appt) => (
        <AppointmentRow
          key={appt.id}
          appointment={appt}
          patient={patient}
        />
      ))}
    </div>
  );
};

const AppointmentRow: React.FC<{
  appointment: Appointment;
  patient: Patient;
}> = ({ appointment, patient }) => {
  const [open, setOpen] = React.useState(false);
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [isEditingEmail, setIsEditingEmail] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  
  const [showSmsModal, setShowSmsModal] = React.useState(false);
const [smsNumber, setSmsNumber] = React.useState(patient.phone);
const [smsMessage, setSmsMessage] = React.useState(
  `Hi  ${patient.name}, this is a reminder about your appointment on ${appointment.date} at ${appointment.time} with ${appointment.doctorName}. Thank you!`
);

const [showSmsToast, setShowSmsToast] = React.useState(false);

  const defaultSubject = `Appointment Reminder - ${appointment.date} at ${appointment.time} with ${appointment.doctorName}`;
  const defaultBody = `Dear ${patient.name},

Thank you for making an appointment with us.

Your appointment details:

Date: ${appointment.date}
Time: ${appointment.time}
Clinician: ${appointment.doctorName}
Reason: ${appointment.reason}

Appointment Link: https://yourapp.com/appointment/${appointment.id}`;

  const [emailTo, setEmailTo] = React.useState(patient.email);
const [emailSubject, setEmailSubject] = React.useState(defaultSubject);
const [emailBody, setEmailBody] = React.useState(defaultBody);

  const statusClasses =
    appointment.status === "confirmed"
      ? "bg-blue-50 text-blue-700"
      : appointment.status === "completed"
      ? "bg-green-50 text-green-700"
      : "bg-slate-100 text-slate-500";

  const statusLabel =
    appointment.status === "confirmed"
      ? "Confirmed"
      : appointment.status === "completed"
      ? "Completed"
      : "Cancelled";

  const handleSendEmail = () => {
    // TODO: call API here later
    console.log("Send appointment email", {
      to: emailTo,
      subject: emailSubject,
      body: emailBody,
    });

    setShowEmailModal(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <>
      <Card>
        <CardBody className="space-y-3">
          {/* row header */}
          <div className="flex items-center justify-between gap-4">
            {/* left: main info */}
            <div className="text-xs">
              <div className="font-medium text-slate-900">
                {appointment.date} at {appointment.time}
              </div>
              <div className="text-slate-600">{appointment.doctorName}</div>
              <div className="text-slate-400">{appointment.reason}</div>
            </div>

            {/* right: actions */}
            <div className="flex items-center gap-2">
             
             
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${statusClasses}`}
              >
                {statusLabel}
              </span>
              
            </div>
          </div>

          {/* expanded appointment details */}
          {open && (
            <div className="pt-3 border-t border-slate-200 space-y-4 text-xs">
              {/* Top row title + Edit (for questionnaire, not email) */}
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">
                  Appointment Details
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs px-3"
                  onClick={() =>
                    console.log("Edit questionnaire for", appointment.id)
                  }
                >
                  Edit
                </Button>
              </div>

              {/* Appointment Type + Terms & Conditions + Telehealth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-500">
                    Appointment Type
                  </div>
                  <div className="text-slate-700">
                    {appointment.appointmentType || "-"}
                  </div>

                  <div className="text-[11px] text-slate-500 pt-3">
                    Telehealth Consent
                  </div>
                  <div className="text-slate-700">
                    {appointment.telehealthConsent
                      ? "✓ Accepted"
                      : "Not accepted"}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] text-slate-500">
                    Terms &amp; Conditions
                  </div>
                  <div className="text-slate-700">
                    {appointment.termsAccepted ? "✓ Accepted" : "Not accepted"}
                  </div>
                </div>
              </div>

              {/* Main concern & goal */}
              <InfoRow
                label="What is your main concern today?"
                value={appointment.mainConcern || "-"}
              />

              <InfoRow
                label="What are you hoping to achieve from this consultation?"
                value={appointment.goal || "-"}
              />

              {/* Duration */}
              <InfoRow
                label="How long have you had this concern?"
                value={appointment.durationOfConcern || "-"}
              />

              {/* Documents Uploaded */}
              <div className="space-y-1">
                <div className="text-[11px] text-slate-500">
                  Documents Uploaded
                </div>
                {appointment.documents?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {appointment.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url || "#"}
                        target={doc.url ? "_blank" : undefined}
                        rel={doc.url ? "noreferrer" : undefined}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                      >
                        <span>📄</span>
                        <span>{doc.name}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    No documents uploaded.
                  </div>
                )}
              </div>

              {/* Clinician Notes */}
              <InfoRow
                label="Clinician Notes"
                value={appointment.clinicianNotes || "-"}
              />

              {/* Prescriptions Provided */}
              <InfoRow
                label="Prescriptions Provided"
                value={appointment.prescriptions || "-"}
              />

              {/* Follow-up row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-2">
                  <span className="inline-flex h-3 w-3 rounded-full border-4 border-blue-500 bg-white" />
                  <span>
                    Follow-up appointment{" "}
                    {appointment.followUpNeeded ? "needed" : "not needed"}
                  </span>
                </div>

                <InfoRow
                  label="Follow-up Date"
                  value={appointment.followUpDate || "-"}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Email modal for "Re-send appointment details" */}
      {/* {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="text-sm font-semibold text-slate-900">
                Send Appointment Details
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 text-xs">
              <div className="space-y-1">
                <div className="text-[11px] text-slate-500">To</div>
                 <Input
    value={emailTo}
    disabled={!isEditingEmail}
    onChange={(e) => setEmailTo(e.target.value)}
  />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-slate-500">Subject</div>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-slate-500">Email Content</div>
                <textarea
                  className="w-full min-h-[200px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  readOnly={!isEditingEmail}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setIsEditingEmail((v) => !v)}
              >
                {isEditingEmail ? "Stop Editing" : "Edit"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="text-xs"
                onClick={handleSendEmail}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )} */}

      {/* Toast notification */}
      {/* {showToast && (
        <div className="fixed bottom-4 right-4 z-[60] rounded-lg bg-slate-900 px-4 py-2 text-xs text-white shadow-lg">
          Appointment details email sent to {emailTo}
        </div>
      )} */}

        {/* SMS modal for "SMS patient" */}
        {/* REMOVED FOR ADMIN */}

        {/* SMS Toast notification  REMOVED*/}
       

    </>
  );
};

/* ---------- Other tabs ---------- */

/* ---------- Create Appointment modal ---------- */

interface CreateAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  patient: Patient;
}

const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  open,
  onClose,
  patient,
}) => {
  if (!open) return null;

  // Hardcoded options for now – you can extend these later or load from API
  const serviceOptions = [
    "General Consultation",
    "Annual Checkup",
    "Follow-up Visit",
    "Cardiology Review",
    "Telehealth Video Consult",
  ];

  const attendeesOptions = ["1 attendee", "2 attendees", "Family (3+)", "Group"];

  const appointmentTypes = [
    "10 minute short appointment",
    "20 minute standard appointment",
    "30 minute extended appointment",
  ];

  const timeSlots = [
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
  ];

  const [service, setService] = React.useState<string>("");
  const [attendees, setAttendees] = React.useState<string>("");
  const [apptType, setApptType] = React.useState<string>("");
  const [doctorQuery, setDoctorQuery] = React.useState<string>("");
  const [date, setDate] = React.useState<string>("");
  const [timeSlot, setTimeSlot] = React.useState<string>("");

  const handleSendDetails = () => {
    // TODO: integrate with backend
    console.log("Create appointment for", patient.name, {
      service,
      attendees,
      apptType,
      doctorQuery,
      date,
      timeSlot,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="text-sm font-semibold text-slate-900">
            Create New Appointment
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 text-xs">
          {/* Healthcare Service */}
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500">
              Healthcare Service <span className="text-red-500">*</span>
            </div>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="">Select a service</option>
              {serviceOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Number of Attendees */}
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500">
              Number of Attendees <span className="text-red-500">*</span>
            </div>
            <select
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="">Select attendees</option>
              {attendeesOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Appointment Type */}
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500">
              Appointment Type <span className="text-red-500">*</span>
            </div>
            <select
              value={apptType}
              onChange={(e) => setApptType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="">Select appointment type</option>
              {appointmentTypes.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Select Doctor */}
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500">
              Select Doctor <span className="text-red-500">*</span>
            </div>
            <Input
              placeholder="Search by name or specialty..."
              value={doctorQuery}
              onChange={(e) => setDoctorQuery(e.target.value)}
            />
          </div>

          {/* Select Date */}
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500">
              Select Date <span className="text-red-500">*</span>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          {/* Select Time Slot */}
          <div className="space-y-2">
            <div className="text-[11px] text-slate-500">
              Select Time Slot <span className="text-red-500">*</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {timeSlots.map((slot) => {
                const active = timeSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTimeSlot(slot)}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="text-xs"
            onClick={handleSendDetails}
          >
            Send Details to Patient
          </Button>
        </div>
      </div>
    </div>
  );
};


interface AuditEntry {
  id: string;
  occurred_at: string;
  actor_type: "admin" | "patient" | "system";
  action: string;
  entity_type: string;
  source: string;
  ip_address: string | null;
  metadata: Record<string, any>;
}

const formatAction = (action: string, entity: string) => {
  switch (action) {
    case "VIEWED":
      return `Viewed ${entity}`;
    case "LOGIN":
      return "Logged in";
    case "FAILED_ACCESS":
      return `Unauthorized access attempt on ${entity}`;
    default:
      return `${action} ${entity}`;
  }
};

const formatActor = (actor: string) => {
  if (actor === "admin") return "Admin";
  if (actor === "patient") return "Patient";
  return "System";
};

const formatLocation = (ip?: string | null) => {
  if (!ip) return "Unknown location";
  if (ip === "::1" || ip === "127.0.0.1") return "Localhost";
  return `IP ${ip}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString();



const AuditLogTab: React.FC = () => {
  const auditLogs: AuditEntry[] = [
    {
      id: "1",
      occurred_at: "2025-12-18T14:02:32.899Z",
      actor_type: "admin",
      action: "VIEWED",
      entity_type: "appointment",
      source: "api",
      ip_address: "::1",
      metadata: {
        scope: "all_appointments",
        perPage: 50,
      },
    },
    {
      id: "2",
      occurred_at: "2025-12-18T13:53:50.209Z",
      actor_type: "patient",
      action: "FAILED_ACCESS",
      entity_type: "appointment",
      source: "api",
      ip_address: null,
      metadata: {
        reason: "non-admin attempted to read all appointments",
      },
    },
    {
      id: "3",
      occurred_at: "2025-12-17T04:08:57.498Z",
      actor_type: "system",
      action: "LOGIN",
      entity_type: "auth",
      source: "api",
      ip_address: null,
      metadata: {},
    },
  ];

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* TABLE WRAPPER */}
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-sm">
          {/* HEADER */}
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">
                User ID
              </th>
              <th className="px-4 py-3 text-left font-medium">Date & Time</th>
              
              <th className="px-4 py-3 text-left font-medium">
                Changes / Updates Made
              </th>
              <th className="px-4 py-3 text-left font-medium">
                Who Changed / Updated
              </th>
              <th className="px-4 py-3 text-left font-medium">IP Address</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-slate-100">
            {auditLogs.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {/* DATE */}
                

                {/* PATIENT */}
                <td className="px-4 py-4">
                  
                  <div className="text-xs text-blue-600">
                    ({row.id})
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {formatDate(row.occurred_at)}
                </td>

                {/* VIEWED */}
                <td className="px-4 py-4 text-slate-700">
                  {row.action}
                </td>

                {/* CHANGES */}
               

                {/* ACTOR */}
                <td className="px-4 py-4 text-slate-700">
                  {row.actor_type}
                </td>

                {/* IP */}
                <td className="px-4 py-4 text-slate-700 whitespace-nowrap">
                  {row.ip_address}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


