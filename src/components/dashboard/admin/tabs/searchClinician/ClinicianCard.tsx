"use client";

import React, { useState } from "react";
import Button from "@/components/atom/Button/Button";
import Loader from "@/components/atom/Loader/Loader";
import Price from "@/components/common/Price";

interface Fee {
  label: string;
  amount: number;
}

interface ClinicianCardProps {
  clinician: {
    id: string;
    name: string;
    specialty: string;
    registration: string;
    fees: Fee[];
    experience: number;
    tags: string[];
  };
  onViewProfile: (id: string) => Promise<void> | void;
}

const ClinicianCard: React.FC<ClinicianCardProps> = ({
  clinician,
  onViewProfile,
}) => {
  const [loading, setLoading] = useState(false);

  const handleViewProfile = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await onViewProfile(clinician.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative border border-slate-200 rounded-xl p-4 bg-white">
      {loading && (
        <div className="absolute inset-0 z-10 bg-white/70 flex items-center justify-center rounded-xl">
          <Loader />
        </div>
      )}

      {/* NAME */}
      <div className="flex justify-between items-start">
        <div>
          <div
            className={`text-sm font-semibold text-blue-600 hover:underline cursor-pointer ${loading ? "pointer-events-none opacity-60" : ""
              }`}
            onClick={handleViewProfile}
          >
            {clinician.name}
          </div>

          <div className="inline-block mt-1 text-[11px] px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700">
            {clinician.specialty}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={loading}
          onClick={handleViewProfile}
        >
          View Profile
        </Button>
      </div>

      {/* REGISTRATION */}
      <div className="mt-3 text-xs text-slate-600">
        Registration:{" "}
        <span className="text-slate-900">{clinician.registration}</span>
      </div>

      {/* FEES */}
      <div className="mt-1 text-xs text-slate-600">
        {clinician.fees && clinician.fees.length > 0 ? (
          clinician.fees.map((f, idx) => (
            <span key={idx}>
              {f.label}: <span className="font-medium"><Price amount={f.amount} /></span>
              {idx !== clinician.fees.length - 1 && "  |  "}
            </span>
          ))
        ) : (
          <span className="italic text-slate-400">No fee set</span>
        )}
      </div>

      {/* TAGS */}
      <div className="mt-3 flex flex-wrap gap-2">
        {clinician.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 rounded-full bg-slate-50 border border-slate-300 text-[11px] text-slate-600"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ClinicianCard;
