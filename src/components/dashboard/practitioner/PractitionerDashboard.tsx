// src/components/dashboard/practitioner/PractitionerDashboard.tsx
"use client";

import React, { useState } from "react";
import DashboardShell from "@/components/dashboard/layout/DashboardShell";
import DashboardMenuCard, {
  DashboardMenuItem,
  DashboardMenuItemId,
} from "@/components/dashboard/layout/DashboardMenuCard";
import {
  ClinicianStats,
  Patient,
  Appointment,
  AnalyticsTabId,
  BookingStats,
  TimestampRow,
  SettingsTabId,            // <-- make sure this exists in your types file
} from "@/types/Dashboard";
import DashboardHome from "@/components/dashboard/practitioner/DashboardHome";
import SearchPatientsPanel from "@/components/dashboard/practitioner/SearchPatientsPanel";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";

/* ------------ Mock data (replace with API later) ------------ */

const menuItems: DashboardMenuItem[] = [
  { id: "home", label: "Dashboard Home" },
  { id: "search", label: "Search Patient" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

const MOCK_STATS: ClinicianStats = {
  todaysAppointments: 12,
  completedAppointments: 3,
};

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
    date: "20/01/2025",   // <-- put today's date here
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
    date: "20/01/2025",  // <-- same day, second event
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
    date: "21/01/2025",  // <-- tomorrow date
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

  const filteredPatients = MOCK_PATIENTS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleBackToDashboard = () => {
    setSelectedPatient(null);
    setActiveMenu("search");
  };

  const handleLogout = () => {
    // TODO: replace with your real logout logic
    console.log("logout clicked");
  };

  return (
    <DashboardShell
      title="Clinician Dashboard"
      subtitle="Manage patients and appointments"
      profileName="Dr. Kumari Silva"
      profileRole="Clinician"
      onLogout={handleLogout}
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
          {activeMenu === "home" && <DashboardHome stats={MOCK_STATS}     appointments={MOCK_APPOINTMENTS}/>}

          {activeMenu === "search" && (
            <SearchPatientsPanel
              search={search}
              onSearchChange={setSearch}
              patients={filteredPatients}
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
              onBackToDashboard={handleBackToDashboard}
              appointments={MOCK_APPOINTMENTS}
            />
          )}

          {activeMenu === "analytics" && <AnalyticsPanel />}
          {activeMenu === "settings" && <SettingsPanel />}
        </div>
      </div>
    </DashboardShell>
  );
};

export default PractitionerDashboard;

/* ---------- Analytics (main menu) ---------- */

const MOCK_BOOKING_STATS: BookingStats = {
  totalBookings: 8,
  completed: 4,
  cancelled: 0,
  refunds: 0,
  upcoming: 4,
  revenue: 17000,
  currency: "LKR",
};

const MOCK_TIMESTAMP_ROWS: TimestampRow[] = [
  {
    id: "1",
    patientId: "pt-24",
    scheduledTime: "October 30th, 2025 09:00 AM",
    actualStartTime: "09:06 AM",
    appointmentType: "Short (10 min)",
    duration: "12 min",
    status: "late",
    lateByMinutes: 6,
  },
  {
    id: "2",
    patientId: "pt-25",
    scheduledTime: "October 30th, 2025 10:30 AM",
    actualStartTime: "10:30 AM",
    appointmentType: "Long (30 min)",
    duration: "28 min",
    status: "on-time",
  },
  {
    id: "3",
    patientId: "pt-26",
    scheduledTime: "October 30th, 2025 01:00 PM",
    actualStartTime: "01:09 PM",
    appointmentType: "Short (10 min)",
    duration: "11 min",
    status: "on-time",
  },
  {
    id: "4",
    patientId: "pt-27",
    scheduledTime: "October 30th, 2025 02:30 PM",
    actualStartTime: "02:42 PM",
    appointmentType: "Short (10 min)",
    duration: "9 min",
    status: "late",
    lateByMinutes: 12,
  },
  {
    id: "5",
    patientId: "pt-28",
    scheduledTime: "October 30th, 2025 04:00 PM",
    actualStartTime: "03:58 PM",
    appointmentType: "Long (30 min)",
    duration: "32 min",
    status: "on-time",
  },
];

const AnalyticsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>("bookings");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [timestampDate, setTimestampDate] = useState<string>("");

  return (
    <div className="space-y-4">
      {/* Title + subtitle */}
      <div>
        <h1 className="text-base font-semibold text-slate-900">Analytics</h1>
        <p className="text-xs text-slate-500">
          View your appointment analytics and timestamps.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-full bg-slate-100 p-1 text-xs">
        {renderAnalyticsTab("bookings", "Track Bookings", activeTab, setActiveTab)}
        {renderAnalyticsTab("timestamps", "Timestamps", activeTab, setActiveTab)}
      </div>

      {/* Active tab content */}
      {activeTab === "bookings" ? (
        <BookingsAnalyticsView
          stats={MOCK_BOOKING_STATS}
          fromDate={fromDate}
          toDate={toDate}
          onChangeFromDate={setFromDate}
          onChangeToDate={setToDate}
        />
      ) : (
        <TimestampAnalyticsView
          rows={MOCK_TIMESTAMP_ROWS}
          date={timestampDate}
          onChangeDate={setTimestampDate}
        />
      )}
    </div>
  );
};

