"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";
import { AppointmentFormInputs } from "@/types/FormType";

interface Props {
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
}

const PreConsultationStep = forwardRef(
  ({ nextStep, prevStep, updateData, bookingData }: Props, ref) => {

    const pre = bookingData?.pre_consultation || {};
    const note = pre.note || {};
    const selectedAttendees = bookingData?.selectedAttendees || [];

    const maxAttendees = bookingData?.appointmentType?.max_attendees || 1;

    const [emailInput, setEmailInput] = useState("");
    const [attachment, setAttachment] = useState<File | null>(null);

    // Update "concern" or "outcome"
    const handleChange = (field: "concern" | "outcome", value: string) => {
      updateData({
        pre_consultation: {
          ...pre,
          note: { ...note, [field]: value },
        },
      });
    };

    // Referral source
    const handleReferralChange = (value: string) => {
      updateData({
        pre_consultation: {
          ...pre,
          referral: value,
        },
      });
    };

    // Add attendee email
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

    // Remove attendee
    const removeAttendee = (email: string) => {
      updateData({
        selectedAttendees: selectedAttendees.filter((e) => e !== email),
      });
    };

    // File upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setAttachment(file);
        updateData({
          pre_consultation: {
            ...pre,
            attachment: file.name,
          },
        });
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

    // Validation exposed to parent
    useImperativeHandle(ref, () => ({
      validateStep: () => {
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

        // Only validate attendees IF more than 1 allowed
        if (maxAttendees > 1 && selectedAttendees.length === 0) {
          toast.error("Please add at least one attendee email.");
          return false;
        }

        return true;
      },
    }));

    // Handle Next Step
    const handleNext = () => {
      if (!note.concern?.trim() || !note.outcome?.trim() || !pre.referral?.trim()) {
        toast.error("Please complete all fields.");
        return;
      }

      if (maxAttendees > 1 && selectedAttendees.length === 0) {
        toast.error("Please add at least one attendee.");
        return;
      }

      nextStep();
    };

    return (
      <div className="py-12 px-6">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            Pre-Consultation Details
          </h2>
          <p className="text-gray-600 text-center mb-10">
            Provide key details, optional attachments, and (if applicable) attendee email(s).
          </p>

          {/* FORM */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Main Concern
              </label>
              <textarea
                value={note.concern || ""}
                onChange={(e) => handleChange("concern", e.target.value)}
                className="w-full border rounded-lg p-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Describe your concern"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Desired Outcome
              </label>
              <textarea
                value={note.outcome || ""}
                onChange={(e) => handleChange("outcome", e.target.value)}
                className="w-full border rounded-lg p-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="What do you hope to achieve?"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                How did you hear about us?
              </label>
              <input
                type="text"
                value={pre.referral || ""}
                onChange={(e) => handleReferralChange(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Friend / Google / Social Media / Other"
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
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-md bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100 text-sm font-medium"
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
                    <button
                      onClick={removeAttachment}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ONLY SHOW IF MORE THAN 1 ATTENDEE IS ALLOWED */}
          {maxAttendees > 1 && (
            <div className="mb-10">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Attendees</h3>
              <p className="text-sm text-gray-500 mb-3">
                Add email addresses of people who should receive the meeting link.
              </p>

              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Enter attendee email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addAttendee}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>

              {selectedAttendees.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedAttendees.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg text-sm"
                    >
                      <span>{email}</span>
                      <button
                        onClick={() => removeAttendee(email)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStep}
              className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Back
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }
);

PreConsultationStep.displayName = "PreConsultationStep";
export default PreConsultationStep;
