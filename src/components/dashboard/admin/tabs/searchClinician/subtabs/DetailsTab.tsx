"use client";

import React from "react";
import Input from "@/components/atom/Input/Input";

interface DetailsTabProps {
  clinician: {
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
  return (
    <div className="space-y-8">

      {/* -------------------------------- BASIC INFORMATION -------------------------------- */}
      <div>
        <div className="text-sm font-semibold text-slate-900 mb-1">
          Basic Information
        </div>
        <div className="text-xs text-slate-500 mb-4">
          Core professional details
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={clinician.name}
            readOnly
          />
          <Input
            label="Registration Number"
            value={clinician.registration}
            readOnly
          />

          <Input
            label="Qualifications"
            value={clinician.qualifications}
            readOnly
          />

          <Input
            label="Speciality"
            value={clinician.specialty}
            readOnly
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
          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none"
          rows={4}
          value={clinician.intro}
          readOnly
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
            value={clinician.bank.bankName}
            readOnly
          />
          <Input
            label="Account Name"
            value={clinician.bank.accountName}
            readOnly
          />

          <Input
            label="Branch Location"
            value={clinician.bank.branch}
            readOnly
          />
          <Input
            label="Account Number"
            value={clinician.bank.accountNumber}
            readOnly
          />
        </div>
      </div>

    </div>
  );
};

export default DetailsTab;