const renderAnalyticsTab = (
  id: AnalyticsTabId,
  label: string,
  active: AnalyticsTabId,
  setActive: (id: AnalyticsTabId) => void
) => {
  const isActive = id === active;
  return (
    <button
      key={id}
      type="button"
      onClick={() => setActive(id)}
      className={`flex-1 rounded-full px-3 py-2 font-medium ${
        isActive
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-transparent text-slate-600 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
};

interface BookingsAnalyticsViewProps {
  stats: BookingStats;
  fromDate: string;
  toDate: string;
  onChangeFromDate: (v: string) => void;
  onChangeToDate: (v: string) => void;
}

const BookingsAnalyticsView: React.FC<BookingsAnalyticsViewProps> = ({
  stats,
  fromDate,
  toDate,
  onChangeFromDate,
  onChangeToDate,
}) => {
  return (
    <div className="space-y-4">
      {/* Date range filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <div className="text-[11px] text-slate-500">From Date</div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onChangeFromDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
        <div className="space-y-1">
          <div className="text-[11px] text-slate-500">To Date</div>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onChangeToDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
      </div>

      {/* Stats cards – 3 per row on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnalyticsStatCard
          label="Total Bookings"
          value={stats.totalBookings.toString()}
          className="bg-blue-500 text-white"
        />
        <AnalyticsStatCard
          label="Appts. Completed"
          value={stats.completed.toString()}
          className="bg-green-500 text-white"
        />
        <AnalyticsStatCard
          label="Cancelled Bookings"
          value={stats.cancelled.toString()}
          className="bg-red-500 text-white"
        />
        <AnalyticsStatCard
          label="Refunds Requested"
          value={stats.refunds.toString()}
          className="bg-amber-400 text-slate-900"
        />
        <AnalyticsStatCard
          label="Upcoming Appointments"
          value={stats.upcoming.toString()}
          className="bg-orange-500 text-white"
        />
        <AnalyticsStatCard
          label="Total Revenue"
          value={`${stats.currency} ${stats.revenue.toLocaleString()}`}
          className="bg-purple-500 text-white"
        />
      </div>
    </div>
  );
};

const AnalyticsStatCard: React.FC<{
  label: string;
  value: string;
  className?: string;
}> = ({ label, value, className = "" }) => (
  <div
    className={`rounded-xl px-4 py-3 shadow-sm text-xs font-medium ${className}`}
  >
    <div className="text-[11px] opacity-90">{label}</div>
    <div className="mt-1 text-sm">{value}</div>
  </div>
);

interface TimestampAnalyticsViewProps {
  rows: TimestampRow[];
  date: string;
  onChangeDate: (v: string) => void;
}

const TimestampAnalyticsView: React.FC<TimestampAnalyticsViewProps> = ({
  rows,
  date,
  onChangeDate,
}) => {
  return (
    <div className="space-y-4 text-xs">
      {/* Single date filter */}
      <div className="space-y-1 max-w-xs">
        <div className="text-[11px] text-slate-500">Select Date</div>
        <input
          type="date"
          value={date}
          onChange={(e) => onChangeDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Patient ID</th>
              <th className="px-4 py-2 text-left">Scheduled Time</th>
              <th className="px-4 py-2 text-left">Actual Start Time</th>
              <th className="px-4 py-2 text-left">Appointment Type</th>
              <th className="px-4 py-2 text-left">Duration</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{row.patientId}</td>
                <td className="px-4 py-2">{row.scheduledTime}</td>
                <td className="px-4 py-2">{row.actualStartTime}</td>
                <td className="px-4 py-2">{row.appointmentType}</td>
                <td className="px-4 py-2">{row.duration}</td>
                <td className="px-4 py-2">
                  <StatusPill status={row.status} lateBy={row.lateByMinutes} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-4 text-center text-[11px] text-slate-500"
                >
                  No timestamp data for this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatusPill: React.FC<{ status: "on-time" | "late"; lateBy?: number }> = ({
  status,
  lateBy,
}) => {
  const isLate = status === "late";
  const label = isLate ? `Late (${lateBy ?? 0} min)` : "On Time";

  const classes = isLate
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-green-50 text-green-700 border-green-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
};

/* ---------- Settings (main menu) ---------- */

const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("security");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Blue header like your design */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
        <div className="text-sm font-semibold text-white">Settings</div>
        <div className="text-[11px] text-blue-100">
          Manage your account, availability, and pricing.
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-4">
        {/* Tabs row */}
        <div className="flex rounded-full bg-slate-100 p-1 text-xs">
          {renderSettingsTab("security", "Security", activeTab, setActiveTab)}
          {renderSettingsTab("account", "Account", activeTab, setActiveTab)}
          {renderSettingsTab(
            "availability",
            "Availability",
            activeTab,
            setActiveTab
          )}
          {renderSettingsTab("pricing", "Pricing", activeTab, setActiveTab)}
        </div>

        {/* Tab content */}
        {activeTab === "security" && <SecuritySettings />}
        {activeTab === "account" && <AccountSettings />}
        {activeTab === "availability" && <AvailabilitySettingsPlaceholder />}
        {activeTab === "pricing" && <PricingSettings />}
      </div>
    </div>
  );
};

const renderSettingsTab = (
  id: SettingsTabId,
  label: string,
  active: SettingsTabId,
  setActive: (id: SettingsTabId) => void
) => {
  const isActive = id === active;
  return (
    <button
      key={id}
      type="button"
      onClick={() => setActive(id)}
      className={`flex-1 rounded-full px-3 py-2 font-medium transition ${
        isActive
          ? "bg-white text-slate-900 shadow-sm"
          : "bg-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
};

/* ---------- Security tab ---------- */

const SecuritySettings: React.FC = () => {
  // later you can initialise this from API
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);

  // this is where you'll call your backend later
  const handleToggle2FA = (next: boolean) => {
    setTwoFactorEnabled(next);
    // TODO: call /api/settings/security with next value
    console.log("2FA toggled:", next);
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="text-sm font-semibold text-slate-900">Security</div>

      {/* 2FA card */}
      <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <div>
          <div className="text-xs font-semibold text-slate-900">
            Two-Factor Authentication (2FA)
          </div>
          <div className="text-[11px] text-slate-600">
            Add an extra layer of security to your account.
          </div>
        </div>

        <SettingsToggle enabled={twoFactorEnabled} onChange={handleToggle2FA} />
      </div>
    </div>
  );
};

/* Simple reusable toggle – UI-only, no dependency on other atoms. */

const SettingsToggle: React.FC<{
  enabled: boolean;
  onChange: (next: boolean) => void;
}> = ({ enabled, onChange }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
        enabled
          ? "bg-blue-500 border-blue-500"
          : "bg-slate-200 border-slate-300"
      }`}
      aria-pressed={enabled}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          enabled ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
};

/* ---------- Placeholder sections for other settings tabs ---------- */

const SettingsSectionPlaceholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="space-y-2 text-xs">
    <div className="text-sm font-semibold text-slate-900">{title}</div>
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] text-slate-500">
        {title} settings coming soon.
      </p>
    </div>
  </div>
);

/* ---------- Account tab ---------- */

const AccountSettings: React.FC = () => {
  // later: hydrate from API
  const [username, setUsername] = useState<string>("Dr. Kumari Silva");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setSaving(true);

    try {
      // TODO: replace with your real API call, e.g.:
      // await api.updateAccountSettings({ username, newPassword });
      console.log("Saving account settings", {
        username,
        newPassword: newPassword ? "***" : "(unchanged)",
      });

      setMessage("Account settings saved successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="text-sm font-semibold text-slate-900">Account</div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Username + New password row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Username */}
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500">Username</div>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500">New Password</div>
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Confirm password full width */}
        <div className="space-y-1 max-w-md">
          <div className="text-[11px] text-slate-500">Confirm New Password</div>
          <Input
            type="password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {/* Save button + messages */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="text-xs px-4"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>

          {message && (
            <span className="text-[11px] text-green-600">{message}</span>
          )}
          {error && (
            <span className="text-[11px] text-red-600">{error}</span>
          )}
        </div>
      </form>
    </div>
  );
};


const AvailabilitySettingsPlaceholder: React.FC = () => (
  <SettingsSectionPlaceholder title="Availability" />
);



/* ---------- Pricing tab ---------- */

interface PricingFormValues {
  soloShort: string;
  soloLong: string;
  soloOneHour: string;
}

const PricingSettings: React.FC = () => {
  const [values, setValues] = useState<PricingFormValues>({
    soloShort: "",
    soloLong: "",
    soloOneHour: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange =
    (field: keyof PricingFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    // simple basic validation – you can tighten later
    if (!values.soloShort && !values.soloLong && !values.soloOneHour) {
      setError("Please enter at least one price before saving.");
      return;
    }

    setSaving(true);
    try {
      // TODO: call your backend API here
      console.log("Saving pricing for clinician", values);

      setMessage("Pricing saved successfully.");
    } catch (err) {
      setError("Something went wrong while saving pricing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="text-sm font-semibold text-slate-900">Pricing</div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Solo Appointments heading */}
        <div className="text-[11px] font-semibold text-slate-700">
          Solo Appointments
        </div>

        {/* 3 fields in one row on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PricingField
            label="Short Appointment (10 min)"
            currency="LKR"
            value={values.soloShort}
            onChange={handleChange("soloShort")}
          />
          <PricingField
            label="Long Appointment (20 min)"
            currency="LKR"
            value={values.soloLong}
            onChange={handleChange("soloLong")}
          />
          <PricingField
            label="1 Hour Appointment"
            currency="LKR"
            value={values.soloOneHour}
            onChange={handleChange("soloOneHour")}
          />
        </div>

        {/* Note box like the design */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[11px] text-slate-600">
          Note: Platform service charges may be applied to these rates when
          displayed to customers to cover operational costs and platform
          maintenance.
        </div>

        {/* Save button + messages */}
        <div className="flex justify-end items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="text-xs px-4"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Pricing"}
          </Button>

          {message && (
            <span className="text-[11px] text-green-600">{message}</span>
          )}
          {error && <span className="text-[11px] text-red-600">{error}</span>}
        </div>
      </form>
    </div>
  );
};

/* Reusable price field – easy to reuse for admin later */
const PricingField: React.FC<{
  label: string;
  currency: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, currency, value, onChange }) => (
  <div className="space-y-1">
    <div className="text-[11px] text-slate-500">{label}</div>
    <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1">
      <span className="text-[11px] text-slate-500 mr-2">{currency}</span>
      <Input
        type="number"
        className="border-0 flex-1 px-0 py-1 focus:ring-0 focus:outline-none text-xs"
        value={value}
        onChange={onChange}
      />
    </div>
  </div>
);
