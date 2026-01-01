"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { ArrowLeft } from "lucide-react"; // Optional: for a back icon

/* -------------------------------------------------------------------------- */
/* PROPS INTERFACE                             */
/* -------------------------------------------------------------------------- */

interface AddClinicianFormProps {
  onBack: () => void;
}

/* -------------------------------------------------------------------------- */
/* CONFIG DATA                                 */
/* -------------------------------------------------------------------------- */

const SPECIALTIES = [
  "General Physician",
  "Psychiatrist",
  "Cardiologist",
  "Dermatologist",
  "Pediatrician",
];

const AVAILABLE_SERVICES = [
  "general consultation",
  "chronic care",
  "preventive care",
  "urgent care",
  "mental health",
  "cardiology",
  "ophthalmology",
  "ent",
  "dermatology",
  "family planning",
];

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

// Updated to accept props
const AddClinicianForm: React.FC<AddClinicianFormProps> = ({ onBack }) => {
  const [form, setForm] = useState({
    fullName: "",
    specialty: "",
    registrationNumber: "",
    qualifications: "",
    intro: "",
    email: "",
    phone: "",
    experience: "",
    languages: "",
    pricing: {
      quick: "",
      standard: "",
      extended: "",
    },
    services: [] as string[],
    bank: {
      bankName: "",
      accountName: "",
      branch: "",
      accountNumber: "",
    },
  });

  /* ---------------------------- FIELD HANDLERS ---------------------------- */

  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateNestedField = (
    section: string,
    key: string,
    value: any
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [key]: value,
      },
    }));
  };

  const toggleService = (service: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  /* ---------------------------- SUBMIT HANDLER ---------------------------- */

  const handleSubmit = () => {
    console.log("Add clinician payload:", form);
    alert("Clinician added (mock)");
    onBack(); // Go back to list after success
  };

  return (
    <div className="space-y-4">
      {/* Back Button added for UI consistency */}
      <Button  size="sm" onClick={onBack} className="flex items-center gap-2">
        <ArrowLeft size={16} /> Back to Applications
      </Button>

      <Card>
        <CardHeader>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Add New Clinician
            </div>
            <div className="text-xs text-slate-500">
              Enter clinician details to add them to the system
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-8">
          {/* ---------------- BASIC INFORMATION ---------------- */}
          <Section title="Basic Information">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
              />

              <div>
                <label className="text-xs text-slate-600 mb-1 block">
                  Specialty
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  value={form.specialty}
                  onChange={(e) => updateField("specialty", e.target.value)}
                >
                  <option value="">Select specialty</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          {/* ... [Rest of your sections remain the same] ... */}

          <Section title="Bank Details">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                value={form.bank.bankName}
                onChange={(e) => updateNestedField("bank", "bankName", e.target.value)}
              />
              <Input
                label="Account Name"
                value={form.bank.accountName}
                onChange={(e) => updateNestedField("bank", "accountName", e.target.value)}
              />
              <Input
                label="Branch Location"
                value={form.bank.branch}
                onChange={(e) => updateNestedField("bank", "branch", e.target.value)}
              />
              <Input
                label="Account Number"
                value={form.bank.accountNumber}
                onChange={(e) => updateNestedField("bank", "accountNumber", e.target.value)}
              />
            </div>
          </Section>

          {/* ---------------- SUBMIT ---------------- */}
          <Button className="w-full" onClick={handleSubmit}>
            Add Clinician
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* SMALL SECTION WRAPPER                           */
/* -------------------------------------------------------------------------- */

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="text-sm font-semibold text-slate-900 mb-3">
      {title}
    </div>
    {children}
  </div>
);

export default AddClinicianForm;