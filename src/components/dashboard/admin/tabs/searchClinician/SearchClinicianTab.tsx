"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import ClinicianCard from "./ClinicianCard";
import ClinicianProfileModal from "./ClinicianProfileModal";

const MOCK_CLINICIANS = [
  {
    id: "c1",
    name: "Dr. Kumari Silva",
    specialty: "General Physician",
    isActive: true,
    registration: "SLMC-GP-2018-0106",
    qualifications: "MBBS, MD",
    intro: "Brief introduction and professional background…",
    bank: {
      bankName: "HNB",
      accountName: "Dr. Kumari Silva",
      branch: "Colombo",
      accountNumber: "0123456789",
    },
    pricing: [
  { type: "Quick Consultation", duration: "10 min", fee: 500 },
  { type: "Standard Consultation", duration: "30 min", fee: 220 },
  { type: "Extended Consultation", duration: "60 min", fee: 250 },
],
    fees: { solo: 3500, family: 5000 },
    ratings: { overall: 4.75, advice: 4.85, punctuality: 4.65 },
    tags: ["general consultation", "preventive care", "chronic care"],
  },

  {
    id: "c2",
    name: "Dr. Nimal Perera",
    specialty: "General Physician",
    isActive: true,
    registration: "SLMC-GP-2020-0234",
    qualifications: "MBBS",
    intro: "Experienced GP specializing in urgent care and preventive medicine…",
    bank: {
      bankName: "BOC",
      accountName: "Dr. Nimal Perera",
      branch: "Kandy",
      accountNumber: "9988776655",
    },
    pricing: [
  { type: "Quick Consultation", duration: "10 min", fee: 500 },
  { type: "Standard Consultation", duration: "30 min", fee: 230 },
  { type: "Extended Consultation", duration: "60 min", fee: 150 },
],
    fees: { solo: 2800, family: 4500 },
    ratings: { overall: 4.7, advice: 4.55, punctuality: 4.95 },
    tags: ["general consultation", "urgent care", "preventive care"],
  },

  {
    id: "c3",
    name: "Dr. Priya Wijesinghe",
    specialty: "Psychiatrist",
    isActive: true,
    registration: "SLMC-PSY-2016-0876",
    qualifications: "MBBS, MD Psychiatry",
    intro: "Specialized psychiatrist with 8+ years experience in mental health…",
    bank: {
      bankName: "Commercial Bank",
      accountName: "Dr. Priya Wijesinghe",
      branch: "Galle",
      accountNumber: "5566778899",
    },
    pricing: [
  { type: "Quick Consultation", duration: "10 min", fee: 500 },
  { type: "Standard Consultation", duration: "30 min", fee: 200 },
  { type: "Extended Consultation", duration: "60 min", fee: 150 },
],
    fees: { solo: 4500, family: 6500 },
    ratings: { overall: 4.9, advice: 4.95, punctuality: 4.8 },
    tags: ["mental health", "therapy", "diagnostics"],
  },
];


const SearchClinicianTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState(MOCK_CLINICIANS);

  /* ---------------- Filter clinicians based on search ---------------- */
  useEffect(() => {
    const s = search.toLowerCase();

    setFiltered(
      MOCK_CLINICIANS.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.specialty.toLowerCase().includes(s) ||
          c.registration.toLowerCase().includes(s)
      )
    );
  }, [search]);

type Clinician = {
  id: string;
  name: string;
  specialty: string;
  registration: string;
  qualifications: string;
  intro: string;
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

const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(null);
const [openProfile, setOpenProfile] = useState(false);

const handleViewProfile = (id: string) => {
  const clinician = MOCK_CLINICIANS.find((c) => c.id === id);
  if (!clinician) return; // prevents undefined error

  setSelectedClinician(clinician);
  setOpenProfile(true);
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
              Find clinicians and view quick details. Click name to open profile.
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
            {filtered.map((c) => (
              <ClinicianCard
                key={c.id}
                clinician={c}
                onViewProfile={handleViewProfile}
              />
            ))}

            {filtered.length === 0 && (
              <div className="text-xs text-slate-500">No clinicians found.</div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default SearchClinicianTab;
