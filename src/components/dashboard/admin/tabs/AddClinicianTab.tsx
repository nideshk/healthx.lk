"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

/* -------------------------------------------------------------------------- */
/*                                CONFIG DATA                                 */
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
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const AddClinicianTab: React.FC = () => {
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
    /**
     * FUTURE API:
     * POST /api/admin/clinicians
     * body: form
     */
    console.log("Add clinician payload:", form);
    alert("Clinician added (mock)");
  };

  return (
    <div className="space-y-6">
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

          {/* ---------------- REGISTRATION & QUALIFICATIONS ---------------- */}
          <Section title="Registration & Qualifications">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Registration Number"
                value={form.registrationNumber}
                onChange={(e) =>
                  updateField("registrationNumber", e.target.value)
                }
              />

              <Input
                label="Qualifications"
                value={form.qualifications}
                onChange={(e) =>
                  updateField("qualifications", e.target.value)
                }
              />
            </div>
          </Section>

          {/* ---------------- PROFESSIONAL SUMMARY ---------------- */}
          <Section title="Professional Summary">
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm"
              rows={4}
              placeholder="Brief introduction and background"
              value={form.intro}
              onChange={(e) => updateField("intro", e.target.value)}
            />
          </Section>

          {/* ---------------- CONTACT INFORMATION ---------------- */}
          <Section title="Contact Information">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />

              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
          </Section>

          {/* ---------------- EXPERIENCE & LANGUAGES ---------------- */}
          <Section title="Experience & Languages">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Years of Experience"
                value={form.experience}
                onChange={(e) => updateField("experience", e.target.value)}
              />

              <Input
                label="Languages"
                placeholder="English, Sinhala, Tamil"
                value={form.languages}
                onChange={(e) => updateField("languages", e.target.value)}
              />
            </div>
          </Section>

          {/* ---------------- PRICING (UPDATED) ---------------- */}
          <Section title="Consultation Fees (LKR)">
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Quick Consultation"
                value={form.pricing.quick}
                onChange={(e) =>
                  updateNestedField("pricing", "quick", e.target.value)
                }
              />

              <Input
                label="Standard Consultation"
                value={form.pricing.standard}
                onChange={(e) =>
                  updateNestedField("pricing", "standard", e.target.value)
                }
              />

              <Input
                label="Extended Consultation"
                value={form.pricing.extended}
                onChange={(e) =>
                  updateNestedField("pricing", "extended", e.target.value)
                }
              />
            </div>

            <div className="text-xs text-slate-500 mt-2">
              Please note that platform fees of LKR 950 will be charged per
              consultation.
            </div>
          </Section>

          {/* ---------------- AVAILABLE SERVICES ---------------- */}
          <Section title="Available Services">
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_SERVICES.map((service) => (
                <label key={service} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.services.includes(service)}
                    onChange={() => toggleService(service)}
                  />
                  {service}
                </label>
              ))}
            </div>
          </Section>

          {/* ---------------- BANK DETAILS ---------------- */}
          <Section title="Bank Details">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                value={form.bank.bankName}
                onChange={(e) =>
                  updateNestedField("bank", "bankName", e.target.value)
                }
              />

              <Input
                label="Account Name"
                value={form.bank.accountName}
                onChange={(e) =>
                  updateNestedField("bank", "accountName", e.target.value)
                }
              />

              <Input
                label="Branch Location"
                value={form.bank.branch}
                onChange={(e) =>
                  updateNestedField("bank", "branch", e.target.value)
                }
              />

              <Input
                label="Account Number"
                value={form.bank.accountNumber}
                onChange={(e) =>
                  updateNestedField("bank", "accountNumber", e.target.value)
                }
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

export default AddClinicianTab;

/* -------------------------------------------------------------------------- */
/*                             SMALL SECTION WRAPPER                           */
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
