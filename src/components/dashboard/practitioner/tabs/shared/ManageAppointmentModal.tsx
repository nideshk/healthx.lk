"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

interface ManageAppointmentModalProps {
  open: boolean;
  appointment: any; // replace with Appointment type later
  onClose: () => void;
}

type Screen =
  | "menu"
  | "cancel"
  | "reschedule"
  | "refund"
  | "resend";

const mockClinicians = [
  { id: "c1", name: "Dr. Rohan Fernando" },
  { id: "c2", name: "Dr. Priya Wijesinghe" },
  { id: "c3", name: "Dr. Saman Jayawardena" },
];

const ManageAppointmentModal: React.FC<ManageAppointmentModalProps> = ({
  open,
  appointment,
  onClose,
}) => {
  const [screen, setScreen] = useState<Screen>("menu");

  const [cancelReason, setCancelReason] = useState("");
  const [selectedClinician, setSelectedClinician] = useState("");
  const [newTime, setNewTime] = useState("");
  const [refundReason, setRefundReason] = useState("");

  if (!open) return null;

  /* -------------------------------------------------------------------------- */
  /*                             Reusable Modal Wrapper                          */
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
  /*                                 Main Menu                                  */
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
          { label: "Request Refund", action: () => setScreen("refund") },
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
  /*                             Cancel Appointment                              */
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
        />

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => setScreen("menu")}>
            Back
          </Button>
          <Button variant="danger">Confirm Cancellation</Button>
        </div>
      </ModalWrapper>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                           Reschedule Appointment                            */
  /* -------------------------------------------------------------------------- */

  if (screen === "reschedule") {
    return (
      <ModalWrapper>
        <div className="text-lg font-semibold text-slate-900 mb-3">
          Manage Appointment
        </div>

        <div className="text-sm font-medium mb-1">Select New Clinician</div>

        <select
          className="w-full border border-slate-300 rounded-lg p-2 text-sm"
          value={selectedClinician}
          onChange={(e) => setSelectedClinician(e.target.value)}
        >
          <option value="">Choose clinician</option>
          {mockClinicians.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="text-sm font-medium mt-3 mb-1">New Time Slot</div>

        <Input
          type="time"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
        />

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => setScreen("menu")}>
            Back
          </Button>
          <Button>Confirm Reschedule</Button>
        </div>
      </ModalWrapper>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                              Refund Request Screen                         */
  /* -------------------------------------------------------------------------- */

  if (screen === "refund") {
    return (
      <ModalWrapper>
        <div className="text-lg font-semibold text-slate-900 mb-3">
          Manage Appointment
        </div>

        <div className="text-sm font-medium mb-2">Refund Reason</div>

        <div className="space-y-2 text-sm">
          {["Duplicate Payment", "Fraudulent Transaction", "Customer Request"].map(
            (reason) => (
              <label key={reason} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="refundReason"
                  value={reason}
                  checked={refundReason === reason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
                {reason}
              </label>
            )
          )}
        </div>

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => setScreen("menu")}>
            Back
          </Button>
          <Button>Submit Refund Request</Button>
        </div>
      </ModalWrapper>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                          Resend Telehealth Details                          */
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
          <Button variant="outline" onClick={() => setScreen("menu")}>
            Back
          </Button>
          <Button>Resend Details</Button>
        </div>
      </ModalWrapper>
    );
  }

  return null;
};

export default ManageAppointmentModal;
