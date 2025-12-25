"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";
import { AppointmentFormInputs } from "@/types/FormType";

interface Props {
  bookingControllerRef: React.MutableRefObject<{
    validateStep?: () => boolean;
    getAttachment?: () => File | null;
  }>;
  bookingData: AppointmentFormInputs;
  updateData: (d: Partial<AppointmentFormInputs>) => void;
  nextStep: (data?: Partial<AppointmentFormInputs>) => void;
  prevStep: (data?: Partial<AppointmentFormInputs>) => void;
}

export default function PreConsultationStep({
  nextStep,
  prevStep,
  updateData,
  bookingData,
  bookingControllerRef,
}: Props) {
  const pre = bookingData?.pre_consultation || {};
  const note = pre.note || {};
  const selectedAttendees = bookingData?.selectedAttendees || [];
  const maxAttendees = bookingData?.appointmentType?.max_attendees || 1;

  const [emailInput, setEmailInput] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  /* ------------------------------------------------
   * REGISTER CONTROLLER METHODS (KEY PART)
   * ------------------------------------------------ */
  useEffect(() => {
    bookingControllerRef.current.validateStep = () => {
      if (!note.concern?.trim()) {
        toast.error("Please enter your main concern.");
        return false;
      }
      if (!note.outcome?.trim()) {
        toast.error("Please enter your desired outcome.");
        return false;
      }
      if (!pre.referral?.trim()) {
        toast.error("Please provide referral source.");
        return false;
      }
      if (maxAttendees > 1 && selectedAttendees.length === 0) {
        toast.error("Please add at least one attendee email.");
        return false;
      }
      return true;
    };

    bookingControllerRef.current.getAttachment = () => attachment;

    // 🔍 Debug (remove later)
    console.log("✅ PreConsult controller registered:", bookingControllerRef.current);
  }, [attachment, note, pre.referral, selectedAttendees, maxAttendees]);

  /* ------------------------------------------------
   * FORM HANDLERS
   * ------------------------------------------------ */
  const handleChange = (field: "concern" | "outcome", value: string) => {
    updateData({
      pre_consultation: {
        ...pre,
        note: { ...note, [field]: value },
      },
    });
  };

  const handleReferralChange = (value: string) => {
    updateData({
      pre_consultation: {
        ...pre,
        referral: value,
      },
    });
  };

  const addAttendee = () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error("Enter a valid email.");
      return;
    }
    if (selectedAttendees.includes(emailInput)) {
      toast.error("Email already added.");
      return;
    }
    updateData({
      selectedAttendees: [...selectedAttendees, emailInput],
    });
    setEmailInput("");
  };

  const removeAttendee = (email: string) => {
    updateData({
      selectedAttendees: selectedAttendees.filter((e) => e !== email),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);

      // Optional: store file name ONLY (safe)
      updateData({
        pre_consultation: {
          ...pre,
          attachment: file.name,
        },
      });

      console.log("📤 Attachment selected:", file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    updateData({
      pre_consultation: {
        ...pre,
        attachment: null,
      },
    });
  };

  const handleNext = () => {
    if (!bookingControllerRef.current.validateStep?.()) return;
    nextStep();
  };

  /* ------------------------------------------------
   * RENDER
   * ------------------------------------------------ */
  return (
    <div className="py-12 px-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Pre-Consultation Details
        </h2>
        <p className="text-gray-600 text-center mb-10">
          Provide key details, optional attachments, and attendee email(s).
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Main Concern
            </label>
            <textarea
              value={note.concern || ""}
              onChange={(e) => handleChange("concern", e.target.value)}
              className="w-full border rounded-lg p-3 text-sm"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Desired Outcome
            </label>
            <textarea
              value={note.outcome || ""}
              onChange={(e) => handleChange("outcome", e.target.value)}
              className="w-full border rounded-lg p-3 text-sm"
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              How did you hear about us?
            </label>
            <input
              value={pre.referral || ""}
              onChange={(e) => handleReferralChange(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>

          {/* ATTACHMENT */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Attachment (optional)
            </label>

            <div className="flex items-center gap-3">
              <label
                htmlFor="attachment-upload"
                className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-md bg-blue-50 border border-blue-300 text-blue-700 text-sm font-medium"
              >
                <Paperclip className="w-4 h-4" />
                {attachment ? "Replace File" : "Upload File"}
              </label>

              <input
                id="attachment-upload"
                type="file"
                accept=".pdf,.jpg,.png,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              {attachment && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>{attachment.name}</span>
                  <button onClick={removeAttachment} className="text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {maxAttendees > 1 && (
          <div className="mb-10">
            <h3 className="text-lg font-semibold mb-3">Attendees</h3>

            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Enter attendee email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              />
              <button
                onClick={addAttendee}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Add
              </button>
            </div>

            {selectedAttendees.map((email) => (
              <div
                key={email}
                className="flex justify-between mt-2 bg-blue-50 px-4 py-2 rounded"
              >
                <span>{email}</span>
                <button onClick={() => removeAttendee(email)}>
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={() => prevStep()} className="px-4 py-2 border rounded">
            Back
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
