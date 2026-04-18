"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Paperclip,
  X,
  UserPlus,
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  Target,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";
import { AppointmentFormInputs } from "@/types/FormType";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";
import Price from "@/components/common/Price";

interface Props {
  bookingControllerRef: React.MutableRefObject<{
    validateStep?: () => boolean;
    getAttachments?: () => File[];
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
  "Other",
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

  const [emailInput, setEmailInput] = useState({
    email: "",
    relationship: "",
  });

  const [attachments, setAttachments] = useState<File[]>([]);

  const isCustomReferral =
    pre.referral && !REFERRAL_SOURCES.includes(pre.referral);

  const { user } = useAuth();

  const typeFee = bookingData?.appointmentType?.fee || 0;
  const platformFee = bookingData?.appointmentType?.platform_fee || 0;
  const totalPayable =
    typeFee + platformFee + selectedAttendees.length * 500;

  const validateFields = () => {
    if (!note.concern?.trim()) {
      toast.error(t("errors.concern"));
      return false;
    }
    if (!note.outcome?.trim()) {
      toast.error(t("errors.outcome"));
      return false;
    }
    if (!note.duration?.trim()) {
      toast.error(t("errors.duration"));
      return false;
    }
    if (!pre.referral?.trim()) {
      toast.error(t("errors.referral"));
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (bookingControllerRef.current) {
      bookingControllerRef.current.validateStep = validateFields;
      bookingControllerRef.current.getAttachments = () => attachments;
    }
  }, [attachments, note, pre.referral, selectedAttendees]);

  const addAttendee = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailInput.email.trim() || !emailRegex.test(emailInput.email)) {
      toast.error(t("errors.email"));
      return;
    }

    if (!emailInput.relationship) {
      toast.error("Please select relationship");
      return;
    }

    if (selectedAttendees.length >= maxAttendees) {
      toast.error(t("errors.maxAttendees", { count: maxAttendees }));
      return;
    }

    if (selectedAttendees.some((a) => a.email === emailInput.email)) {
      toast.error(t("errors.duplicateEmail"));
      return;
    }

    if (user?.user?.email === emailInput.email) {
      toast.error(t("errors.selfInvite"));
      return;
    }

    updateData({
      selectedAttendees: [
        ...selectedAttendees,
        {
          email: emailInput.email,
          relationship: emailInput.relationship,
        },
      ],
    });

