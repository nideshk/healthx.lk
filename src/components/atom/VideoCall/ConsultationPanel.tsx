"use client";

import { authFetch } from "@/lib/authFetch";
import { useEffect, useState } from "react";

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
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [consultationMeta, setConsultationMeta] = useState({
    mainConcern: "",
    goal: "",
    duration: ""
  });
  const [attachments, setAttachments] = useState<
    Array<{ name?: string; document_type?: string; url: string }>
  >([]);

  useEffect(() => {
  const fetchConsultationDetails = async () => {
    setConsultationLoading(true);
    try {
      const res = await authFetch(
        `/api/booking/appointment/${appointmentId}/consultation`
      );
      if (!res.ok) return;

      const data = await res.json();

      setConsultationMeta({
        mainConcern: data.preconsult?.raw_payload?.note?.concern || "",
        goal: data.preconsult?.raw_payload?.note?.outcome || "",
        duration: data.preconsult?.raw_payload?.note?.duration || ""

      });

      setAttachments(
        (data.attachments || []).map((a: any) => ({
          url: a.view_url,
          name: a.file_name,
          document_type: a.file_type,
        }))
      );

      // preload existing encounter values
      setClinicianNotes(data.encounter?.clinician_notes || "");
      setPrescriptions(data.encounter?.prescriptions || "");
      setFollowUpNeeded(!!data.encounter?.follow_up_needed);
      setFollowUpDate(
        data.encounter?.follow_up_date?.slice(0, 10) || null
      );
    } finally {
      setConsultationLoading(false);
    }
  };

  fetchConsultationDetails();
}, [appointmentId]);
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
      className="w-full bg-[#f9fafb] h-full p-6 flex flex-col overflow-y-auto border-l border-gray-200"
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

      {/* Pre-Consultation Details */}
      <div className="mb-4 p-4 rounded-xl bg-white shadow-sm border">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Pre-Consultation Details
        </h3>

        {consultationLoading ? (
          <p className="text-xs text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-4">
            {/* Main Concern */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                What is your main concern today?
              </label>
              <div className="mt-2 w-full min-h-[100px] p-3 rounded-lg border bg-gray-50 text-gray-900 whitespace-pre-wrap">
                {consultationMeta.mainConcern || "—"}
              </div>
            </div>

            {/* Goal */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                What are you hoping to achieve?
              </label>
              <div className="mt-2 w-full min-h-[100px] p-3 rounded-lg border bg-gray-50 text-gray-900 whitespace-pre-wrap">
                {consultationMeta.goal || "—"}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Duration of symptoms
              </label>
              <div className="mt-2 w-full p-3 rounded-lg border bg-gray-50 text-gray-900">
                {consultationMeta.duration || "—"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supporting Documents */}
      <div className="mb-4 p-4 rounded-xl bg-white shadow-sm border">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Supporting Documents
        </h3>

        {attachments.length === 0 ? (
          <div className="mt-2 w-full p-3 rounded-lg border bg-gray-50 text-gray-500 text-sm italic">
            No supporting documents uploaded.
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((doc, idx) => (
              <a
                key={idx}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-lg border bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition"
              >
                {/* LEFT SIDE */}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {(doc.name || doc.document_type || "Document").replace(/_/g, " ")}
                  </span>

                  {doc.document_type && (
                    <span className="text-xs text-gray-500 uppercase">
                      {doc.document_type}
                    </span>
                  )}
                </div>

                {/* RIGHT SIDE */}
                <span className="text-xs font-medium text-blue-600 ml-4 shrink-0">
                  View
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Clinician Notes */}
      <div className="mb-4 p-4 rounded-xl bg-white shadow-sm border">
        <label className="text-sm font-medium text-gray-700">
          Clinician Notes
        </label>
        <textarea
          className="mt-2 w-full min-h-[160px] p-3 rounded-lg border bg-gray-50 text-black"
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
          className="mt-2 w-full min-h-[120px] p-3 rounded-lg border bg-gray-50 text-black"
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
            className="text-black"
            onChange={(e) => setFollowUpNeeded(e.target.checked)}
          />
          Follow-up required
        </label>

        {followUpNeeded && (
          <input
            type="date"
            className="mt-3 w-full p-2 rounded-lg border text-black"
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
