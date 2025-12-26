"use client";

import React, { useEffect, useState } from "react";

import DashboardShell from "@/components/dashboard/layout/DashboardShell";
import DashboardMenuCard, {
  DashboardMenuItem,
} from "@/components/dashboard/layout/DashboardMenuCard";

import HomeTab from "./tabs/HomeTab";
import SearchClinicianTab from "./tabs/searchClinician/SearchClinicianTab";
import SearchPatientTab from "./tabs/searchPatient/SearchPatientTab";
import AddClinicianTab from "./tabs/AddClinicianTab";
import ManageAdminsTab from "./tabs/ManageAdminsTab";
import AnalyticsTab from "./tabs/analytics/AnalyticsTab";
import SettingsTab from "./tabs/SettingsTab";

import { Patient } from "@/types/Dashboard";

/* ---------------- TYPES ---------------- */

type AdminMenuId =
  | "home"
  | "searchClinician"
  | "searchPatient"
  | "addClinician"
  | "manageAdmins"
  | "analytics"
  | "settings";

/* ---------------- MENU ---------------- */

const menuItems: DashboardMenuItem[] = [
  { id: "home", label: "Dashboard Home" },
  { id: "searchClinician", label: "Search Clinician" },
  { id: "searchPatient", label: "Search Patient" },
  { id: "addClinician", label: "Add New Clinician" },
  { id: "manageAdmins", label: "Manage Administrators" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

/* ---------------- UTILS ---------------- */

/**
 * Correct age calculation from DOB
 * Handles month/day properly (no off-by-one bugs)
 */
const calculateAgeFromDob = (dob?: string | null): number => {
  if (!dob) return 0;

  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  return hasHadBirthdayThisYear ? age : age - 1;
};

/* ---------------- COMPONENT ---------------- */

const AdminDashboard: React.FC = () => {
  const [activeMenu, setActiveMenu] =
    useState<AdminMenuId>("home");

  const [profileName, setProfileName] = useState("Admin");
  const [profileRole, setProfileRole] =
    useState("Administrator");

  /* -------- Search Patient state -------- */

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);
      const [profileEmail, setProfileEmail] = useState(""); // ✅ NEW


  /* ---------------- FETCH PATIENTS ---------------- */

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!res.ok) return;

        const json = await res.json();

        setProfileName(
          json?.user?.profile?.display_name ??
            json?.user?.display_name ??
            "Admin"
        );

        setProfileRole(json?.user?.role ?? "Administrator");

        // ✅ email from auth/me
        setProfileEmail(json?.user?.user?.email ?? "");
      } catch (err) {
        console.error("Failed to fetch admin profile", err);
      }
    };

    fetchMe();
  }, []);

  useEffect(() => {
    if (activeMenu !== "searchPatient") return;

    const fetchPatients = async () => {
      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "20");

        // Apply search only if >= 4 chars
        if (search.trim().length >= 4) {
          params.set("q", search.trim());
        }

        const res = await fetch(
          `/api/patient?${params.toString()}`,
          { credentials: "include" }
        );

        if (!res.ok)
          throw new Error("Failed to fetch patients");

        const json = await res.json();

        const mapped: Patient[] = json.data.map(
          (p: any) => ({
            id: p.id,
            patientId: p.id.slice(0, 6).toUpperCase(),
            name: p.full_name,
            dob: p.dob ?? "-",
            age: calculateAgeFromDob(p.dob),
            gender: p.gender ?? "-",
            email: p.email,
            phone: p.contact_number,
            addressLine1: p.address ?? "",
            city: "",
            country: "",
            consentGiven: false,
          })
        );

        setPatients(mapped);
      } catch (err) {
        console.error(err);
        setPatients([]);
      }
    };

    fetchPatients();
  }, [search, activeMenu]);

  /* ---------------- RESET STATE ON TAB SWITCH ---------------- */

  useEffect(() => {
    if (activeMenu === "searchPatient") {
      setSearch("");
      setSelectedPatient(null);
    }
  }, [activeMenu]);

  /* ---------------- FETCH LOGGED IN ADMIN ---------------- */

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!res.ok) return;

        const json = await res.json();

        setProfileName(
          json?.user?.profile?.display_name ??
            json?.user?.display_name ??
            "Admin"
        );

        setProfileRole(
          json?.user?.role ?? "Administrator"
        );
      } catch (err) {
        console.error(
          "Failed to fetch admin profile",
          err
        );
      }
    };

    fetchMe();
  }, []);

  /* ---------------- RENDER ---------------- */

  return (
    <DashboardShell
      title="Admin Dashboard"
      subtitle="Manage clinicians and patients"
      profileName={profileName}
      profileRole={profileRole}
      onLogout={() => console.log("admin logout")}
    >
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT MENU */}
        <div className="col-span-3 max-w-xs">
          <DashboardMenuCard
            title="Admin Menu"
            subtitle="Quick access"
            items={menuItems as any}
            activeId={activeMenu as any}
            onChange={(id) =>
              setActiveMenu(id as AdminMenuId)
            }
          />
        </div>

        {/* RIGHT CONTENT */}
        <div className="col-span-9">
          {activeMenu === "home" && <HomeTab />}

          {activeMenu === "searchClinician" && (
            <SearchClinicianTab />
          )}

          {activeMenu === "searchPatient" && (
            <SearchPatientTab
              search={search}
              onSearchChange={setSearch}
              patients={patients}
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
              onBackToDashboard={() =>
                setSelectedPatient(null)
              }
            />
          )}

          {activeMenu === "addClinician" && (
            <AddClinicianTab />
          )}

          {activeMenu === "manageAdmins" && (
            <ManageAdminsTab />
          )}

          {activeMenu === "analytics" && (
            <AnalyticsTab />
          )}

          {activeMenu === "settings" && (
            <SettingsTab email={profileEmail} />
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
