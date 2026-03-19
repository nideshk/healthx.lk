"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import { Patient, PatientDetailTab } from "@/types/Dashboard";
import { toast } from "react-toastify";
import { authFetch } from "@/lib/authFetch";
import Link from "next/link";
import Loader from "@/components/atom/Loader/Loader";

/* ----------------------------------
   Admin-only lean appointment type
----------------------------------- */
export interface AdminAppointment {
  id: string;
  date: string;
  time: string;
  info: string;
  doctorName: string;
  appointmentType: string;
  category: "upcoming" | "ongoing" | "previous" | "cancelled";
  patient_id?: string;
  patientName?: string;
  email?: string;
  contact_number?: string;
  room_key?: string;
}

interface PatientDetailViewProps {
  patient: Patient;
  appointments: AdminAppointment[];
  loadingAppointments?: boolean;
  onBack: () => void;
}

function calculateAge(dob: string): number {
  if (!dob) return 0;
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

const formatAllergies = (allergies: any): string => {
  if (!allergies) return "None";

  if (Array.isArray(allergies)) {
    return allergies.length > 0 ? allergies.join(", ") : "None";
  }

  return allergies;
};

// Helper to mask government ID numbers
const maskGovId = (num: string) => {
  if (!num) return "-";
  const visiblePart = num.slice(-4);
  return `***${visiblePart}`;
};

const PatientDetails: React.FC<PatientDetailViewProps> = ({
  patient,
  appointments,
  loadingAppointments = false,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<PatientDetailTab>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for all fields required by the API
  const [formData, setFormData] = useState({
    full_name: patient.full_name || "",
    dob: patient.dob || "",
    gender: patient.gender || "",
    allergies: Array.isArray(patient.allergies)
      ? patient.allergies.join(", ")
      : patient.allergies || "",
    email: patient.email || "",
    contact_number: patient.contact_number || "",
    address: (patient as any).address || patient.addressLine1 || "",
    city: patient.city || "",
    state: (patient as any).state || "",
    country: patient.country || "",
    emergency_contact: (patient as any).emergency_contact || "",
    govIdType: (patient as any).government_id?.type || "nic",
    govIdNumber: (patient as any).government_id?.number || "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Logic to split full_name into first and last name for the API
    const nameParts = formData.full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    try {
      const payload = {
        user_id: patient.id,
        target_role: "patient",
        patient: {
          first_name: firstName,
          last_name: lastName,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          dob: formData.dob,
          gender: formData.gender,
          contact_number: formData.contact_number,
          emergency_contact: formData.emergency_contact,
          address: formData.address,
          allergies: formData.allergies.split(",").map((s) => s.trim()).filter(Boolean),
          government_id: {
            type: formData.govIdType,
            number: formData.govIdNumber
          }
        },
      };

      const response = await authFetch("/api/update-user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast.success("Patient details updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error("Unable to update patient details");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Back and Edit Actions */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900"
        >
          <span>←</span>
          <span>Back to Patients</span>
        </button>

        {activeTab === "overview" && (
          <div className="flex gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-xs h-8"
              >
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="text-xs h-8"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  className="text-xs h-8"
                  loading={isSaving}
                >
                  Save Changes
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Patient Header */}
      <Card>
        <CardBody className="flex flex-col md:flex-row md:items-center md:justify-between bg-blue-50 rounded-xl">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-slate-900">
              {isEditing ? formData.full_name : patient.full_name}
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-slate-700">
              <DetailLine label="Patient ID" value={patient.id} />
              <DetailLine label="Date of Birth" value={isEditing ? formData.dob : patient.dob} />
              <DetailLine
                label="Age"
                value={`${calculateAge(isEditing ? formData.dob : patient.dob)} years`}
              />
              <DetailLine label="Gender" value={(isEditing ? formData.gender : patient.gender) || "N/A"} />
              <DetailLine 
                label="Gov ID" 
                value={isEditing ? `${formData.govIdType.toUpperCase()}: ${formData.govIdNumber}` : `${formData.govIdType.toUpperCase()}: ${maskGovId(formData.govIdNumber)}`} 
              />
              <DetailLine
                label="Allergies"
                value={isEditing ? formData.allergies : formatAllergies(patient.allergies)}
              />
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
      {activeTab === "overview" && (
        <PatientOverviewTab
          formData={formData}
          isEditing={isEditing}
          onChange={handleInputChange}
        />
      )}

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
        onClick={() => {
          setActiveTab(id);
          if (id !== "overview") setIsEditing(false);
        }}
        className={`flex-1 rounded-full px-3 py-2 flex items-center justify-center ${
          active
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

const PatientOverviewTab: React.FC<{
  formData: any;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
}> = ({ formData, isEditing, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card>
      <CardHeader>
        <div className="text-sm font-semibold text-slate-900">
          Patient Information
        </div>
      </CardHeader>
      <CardBody className="space-y-3 text-xs">
        <InfoRow
          label="Full Name"
          value={formData.full_name}
          isEditing={isEditing}
          onChange={(val) => onChange("full_name", val)}
        />
        <div className="grid grid-cols-2 gap-2">
          <InfoRow
            label="Date of Birth"
            value={formData.dob}
            isEditing={isEditing}
            type="date"
            onChange={(val) => onChange("dob", val)}
          />
          <InfoRow
            label="Gender"
            value={formData.gender}
            isEditing={isEditing}
            onChange={(val) => onChange("gender", val)}
          />
        </div>
       
        <div className="grid grid-cols-2 gap-2">
           <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500">Age</span>
            <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-100 text-slate-500 cursor-not-allowed">
              {calculateAge(formData.dob)} years
            </div>
          </div>
          <InfoRow
            label={`Gov ID (${formData.govIdType.toUpperCase()})`}
            value={isEditing ? formData.govIdNumber : maskGovId(formData.govIdNumber)}
            isEditing={isEditing}
            onChange={(val) => onChange("govIdNumber", val)}
          />
        </div>

        <InfoRow
          label="Allergies"
          value={formData.allergies}
          isEditing={isEditing}
          placeholder="e.g. Peanuts, Dust"
          onChange={(val) => onChange("allergies", val)}
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
        <InfoRow
          label="Email"
          value={formData.email}
          isEditing={isEditing}
          onChange={(val) => onChange("email", val)}
        />
        <div className="grid grid-cols-2 gap-2">
          <InfoRow
            label="Phone"
            value={formData.contact_number}
            isEditing={isEditing}
            onChange={(val) => onChange("contact_number", val)}
          />
          <InfoRow
            label="Emergency Contact"
            value={formData.emergency_contact}
            isEditing={isEditing}
            onChange={(val) => onChange("emergency_contact", val)}
          />
        </div>
        <InfoRow
          label="Address"
          value={formData.address}
          isEditing={isEditing}
          onChange={(val) => onChange("address", val)}
        />
        <div className="grid grid-cols-2 gap-2">
          <InfoRow
            label="City"
            value={formData.city}
            isEditing={isEditing}
            onChange={(val) => onChange("city", val)}
          />
          <InfoRow
            label="State"
            value={formData.state}
            isEditing={isEditing}
            onChange={(val) => onChange("state", val)}
          />
        </div>
        <InfoRow
          label="Country"
          value={formData.country}
          isEditing={isEditing}
          onChange={(val) => onChange("country", val)}
        />
      </CardBody>
    </Card>
  </div>
);

const InfoRow: React.FC<{
  label: string;
  value: string;
  isEditing?: boolean;
  type?: string;
  placeholder?: string;
  onChange?: (val: string) => void;
}> = ({ label, value, isEditing, type = "text", placeholder, onChange }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] text-slate-500">{label}</span>
    {isEditing ? (
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="border border-blue-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    ) : (
      <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800">
        {value || "-"}
      </div>
    )}
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
  const cancelled = appointments.filter((a) => a.category === "cancelled");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Upcoming Appointments
        </h3>
        {loading ? <LoadingText /> : upcoming.length ? <AppointmentList appointments={upcoming} /> : <EmptyText />}
      </div>
      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Ongoing Appointments
        </h3>
        {loading ? <LoadingText /> : ongoing.length ? <AppointmentList appointments={ongoing} /> : <EmptyText />}
      </div>
      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Previous Appointments
        </h3>
        {loading ? <LoadingText /> : previous.length ? <AppointmentList appointments={previous} /> : <EmptyText />}
      </div>
      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Cancelled Appointments
        </h3>

        {loading ? (
          <LoadingText />
        ) : cancelled.length ? (
          <AppointmentList appointments={cancelled} />
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
      <AppointmentRow key={a.id} appointment={a} />
    ))}
  </div>
);

const AppointmentRow: React.FC<{
  appointment: AdminAppointment;
}> = ({ appointment }) => {
  const isCancelled = appointment.category === "cancelled";
  const canManage =
    (appointment.category === "upcoming" || appointment.category === "ongoing") &&
    !isCancelled;
  const [open, setOpen] = useState(false);
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [consultationFetched, setConsultationFetched] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [consultationMeta, setConsultationMeta] = useState({
    telehealthConsent: false,
    termsAccepted: false,
    mainConcern: "",
    goal: "",
  });
  const [attachments, setAttachments] = useState<
    Array<{ id: string; file_name: string; view_url: string }>
  >([]);
  const [appointmentForm, setAppointmentForm] = useState({
    clinicianNotes: "",
    prescriptions: "",
    followUpNeeded: false,
    followUpDate: "",
    followUpTime: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleNotify = async (channels: Array<"email" | "sms">) => {
    setIsNotifying(true);

    try {
      const meetingUrl = `${window.location.origin}/appointment/meeting?room=${appointment.room_key}`;

      const htmlMessage = `
        <div style="font-family: Arial; line-height: 1.6;">
          <p>Hello ${appointment.patientName || "Patient"},</p>
          <p>Here are your appointment details:</p>
          <p>
            <strong>Appointment Type:</strong> ${appointment.appointmentType}<br/>
            <strong>Date:</strong> ${appointment.date}<br/>
            <strong>Time:</strong> ${appointment.time}
          </p>
          <p>
            Join using this link:<br/>
            <a href="${meetingUrl}">${meetingUrl}</a>
          </p>
          <p>Regards,<br/>Clinecxa Team</p>
        </div>
      `.trim();

      const textMessage = `
  Hello ${appointment.patientName || "Patient"},

  Appointment: ${appointment.date} at ${appointment.time}
  Join: ${meetingUrl}

  Regards,
  Clinecxa Team
      `.trim();

      const res = await authFetch("/api/notify-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: appointment.patient_id,
          role: "patient",
          eventType: "appointment_resend",
          title: "Your Appointment Details",
          message: channels.includes("email") ? htmlMessage : textMessage,
          channels,
          payload: {
            email: appointment.email,
            phone: appointment.contact_number,
            appointment_id: appointment.id,
            meeting_url: meetingUrl,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed");

      toast.success(`${channels.join(" & ").toUpperCase()} sent successfully`);
    } catch (err) {
      toast.error("Failed to send notification");
    } finally {
      setIsNotifying(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    setIsCancelling(true);

    try {
      const res = await authFetch(
        `/api/booking/appointment/${appointment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "cancel",
            reason: cancelReason,
          }),
        }
      );

      if (!res.ok) throw new Error("Cancel failed");

      toast.success("Appointment cancelled");

      setShowCancelModal(false);
      setCancelReason("");
    } catch (err) {
      toast.error("Unable to cancel appointment");
    } finally {
      setIsCancelling(false);
    }
  };
  const fetchConsultationDetails = async () => {
    if (consultationFetched) return;
    setConsultationLoading(true);
    try {
      const res = await authFetch(
        `/api/booking/appointment/${appointment.id}/consultation`,
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch consultation");
      }
      const data = await res.json();

      // Store metadata
      setConsultationMeta({
        telehealthConsent: !!data.consent?.telehealth,
        termsAccepted: !!data.consent?.terms,
        mainConcern: data.preconsult?.raw_payload?.note?.concern || "",
        goal: data.preconsult?.raw_payload?.note?.outcome || "",
      });

      // Store attachments
      setAttachments(data.attachments || []);

      // Store form data
      setAppointmentForm((prev) => ({
        ...prev,
        clinicianNotes: data.encounter?.clinician_notes || "",
        prescriptions: data.encounter?.prescriptions || "",
        followUpNeeded: !!data.encounter?.follow_up_needed,
        followUpDate: data.encounter?.follow_up_date?.slice(0, 10) || "",
        followUpTime: data.encounter?.follow_up_date?.includes("T")
          ? data.encounter.follow_up_date.split("T")[1].slice(0, 5)
          : "",
      }));

      setConsultationFetched(true);
    } catch (err) {
      console.error("Failed to load consultation", err);
      toast.error("Failed to load consultation details");
    } finally {
      setConsultationLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
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

      const res = await authFetch(
        `/api/booking/appointment/${appointment.id}/consultation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Consultation notes saved successfully");
    } catch (err) {
      console.error("Failed to save consultation", err);
      toast.error("Error saving consultation");
    } finally {
      setIsSaving(false);
    }
  };

  const updateAppointmentField = (key: string, value: string | boolean) => {
    setAppointmentForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardBody className="text-xs space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-md text-blue-600">
              Dr. {appointment.doctorName}
            </div>
            <div className="text-slate-600">
              {appointment.date} at {appointment.time}
            </div>
            <div className="text-slate-700 mt-1">{appointment.appointmentType}</div>
          </div>
          {/* <button
            type="button"
            onClick={() => {
              if (!open) fetchConsultationDetails();
              setOpen((o) => !o);
            }}
            className="text-xs border rounded-full px-2 py-1 hover:bg-slate-50"
          >
            {open ? "▴" : "▾"}
          </button> */}
          <div className="flex items-center gap-2">
            {/* Re-send Email */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNotify(["email"])}
              disabled={isNotifying || !canManage}
            >
              Re-send Email
            </Button>

            {/* Send SMS */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleNotify(["sms"])}
              disabled={isNotifying || !canManage}
            >
              Send SMS
            </Button>

            {/* Cancel */}
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              disabled={!canManage || isCancelled }
            >
              Cancel
            </Button>

            {/* Existing Toggle */}
            <button
              type="button"
              onClick={() => {
                if (!open) fetchConsultationDetails();
                setOpen((o) => !o);
              }}
              className="text-xs border rounded-full px-2 py-1 hover:bg-slate-50"
            >
              {open ? "▴" : "▾"}
            </button>
          </div>
        </div>

        {open && (
          <div className="pt-3 border-t border-slate-200 space-y-4">
            {consultationLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader size="sm" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">
                    Consultation Details
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {consultationMeta.telehealthConsent
                        ? "✓ Accepted"
                        : "Not accepted"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-500">
                      Terms & Conditions
                    </div>
                    <div className="text-slate-700">
                      {consultationMeta.termsAccepted
                        ? "✓ Accepted"
                        : "Not accepted"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardBody>
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl relative">

            <div className="text-sm font-semibold mb-3 text-slate-900">
              Cancel Appointment
            </div>

            <div className="text-xs text-slate-600 mb-2">
              Please provide a reason for cancellation:
            </div>

            <textarea
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none"
              rows={4}
              placeholder="Enter cancellation reason..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              disabled={isCancelling}
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                disabled={isCancelling}
              >
                Back
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

const LoadingText = () => (
  <p className="text-xs text-slate-500">Loading appointments...</p>
);

const EmptyText = () => (
  <p className="text-xs text-slate-500">No appointments in this section.</p>
);

const ConsultationInfoRow: React.FC<{ label: string; value: string }> = ({
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