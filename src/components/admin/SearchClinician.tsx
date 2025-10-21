"use client";
import React, { useState } from "react";
import ClinicianCard from "./ClinicianCard";
import { Search } from "lucide-react";

const clinicians = [
  {
    name: "Dr. Kumari Silva",
    specialty: "General Physician",
    registration: "SLMC-GP-2018-0156",
    soloFee: "LKR 3,500",
    familyFee: "LKR 5,000",
    ratings: { overall: 4.7, advice: 4.8, punctuality: 4.6 },
    tags: ["general", "preventive", "chronic"],
  },
  {
    name: "Dr. Nimal Perera",
    specialty: "General Physician",
    registration: "SLMC-GP-2020-0234",
    soloFee: "LKR 3,000",
    familyFee: "LKR 4,500",
    ratings: { overall: 4.7, advice: 4.5, punctuality: 4.9 },
    tags: ["checkup", "family", "wellness"],
  },
];

export default function SearchClinician() {
  const [search, setSearch] = useState("");
  const filtered = clinicians.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <h2 className="text-xl font-semibold mb-1">Search Clinicians</h2>
      <p className="text-gray-500 mb-4 text-xs">
        Find clinicians and view quick details.
      </p>

      <div className="relative mb-4">
        <Search className="absolute top-2.5 left-3 text-gray-400" size={14} />
        <input
          placeholder="Search by name, specialty, or registration..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-200 outline-none"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((c, i) => (
          <ClinicianCard key={i} clinician={c} />
        ))}
      </div>
    </>
  );
}