    setEmailInput({ email: "", relationship: "" });
  };

  const removeAttendee = (email: string) => {
    updateData({
      selectedAttendees: selectedAttendees.filter(
        (a) => a.email !== email
      ),
    });
  };

  const handleNext = () => {
    if (!validateFields()) return;

    // Check if user has filled out attendee fields but forgot to click "Add"
    if (emailInput.email.trim() || emailInput.relationship) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(emailInput.email);
      const isDuplicate = selectedAttendees.some((a) => a.email === emailInput.email);
      const isSelf = user?.user?.email === emailInput.email;
      const spaceLeft = selectedAttendees.length < maxAttendees;

      if (isValidEmail && emailInput.relationship && !isDuplicate && !isSelf && spaceLeft) {
        // Auto-add it for them
        addAttendee();
      } else {
        // Something is wrong or incomplete (e.g. invalid email or missing relationship)
        // Warn the user so they don't move forward thinking the attendee was added
        toast.warning("You have unsaved attendee info. Please click the '+' button or clear the fields to continue.");
        return;
      }
    }

    nextStep();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const remainingSlots = 3 - attachments.length;

    if (selectedFiles.length > remainingSlots) {
      toast.warning(t("errors.maxThreeFiles", { defaultValue: "You can only upload up to 3 documents" }));
    }

    const filesToAdd = selectedFiles.slice(0, remainingSlots);
    setAttachments([...attachments, ...filesToAdd]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-[#FBFDFF] py-12 px-4 md:px-8 pb-40">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {t("title")}
            </h2>
            <p className="text-slate-500 font-medium mt-1">
              {t("subtitle", {
                doctor: bookingData.selectedDoctor?.name ?? "",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm self-start">
            <ShieldCheck className="w-4 h-4 text-teal-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {t("privacy")}
            </span>
          </div>
        </div>

        {/* MAIN FORM */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-50">
          <div className="flex flex-col gap-8">
            {/* Concern */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <MessageSquare className="w-4 h-4 text-teal-500" />
                {t("concern")} *
              </label>
              <textarea
                value={note.concern || ""}
                onChange={(e) =>
                  updateData({
                    pre_consultation: {
                      ...pre,
                      note: { ...note, concern: e.target.value },
                    },
                  })
                }
                className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm"
              />
            </div>

            {/* Outcome */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <Target className="w-4 h-4 text-teal-500" />
                {t("outcome")} *
              </label>
              <textarea
                value={note.outcome || ""}
                onChange={(e) =>
                  updateData({
                    pre_consultation: {
                      ...pre,
                      note: { ...note, outcome: e.target.value },
                    },
                  })
                }
                className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm"
              />
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <Target className="w-4 h-4 text-teal-500" />
                {t("duration")} *
              </label>
              <textarea
                value={note.duration || ""}
                onChange={(e) =>
                  updateData({
                    pre_consultation: {
                      ...pre,
                      note: { ...note, duration: e.target.value },
                    },
                  })
                }
                className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm"
              />
            </div>
          </div>
        </div>
        {/* Referral */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50 mt-6">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-4">
            {t("referral")} *
          </label>

          <div className="relative group">
            <select
              value={isCustomReferral ? "Other" : pre.referral || ""}
              onChange={(e) => {
                const val = e.target.value;
                updateData({
                  pre_consultation: {
                    ...pre,
                    referral: val === "Other" ? "" : val,
                  },
                });
              }}
              className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm focus:border-teal-500 bg-slate-50/50 appearance-none cursor-pointer outline-none transition-all font-bold text-slate-700"
            >
              <option value="" disabled>
                {t("selectOption")}
              </option>
              {REFERRAL_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>

            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 pointer-events-none transition-colors" />
          </div>

          {(isCustomReferral ||
            (pre.referral === "" && pre.referral !== undefined)) && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <input
                  placeholder={t("customReferral")}
                  value={pre.referral || ""}
                  onChange={(e) =>
                    updateData({
                      pre_consultation: {
                        ...pre,
                        referral: e.target.value,
                      },
                    })
                  }
                  className="w-full border-2 border-teal-100 rounded-2xl p-4 text-sm focus:border-teal-500 bg-white shadow-inner outline-none font-medium"
                />
              </div>
            )}
        </div>

        <div className="flex flex-col gap-6 mt-6">
          {/* Attachment */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 block">
                {t("attachments")}
              </label>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {attachments.length} / 3
              </span>
            </div>

            {attachments.length < 3 ? (
              <label className="group flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-teal-50/50 hover:border-teal-300 transition-all">
                <Paperclip className="w-8 h-8 text-slate-300 group-hover:text-teal-500 mb-2 transition-colors" />
                <p className="text-xs font-bold text-slate-400 group-hover:text-teal-700 text-center px-4">
                  {attachments.length === 0 ? t("uploadHint") : t("uploadMoreHint", { defaultValue: "Add more documents" })}
                </p>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.jpg,.png,.jpeg"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="w-full h-40 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center bg-slate-50/50 opacity-60">
                <CheckCircle2 className="w-8 h-8 text-teal-400 mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Maximum limit reached
                </p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {attachments.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-4 bg-teal-50 border border-teal-100 rounded-2xl">
                  <div className="flex items-center gap-3 truncate">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <FileText className="w-4 h-4 text-teal-500" />
                    </div>
                    <span className="text-sm font-bold text-teal-900 truncate">
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="p-1 hover:bg-white rounded-full text-teal-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[11px] font-bold text-slate-400 italic">
              {t("fileDeletionNote")}
            </p>
          </div>


          {/* Attendees */}
          {maxAttendees > 1 && (
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
              <div className="flex flex-col">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 leading-none">
                  {t("attendees")}
                </label>
              </div>

              <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-blue-700 leading-normal">
                  {t.rich("attendeeFeeNote", {
                    price: () => <Price amount={500} />,
                  })}
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <input
                  type="email"
                  placeholder={t("invitePlaceholder")}
                  value={emailInput.email}
                  onChange={(e) =>
                    setEmailInput({
                      ...emailInput,
                      email: e.target.value,
                    })
                  }
                  className="flex-1 border-2 border-slate-50 rounded-2xl p-3 text-sm focus:border-teal-500 bg-slate-50/50 outline-none font-medium"
                />

                <select
                  value={emailInput.relationship}
                  onChange={(e) =>
                    setEmailInput({
                      ...emailInput,
                      relationship: e.target.value,
                    })
                  }
                  className="border-2 border-slate-50 rounded-2xl p-3 text-sm bg-slate-50/50 outline-none font-medium"
                >
                  <option value="" disabled>
                    Relationship
                  </option>
                  <option value="partner">Partner</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>

                <button
                  onClick={addAttendee}
                  className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-teal-600 transition-all shadow-lg shadow-slate-200"
                >
                  <UserPlus className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedAttendees.map((attendee) => (
                  <div
                    key={attendee.email}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-100 pl-3 pr-1 py-1 rounded-xl text-[11px] font-bold text-slate-600"
                  >
                    {attendee.email}
                    <span className="text-slate-400">
                      ({attendee.relationship})
                    </span>
                    <button
                      onClick={() =>
                        removeAttendee(attendee.email)
                      }
                      className="p-1 hover:bg-white rounded-full text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FILE + ATTENDEE SECTION */}
        {/* (unchanged from previous version) */}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 p-4 md:p-6 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => prevStep()}
            className="hidden md:block px-8 py-3 rounded-2xl text-sm font-bold text-slate-400"
          >
            {t("back")}
          </button>

          <div className="flex-1 flex items-center justify-end gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total Amount
              </p>
              <p className="text-xl font-black text-slate-900">
                <Price amount={totalPayable} />
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full md:w-auto px-10 py-4 bg-slate-900 hover:bg-teal-600 text-white rounded-2xl text-sm font-bold"
            >
              {t("continue")}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
