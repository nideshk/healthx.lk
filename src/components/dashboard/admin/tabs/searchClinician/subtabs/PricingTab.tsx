"use client";

import React from "react";
import Input from "@/components/atom/Input/Input";

type AppointmentPricing = {
  type: string;
  duration: string;
  fee: number;
};

interface PricingTabProps {
  clinician: {
    pricing: AppointmentPricing[];
  };
}

const PricingTab: React.FC<PricingTabProps> = ({ clinician }) => {
  return (
    <div className="space-y-6">

      {/* ---------------- HEADER ---------------- */}
      <div>
        <div className="text-sm font-semibold text-slate-900">Pricing</div>
        <div className="text-xs text-slate-500">
          Consultation fee configuration
        </div>
      </div>

      {/* ---------------- TABLE HEADER ---------------- */}
      <div className="grid grid-cols-3 text-sm font-medium text-slate-600 border-b border-slate-200 pb-2">
        <div>Appointment Type</div>
        <div>Duration</div>
        <div>Fee (LKR)</div>
      </div>

      {/* ---------------- PRICING ROWS ---------------- */}
      <div className="space-y-3">
        {clinician.pricing.map((item) => (
          <div
            key={item.type}
            className="grid grid-cols-3 items-center gap-4"
          >
            <div className="text-sm text-slate-900">{item.type}</div>

            <div className="text-sm text-slate-700">{item.duration}</div>

            <Input
              value={String(item.fee)}
              disabled
              className="max-w-[120px]"
            />
          </div>
        ))}
      </div>

      {/* ---------------- PLATFORM INFO ---------------- */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <span className="text-amber-600 text-lg">•</span>
        <div className="text-xs text-amber-800">
          <span className="font-medium">Platform Fee Information</span>
          <div className="mt-1">
            Please note that platform fees of <b>LKR 950</b> will be charged per
            consultation.
          </div>
        </div>
      </div>

    </div>
  );
};

export default PricingTab;
