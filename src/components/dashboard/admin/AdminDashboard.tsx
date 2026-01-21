"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/layout/DashboardShell";
import DashboardMenuCard, { DashboardMenuItem } from "@/components/dashboard/layout/DashboardMenuCard";
import HomeTab from "./tabs/HomeTab";
import SearchClinicianTab from "./tabs/searchClinician/SearchClinicianTab";
import SearchPatientTab from "./tabs/searchPatient/SearchPatientTab";
import AddClinicianTab from "./tabs/AddClinician/AddClinician";
import ManageAdminsTab from "./tabs/manageAdmin/ManageAdminsTab";
import AnalyticsTab from "./tabs/analytics/AnalyticsTab";
import SettingsTab from "./tabs/settings/SettingsTab";
import { Patient } from "@/types/Dashboard";
import { authFetch } from "@/lib/authFetch";
import CouponsTab from "./tabs/coupons/CouponsTab";

type AdminMenuId = "home" | "searchClinician" | "searchPatient" | "addClinician" | "manageAdmins" | "analytics" | "settings" | "coupons";

const menuItems: DashboardMenuItem[] = [
  { id: "home", label: "Home" },
  { id: "searchClinician", label: "Search Clinician" },
  { id: "searchPatient", label: "Search Patient" },
  { id: "addClinician", label: "Add New Clinician" },
  { id: "manageAdmins", label: "Manage Administrators" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
  { id: "coupons", label: "Coupons" }
];

const calculateAgeFromDob = (dob?: string | null): number => {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear = today.getMonth() > birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  return hasHadBirthdayThisYear ? age : age - 1;
};

const AdminDashboard: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<AdminMenuId>("home");
  const [profileName, setProfileName] = useState("Admin");
  const [profileRole, setProfileRole] = useState("Administrator");
  const [profileEmail, setProfileEmail] = useState("");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(false); // ✅ Added loading state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Fetch Admin Profile
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await authFetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Unauthorized");
        }

        const json = await res.json();
        setProfileName(json?.user?.profile?.display_name ?? json?.user?.display_name ?? "Admin");
        setProfileRole(json?.user?.role ?? "Administrator");
        setProfileEmail(json?.user?.user?.email ?? "");
      } catch (err) {
        console.error("Failed to fetch admin profile", err);
      }
    };
    fetchMe();
  }, []);

  // Fetch Patients Logic
  useEffect(() => {
    if (activeMenu !== "searchPatient") return;

    const fetchPatients = async () => {
      // Trigger fetch if search is empty (initial load) OR >= 3 characters
      if (search.length > 0 && search.length < 3) return;

      setLoadingPatients(true);
      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "20");

        if (search.trim().length >= 3) {
          params.set("q", search.trim());
        }

        const res = await authFetch(`/api/patient?${params.toString()}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch patients");

        const json = await res.json();
        const mapped: Patient[] = (json.data || []).map((p: any) => ({
          id: p.id,
          patientId: p.id.slice(0, 6).toUpperCase(),
          name: p.full_name,
          dob: p.dob ?? "-",
          age: calculateAgeFromDob(p.dob),
          gender: p.gender ?? "-",
          email: p.email,
          phone: p.contact_number,
          addressLine1: p.address ?? "",
          city: p.city ?? "",
          country: p.country ?? "",
          consentGiven: false,
        }));

        setPatients(mapped);
      } catch (err) {
        console.error(err);
        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, [search, activeMenu]);

  // Reset state on tab switch
  useEffect(() => {
    if (activeMenu === "searchPatient") {
      setSearch("");
      setSelectedPatient(null);
    }
  }, [activeMenu]);

  const menuComponent = (
    <DashboardMenuCard
      title="Admin Menu"
      subtitle="Quick access"
      items={menuItems as any}
      activeId={activeMenu as any}
      onChange={(id) => setActiveMenu(id as AdminMenuId)}
    />
  );

  return (
    <DashboardShell
      title="Admin Dashboard"
      subtitle="Manage clinicians and patients"
      profileName={profileName}
      profileRole={profileRole}
      onLogout={() => console.log("admin logout")}
      sidebar={menuComponent}
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className="hidden md:block w-full md:w-64 shrink-0">
          {menuComponent}
        </div>

        <div className="flex-1 min-w-0">
          {activeMenu === "home" && <HomeTab />}
          {activeMenu === "searchClinician" && <SearchClinicianTab />}
          {activeMenu === "searchPatient" && (
            <SearchPatientTab
              search={search}
              onSearchChange={setSearch}
              patients={patients}
              loading={loadingPatients}
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
              onBackToDashboard={() => setSelectedPatient(null)}
            />
          )}
          {activeMenu === "addClinician" && <AddClinicianTab />}
          {activeMenu === "manageAdmins" && <ManageAdminsTab />}
          {activeMenu === "analytics" && <AnalyticsTab />}
          {activeMenu === "settings" && <SettingsTab email={profileEmail} />}
          {activeMenu === "coupons" && <CouponsTab />}
        </div>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;