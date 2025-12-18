"use client";

import React from "react";
import Button from "@/components/atom/Button/Button";

interface ClinicianCardProps {
  clinician: {
    id: string;
    name: string;
    specialty: string;
    registration: string;
    fees: {
      solo: number;
      family: number;
    };
    ratings: {
      overall: number;
      advice: number;
      punctuality: number;
    };
    tags: string[];
  };
  onViewProfile: (id: string) => void;
}

const ClinicianCard: React.FC<ClinicianCardProps> = ({
  clinician,
  onViewProfile,
}) => {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      {/* NAME + SPECIALTY */}
      <div className="flex justify-between items-start">
        <div>
          <div
            className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
            onClick={() => onViewProfile(clinician.id)}
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
          onClick={() => onViewProfile(clinician.id)}
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
        Solo:{" "}
        <span className="font-medium">LKR {clinician.fees.solo}</span>{" "}
        &nbsp; | &nbsp;
        Family:{" "}
        <span className="font-medium">LKR {clinician.fees.family}</span>
      </div>

      {/* RATINGS */}
      <div className="mt-2 flex gap-6 text-[11px] text-slate-600">
        <div>
          Overall Rating:{" "}
          <span className="font-medium text-slate-900">
            {clinician.ratings.overall}/5
          </span>
        </div>
        <div>
          Advice:{" "}
          <span className="font-medium text-slate-900">
            {clinician.ratings.advice}/5
          </span>
        </div>
        <div>
          Punctuality:{" "}
          <span className="font-medium text-slate-900">
            {clinician.ratings.punctuality}/5
          </span>
        </div>
      </div>

      {/* SPECIALTIES TAGS */}
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
