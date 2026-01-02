// src/components/dashboard/practitioner/PractitionerDashboard.tsx
"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/layout/DashboardShell";
import DashboardMenuCard, {
  DashboardMenuItem,
  DashboardMenuItemId,
} from "@/components/dashboard/layout/DashboardMenuCard";
import {
  Patient,
  Appointment,
  AnalyticsTabId,
  BookingStats,
  TimestampRow,
  SettingsTabId,
} from "@/types/Dashboard";


import HomeTab from "../practitioner/tabs/HomeTab";
import SearchPatientsTab from "./tabs/seachPatients/SearchPatientsTab";
import AnalyticsTab from "./tabs/analyticsTab/AnalyticsTab";
import SettingsTab from "../practitioner/tabs/settings/SettingsTab";

/* ------------ Mock data (patients + appointments) ------------ */

const menuItems: DashboardMenuItem[] = [
  { id: "home", label: "Dashboard Home" },
  { id: "searchPatient", label: "Search Patient" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

const MOCK_PATIENTS: Patient[] = [
  {
    id: "1",
    patientId: "PT-001",
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "+1 234 567 8900",
    age: 40,
    gender: "Male",
    dob: "15/03/1985",
    allergies: "Penicillin, Peanuts",
    lastConsultation: "Oct 18, 2025",
    consentGiven: true,
    addressLine1: "123 Main Street",
    city: "Los Angeles",
    country: "United States",
  },
  {
    id: "2",
    patientId: "PT-002",
    name: "Jane Smith",
    email: "jane.smith@email.com",
    phone: "+1 111 222 3333",
    age: 38,
    gender: "Female",
    dob: "20/07/1987",
    lastConsultation: "Oct 10, 2025",
    consentGiven: false,
    addressLine1: "456 Second Ave",
    city: "New York",
    country: "United States",
  },
];

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "m1",
    category: "upcoming",
    date: "20/01/2025",
    time: "09:00 AM",
    doctorName: "Dr. Kumari Silva",
    reason: "General Health Checkup",
    status: "confirmed",
    appointmentType: "Short (10 min)",
    telehealthConsent: true,
    termsAccepted: true,
    mainConcern: "Headaches during work",
    goal: "Relief and guidance",
    durationOfConcern: "2 weeks",
    documents: [],
    clinicianNotes: "",
    prescriptions: "",
    followUpNeeded: false,
  },
  {
    id: "m2",
    category: "upcoming",
    date: "20/01/2025",
    time: "11:30 AM",
    doctorName: "Dr. Kumari Silva",
    reason: "Follow-up Visit",
    status: "confirmed",
    appointmentType: "Long (20 min)",
    telehealthConsent: true,
    termsAccepted: true,
    mainConcern: "",
    goal: "",
    durationOfConcern: "",
    documents: [],
    clinicianNotes: "",
    prescriptions: "",
    followUpNeeded: false,
  },
  {
    id: "m3",
    category: "upcoming",
    date: "21/01/2025",
    time: "02:00 PM",
    doctorName: "Dr. Kumari Silva",
    reason: "Dermatology Consultation",
    status: "confirmed",
    appointmentType: "Short (10 min)",
    telehealthConsent: true,
    termsAccepted: true,
    mainConcern: "",
    goal: "",
    durationOfConcern: "",
    documents: [],
    clinicianNotes: "",
    prescriptions: "",
    followUpNeeded: false,
  },
];

/* ------------ Main dashboard component ------------ */

const PractitionerDashboard: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<DashboardMenuItemId>("home");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // clinician name + id from /api/auth/me
  const [profileName, setProfileName] = useState<string>("");
  const [practitionerId, setPractitionerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) return;

        const json = await res.json();
        const displayName: string | undefined =
          json?.user?.profile?.display_name ?? json?.user?.display_name;

        const id: string | null =
          json?.user?.practitioner_id ?? json?.practitioner_id ?? null;

        if (displayName) setProfileName(displayName);
        if (id) setPractitionerId(id);
      } catch (err) {
        console.error("Failed to fetch current user for dashboard header", err);
      }
    };

    fetchMe();
  }, []);



  const handleBackToDashboard = () => {
    setSelectedPatient(null);
    setActiveMenu("searchPatient");
  };


  const effectiveProfileName = profileName || "Clinician";

  return (
    <DashboardShell
      title="Clinician Dashboard"
      subtitle="Manage patients and appointments"
      profileName={effectiveProfileName}
      profileRole="Clinician"
    >
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT MENU CARD */}
        <div className="col-span-3 max-w-xs">
          <DashboardMenuCard
            items={menuItems}
            activeId={activeMenu}
            onChange={setActiveMenu}
          />
        </div>

        {/* RIGHT SIDE */}
        <div className="col-span-9">
          {activeMenu === "home" && (
            <HomeTab clinicianName={effectiveProfileName} />
          )}

          {activeMenu === "searchPatient" && (
            <SearchPatientsTab
              search={search}
              onSearchChange={setSearch}
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
              onBackToDashboard={handleBackToDashboard}
            />
          )}

          {activeMenu === "analytics" && <AnalyticsTab/>}

          {activeMenu === "settings" && (
            <SettingsTab />
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default PractitionerDashboard;
