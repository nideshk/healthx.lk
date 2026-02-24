"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { toast } from "react-toastify";
import { authFetch } from "@/lib/authFetch";

interface ManageAppointmentModalProps {
  open: boolean;
  appointment: any; // replace with Appointment type later
  onClose: () => void;
}

type Screen = "menu" | "cancel" | "resend";

const ManageAppointmentModal: React.FC<ManageAppointmentModalProps> = ({
  open,
  appointment,
  onClose,
}) => {
  const [screen, setScreen] = useState<Screen>("menu");
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Note: These were in your original code, keeping them to avoid removing code
  const [selectedClinician, setSelectedClinician] = useState("");
  const [newTime, setNewTime] = useState("");
  const [refundReason, setRefundReason] = useState("");

  if (!open) return null;

  /* -------------------------------------------------------------------------- */
  /* API Handlers                                                               */
  /* -------------------------------------------------------------------------- */

  const handleCancelAppointment = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authFetch(`/api/booking/appointment/${appointment?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel",
          reason: cancelReason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Appointment cancelled");
        // Refresh the page to reflect changes in the calendar/list
        window.location.reload();
      } else {
        throw new Error(data.message || "Failed to cancel appointment");
      }
    } catch (error: any) {
      toast.error(error.message || "Unable to cancel appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendDetails = async () => {
    setIsSubmitting(true);
    try {
      // Dynamic content construction based on your requirements
      const patientName = appointment.patient || "Patient";
      const apptType = appointment.appointmentType || "Standard Consultation";
      const apptDate = appointment.date || "N/A";
      const apptTime = appointment.time || "N/A";
      const roomKey = appointment.room_key || "";
      const meetingUrl = `${window.location.origin}/appointment/meeting?room=${roomKey}`;

      const messageContent = `
Hello ${patientName},

Here are your appointment details:

Appointment Type: ${apptType}
Date: ${apptDate}
Time: ${apptTime}

Join your appointment using the link below:
${meetingUrl}

Regards,
Clinecxa Team
      `.trim();

      const response = await authFetch("/api/notify-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: appointment.patient_id || appointment.userId,
          role: "patient",
          eventType: "appointment_resend",
          title: "Your Appointment Details",
          message: messageContent,
          channels: ["email", "sms"],
          payload: {
            email: appointment.email || "",
            phone: appointment.contact_number || "",
            appointment_id: appointment.id,
            room_key: roomKey,
            meeting_url: meetingUrl,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Details resent successfully");
        // Reset to first page and close modal
        setScreen("menu");
        onClose();
      } else {
        throw new Error(data.message || "Failed to resend details");
      }
    } catch (error: any) {
      toast.error(error.message || "Unable to resend appointment details");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* Reusable Modal Wrapper                          */
  /* -------------------------------------------------------------------------- */

  const ModalWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl relative">
        <button
          className="absolute right-4 top-4 text-slate-500 hover:text-slate-700 text-xl"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* Main Menu                                  */
  /* -------------------------------------------------------------------------- */

  if (screen === "menu") {
    return (
      <ModalWrapper>
        <div className="text-lg font-semibold text-slate-900 mb-4">
          Manage Appointment
        </div>

        <div className="space-y-2">
          {[
            { label: "Cancel Appointment", action: () => setScreen("cancel") },
            {
              label: "Resend Telehealth Details",
              action: () => setScreen("resend"),
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="
              w-full text-left px-4 py-3 rounded-lg
              border border-slate-200
              text-slate-700
              hover:bg-blue-500 hover:text-white
              transition-colors
            "
            >
              {item.label}
            </button>
          ))}
        </div>
      </ModalWrapper>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* Cancel Appointment                              */
  /* -------------------------------------------------------------------------- */

  if (screen === "cancel") {
    return (
      <ModalWrapper>
        <div className="text-lg font-semibold text-slate-900 mb-3">
          Manage Appointment
        </div>

        <div className="text-sm font-medium mb-2">Cancellation Reason</div>

        <textarea
          className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none"
          rows={4}
          placeholder="Please provide a reason for cancellation..."
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          disabled={isSubmitting}
        />

        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => setScreen("menu")}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            variant="danger"
            onClick={handleCancelAppointment}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </div>
      </ModalWrapper>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* Resend Telehealth Details                          */
  /* -------------------------------------------------------------------------- */

  if (screen === "resend") {
    return (
      <ModalWrapper>
        <div className="text-lg font-semibold text-slate-900 mb-3">
          Manage Appointment
        </div>

        <p className="text-sm text-slate-600 mb-4">
          This will resend the telehealth appointment details to the patient via
          email and text message.
        </p>

        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => setScreen("menu")}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            onClick={handleResendDetails}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Resending..." : "Resend Details"}
          </Button>
        </div>
      </ModalWrapper>
    );
  }

  return null;
};

export default ManageAppointmentModal;