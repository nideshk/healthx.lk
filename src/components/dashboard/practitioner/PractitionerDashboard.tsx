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

import { toast } from "react-toastify";

import HomeTab from "../practitioner/tabs/HomeTab";
import SearchPatientsTab from "./tabs/seachPatients/SearchPatientsTab";
import AnalyticsTab from "./tabs/analyticsTab/AnalyticsTab";
import PrescriptionsTab from "./tabs/PrescriptionsTab";
import SettingsTab from "../practitioner/tabs/settings/SettingsTab";
import { authFetch } from "@/lib/authFetch";

/* ------------ Mock data (patients + appointments) ------------ */

const menuItems: DashboardMenuItem[] = [
  { id: "home", label: "Dashboard Home" },
  { id: "searchPatient", label: "Search Patient" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
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
        const res = await authFetch("/api/auth/me");
        if (!res.ok) return;

        const json = await res.json();
        const displayName: string | undefined =
          json?.user?.profile?.display_name ?? json?.user?.display_name;

        const id: string | null =
          json?.user?.practitioner_id ?? json?.practitioner_id ?? null;

        if (displayName) setProfileName(displayName);
        if (id) setPractitionerId(id);
      } catch (err) {
        toast.error("Failed to fetch current user for dashboard header");
      }
    };

    fetchMe();
  }, []);



  const handleBackToDashboard = () => {
    setSelectedPatient(null);
    setActiveMenu("searchPatient");
  };


  const effectiveProfileName = profileName || "Clinician";

  // Define the menu as a variable to keep it DRY (used in desktop sidebar and mobile drawer)
  const menuContent = (
    <DashboardMenuCard
      items={menuItems}
      activeId={activeMenu}
      onChange={setActiveMenu}
    />
  );

  return (
    <DashboardShell
      title="Clinician Dashboard"
      subtitle="Manage patients and appointments"
      profileName={effectiveProfileName}
      profileRole="Clinician"
      sidebar={menuContent} // This enables the mobile hamburger menu functionality
    >
      {/* Changed from grid to flex for better responsiveness */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* LEFT MENU CARD - Hidden on mobile, width fixed on desktop */}
        <div className="hidden md:block w-full md:w-64 shrink-0">
          {menuContent}
        </div>

        {/* MAIN CONTENT AREA - Full width on mobile */}
        <div className="flex-1 min-w-0">
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

          {activeMenu === "analytics" && <AnalyticsTab />}

          {activeMenu === "prescriptions" && <PrescriptionsTab />}

          {activeMenu === "settings" && (
            <SettingsTab />
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default PractitionerDashboard;