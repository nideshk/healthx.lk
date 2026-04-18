"use client";

import React, { useState, useEffect } from "react";
import ClinicianCard from "./ClinicianCard";
import { Search } from "lucide-react";

interface Practitioner {
  id: string;
  full_name: string;
  specialization?: string;
  license_number?: string;
  solo_consultation_fee?: number;
  family_consultation_fee?: number;
  available_services?: string[];
  contact_email?: string;
  contact_number?: string;
  profile_picture_url?: string;
}

export default function SearchClinician() {
  const [search, setSearch] = useState("");
  const [clinicians, setClinicians] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch practitioners from API
  useEffect(() => {
    const fetchPractitioners = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/practitioners");
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to fetch clinicians");
        setClinicians(data.data || []);
      } catch (err: any) {
        console.error("Error fetching clinicians:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPractitioners();
  }, []);

  // ✅ Filter by name, specialty, or registration
  const filtered = clinicians.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(term) ||
      c.specialization?.toLowerCase().includes(term) ||
      c.license_number?.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <h2 className="text-xl font-semibold mb-1">Search Clinicians</h2>
      <p className="text-gray-500 mb-4 text-xs">
        Find clinicians and view quick details....
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

      {/* ✅ Handle Loading & Error */}
      {loading && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Loading clinicians...
        </div>
      )}
      {error && (
        <div className="text-center py-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* ✅ Render Clinicians */}
      {!loading && !error && (
        <div className="space-y-3">
          {filtered.length > 0 ? (
            filtered.map((c) => (
              <ClinicianCard
                key={c.id}
                clinician={{
                  id: c.id,
                  name: c.full_name,
                  specialty: c.specialization || "—",
                  registration: c.license_number || "—",
                  soloFee: c.solo_consultation_fee
                    ? `LKR ${c.solo_consultation_fee.toLocaleString()}`
                    : "—",
                  familyFee: c.family_consultation_fee
                    ? `LKR ${c.family_consultation_fee.toLocaleString()}`
                    : "—",
                  tags: c.available_services || [],
                }}
              />
            ))
          ) : (
            <>
              <p className="text-center text-gray-400 text-sm">
                No clinicians found....
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
