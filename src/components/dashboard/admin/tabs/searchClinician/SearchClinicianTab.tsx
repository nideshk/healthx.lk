"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import ClinicianCard from "./ClinicianCard";
import ClinicianProfileModal from "./ClinicianProfileModal";

// const MOCK_CLINICIANS = [
//   {
//     id: "c1",
//     name: "Dr. Kumari Silva",
//     specialty: "General Physician",
//     isActive: true,
//     registration: "SLMC-GP-2018-0106",
//     qualifications: "MBBS, MD",
//     intro: "Brief introduction and professional background…",
//     bank: {
//       bankName: "HNB",
//       accountName: "Dr. Kumari Silva",
//       branch: "Colombo",
//       accountNumber: "0123456789",
//     },
//     pricing: [
//   { type: "Quick Consultation", duration: "10 min", fee: 500 },
//   { type: "Standard Consultation", duration: "30 min", fee: 220 },
//   { type: "Extended Consultation", duration: "60 min", fee: 250 },
// ],
//     fees: { solo: 3500, family: 5000 },
//     ratings: { overall: 4.75, advice: 4.85, punctuality: 4.65 },
//     tags: ["general consultation", "preventive care", "chronic care"],
//   },

//   {
//     id: "c2",
//     name: "Dr. Nimal Perera",
//     specialty: "General Physician",
//     isActive: true,
//     registration: "SLMC-GP-2020-0234",
//     qualifications: "MBBS",
//     intro: "Experienced GP specializing in urgent care and preventive medicine…",
//     bank: {
//       bankName: "BOC",
//       accountName: "Dr. Nimal Perera",
//       branch: "Kandy",
//       accountNumber: "9988776655",
//     },
//     pricing: [
//   { type: "Quick Consultation", duration: "10 min", fee: 500 },
//   { type: "Standard Consultation", duration: "30 min", fee: 230 },
//   { type: "Extended Consultation", duration: "60 min", fee: 150 },
// ],
//     fees: { solo: 2800, family: 4500 },
//     ratings: { overall: 4.7, advice: 4.55, punctuality: 4.95 },
//     tags: ["general consultation", "urgent care", "preventive care"],
//   },

//   {
//     id: "c3",
//     name: "Dr. Priya Wijesinghe",
//     specialty: "Psychiatrist",
//     isActive: true,
//     registration: "SLMC-PSY-2016-0876",
//     qualifications: "MBBS, MD Psychiatry",
//     intro: "Specialized psychiatrist with 8+ years experience in mental health…",
//     bank: {
//       bankName: "Commercial Bank",
//       accountName: "Dr. Priya Wijesinghe",
//       branch: "Galle",
//       accountNumber: "5566778899",
//     },
//     pricing: [
//   { type: "Quick Consultation", duration: "10 min", fee: 500 },
//   { type: "Standard Consultation", duration: "30 min", fee: 200 },
//   { type: "Extended Consultation", duration: "60 min", fee: 150 },
// ],
//     fees: { solo: 4500, family: 6500 },
//     ratings: { overall: 4.9, advice: 4.95, punctuality: 4.8 },
//     tags: ["mental health", "therapy", "diagnostics"],
//   },
// ];

const SearchClinicianTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pagination ready
  const [limit] = useState(10);
  const [offset] = useState(0);

  // const [filtered, setFiltered] = useState(MOCK_CLINICIANS);

  /* ---------------- Filter clinicians based on search ---------------- */
  useEffect(() => {
    const fetchClinicians = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        // search only if length >= 4
        if (search.length >= 4) {
          params.append("q", search);
        }

        params.append("limit", limit.toString());
        params.append("offset", offset.toString());

        const res = await fetch(`/api/practitioner?${params.toString()}`, {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to fetch clinicians");

        const data = await res.json();

        setClinicians(data.practitioners || []);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchClinicians();
  }, [search, limit, offset]);

  // useEffect(() => {
  //   const s = search.toLowerCase();

  //   setFiltered(
  //     MOCK_CLINICIANS.filter(
  //       (c) =>
  //         c.name.toLowerCase().includes(s) ||
  //         c.specialty.toLowerCase().includes(s) ||
  //         c.registration.toLowerCase().includes(s)
  //     )
  //   );
  // }, [search]);

  type Clinician = {
    id: string;
    name: string;
    specialty: string;
    registration: string;
    qualifications: string;
    intro: string;
    email: string;
    bank: {
      bankName: string;
      accountName: string;
      branch: string;
      accountNumber: string;
    };
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

  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(
    null
  );
  const [openProfile, setOpenProfile] = useState(false);

  // const handleViewProfile = (id: string) => {
  //   const clinician = clinicians.find((c) => c.id === id);
  //   if (!clinician) return; // prevents undefined error

  //   setSelectedClinician(clinician);
  //   setOpenProfile(true);
  // };

const handleViewProfile = async (id: string) => {
  try {
    const res = await fetch(`/api/practitioners/${id}`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to fetch practitioner");

    const data = await res.json();

    const p = data.practitioner || {};
    const bank = data.bank_details?.[0] || {};

    setSelectedClinician({
      id: p.id,
      name: p.full_name ?? "",
      registration: p.license_number ?? "",
      specialty: p.specialization?.[0] ?? "",
      qualifications: p.qualifications ?? "",
      intro: p.profile_bio ?? "",
      email: p.contact_email ?? "",
      bank: {
        bankName: bank.bank_name ?? "",
        accountName: bank.account_holder_name ?? "",
        branch: bank.branch_name ?? "",
        accountNumber: bank.account_number ?? "",
      },
      fees: {
        solo: p.fees?.solo || 0,
        family: p.fees?.family || 0,
      },
      ratings: { overall: 0, advice: 0, punctuality: 0 }, // to be filled later
      tags: p.specialization ?? [],
    });

    setOpenProfile(true);
  } catch (err) {
    console.error(err);
  }
};



  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Search Clinicians
            </div>
            <div className="text-xs text-slate-500">
              Find clinicians and view quick details. Click name to open
              profile.
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-4">
          {/* Search Bar */}
          <Input
            placeholder="Search by name, specialty, or registration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {openProfile && (
            <ClinicianProfileModal
              open={openProfile}
              onClose={() => setOpenProfile(false)}
              clinician={selectedClinician}
            />
          )}

          {/* Results */}
          <div className="space-y-3">
            {clinicians.map((c) => (
              <ClinicianCard
                key={c.id}
                clinician={{
                  id: c.id,
                  name: c.full_name,
                  specialty: c.qualification,
                  registration: c.license_number,
                  tags: c.specialization,
                  // isActive: c.is_active,
                  experience: c.experience_years,
                  fees: c.fees || {},
                  // ratings: {}, // can be filled later
                }}
                onViewProfile={handleViewProfile}
              />
            ))}

            {loading && (
              <div className="text-xs text-slate-500">
                Loading clinicians...
              </div>
            )}

            {!loading && clinicians.length === 0 && (
              <div className="text-xs text-slate-500">No clinicians found.</div>
            )}

            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default SearchClinicianTab;
