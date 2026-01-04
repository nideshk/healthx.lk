"use client";

import { useEffect, useState } from "react";
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
import { ReviewModal } from "@/components/atom/Modal/ReviewModal";
import axios from "axios";


export default function PatientDashboardLayout({
  activeTab,
}: {
  activeTab: PatientTab;
}) {
  /* ---------------- REVIEW MODAL STATE ---------------- */
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingReview, setPendingReview] = useState<any>(null);

  /* ---------------- REVIEW FALLBACK CHECK ---------------- */
  useEffect(() => {
    // prevent repeated prompts on same day
    const lastPrompt = localStorage.getItem("lastReviewPrompt");
    if (lastPrompt && isSameDay(new Date(lastPrompt), new Date())) {
      return;
    }

    const res = axios.get("http://localhost:3000/api/reviews/pending").then(res=>{
       setPendingReview(res.data.appointment);
          setShowReviewModal(true);
          console.log(res.data)
          localStorage.setItem(
            "lastReviewPrompt",
            new Date().toISOString()
          );
    }).catch(err=>{
      console.log(err)
    })
  }, []);

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-6">

        {/* ---------------- SIDEBAR ---------------- */}
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

        {/* ---------------- MAIN ---------------- */}
        <main className="lg:col-span-3 space-y-6">
          {activeTab === "appointment" && <AppointmentTab />}
          {activeTab === "reschedule" && <RescheduleTab />}
          {activeTab === "file-manager" && <FileManagerTab />}
          {activeTab === "follow-up" && <FollowUpRequest />}
        </main>
      </div>

      {/* ---------------- REVIEW MODAL (FALLBACK) ---------------- */}
      {showReviewModal && pendingReview && (
        <ReviewModal
          appointment={pendingReview}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
}

/* ---------------- SIDEBAR LINK ---------------- */
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

/* ---------------- DATE HELPER ---------------- */
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
