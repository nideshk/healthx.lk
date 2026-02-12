"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { authFetch } from "@/lib/authFetch";
import { toast } from "react-toastify";
import { X, ChevronDown } from "lucide-react";

interface Specialization {
  id: string;
  name: string;
  active: boolean;
  slug: string;
}

interface DetailsTabProps {
  clinician: {
    id: string;
    name: string;
    registration: string;
    specialty: string | string[]; // Can be string or array from backend
    qualifications: string;
    intro: string;
    bank: {
      bankName: string;
      accountName: string;
      branch: string;
      accountNumber: string;
    };
  };
}

const DetailsTab: React.FC<DetailsTabProps> = ({ clinician }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [isSpecOpen, setIsSpecOpen] = useState(false);

  // Helper to ensure specialty is always an array for the state
  const getInitialSpecialties = () => {
    if (Array.isArray(clinician.specialty)) return clinician.specialty;
    if (typeof clinician.specialty === "string" && clinician.specialty) {
      return clinician.specialty.split(",").map((s) => s.trim());
    }
    return [];
  };

  // Local state for all editable fields
  const [formData, setFormData] = useState({
    name: clinician.name,
    qualifications: clinician.qualifications,
    specialty: getInitialSpecialties(),
    intro: clinician.intro,
    registration: clinician.registration,
    bankName: clinician.bank.bankName,
    accountName: clinician.bank.accountName,
    branch: clinician.bank.branch,
    accountNumber: clinician.bank.accountNumber,
  });

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const res = await fetch("/api/form-data/appointment-config");
        if (!res.ok) throw new Error("Failed to fetch appointment config");
        const data = await res.json();
        setSpecializations(data.services || []);
      } catch (err) {
        console.error("Error loading specializations", err);
      }
    };
    fetchSpecializations();
  }, []);

  /* ---------------- HANDLERS ---------------- */

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSpecialization = (slug: string) => {
    const current = formData.specialty;
    const updated = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    handleChange("specialty", updated);
  };

  const handleCancel = () => {
    setFormData({
      name: clinician.name,
      qualifications: clinician.qualifications,
      specialty: getInitialSpecialties(),
      intro: clinician.intro,
      bankName: clinician.bank.bankName,
      accountName: clinician.bank.accountName,
      branch: clinician.bank.branch,
      registration: clinician.registration,
      accountNumber: clinician.bank.accountNumber,
    });
    setIsEditing(false);
    setIsSpecOpen(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const nameParts = formData.name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const payload = {
        user_id: clinician.id,
        target_role: "practitioner",
        practitioner: {
          first_name: firstName,
          last_name: lastName,
          license_number: formData.registration,
          qualification: formData.qualifications,
          specialization: formData.specialty, 
          profile_bio: formData.intro,
          bank_details: {
            account_holder_name: formData.accountName,
            bank_name: formData.bankName,
            account_number: formData.accountNumber,
            branch_name: formData.branch,
          },
        },
      };

      const res = await authFetch(`/api/update-user`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      // SUCCESS TOAST
      toast.success("Profile details updated successfully!");

      const text = `Appointment for Dr. ${formData.name} updated successfully. Registration: ${formData.registration}`;

      setIsEditing(false);
      setIsSpecOpen(false);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* -------------------------------- BASIC INFORMATION -------------------------------- */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <div>
            <div className="text-sm font-semibold text-slate-900 mb-1">
              Basic Information
            </div>
            <div className="text-xs text-slate-500 mb-4">
              Core professional details
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Edit Details
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} loading={loading}>
                  Save Details
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            disabled={!isEditing}
          />
          <Input
            label="License Number"
            value={formData.registration}
            onChange={(e) => handleChange("registration", e.target.value)}
            disabled={!isEditing}
          />

          <Input
            label="Qualifications"
            value={formData.qualifications}
            onChange={(e) => handleChange("qualifications", e.target.value)}
            disabled={!isEditing}
          />

          {/* SPECIALIZATION DROPDOWN */}
          <div className="relative">
            <label className="text-xs text-slate-600 mb-1 block font-medium">
              Specialization
            </label>
            <div
              className={`w-full min-h-[40px] px-3 py-2 rounded-lg border flex items-center justify-between transition-colors ${
                isEditing
                  ? "border-slate-300 bg-white focus-within:ring-2 focus-within:ring-teal-500"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-wrap gap-2">
                {formData.specialty.length === 0 ? (
                  <span className="text-slate-400 text-sm">
                    Select specializations
                  </span>
                ) : (
                  formData.specialty.map((slug) => {
                    const spec = specializations.find((s) => s.slug === slug);
                    return (
                      <span
                        key={slug}
                        className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {spec?.name || slug}
                      </span>
                    );
                  })
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsSpecOpen((prev) => !prev)}
                  className="ml-2 text-slate-500 hover:text-slate-700"
                >
                  {isSpecOpen ? <X size={18} /> : <ChevronDown size={18} />}
                </button>
              )}
            </div>

            {isEditing && isSpecOpen && (
              <div className="absolute z-20 mt-2 w-full max-h-60 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                {specializations
                  .filter((spec) => spec.active)
                  .map((spec) => (
                    <label
                      key={spec.id}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="rounded accent-teal-600"
                        checked={formData.specialty.includes(spec.slug)}
                        onChange={() => toggleSpecialization(spec.slug)}
                      />
                      <span className="text-slate-700 text-sm">{spec.name}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------- PROFESSIONAL SUMMARY -------------------------------- */}
      <div>
        <div className="text-sm font-semibold text-slate-900 mb-1">
          Professional Summary
        </div>
        <div className="text-xs text-slate-500 mb-3">
          Description and introduction for patients
        </div>

        <textarea
          className={`w-full border rounded-lg p-3 text-sm focus:outline-none transition-colors ${
            isEditing
              ? "border-blue-300 bg-white"
              : "border-slate-300 bg-slate-50"
          }`}
          rows={4}
          value={formData.intro}
          onChange={(e) => handleChange("intro", e.target.value)}
          disabled={!isEditing}
        />
      </div>

      {/* -------------------------------- BANK DETAILS -------------------------------- */}
      <div>
        <div className="text-sm font-semibold text-slate-900 mb-1">
          Bank Details
        </div>
        <div className="text-xs text-slate-500 mb-4">
          Payment information for consultation fees
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Bank Name"
            value={formData.bankName}
            onChange={(e) => handleChange("bankName", e.target.value)}
            disabled={!isEditing}
          />
          <Input
            label="Account Name"
            value={formData.accountName}
            onChange={(e) => handleChange("accountName", e.target.value)}
            disabled={!isEditing}
          />

          <Input
            label="Branch Location"
            value={formData.branch}
            onChange={(e) => handleChange("branch", e.target.value)}
            disabled={!isEditing}
          />
          <Input
            label="Account Number"
            value={formData.accountNumber}
            onChange={(e) => handleChange("accountNumber", e.target.value)}
            disabled={!isEditing}
          />
        </div>
      </div>
    </div>
  );
};

export default DetailsTab;