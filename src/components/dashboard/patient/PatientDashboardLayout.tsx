import {
  Calendar,
  RotateCcw,
  Files,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { PatientTab } from "./patientTabs";
import AppointmentTab from "./tabs/AppointmentTab";
import RescheduleTab from "./tabs/RescheduleTab";
import FileManagerTab from "./tabs/FileManagerTab";
import FollowUpRequest from "./FollowUpRequest";

export default function PatientDashboardLayout({
  activeTab,
}: {
  activeTab: PatientTab;
}) {
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-6">

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl bg-white shadow">
            <SidebarLink
              href="/dashboard?tab=appointment"
              active={activeTab === "appointment"}
              icon={<Calendar className="w-4 h-4" />}
              label="Appointments"
            />
            <SidebarLink
              href="/dashboard?tab=reschedule"
              active={activeTab === "reschedule"}
              icon={<RotateCcw className="w-4 h-4" />}
              label="Reschedule"
            />
            <SidebarLink
              href="/dashboard?tab=file-manager"
              active={activeTab === "file-manager"}
              icon={<Files className="w-4 h-4" />}
              label="My Files"
            />

            <Link
              href="/appointment"
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Book Appointment
            </Link>
            <div className="mt-5">

              <SidebarLink
              href="/dashboard?tab=follow-up"
              active={activeTab === "follow-up"}
              icon={<Files className="w-4 h-4" />}
              label="Follow-Ups"
            />

            </div>
          </div>

        </aside>

        {/* Main */}
        <main className="lg:col-span-3 space-y-6">
          {activeTab === "appointment" && <AppointmentTab />}
          {activeTab === "reschedule" && <RescheduleTab />}
          {activeTab === "file-manager" && <FileManagerTab />}
          {activeTab === "follow-up" && <FollowUpRequest />}
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ href, active, icon, label }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2 rounded-xl mb-2 transition ${
        active
          ? "bg-blue-100 text-blue-700 font-semibold"
          : "hover:bg-gray-50"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
