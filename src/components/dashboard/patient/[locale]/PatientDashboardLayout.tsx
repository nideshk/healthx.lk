"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  RotateCcw,
  Files,
  Plus,
  ShieldCheck,
  MessageCircleCodeIcon,
} from "lucide-react";
import Link from "next/link";
import { PatientTab } from "./patientTabs";
import AppointmentTab from "./tabs/AppointmentTab";
import RescheduleTab from "./tabs/RescheduleTab";
import FileManagerTab from "./tabs/FileManagerTab";
import FollowUpRequest from "./FollowUpRequest";
import { ReviewModal } from "@/components/atom/Modal/ReviewModal";
import { authFetch } from "@/lib/authFetch";
import { useTranslations } from "next-intl";

export default function PatientDashboardLayout({
  activeTab,
}: {
  activeTab: PatientTab;
}) {
  const t = useTranslations("patientDashboard");

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingReview, setPendingReview] = useState<any>(null);

  useEffect(() => {
    const lastPrompt = localStorage.getItem("lastReviewPrompt");
    if (lastPrompt && isSameDay(new Date(lastPrompt), new Date())) return;

    let mounted = true;

    async function fetchPendingReview() {
      try {
        const res = await authFetch("/api/reviews/pending");
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted || !data?.appointment) return;

        setPendingReview(data.appointment);
        setShowReviewModal(true);
        localStorage.setItem("lastReviewPrompt", new Date().toISOString());
      } catch (err) {
        console.error("Failed to fetch pending review:", err);
      }
    }

    fetchPendingReview();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Changed gap and grid behavior */}
        <div className="grid lg:grid-cols-12 gap-8">

          {/* ---------------- SIDEBAR (Hidden on Mobile) ---------------- */}
          {/* Added 'hidden lg:block' to hide on mobile and tablet */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-8">
              <div className="mb-8">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">
                  {t("menu")}
                </h2>

                <nav className="space-y-1">
                  <SidebarLink
                    href="/dashboard?tab=appointment"
                    active={activeTab === "appointment"}
                    icon={<Calendar size={20} />}
                    label={t("appointments")}
                  />
                  <SidebarLink
                    href="/dashboard?tab=reschedule"
                    active={activeTab === "reschedule"}
                    icon={<RotateCcw size={20} />}
                    label={t("reschedule")}
                  />
                  <SidebarLink
                    href="/dashboard?tab=file-manager"
                    active={activeTab === "file-manager"}
                    icon={<Files size={20} />}
                    label={t("medicalRecords")}
                  />
                  <SidebarLink
                    href="/dashboard?tab=follow-up"
                    active={activeTab === "follow-up"}
                    icon={<MessageCircleCodeIcon size={20} />}
                    label={t("followUps")}
                  />
                </nav>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <Link
                  href="/appointment"
                  className="group flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-900 hover:bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                  {t("newBooking")}
                </Link>
              </div>

              {/* TRUST BADGE */}
              <div className="mt-8 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <ShieldCheck className="w-3 h-3 text-teal-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {t("privacyTitle")}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {t("privacyDescription")}
                </p>
              </div>
            </div>
          </aside>

          {/* ---------------- MAIN CONTENT (Full width on Mobile) ---------------- */}
          {/* Changed lg:col-span-9 to col-span-12 lg:col-span-9 */}
          <main className="col-span-12 lg:col-span-9">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 capitalize tracking-tight">
                  {t(`tabs.${activeTab}`)}
                </h1>
                <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
              </div>
            </header>

              {/* ✅ MOBILE NEW BOOKING BUTTON - Proper Placement */}
              <div className="lg:hidden mb-6">
                <Link
                  href="/appointment"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-lg active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  {t("newBooking")}
                </Link>
              </div>

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
      className={`group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${active
        ? "bg-teal-50 text-teal-700 font-bold border border-teal-100/50"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
        }`}
    >
      <span
        className={`${active ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"
          } transition-colors`}
      >
        {icon}
      </span>
      <span className="text-sm">{label}</span>
      {active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-600 shadow-[0_0_8px_rgba(13,148,136,0.5)]" />
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