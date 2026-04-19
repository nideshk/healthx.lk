"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/layout/DashboardShell";
import DashboardMenuCard, { DashboardMenuItem } from "@/components/dashboard/layout/DashboardMenuCard";
import { toast } from "react-toastify";
import HomeTab from "./tabs/HomeTab";
import SearchClinicianTab from "./tabs/searchClinician/SearchClinicianTab";
import SearchPatientTab from "./tabs/searchPatient/SearchPatientTab";
import AddClinicianTab from "./tabs/AddClinician/AddClinician";
import ManageAdminsTab from "./tabs/manageAdmin/ManageAdminsTab";
import AnalyticsTab from "./tabs/analytics/AnalyticsTab";
import SettingsTab from "./tabs/settings/SettingsTab";
import SpecializationsTab from "./tabs/specializations/SpecializationsTab";
import { Patient } from "@/types/Dashboard";
import { authFetch } from "@/lib/authFetch";
import CouponsTab from "./tabs/coupons/CouponsTab";
import CreateAppointmentTab from "./tabs/createAppointment/CreateAppointmentTab";
import PrescriptionsTab from "./tabs/PrescriptionsTab";

type AdminMenuId = "home" | "searchClinician" | "searchPatient" | "addClinician" | "manageAdmins" | "analytics" | "settings" | "coupons" | "createAppointment" | "specialisations" | "prescriptions";

const menuItems: DashboardMenuItem[] = [
  { id: "home", label: "Home" },
  { id: "searchClinician", label: "Search Clinician" },
  { id: "searchPatient", label: "Search Patient" },
  { id: "addClinician", label: "Add New Clinician" },
  { id: "manageAdmins", label: "Manage Administrators" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
  { id: "coupons", label: "Coupons" },
  { id: "createAppointment", label: "Create Appointment" },
  { id: "specialisations", label: "Specializations" },
  { id: "prescriptions", label: "Prescriptions" }
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
        toast.error("Failed to fetch admin profile");
      }
    };
    fetchMe();
  }, []);

  // Patient logic moved to SearchPatientTab



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
      onLogout={() => {}}
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
            <SearchPatientTab />
          )}
          {activeMenu === "addClinician" && <AddClinicianTab />}
          {activeMenu === "manageAdmins" && <ManageAdminsTab />}
          {activeMenu === "analytics" && <AnalyticsTab />}
          {activeMenu === "settings" && <SettingsTab email={profileEmail} />}
          {activeMenu === "coupons" && <CouponsTab />}
          {activeMenu === "createAppointment" && <CreateAppointmentTab />}
          {activeMenu === "specialisations" && <SpecializationsTab />}
          {activeMenu === "prescriptions" && <PrescriptionsTab />}
        </div>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;