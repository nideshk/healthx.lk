"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Paperclip,
  X,
  UserPlus,
  CheckCircle2,
  ChevronDown,
  Users,
  MessageSquare,
  Target,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { AppointmentFormInputs } from "@/types/FormType";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";

interface Props {
  bookingControllerRef: React.MutableRefObject<{
    validateStep?: () => boolean;
    getAttachment?: () => File | null;
  }>;
  bookingData: AppointmentFormInputs;
  updateData: (d: Partial<AppointmentFormInputs>) => void;
  nextStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
  prevStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
}

const REFERRAL_SOURCES = [
  "Search Engine (Google/Bing)",
  "Social Media (Instagram/Facebook)",
  "Word of Mouth / Referral",
  "Professional Recommendation",
  "Previous Patient",
  "Advertisement",
  "Other"
];

export default function PreConsultationStep({
  nextStep,
  prevStep,
  updateData,
  bookingData,
  bookingControllerRef,
}: Props) {

  const t = useTranslations("preConsultation");

  const pre = bookingData?.pre_consultation || {};
  const note = pre.note || {};
  const selectedAttendees = bookingData?.selectedAttendees || [];
  const maxAttendees = bookingData?.appointmentType?.max_attendees || 1;

  const [emailInput, setEmailInput] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const isCustomReferral = pre.referral && !REFERRAL_SOURCES.includes(pre.referral);

  const { user } = useAuth();

  // Validation Logic
  const validateFields = () => {
    if (!note.concern?.trim()) {
      toast.error(t("errors.concern"), { icon: <AlertCircle className="text-red-500" /> });
      return false;
    }
    if (!note.outcome?.trim()) {
      toast.error(t("errors.outcome"), { icon: <AlertCircle className="text-red-500" /> });
      return false;
    }
    if (!pre.referral?.trim()) {
      toast.error(t("errors.referral"), { icon: <AlertCircle className="text-red-500" /> });
      return false;
    }
    return true;
  };

  useEffect(() => {
    bookingControllerRef.current.validateStep = validateFields;
    bookingControllerRef.current.getAttachment = () => attachment;
  }, [attachment, note, pre.referral, selectedAttendees, maxAttendees]);

  const addAttendee = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.trim() || !emailRegex.test(emailInput)) {
      toast.error(t("errors.email"));
      return;
    }
    if (selectedAttendees.length >= maxAttendees) {
      toast.error(t("errors.maxAttendees", { count: maxAttendees }));
      return;
    }
    if (selectedAttendees.includes(emailInput)) {
      toast.error(t("errors.duplicateEmail"));
      return;
    }
    if (user?.user?.email === emailInput) {
      toast.error(t("errors.selfInvite"));
      return;
    }
    updateData({ selectedAttendees: [...selectedAttendees, emailInput] });
    setEmailInput("");
  };

  const removeAttendee = (email: string) => {
    updateData({ selectedAttendees: selectedAttendees.filter((e) => e !== email) });
  };

  const handleNext = () => {
    if (validateFields()) {
      nextStep();
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFDFF] py-12 px-4 md:px-8 pb-32">
      <div className="max-w-4xl mx-auto">

        {/* Step Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {t("title")}
            </h2>
            <p className="text-slate-500 font-medium mt-1">
              {t("subtitle", { doctor: bookingData.selectedDoctor?.name ?? "" })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm self-start">
            <ShieldCheck className="w-4 h-4 text-teal-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {t("privacy")}
            </span>
          </div>
        </div>

        <div className="space-y-6">

          {/* Main Info Card */}
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-50">
            <div className="grid md:grid-cols-2 gap-8">

              {/* Concern */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                  <MessageSquare className="w-4 h-4 text-teal-500" />
                  {t("concern")} <span className="text-red-400">*</span>
                </label>
                <textarea
                  placeholder={t("concernPlaceholder")}
                  value={note.concern || ""}
                  onChange={(e) =>
                    updateData({ pre_consultation: { ...pre, note: { ...note, concern: e.target.value } } })
                  }
                  className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm focus:border-teal-500 focus:ring-4 focus:ring-teal-50/50 min-h-[140px] bg-slate-50/50 transition-all outline-none resize-none"
                />
              </div>

              {/* Outcome */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                  <Target className="w-4 h-4 text-teal-500" />
                  {t("outcome")} <span className="text-red-400">*</span>
                </label>
                <textarea
                  placeholder={t("outcomePlaceholder")}
                  value={note.outcome || ""}
                  onChange={(e) =>
                    updateData({ pre_consultation: { ...pre, note: { ...note, outcome: e.target.value } } })
                  }
                  className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm focus:border-teal-500 focus:ring-4 focus:ring-teal-50/50 min-h-[140px] bg-slate-50/50 transition-all outline-none resize-none"
                />
              </div>
            </div>

            {/* Referral */}
            <div className="mt-8 pt-8 border-t border-dashed border-slate-100">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-4">
                {t("referral")} <span className="text-red-400">*</span>
              </label>

              <div className="relative group">
                <select
                  value={isCustomReferral ? "Other" : (pre.referral || "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateData({ pre_consultation: { ...pre, referral: val === "Other" ? "" : val } });
                  }}
                  className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm focus:border-teal-500 bg-slate-50/50 appearance-none cursor-pointer outline-none transition-all font-bold text-slate-700"
                >
                  <option value="" disabled>{t("selectOption")}</option>
                  {REFERRAL_SOURCES.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 pointer-events-none transition-colors" />
              </div>

              {(isCustomReferral || (pre.referral === "" && pre.referral !== undefined)) && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <input
                    placeholder={t("customReferral")}
                    value={pre.referral || ""}
                    onChange={(e) => updateData({ pre_consultation: { ...pre, referral: e.target.value } })}
                    className="w-full border-2 border-teal-100 rounded-2xl p-4 text-sm focus:border-teal-500 bg-white shadow-inner outline-none font-medium"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Files & Attendees */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-4">
                {t("attachments")}
              </label>

              {!attachment ? (
                <label className="group flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-teal-50/50 hover:border-teal-300 transition-all">
                  <Paperclip className="w-8 h-8 text-slate-300 group-hover:text-teal-500 mb-2 transition-colors" />
                  <p className="text-xs font-bold text-slate-400 group-hover:text-teal-700">
                    {t("uploadHint")}
                  </p>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.png,.jpeg" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 bg-teal-50 border border-teal-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-500 p-2 rounded-xl text-white shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-teal-900 truncate max-w-[150px]">
                      {attachment.name}
                    </span>
                  </div>
                  <button onClick={() => setAttachment(null)} className="p-1 hover:bg-white rounded-full text-teal-600 shadow-sm transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {maxAttendees > 1 && (
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {t("attendees")}
                  </label>
                  <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[10px] font-black rounded-lg border border-teal-100">
                    {t("maxLabel")} {maxAttendees}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder={t("invitePlaceholder")}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                    className="flex-1 border-2 border-slate-50 rounded-2xl p-3 text-sm focus:border-teal-500 bg-slate-50/50 outline-none font-medium"
                  />
                  <button onClick={addAttendee} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-teal-600 transition-all shadow-lg shadow-slate-200">
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedAttendees.map((email) => (
                    <div key={email} className="flex items-center gap-2 bg-slate-50 border border-slate-100 pl-3 pr-1 py-1 rounded-xl text-[11px] font-bold text-slate-600">
                      {email}
                      <button onClick={() => removeAttendee(email)} className="p-1 hover:bg-white rounded-full text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 p-4 md:p-6 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button onClick={() => prevStep()} className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-50 transition-all">
            {t("back")}
          </button>

          <button onClick={handleNext} className="flex-1 md:flex-none px-12 py-3 bg-slate-900 hover:bg-teal-600 text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
            {t("continue")}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
