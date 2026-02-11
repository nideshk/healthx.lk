"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { authFetch } from "@/lib/authFetch";
import { toast } from "react-toastify";

interface DetailsTabProps {
  clinician: {
    id: string;
    name: string;
    registration: string;
    specialty: string;
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
  
  // Local state for all editable fields
  const [formData, setFormData] = useState({
    name: clinician.name,
    qualifications: clinician.qualifications,
    specialty: clinician.specialty,
    intro: clinician.intro,
    registration: clinician.registration,
    bankName: clinician.bank.bankName,
    accountName: clinician.bank.accountName,
    branch: clinician.bank.branch,
    accountNumber: clinician.bank.accountNumber,
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    setFormData({
      name: clinician.name,
      qualifications: clinician.qualifications,
      specialty: clinician.specialty,
      intro: clinician.intro,
      bankName: clinician.bank.bankName,
      accountName: clinician.bank.accountName,
      branch: clinician.bank.branch,
    registration: clinician.registration,
      accountNumber: clinician.bank.accountNumber,
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Split name into first and last for the API payload
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
          specialization: [formData.specialty], 
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

      const text = `Appointment for Dr. ${formData.name} updated successfully. Registration: ${clinician.registration}`;
      
      try {
        if (navigator.share) {
          await navigator.share({ title: "Appointment", text });
        } else {
          await navigator.clipboard.writeText(text);
          toast.success("Appointment details copied");
        }
      } catch {
        toast.error("Unable to share appointment");
      }

      setIsEditing(false);
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
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit Details
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading}>
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

          <Input
            label="Speciality"
            value={formData.specialty}
            onChange={(e) => handleChange("specialty", e.target.value)}
            disabled={!isEditing}
          />
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
            isEditing ? "border-blue-300 bg-white" : "border-slate-300 bg-slate-50"
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