"use client";

import React, { useState } from "react";
import Button from "@/components/atom/Button/Button";
import DetailsTab from "../searchClinician/subtabs/DetailsTab";
import AvailabilityTab from "../searchClinician/subtabs/AvailabilityTab";
import PricingTab from "./subtabs/PricingTab";
import EarningsTab from "./subtabs/EarningsTab";
import { Settings } from "lucide-react";
import SettingsTab from "./subtabs/SettingsTab";
import PrescriptionsTab from "./subtabs/PrescriptionsTab";

interface ClinicianProfileModalProps {
  open: boolean;
  onClose: () => void;
  clinician: any; // Replace with your Clinician type later
}

const TABS = ["Details", "Availability", "Pricing", "Earnings", "Prescriptions", "Settings"];

const ClinicianProfileModal: React.FC<ClinicianProfileModalProps> = ({
  open,
  onClose,
  clinician,
}) => {
  const [activeTab, setActiveTab] = useState("Details");

  if (!open || !clinician) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-6 relative">

        {/* CLOSE BUTTON */}
        <button
          className="absolute right-4 top-4 text-slate-600 hover:text-black text-xl"
          onClick={onClose}
        >
          ×
        </button>

        {/* HEADER */}
        <div>
          <div className="text-xl font-semibold text-slate-900">
            {clinician.name}
          </div>
          <div className="text-sm text-slate-600 mt-1">
            {clinician.specialty} • {clinician.registration}
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mt-6 border-b border-slate-200 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm pb-2 ${
                activeTab === tab
                  ? "font-semibold text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
{/* TAB CONTENT */}
<div className="mt-6">
  {activeTab === "Details" && (
    <DetailsTab clinician={clinician} />
  )}

  {activeTab === "Availability" && (
    <AvailabilityTab clinicianId={clinician.id} />
  )}

  {activeTab === "Pricing" && (
    <div className="text-sm text-slate-400">
<PricingTab clinicianId={clinician.id} />
    </div>
  )}

  {activeTab === "Earnings" && (
    <div className="text-sm text-slate-400">
      <EarningsTab clinicianId={clinician.id} />
    </div>
  )}

  {activeTab === "Prescriptions" && (
    <PrescriptionsTab clinicianId={clinician.id} />
  )}

 {activeTab === "Settings" && (
  <div className="text-sm text-slate-400">
    <SettingsTab
      clinician={{
        id: clinician.id,
        email: clinician.email ?? clinician.contact_email ?? "",
        isActive: true, // until backend sends is_active
      }}
      onSuccess={onClose} // This ensures the modal closes on success
    />
  </div>
)}

</div>


      </div>
    </div>
  );
};

export default ClinicianProfileModal;