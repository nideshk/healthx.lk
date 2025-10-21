"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface ClinicianCardProps {
  clinician: {
    id: string;
    name: string;
    specialty?: string;
    registration?: string;
    soloFee?: string;
    familyFee?: string;
    ratings?: {
      overall: number;
      advice: number;
      punctuality: number;
    };
    tags?: string[];
  };
}

export default function ClinicianCard({ clinician }: ClinicianCardProps) {
  return (
    <div className="flex justify-between items-start border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-all duration-200">
      {/* Left Side: Details */}
      <div className="flex flex-col space-y-2">
        {/* Name + Specialty */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-semibold text-gray-900">
            Dr. {clinician.name}
          </h3>
          {clinician.specialty && (
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
              {clinician.specialty}
            </span>
          )}
        </div>

        {/* Registration */}
        {clinician.registration && (
          <p className="text-sm text-gray-500">
            Registration: {clinician.registration}
          </p>
        )}

        {/* Fees */}
        <div className="text-sm text-gray-700">
          <span className="font-medium">Solo:</span> {clinician.soloFee || "—"}
          <span className="text-gray-400 mx-2">|</span>
          <span className="font-medium">Family:</span>{" "}
          {clinician.familyFee || "—"}
        </div>

        {/* Ratings */}
        {clinician.ratings && (
          <div className="text-sm text-gray-700">
            <span className="font-medium">Overall Rating:</span>{" "}
            {clinician.ratings.overall.toFixed(1)}/5
            <span className="ml-3">
              <span className="font-medium">Advice:</span>{" "}
              {clinician.ratings.advice.toFixed(1)}/5
            </span>
            <span className="ml-3">
              <span className="font-medium">Punctuality:</span>{" "}
              {clinician.ratings.punctuality.toFixed(1)}/5
            </span>
          </div>
        )}

        {/* Tags */}
        {clinician.tags && clinician.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {clinician.tags.map((tag, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right Side: View Profile Button */}
      <div>
        <Link href={`/admin/clinicians/${clinician.id}`} className="border border-gray-300 hover:border-gray-400 text-gray-700 text-sm px-4 py-1.5 rounded-md font-medium transition flex items-center gap-1">
          View Profile
          <ArrowRight size={14} className="ml-1" />
        </Link>
      </div>
    </div>
  );
}
