"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import { Patient, PatientDetailTab } from "@/types/Dashboard";
import { toast } from "react-toastify";
import { authFetch } from "@/lib/authFetch";

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
  category: "upcoming" | "ongoing" | "previous";
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

const PatientDetails: React.FC<PatientDetailViewProps> = ({
  patient,
  appointments,
  loadingAppointments = false,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<PatientDetailTab>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for form fields
  const [formData, setFormData] = useState({
    full_name: patient.full_name || "",
    dob: patient.dob || "",
    gender: patient.gender || "",
    allergies: Array.isArray(patient.allergies)
      ? patient.allergies.join(", ")
      : patient.allergies || "",
    email: patient.email || "",
    contact_number: patient.contact_number || "",
    addressLine1: patient.addressLine1 || "",
    city: patient.city || "",
    country: patient.country || "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        user_id: patient.id, // Using patient.id as supabase_id per instructions
        target_role: "patient",
        patient: {
          first_name: formData.full_name, // Mapping full_name to first_name as requested
          last_name: "", 
          city: formData.city,
          country: formData.country,
          dob: formData.dob,
          gender: formData.gender,
          contact_number: formData.contact_number,
          address: formData.addressLine1,
          allergies: formData.allergies.split(",").map((s) => s.trim()).filter(Boolean),
        },
      };

      const response = await authFetch("http://localhost:3000/api/update-user", {
        method: "POST",
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
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500">Age</span>
          <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-100 text-slate-500 cursor-not-allowed">
            {calculateAge(formData.dob)} years (Auto-calculated)
          </div>
        </div>
        <InfoRow
          label="Allergies"
          value={formData.allergies}
          isEditing={isEditing}
          placeholder=" Dust, Peanuts"
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
        <InfoRow
          label="Phone"
          value={formData.contact_number}
          isEditing={isEditing}
          onChange={(val) => onChange("contact_number", val)}
        />
        <InfoRow
          label="Address"
          value={formData.addressLine1}
          isEditing={isEditing}
          onChange={(val) => onChange("addressLine1", val)}
        />
        <InfoRow
          label="City"
          value={formData.city}
          isEditing={isEditing}
          onChange={(val) => onChange("city", val)}
        />
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
          <div className="font-bold text-md text-slate-900">
            Dr. {a.doctorName}
          </div>
          <div className="text-slate-600">
            {a.date} at {a.time}
          </div>
          <div className="text-slate-700 mt-1">{a.appointmentType}</div>
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