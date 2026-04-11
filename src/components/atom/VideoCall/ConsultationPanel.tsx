"use client";

import { authFetch } from "@/lib/authFetch";
import { useEffect, useState } from "react";
import { ExternalLink, ClipboardList, Pill } from "lucide-react";

type Props = {
  appointmentId: string;
};

interface MedicineItem {
  medicine_name: string;
  strength: string;
  route: string;
  duration: string;
}

export default function ConsultationPanel({ appointmentId }: Props) {
  const [clinicianNotes, setClinicianNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [prescriptionItems, setPrescriptionItems] = useState<MedicineItem[]>([]);
  const [specialNotes, setSpecialNotes] = useState("");
  const [prescriptionStatus, setPrescriptionStatus] = useState<
    "draft" | "issued"
  >("draft");

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

  const [activeTab, setActiveTab] = useState<"consultation" | "prescription">(
    "consultation"
  );

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
        setDiagnosis(data.encounter?.diagnosis || "");
        setFollowUpNeeded(!!data.encounter?.follow_up_needed);
        setFollowUpDate(data.encounter?.follow_up_date?.slice(0, 10) || null);

        // preload structured prescription if available
        if (data.prescription) {
          setPrescriptionId(data.prescription.id);
          setPrescriptionItems(data.prescription.items || []);
          setSpecialNotes(data.prescription.notes || "");
          setDiagnosis(prev => prev || data.prescription.diagnosis || "");
          setPrescriptionStatus(data.prescription.status || "draft");
        }
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
            diagnosis: diagnosis || null,
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

  const addMedicine = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      { medicine_name: "", strength: "", route: "Oral", duration: "" },
    ]);
  };

  const removeMedicine = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const updateMedicine = (
    index: number,
    field: keyof MedicineItem,
    value: string
  ) => {
    const newItems = [...prescriptionItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setPrescriptionItems(newItems);
  };

  const savePrescriptionDraft = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      let currentId = prescriptionId;

      // 1. Create or update prescription meta
      if (!currentId) {
        const res = await authFetch("/api/prescriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointment_id: appointmentId,
            notes: specialNotes,
            diagnosis: diagnosis || null,
          }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to create prescription");
        currentId = data.id;
        setPrescriptionId(currentId);
      } else {
        // Sync notes if needed (assuming same POST endpoint or similar)
        await authFetch(`/api/prescriptions/${currentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: specialNotes,
            diagnosis: diagnosis || null,
          }),
        });
      }

      // 2. Save items
      const itemsRes = await authFetch(
        `/api/prescriptions/${currentId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: prescriptionItems }),
        }
      );
      if (!itemsRes.ok) throw new Error("Failed to save prescription items");

      setSuccess("Draft saved successfully");
    } catch (err: any) {
      setError(err.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const issuePrescription = async () => {
    if (!prescriptionId) {
      setError("Please save as draft first");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await authFetch(
        `/api/prescriptions/${prescriptionId}/issue`,
        {
          method: "POST",
        }
      );
      if (!res.ok) throw new Error("Failed to issue prescription");
      setPrescriptionStatus("issued");
      setSuccess("Prescription issued successfully");
    } catch (err: any) {
      setError(err.message || "Failed to issue prescription");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */
  return (
    <aside
      className="w-full bg-[#f9fafb] h-full flex flex-col border-l border-gray-200 shadow-xl"
      style={{ minWidth: 300 }}
    >
      {/* Tabs Header */}
      <div className="flex bg-white border-b border-gray-200">
        <button
          onClick={() => setActiveTab("consultation")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 text-sm font-semibold transition-all border-b-2 ${activeTab === "consultation"
            ? "border-blue-600 text-blue-600 bg-blue-50/30"
            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <ClipboardList size={18} />
          Session
        </button>
        <button
          onClick={() => setActiveTab("prescription")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 text-sm font-semibold transition-all border-b-2 ${activeTab === "prescription"
            ? "border-blue-600 text-blue-600 bg-blue-50/30"
            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <Pill size={18} />
          Prescription
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "consultation" ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              Consultation Tools
            </h2>

            {/* Appointment ID */}
            <div className="p-4 rounded-xl bg-white shadow-sm border border-gray-100">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Appointment ID
              </h3>
              <p className="text-gray-900 mt-1 text-xs font-mono break-all">
                {appointmentId}
              </p>
            </div>

            {/* Pre-Consultation Details */}
            <div className="p-4 rounded-xl bg-white shadow-sm border">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">
                Pre-Consultation Details
              </h3>

              {consultationLoading ? (
                <p className="text-xs text-gray-500">Loading...</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Main Concern
                    </label>
                    <div className="mt-1.5 w-full min-h-[80px] p-3 rounded-lg border bg-gray-50 text-gray-900 text-sm whitespace-pre-wrap">
                      {consultationMeta.mainConcern || "—"}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Hoped Outcome
                    </label>
                    <div className="mt-1.5 w-full min-h-[80px] p-3 rounded-lg border bg-gray-50 text-gray-900 text-sm whitespace-pre-wrap">
                      {consultationMeta.goal || "—"}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Symptom Duration
                    </label>
                    <div className="mt-1.5 w-full p-2.5 rounded-lg border bg-gray-50 text-gray-900 text-sm">
                      {consultationMeta.duration || "—"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Supporting Documents */}
            <div className="p-4 rounded-xl bg-white shadow-sm border">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">
                Supporting Documents
              </h3>

              {attachments.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed text-gray-400 text-xs text-center italic">
                  No supporting documents uploaded.
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between p-3 rounded-lg border bg-gray-50 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {(doc.name || doc.document_type || "Document").replace(
                            /_/g,
                            " "
                          )}
                        </span>
                        {doc.document_type && (
                          <span className="text-[10px] text-gray-500 uppercase">
                            {doc.document_type}
                          </span>
                        )}
                      </div>
                      <ExternalLink size={14} className="text-blue-600 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 rounded-xl bg-white shadow-sm border">
              <label className="text-sm font-semibold text-gray-800">
                Clinician Notes
              </label>
              <textarea
                className="mt-3 w-full min-h-[160px] p-4 text-sm rounded-lg border bg-gray-50 text-black border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                placeholder="Start typing clinical assessment..."
                value={clinicianNotes}
                onChange={(e) => setClinicianNotes(e.target.value)}
              />
            </div>

            {/* Follow-up */}
            <div className="p-4 rounded-xl bg-white shadow-sm border">
              <label className="flex items-center gap-3 text-sm font-semibold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={followUpNeeded}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  onChange={(e) => setFollowUpNeeded(e.target.checked)}
                />
                Follow-up required
              </label>

              {followUpNeeded && (
                <input
                  type="date"
                  className="mt-4 w-full p-2.5 text-sm rounded-lg border bg-white text-black border-gray-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={followUpDate ?? ""}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              )}
            </div>

            {/* Save Consultation */}
            <button
              onClick={saveConsultation}
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 text-white py-4 font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition active:scale-[0.98] disabled:opacity-60 mt-4 h-14"
            >
              {saving ? "Saving…" : "Complete Consultation"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">
                  E-Prescription
                </h2>
              </div>
              {prescriptionId && (
                <a
                  href={`/api/prescriptions/${prescriptionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition"
                  title="Open full view"
                >
                  <ExternalLink size={20} />
                </a>
              )}
            </div>

            {/* Prescription Builder */}
            <div className="p-5 rounded-xl bg-white shadow-sm border border-blue-100 flex flex-col min-h-[500px]">
              <div className="mb-6">
                <label className="text-xs font-bold text-blue-800 uppercase tracking-widest pl-1">
                  Diagnosis
                </label>
                <textarea
                  className="mt-2 w-full min-h-[60px] p-3 text-sm rounded-xl border bg-blue-50/10 text-black border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Enter formal diagnosis..."
                  value={diagnosis}
                  disabled={prescriptionStatus === "issued"}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <label className="text-xs font-bold text-blue-800 flex justify-between items-center uppercase tracking-widest">
                Prescription Items
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${prescriptionStatus === "issued"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                    }`}
                >
                  {prescriptionStatus}
                </span>
              </label>

              <div className="mt-5 space-y-4">
                {prescriptionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 relative group hover:bg-white hover:shadow-md transition-all duration-300"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                          Medicine Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Paracetamol"
                          value={item.medicine_name}
                          disabled={prescriptionStatus === "issued"}
                          onChange={(e) =>
                            updateMedicine(idx, "medicine_name", e.target.value)
                          }
                          className="w-full text-xs p-2.5 mt-1 rounded-lg border bg-white text-black outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                          Strength
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 500mg"
                          value={item.strength}
                          disabled={prescriptionStatus === "issued"}
                          onChange={(e) =>
                            updateMedicine(idx, "strength", e.target.value)
                          }
                          className="w-full text-xs p-2.5 mt-1 rounded-lg border bg-white text-black outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                          Route
                        </label>
                        <select
                          value={item.route}
                          disabled={prescriptionStatus === "issued"}
                          onChange={(e) => updateMedicine(idx, "route", e.target.value)}
                          className="w-full text-xs p-2.5 mt-1 rounded-lg border bg-white text-black outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Oral">Oral</option>
                          <option value="IV">IV</option>
                          <option value="Local">Local</option>
                          <option value="Suppository">Suppository</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                          Duration
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 7 days"
                          value={item.duration}
                          disabled={prescriptionStatus === "issued"}
                          onChange={(e) =>
                            updateMedicine(idx, "duration", e.target.value)
                          }
                          className="w-full text-xs p-2.5 mt-1 rounded-lg border bg-white text-black outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {prescriptionStatus !== "issued" && (
                      <button
                        onClick={() => removeMedicine(idx)}
                        className="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full p-2 opacity-0 group-hover:opacity-100 transition shadow-sm border border-red-200"
                        title="Remove"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}

                {prescriptionStatus !== "issued" && (
                  <button
                    onClick={addMedicine}
                    className="w-full py-4 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 text-sm font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all duration-300"
                  >
                    + Add Medicine
                  </button>
                )}

                <div className="mt-6">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">
                    Pharmacy Instructions (Notes)
                  </label>
                  <textarea
                    className="mt-2 w-full min-h-[100px] p-4 text-sm rounded-xl border bg-gray-50/30 text-black outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="Provide additional instructions for the pharmacist..."
                    value={specialNotes}
                    disabled={prescriptionStatus === "issued"}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-auto pt-8 flex gap-3">
                <button
                  onClick={savePrescriptionDraft}
                  disabled={saving || prescriptionStatus === "issued"}
                  className="flex-1 bg-white border-2 border-blue-600 text-blue-600 py-4 rounded-xl text-sm font-bold hover:bg-blue-50 transition active:scale-95 disabled:opacity-50 h-14"
                >
                  Save Draft
                </button>
                <button
                  onClick={issuePrescription}
                  disabled={
                    saving ||
                    prescriptionStatus === "issued" ||
                    prescriptionItems.length === 0
                  }
                  className="flex-1 bg-blue-600 text-white py-4 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 h-14"
                >
                  Issue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className="px-6 pb-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-600 font-medium">
              {success}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

