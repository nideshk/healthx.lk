// src/components/dashboard/admin/AdminDashboard.tsx
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


// ✅ IMPORTANT: import shared types
import { Patient, Appointment } from "@/types/Dashboard";

type AdminMenuId =
  | "home"
  | "searchClinician"
  | "searchPatient"
  | "addClinician"
  | "manageAdmins"
  | "analytics"
  | "settings";

const menuItems: DashboardMenuItem[] = [
  { id: "home", label: "Dashboard Home" },
  { id: "searchClinician", label: "Search Clinician" },
  { id: "searchPatient", label: "Search Patient" },
  { id: "addClinician", label: "Add New Clinician" },
  { id: "manageAdmins", label: "Manage Administrators" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

const AdminDashboard: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<AdminMenuId>("home");

  const [profileName, setProfileName] = useState("Admin");
  const [profileRole, setProfileRole] = useState("Administrator");

  // ✅ Search Patient state (must be initialized)
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // TEMP: mock patients until API is wired
useEffect(() => {
  setPatients([
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
  ]);
}, []);

// TEMP: mock appointments until API is wired
useEffect(() => {
  setAppointments([
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
   {
    id: "m4",
    category: "previous",
    date: "20/01/2025",
    time: "11:30 AM",
    doctorName: "Dr. Sharan Silva",
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
  ]);
}, []);


  /* -------------- Fetch logged in admin user -------------- */
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!res.ok) return;

        const json = await res.json();
        const name =
          json?.user?.profile?.display_name ??
          json?.user?.display_name ??
          "Admin";

        const role = json?.user?.role ?? "Administrator";

        setProfileName(name);
        setProfileRole(role);
      } catch (err) {
        console.error("Failed to fetch admin profile info", err);
      }
    };

    fetchMe();
  }, []);

  const handleLogout = () => {
    console.log("admin logout");
  };

  

  return (
    <DashboardShell
      title="Admin Dashboard"
      subtitle="Manage clinicians and their details"
      profileName={profileName}
      profileRole={profileRole}
      onLogout={handleLogout}
    >
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT SIDE MENU */}
        <div className="col-span-3 max-w-xs">
          <DashboardMenuCard
            title="Admin Menu"
            subtitle="Quick access"
            items={menuItems as any}
            activeId={activeMenu as any}
            onChange={(id) => setActiveMenu(id as AdminMenuId)}
          />
        </div>

        {/* RIGHT SIDE CONTENT */}
        <div className="col-span-9">
          {activeMenu === "home" && <HomeTab />}

          {activeMenu === "searchClinician" && <SearchClinicianTab />}

          {activeMenu === "searchPatient" && (
            <SearchPatientTab
              search={search}
              onSearchChange={setSearch}
              patients={patients}
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
              onBackToDashboard={() => setSelectedPatient(null)}
              appointments={appointments}
            />
          )}

          {activeMenu === "addClinician" && <AddClinicianTab />}

          {activeMenu === "manageAdmins" && <ManageAdminsTab />}

          {activeMenu === "analytics" && <AnalyticsTab />}

          {activeMenu === "settings" && <SettingsTab />}
        </div>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
