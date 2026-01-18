// src/components/dashboard/practitioner/PatientDetailView.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";
import Loader from "@/components/atom/Loader/Loader";
import { Patient, PatientDetailTab, Appointment } from "@/types/Dashboard";
import { authFetch } from "@/lib/authFetch";
import Link from "next/link";
import { toast } from "react-toastify";

interface PatientDetailViewProps {
  patient: Patient;
  appointments: Appointment[];
  onBack: () => void;
}

const PatientDetailView: React.FC<PatientDetailViewProps> = ({
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
              {patient.allergies && (
                <DetailLine label="Allergies" value={patient.allergies} />
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 3. Tabs */}
      <div className="flex gap-2 text-xs bg-slate-50 rounded-full p-1 border border-slate-200">
        {renderTab("overview", "Overview", activeTab, setActiveTab)}
        {renderTab("appointments", "Appointments", activeTab, setActiveTab)}
      </div>

      {/* 4. Tab content */}
      {activeTab === "overview" && <PatientOverviewTab patient={patient} />}
      {activeTab === "appointments" && (
        <AppointmentsTab appointments={appointments} patient={patient} />
      )}
    </div>
  );
};

export default PatientDetailView;

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
const PatientOverviewTab: React.FC<{ patient: Patient }> = ({ patient }) => {
  const [isEditing] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: patient.name,
    dob: patient.dob,
    gender: patient.gender,
    age: patient.age.toString(),
    allergies: patient.allergies || "",
    email: patient.email,
    phone: patient.phone,
    address: patient.addressLine1 || "",
    city: patient.city || "",
    country: patient.country || "",
  });

  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">
            Patient Information
          </div>
        </CardHeader>
        <CardBody className="space-y-3 text-xs">
          <EditableField
            label="Full Name"
            value={formData.name}
            isEditing={isEditing}
            onChange={(v) => handleChange("name", v)}
          />
          <EditableField
            label="Date of Birth"
            value={formData.dob}
            isEditing={isEditing}
            onChange={(v) => handleChange("dob", v)}
          />
          <EditableField
            label="Gender"
            value={formData.gender}
            isEditing={isEditing}
            onChange={(v) => handleChange("gender", v)}
          />
          <EditableField
            label="Age"
            value={formData.age}
            isEditing={isEditing}
            onChange={(v) => handleChange("age", v)}
          />
          <EditableField
            label="Allergies"
            value={formData.allergies}
            isEditing={isEditing}
            onChange={(v) => handleChange("allergies", v)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-sm font-semibold text-slate-900">
            Contact Information
          </div>
        </CardHeader>
        <CardBody className="space-y-3 text-xs">
          <EditableField
            label="Email"
            value={formData.email}
            isEditing={isEditing}
            onChange={(v) => handleChange("email", v)}
          />
          <EditableField
            label="Phone"
            value={formData.phone}
            isEditing={isEditing}
            onChange={(v) => handleChange("phone", v)}
          />
          <EditableField
            label="Address"
            value={formData.address}
            isEditing={isEditing}
            onChange={(v) => handleChange("address", v)}
          />
          <EditableField
            label="City"
            value={formData.city}
            isEditing={isEditing}
            onChange={(v) => handleChange("city", v)}
          />
          <EditableField
            label="Country"
            value={formData.country}
            isEditing={isEditing}
            onChange={(v) => handleChange("country", v)}
          />
        </CardBody>
      </Card>
    </div>
  );
};

const EditableField: React.FC<{
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (v: string) => void;
}> = ({ label, value, isEditing, onChange }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] text-slate-500">{label}</span>
    {isEditing ? (
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800">
        {value || "-"}
      </div>
    )}
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
  const ongoing = appointments.filter((a) => a.category === "ongoing");
  const previous = appointments.filter((a) => a.category === "previous");
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Upcoming Appointments
        </h3>
      </div>

      <AppointmentSection appointments={upcoming} patient={patient} />

      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">
          Ongoing Appointments
        </h3>
      </div>

      <AppointmentSection appointments={ongoing} patient={patient} />

      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">
          Previous Appointments
        </h3>
      </div>

      <AppointmentSection appointments={previous} patient={patient} />

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
      <p className="text-xs text-slate-500">No appointments in this section.</p>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appt) => (
        <AppointmentRow key={appt.id} appointment={appt} patient={patient} />
      ))}
    </div>
  );
};

