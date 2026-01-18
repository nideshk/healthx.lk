"use client";

import { authFetch } from "@/lib/authFetch";
import { useState } from "react";

type Props = {
  appointmentId: string;
};

export default function ConsultationPanel({ appointmentId }: Props) {
  const [clinicianNotes, setClinicianNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ---------------------------------------------------------
     Save consultation (POST only)
  --------------------------------------------------------- */
  const saveConsultation = async () => {
    setError(null);
    setSuccess(null);

    if (followUpNeeded && !followUpDate) {
      setError("Please select a follow-up date");
      return;
    }

    setSaving(true);

    try {
      const res = await authFetch(
        `/api/booking/appointment/${appointmentId}/consultation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinician_notes: clinicianNotes || null,
            prescriptions: prescriptions || null,
            follow_up_needed: followUpNeeded,
            follow_up_date: followUpNeeded ? followUpDate : null,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to save consultation");
      }

      setSuccess("Consultation saved successfully");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */
  return (
    <aside
      className="w-[30%] bg-[#f9fafb] h-full p-6 flex flex-col overflow-y-auto border-l border-gray-200"
      style={{ minWidth: 340, maxWidth: 420 }}
    >
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Consultation Tools
      </h2>

      {/* Appointment ID */}
      <div className="mb-6 p-4 rounded-xl bg-white shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-600">Appointment ID</h3>
        <p className="text-gray-900 mt-1 text-sm font-mono break-all">
          {appointmentId}
        </p>
      </div>

      {/* Clinician Notes */}
      <div className="mb-4 p-4 rounded-xl bg-white shadow-sm border">
        <label className="text-sm font-medium text-gray-700">
          Clinician Notes
        </label>
        <textarea
          className="mt-2 w-full min-h-[160px] p-3 rounded-lg border bg-gray-50"
          placeholder="Write clinical notes here..."
          value={clinicianNotes}
          onChange={(e) => setClinicianNotes(e.target.value)}
        />
      </div>

      {/* Prescriptions */}
      <div className="mb-4 p-4 rounded-xl bg-white shadow-sm border">
        <label className="text-sm font-medium text-gray-700">
          Prescriptions / Advice
        </label>
        <textarea
          className="mt-2 w-full min-h-[120px] p-3 rounded-lg border bg-gray-50"
          placeholder="Medicines, dosage, instructions..."
          value={prescriptions}
          onChange={(e) => setPrescriptions(e.target.value)}
        />
      </div>

      {/* Follow-up */}
      <div className="mb-4 p-4 rounded-xl bg-white shadow-sm border">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={followUpNeeded}
            onChange={(e) => setFollowUpNeeded(e.target.checked)}
          />
          Follow-up required
        </label>

        {followUpNeeded && (
          <input
            type="date"
            className="mt-3 w-full p-2 rounded-lg border"
            value={followUpDate ?? ""}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        )}
      </div>

      {/* Messages */}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {success && <p className="mb-3 text-sm text-green-600">{success}</p>}

      {/* Save */}
      <button
        onClick={saveConsultation}
        disabled={saving}
        className="mt-auto w-full rounded-xl bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 transition disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Consultation"}
      </button>
    </aside>
  );
}
