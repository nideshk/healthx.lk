"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  RotateCcw,
  Files,
  Plus,
  LayoutDashboard,
  ShieldCheck,
  MessageCircleCodeIcon,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";

import { PatientTab } from "./patientTabs";
import AppointmentTab from "./tabs/AppointmentTab";
import RescheduleTab from "./tabs/RescheduleTab";
import FileManagerTab from "./tabs/FileManagerTab";
import FollowUpRequest from "./FollowUpRequest";
import { ReviewModal } from "@/components/atom/Modal/ReviewModal";

export default function PatientDashboardLayout({
  activeTab,
}: {
  activeTab: PatientTab;
}) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingReview, setPendingReview] = useState<any>(null);

  useEffect(() => {
    const lastPrompt = localStorage.getItem("lastReviewPrompt");
    if (lastPrompt && isSameDay(new Date(lastPrompt), new Date())) return;

    axios.get("http://localhost:3000/api/reviews/pending")
      .then(res => {
        if (res.data.appointment) {
          setPendingReview(res.data.appointment);
          setShowReviewModal(true);
          localStorage.setItem("lastReviewPrompt", new Date().toISOString());
        }
      })
      .catch(err => console.error("Review check failed", err));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8">

          {/* ---------------- SIDEBAR (4 cols) ---------------- */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-8">
              <div className="mb-8">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">
                  Menu
                </h2>
                <nav className="space-y-1">
                  <SidebarLink
                    href="/dashboard?tab=appointment"
                    active={activeTab === "appointment"}
                    icon={<Calendar />}
                    label="Appointments"
                  />
                  <SidebarLink
                    href="/dashboard?tab=reschedule"
                    active={activeTab === "reschedule"}
                    icon={<RotateCcw />}
                    label="Reschedule"
                  />
                  <SidebarLink
                    href="/dashboard?tab=file-manager"
                    active={activeTab === "file-manager"}
                    icon={<Files />}
                    label="Medical Records"
                  />
                   <SidebarLink
                    href="/dashboard?tab=follow-up"
                    active={activeTab === "follow-up"}
                    icon={<MessageCircleCodeIcon />}
                    label="Follow-Ups"
                  />
                </nav>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <Link
                  href="/appointment"
                  className="group flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                  New Booking
                </Link>
              </div>

              {/* TRUST BADGE */}
              <div className="mt-8 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Patient Privacy</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Your medical data is encrypted and HIPAA compliant.
                </p>
              </div>
            </div>
          </aside>

          {/* ---------------- MAIN CONTENT (9 cols) ---------------- */}
          <main className="lg:col-span-9">
            <header className="mb-8 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 capitalize">
                        {activeTab.replace("-", " ")}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your healthcare journey and records</p>
                </div>
                <div className="hidden md:block">
                     {/* Dynamic breadcrumb or date can go here */}
                     <span className="text-xs font-medium text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                        Today: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                     </span>
                </div>
            </header>

            <div className="min-h-[60vh]">
                {activeTab === "appointment" && <AppointmentTab />}
                {activeTab === "reschedule" && <RescheduleTab />}
                {activeTab === "file-manager" && <FileManagerTab />}
                {activeTab === "follow-up" && <FollowUpRequest />}
            </div>
          </main>
        </div>
      </div>

      {showReviewModal && pendingReview && (
        <ReviewModal
          appointment={pendingReview}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
}

function SidebarLink({ href, active, icon, label }: any) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
        active
          ? "bg-blue-50 text-blue-700 font-bold border border-blue-100"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
      }`}
    >
      <span className={`${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"} transition-colors`}>
      {icon}
      </span>
      <span className="text-sm">{label}</span>
      {active && (
         <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
      )}
    </Link>
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}