const AppointmentRow: React.FC<{
  appointment: Appointment;
  patient: Patient;
}> = ({ appointment, patient }) => {
  const [open, setOpen] = React.useState(false);
  const [isEditingAppointment, setIsEditingAppointment] = React.useState(false);
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [consultationFetched, setConsultationFetched] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [, forceUpdate] = useState(0);

  const [appointmentForm, setAppointmentForm] = React.useState({
    clinicianNotes: appointment.clinicianNotes || "",
    followUpDate: appointment.followUpDate || "",
    followUpTime: "",
    prescriptions: appointment.prescriptions || "",
    followUpNeeded: appointment.followUpNeeded || false,
  });

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  const updateAppointmentField = (
    key: keyof typeof appointmentForm,
    value: string | boolean
  ) => {
    setAppointmentForm((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * DRY Notification logic using the /api/notify-send endpoint
   * Includes formatting for line separation and a clickable link for email
   */
  /**
   * Refactored handleNotify logic with enhanced HTML email template
   * featuring line separation and a styled action button.
   */
  const handleNotify = async (channels: Array<"email" | "sms" | "in_app">) => {
    setIsNotifying(true);
    try {
      const meetingUrl = `${baseUrl}/appointment/meeting?room=${appointment.room_key}`;

      // Constructing the styled HTML template
      const htmlMessage = `
        <div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6; max-width: 600px;">
          <p ${patient.name},</p>
          
          <p>Here are your appointment details:</p>
          
          <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #2563eb; background-color: #f8fafc;">
            <strong>Appointment Type:</strong> ${appointment.appointmentType || appointment.reason || "Standard Consultation"}<br />
            <strong>Date:</strong> ${appointment.date}<br />
            <strong>Time:</strong> ${appointment.time}
          </div>

          <p>Click the button below to join the meeting:</p>
          
          <div style="margin: 25px 0;">
            <a href="${meetingUrl}" 
               style="background-color: #2563eb; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
               Join Meeting
            </a>
          </div>

          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            Regards,<br />
            <strong>Clinico Team</strong>
          </p>
        </div>
      `.trim();

      // Plain text fallback for SMS/In-app
      const textMessage = `Hello ${patient.name},\n\nAppointment: ${appointment.date} at ${appointment.time}\nJoin here: ${meetingUrl}\n\nRegards, Clinico Team`;

      const res = await authFetch("/api/notify-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: patient.id,
          role: "patient",
          eventType: "appointment_resend",
          title: "Your Appointment Details",
          message: channels.includes("email") ? htmlMessage : textMessage,
          channels: channels,
          payload: {
            email: patient.email,
            phone: patient.phone,
            appointment_id: appointment.id,
            meeting_url: meetingUrl,
          },
        }),
      });

      if (res.ok) {
        toast.success(
          `${channels.join(" & ").toUpperCase()} sent successfully!`
        );
      } else {
        throw new Error("Failed to send");
      }
    } catch (err) {
      console.error("Notification error:", err);
      toast.error("Failed to send notification.");
    } finally {
      setIsNotifying(false);
    }
  };

  const handleSave = async () => {
    try {
      let formattedFollowUp = null;
      if (appointmentForm.followUpNeeded && appointmentForm.followUpDate) {
        const time = appointmentForm.followUpTime || "00:00";
        formattedFollowUp = `${appointmentForm.followUpDate}T${time}:00+00:00`;
      }

      const payload = {
        clinician_notes: appointmentForm.clinicianNotes,
        prescriptions: appointmentForm.prescriptions,
        follow_up_needed: appointmentForm.followUpNeeded,
        follow_up_date: formattedFollowUp,
      };

      await authFetch(
        `/api/booking/appointment/${appointment.id}/consultation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      appointment.clinicianNotes = payload.clinician_notes;
      appointment.prescriptions = payload.prescriptions;
      appointment.followUpNeeded = payload.follow_up_needed;
      appointment.followUpDate = payload.follow_up_date || "";

      setIsEditingAppointment(false);
      toast.success("Consultation notes saved.");
    } catch (err) {
      console.error("Failed to save consultation", err);
      toast.error("Error saving consultation.");
    }
  };

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

  const fetchConsultationDetails = async () => {
    if (consultationFetched) return;
    setConsultationLoading(true);
    try {
      const res = await authFetch(
        `/api/booking/appointment/${appointment.id}/consultation`
      );
      if (!res.ok) return;
      const data = await res.json();

      appointment.telehealthConsent = !!data.consent?.telehealth;
      appointment.termsAccepted = !!data.consent?.terms;
      appointment.mainConcern =
        data.preconsult?.raw_payload?.note?.concern || "";
      appointment.goal = data.preconsult?.raw_payload?.note?.outcome || "";
      appointment.clinicianNotes = data.encounter?.clinician_notes || "";
      appointment.prescriptions = data.encounter?.prescriptions || "";
      appointment.followUpNeeded = !!data.encounter?.follow_up_needed;

      const rawDate = data.encounter?.follow_up_date;
      if (rawDate) {
        appointment.followUpDate = rawDate.slice(0, 10);
        if (rawDate.includes("T")) {
          setAppointmentForm((prev) => ({
            ...prev,
            followUpTime: rawDate.split("T")[1].slice(0, 5),
          }));
        }
      }

      setConsultationFetched(true);
      setAppointmentForm((prev) => ({
        ...prev,
        clinicianNotes: data.encounter?.clinician_notes || "",
        prescriptions: data.encounter?.prescriptions || "",
        followUpNeeded: !!data.encounter?.follow_up_needed,
        followUpDate: data.encounter?.follow_up_date?.slice(0, 10) || "",
      }));

      forceUpdate((v) => v + 1);
    } catch (err) {
      console.error("Failed to load consultation", err);
    } finally {
      setConsultationLoading(false);
    }
  };

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs">
            <div className="font-medium text-slate-900">
              {appointment.date} at {appointment.time}
            </div>
            <div className="text-slate-400">{appointment.reason}</div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleNotify(["email"])}
              disabled={isNotifying}
            >
              Re-send appointment details
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleNotify(["sms"])}
              disabled={isNotifying}
            >
              SMS patient
            </Button>

            <Link href={`/appointment/meeting?room=${appointment.room_key}`}>
              <Button variant="primary" size="sm" className="text-xs">
                Join meeting
              </Button>
            </Link>

            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${statusClasses}`}
            >
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                if (!open) fetchConsultationDetails();
                setOpen((o) => !o);
              }}
              className="text-xs border rounded-full px-2 py-1"
            >
              {open ? "▴" : "▾"}
            </button>
          </div>
        </div>

        {open && (
          <div className="pt-3 border-t border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              {consultationLoading && <Loader size="sm" />}
              <div className="font-semibold text-slate-900">
                Appointment Details
              </div>
              {!isEditingAppointment ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs px-3"
                  onClick={() => setIsEditingAppointment(true)}
                >
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingAppointment(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSave}>
                    Save
                  </Button>
                </div>
              )}
            </div>

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

            <InfoRow
              label="What is your main concern today?"
              value={appointment.mainConcern || "-"}
            />
            <InfoRow
              label="What are you hoping to achieve from this consultation?"
              value={appointment.goal || "-"}
            />

            {isEditingAppointment ? (
              <div className="space-y-1">
                <div className="text-[11px] text-slate-500">
                  Clinician Notes
                </div>
                <textarea
                  value={appointmentForm.clinicianNotes}
                  onChange={(e) =>
                    updateAppointmentField("clinicianNotes", e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
            ) : (
              <InfoRow
                label="Clinician Notes"
                value={appointment.clinicianNotes || "-"}
              />
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                {isEditingAppointment ? (
                  <input
                    type="checkbox"
                    checked={appointmentForm.followUpNeeded}
                    onChange={(e) =>
                      updateAppointmentField("followUpNeeded", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                ) : (
                  <span
                    className={`inline-flex h-3 w-3 rounded-full border-4 ${
                      appointment.followUpNeeded
                        ? "border-blue-500"
                        : "border-slate-300"
                    } bg-white`}
                  />
                )}
                <span>Follow-up appointment needed</span>
              </div>

              {appointmentForm.followUpNeeded && isEditingAppointment && (
                <div className="flex flex-wrap gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Follow-up Date
                    </span>
                    <input
                      type="date"
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      value={appointmentForm.followUpDate}
                      onChange={(e) =>
                        updateAppointmentField("followUpDate", e.target.value)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Follow-up Time
                    </span>
                    <input
                      type="time"
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      value={appointmentForm.followUpTime}
                      onChange={(e) =>
                        updateAppointmentField("followUpTime", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {!isEditingAppointment &&
                appointment.followUpNeeded &&
                appointment.followUpDate && (
                  <div className="text-[11px] text-blue-600 font-medium">
                    Scheduled for: {appointment.followUpDate}
                  </div>
                )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg p-6">
        <div className="text-sm font-semibold mb-4 text-slate-900">
          Create Appointment for {patient.name}
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Appointment creation logic goes here.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};
