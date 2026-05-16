"use client";

import { authFetch } from "@/lib/authFetch";
import { useEffect, useState, useRef } from "react";
import {
  ExternalLink,
  ClipboardList,
  Pill,
  Plus,
  X,
  Save,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  Eye,
  Search,
} from "lucide-react";

type Props = {
  appointmentId: string;
  readOnly?: boolean;
};

interface MedicineItem {
  medicine_name: string;
  strength: string;
  route: string;
  duration: string;
  notes: string;
}

const ROUTE_OPTIONS = ["Oral", "IV", "Local", "Suppository", "Other"] as const;

export default function ConsultationPanel({ appointmentId, readOnly = false }: Props) {
  /* ---------- Diagnosis ---------- */
  const [diagId, setDiagId] = useState<string | null>(null);
  const [diagCode, setDiagCode] = useState("");
  const [diagName, setDiagName] = useState("");
  const [diagDescription, setDiagDescription] = useState("");

  /* ---------- Diagnosis Search ---------- */
  const [diagSearchText, setDiagSearchText] = useState("");
  const [diagSearchResults, setDiagSearchResults] = useState<any[]>([]);
  const [isSearchingDiag, setIsSearchingDiag] = useState(false);
  const [showDiagDropdown, setShowDiagDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown if click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDiagDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Diagnosis search effect
  useEffect(() => {
    if (!diagSearchText || diagSearchText.length < 2) {
      setDiagSearchResults([]);
      setShowDiagDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingDiag(true);
      try {
        const res = await authFetch(
          `/api/diagnoses/search?q=${encodeURIComponent(diagSearchText)}`
        );
        if (res.ok) {
          const json = await res.json();
          setDiagSearchResults(json.data || []);
          setShowDiagDropdown(true);
        } else {
          setDiagSearchResults([]);
        }
      } catch (err) {
        console.error("Diagnosis search error", err);
      } finally {
        setIsSearchingDiag(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [diagSearchText]);

  const selectDiagnosis = (diag: any) => {
    setDiagId(diag.id);
    setDiagCode(diag.code || "");
    setDiagName(diag.name || "");
    setDiagDescription(diag.description || "");
    setDiagSearchText("");
    setShowDiagDropdown(false);
  };

  /* ---------- Clinician Notes ---------- */
  const [clinicianNotes, setClinicianNotes] = useState("");

  /* ---------- Prescription ---------- */
  const [prescriptionItems, setPrescriptionItems] = useState<MedicineItem[]>(
    []
  );
  const [specialNotes, setSpecialNotes] = useState("");
  const [prescriptionStatus, setPrescriptionStatus] = useState<
    "draft" | "ready_to_issue" | "issued"
  >("draft");

  /* ---------- Follow-up ---------- */
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string | null>(null);
  const [followupNotes, setFollowupNotes] = useState("");
  const [practitionerHasSignature, setPractitionerHasSignature] = useState(true);
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  /* ---------- UI State ---------- */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"consultation" | "prescription">(
    "consultation"
  );

  /* ---------- Pre-consult (read-only) ---------- */
  const [consultationMeta, setConsultationMeta] = useState({
    mainConcern: "",
    goal: "",
    duration: "",
    referral: "",
  });

  const [attendees, setAttendees] = useState<
    Array<{ email: string; relationship: string }>
  >([]);

  const [attachments, setAttachments] = useState<
    Array<{ name?: string; document_type?: string; url: string }>
  >([]);

  /* ---------- PDF Preview ---------- */
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewName, setPdfPreviewName] = useState<string | null>(null);
  const [pdfPreviewIsObjectUrl, setPdfPreviewIsObjectUrl] = useState(false);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);

  const openPdfPreview = (att: { url: string; name?: string }) => {
    // external/signed URLs are not object URLs
    if (pdfPreviewIsObjectUrl && pdfPreviewUrl) {
      try {
        URL.revokeObjectURL(pdfPreviewUrl);
      } catch { }
      setPdfPreviewIsObjectUrl(false);
    }

    setPdfPreviewUrl(att.url);
    setPdfPreviewName(att.name || "Attachment");
  };

  const closePdfPreview = () => {
    if (pdfPreviewIsObjectUrl && pdfPreviewUrl) {
      try {
        URL.revokeObjectURL(pdfPreviewUrl);
      } catch { }
      setPdfPreviewIsObjectUrl(false);
    }
    setPdfPreviewUrl(null);
    setPdfPreviewName(null);
  };

  /* ============================== LOAD ============================== */
  useEffect(() => {
    const fetchConsultationDetails = async () => {
      setConsultationLoading(true);
      try {
        const res = await authFetch(
          `/api/booking/appointment/${appointmentId}/consultation`
        );
        if (!res.ok) return;

        const data = await res.json();

        let rawPayload = data.preconsult?.raw_payload;
        if (typeof rawPayload === 'string') {
          try {
            rawPayload = JSON.parse(rawPayload);
          } catch (e) {
            console.error("Failed to parse raw_payload", e);
            rawPayload = {};
          }
        }

        // Pre-consult meta
        setConsultationMeta({
          mainConcern: rawPayload?.note?.concern || "",
          goal: rawPayload?.note?.outcome || "",
          duration: rawPayload?.note?.duration || "",
          referral: rawPayload?.referral || "",
        });

        if (data.attendees) {
          setAttendees(data.attendees);
        }

        // Attachments
        setAttachments(
          (data.attachments || []).map((a: any) => ({
            url: a.view_url,
            name: a.file_name,
            document_type: a.file_type,
          }))
        );

        // Encounter — clinician notes + follow-up data
        if (data.encounter) {
          setClinicianNotes(data.encounter.clinician_notes || "");
          setFollowUpNeeded(!!data.encounter.follow_up_needed);
          setFollowUpDate(
            data.encounter.follow_up_date?.slice(0, 10) || null
          );
          setFollowupNotes(data.encounter.follow_up_comments || "");
        }

        // Diagnosis — from prescription's diagnoses FK join (select("*, diagnoses(*)"))
        const diagRecord = data.prescription?.diagnoses || null;
        if (diagRecord) {
          setDiagId(diagRecord.id || null);
          setDiagCode(diagRecord.code || "");
          setDiagName(diagRecord.name || "");
          setDiagDescription(diagRecord.description || "");
        }

        // Prescription + items
        if (data.prescription) {
          setPrescriptionItems(
            (data.prescription.items || []).map((item: any) => ({
              medicine_name: item.medicine_name || "",
              strength: item.strength || "",
              route: item.route || "Oral",
              duration: item.duration || "",
              notes: item.notes || "",
            }))
          );
          setSpecialNotes(data.prescription.special_notes || "");
          setPrescriptionStatus(data.prescription.status || "draft");
        }

        if (data.practitioner_has_signature !== undefined) {
          setPractitionerHasSignature(data.practitioner_has_signature);
        }
        if (data.practitioner_id) {
          setPractitionerId(data.practitioner_id);
        }
      } finally {
        setConsultationLoading(false);
      }
    };

    fetchConsultationDetails();
  }, [appointmentId]);

  // If this panel is being used in read-only mode (for patients / guests),
  // render a simplified view showing only pre-consultation and attachments.
  if (readOnly) {
    return (
      <aside className="w-full bg-[#f9fafb] h-full flex flex-col border-l border-gray-200 shadow-xl text-black">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h3 className="text-sm font-semibold">Pre-consultation</h3>
        </div>

        {consultationLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-black" size={28} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {(consultationMeta.mainConcern || consultationMeta.goal || consultationMeta.duration || consultationMeta.referral || attendees.length > 0) && (
              <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                <h3 className="text-xs font-semibold text-black uppercase tracking-wider">Patient Pre-consult</h3>
                {consultationMeta.mainConcern && (
                  <p className="text-sm">
                    <span className="font-medium text-black">Concern:</span> {consultationMeta.mainConcern}
                  </p>
                )}
                {consultationMeta.goal && (
                  <p className="text-sm">
                    <span className="font-medium text-black">Goal:</span> {consultationMeta.goal}
                  </p>
                )}
                {consultationMeta.duration && (
                  <p className="text-sm">
                    <span className="font-medium text-black">Duration:</span> {consultationMeta.duration}
                  </p>
                )}
                {consultationMeta.referral && (
                  <p className="text-sm">
                    <span className="font-medium text-black">Referral Source:</span> {consultationMeta.referral}
                  </p>
                )}

                {attendees.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium text-black text-sm">Additional Attendees:</span>
                    <ul className="mt-1 space-y-1">
                      {attendees.map((a, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <span className="bg-gray-100 text-black px-2 py-0.5 rounded text-xs">{a.relationship}</span>
                          {a.email}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {attachments.length > 0 && (
              <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                <h3 className="text-xs font-semibold text-black uppercase tracking-wider">Attachments</h3>
                <div className="space-y-2">
                  {attachments.map((att, i) => {
                    const isPdf =
                      (att.document_type && att.document_type.toLowerCase() === "application/pdf") ||
                      (!!att.name && att.name.toLowerCase().endsWith(".pdf")) ||
                      (!!att.url && att.url.toLowerCase().endsWith(".pdf"));

                    return (
                      <div key={i} className="flex items-center gap-3">
                        <button
                          onClick={() => (isPdf ? openPdfPreview(att) : window.open(att.url, "_blank", "noopener,noreferrer"))}
                          className="flex items-center gap-2 text-sm text-black hover:underline"
                        >
                          <FileText size={14} />
                          <span>{att.name || `Attachment ${i + 1}`}</span>
                        </button>

                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-black">
                          <ExternalLink size={12} />
                        </a>

                        {isPdf && (
                          <button onClick={() => openPdfPreview(att)} className="ml-2 text-sm text-black flex items-center gap-1">
                            <Eye size={14} />
                            <span>Preview</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* PDF Preview Modal */}
            {pdfPreviewUrl && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="bg-white w-[95vw] h-[90vh] rounded-lg overflow-hidden shadow-xl flex flex-col relative">
                  <div className="flex items-center justify-between p-2 border-b">
                    <div className="text-sm font-semibold text-black">{pdfPreviewName}</div>
                    <div className="flex items-center gap-2">
                      <a href={pdfPreviewUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-black underline">Open in new tab</a>
                      <button onClick={closePdfPreview} className="p-2 text-black">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  {pdfPreviewLoading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
                      <Loader2 className="animate-spin text-white" size={40} />
                    </div>
                  )}
                  <div className="flex-1">
                    <object data={pdfPreviewUrl} type="application/pdf" className="w-full h-full">
                      <div className="p-6">
                        <p className="text-black">Unable to preview this file. <a href={pdfPreviewUrl} target="_blank" rel="noopener noreferrer" className="text-black underline">Open in a new tab</a></p>
                      </div>
                    </object>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    );
  }

  /* ==================== SAVE SESSION (consultation tab) ==================== */
  const saveSession = async () => {
    setError(null);
    setSuccess(null);

    if (followUpNeeded && !followUpDate) {
      setError("Please select a follow-up date.");
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
            diagnosis_id: diagId || null,
            diagnosis_code: diagCode || null,
            diagnosis: diagName || null,
            diagnosis_description: diagDescription || null,
            follow_up_needed: followUpNeeded,
            follow_up_date: followUpNeeded ? followUpDate : null,
            followup_notes: followupNotes || null,
            status: "draft",
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to save session");
      }

      setSuccess("Session saved successfully.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  /* ==================== DELETE PRESCRIPTION (Cleanup) ==================== */
  const deletePrescription = async () => {
    if (!window.confirm("Are you sure you want to delete this draft? This cannot be undone.")) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const res = await authFetch(
        `/api/booking/appointment/${appointmentId}/consultation`,
        { method: "DELETE" }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete draft");
      }

      setPrescriptionStatus("draft");
      setPrescriptionItems([]);
      setSpecialNotes("");
      setDiagId(null);
      setDiagCode("");
      setDiagName("");
      setDiagDescription("");
      setSuccess("Draft deleted successfully.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  /* ==================== SAVE PRESCRIPTION (prescription tab) ==================== */
  const savePrescription = async (
    status: "draft" | "ready_to_issue" | "issued" = "draft"
  ) => {
    setError(null);
    setSuccess(null);

    if (status === "issued" || status === "ready_to_issue") {
      const hasItems = prescriptionItems.some((i) => i.medicine_name.trim());
      if (!hasItems) {
        setError("Add at least one medicine before moving past draft.");
        return;
      }
    }

    setSaving(true);

    try {
      const res = await authFetch(
        `/api/booking/appointment/${appointmentId}/consultation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            diagnosis_id: diagId || null,
            diagnosis_code: diagCode || null,
            diagnosis: diagName || null,
            diagnosis_description: diagDescription || null,
            prescription_items: prescriptionItems.filter(
              (i) => i.medicine_name.trim()
            ),
            special_notes: specialNotes || null,
            status,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to save");
      }

      setPrescriptionStatus(status);
      setSuccess(
        status === "issued"
          ? "Prescription issued successfully!"
          : status === "ready_to_issue"
            ? "Ready to Issue."
            : "Prescription draft saved."
      );

      setTimeout(() => setSuccess(null), 4000);

      // If the prescription was moved to Ready, generate and show a PDF preview
      if (status === "ready_to_issue") {
        try {
          setPdfPreviewLoading(true);

          const previewRes = await authFetch(
            `/api/booking/appointment/${appointmentId}/prescription/preview`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                diagnosis_id: diagId || null,
                diagnosis_code: diagCode || null,
                diagnosis: diagName || null,
                diagnosis_description: diagDescription || null,
                prescription_items: prescriptionItems.filter((i) => i.medicine_name.trim()),
                special_notes: specialNotes || null,
              }),
            }
          );

          if (!previewRes.ok) {
            const errJson = await previewRes.json().catch(() => null);
            throw new Error(errJson?.error || "Failed to generate preview");
          }

          const blob = await previewRes.blob();
          const objectUrl = URL.createObjectURL(blob);
          if (pdfPreviewIsObjectUrl && pdfPreviewUrl) {
            try {
              URL.revokeObjectURL(pdfPreviewUrl);
            } catch { }
          }
          setPdfPreviewUrl(objectUrl);
          setPdfPreviewName("Prescription Preview");
          setPdfPreviewIsObjectUrl(true);
        } catch (err: any) {
          console.error("Prescription preview error:", err);
          setError(err?.message || "Failed to generate preview");
        } finally {
          setPdfPreviewLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // Generate a PDF preview from current form data without saving — opens in a new tab
  const previewPrescription = async () => {
    setError(null);
    setSuccess(null);

    const hasItems = prescriptionItems.some((i) => i.medicine_name.trim());
    if (!hasItems) {
      setError("Add at least one medicine before previewing.");
      return;
    }

    setPdfPreviewLoading(true);
    try {
      const previewRes = await authFetch(
        `/api/booking/appointment/${appointmentId}/prescription/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            diagnosis_id: diagId || null,
            diagnosis_code: diagCode || null,
            diagnosis: diagName || null,
            diagnosis_description: diagDescription || null,
            prescription_items: prescriptionItems.filter((i) => i.medicine_name.trim()),
            special_notes: specialNotes || null,
          }),
        }
      );

      if (!previewRes.ok) {
        const errJson = await previewRes.json().catch(() => null);
        throw new Error(errJson?.error || "Failed to generate preview");
      }

      const blob = await previewRes.blob();
      const objectUrl = URL.createObjectURL(blob);

      // Open PDF directly in a new tab
      window.open(objectUrl, "_blank", "noopener,noreferrer");

      // Revoke after a short delay to allow the new tab to load the blob
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err: any) {
      console.error("Prescription preview error:", err);
      setError(err?.message || "Failed to generate preview");
    } finally {
      setPdfPreviewLoading(false);
    }
  };

  /* ==================== MEDICINE HELPERS ==================== */
  const addMedicine = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      { medicine_name: "", strength: "", route: "Oral", duration: "", notes: "" },
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

  const handleSignatureUpload = async (file: File) => {
    if (!file) return;
    
    // Validations
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG or PNG).");
      return;
    }

    setUploadingSignature(true);
    setError(null);

    try {
      // 1. Get presigned URL
      const presignRes = await authFetch("/api/practitioner-document/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          application_id: practitionerId,
          documentType: "signature",
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const data = await presignRes.json();
      const uploadUrl = data.uploadUrl;
      const fileKey = data.document?.file_url;

      // 2. Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Signature upload failed");

      // 3. Update practitioner profile
      const updateRes = await authFetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitioner: {
            signature_url: fileKey,
            signature_uploaded_at: new Date().toISOString()
          }
        }),
      });

      if (!updateRes.ok) throw new Error("Failed to update practitioner profile");

      setPractitionerHasSignature(true);
      setSuccess("Signature uploaded successfully! You can now issue prescriptions.");
    } catch (err: any) {
      console.error("Signature upload error:", err);
      setError(err.message || "Failed to upload signature");
    } finally {
      setUploadingSignature(false);
    }
  };

  const isLocked = prescriptionStatus === "issued" || prescriptionStatus === "ready_to_issue";

  /* ============================== UI ============================== */
  return (
    <aside className="w-full bg-[#f9fafb] h-full flex flex-col border-l border-gray-200 shadow-xl">
      {/* ---- Tab Bar ---- */}
      <div className="flex bg-white border-b">
        <button
          onClick={() => setActiveTab("consultation")}
          className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${activeTab === "consultation"
            ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
            : "text-black hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <ClipboardList size={16} /> Session
        </button>
        <button
          onClick={() => setActiveTab("prescription")}
          className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${activeTab === "prescription"
            ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
            : "text-black hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          <Pill size={16} /> Prescription
        </button>
      </div>

      {/* ---- Status Banner ---- */}
      {isLocked && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
          <AlertCircle size={14} />
          Prescription is <strong>{prescriptionStatus}</strong> — editing is
          disabled.
        </div>
      )}

      {/* ---- Feedback ---- */}
      {(error || success) && (
        <div
          className={`px-4 py-2 text-sm flex items-center gap-2 border-b ${error
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-green-50 text-green-700 border-green-200"
            }`}
        >
          {error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          {error || success}
        </div>
      )}

      {/* ---- Loading ---- */}
      {consultationLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-black" size={28} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ============== SESSION TAB ============== */}
          {activeTab === "consultation" && (
            <>
              {/* Pre-consult (read-only) */}
              {(consultationMeta.mainConcern ||
                consultationMeta.goal ||
                consultationMeta.duration ||
                consultationMeta.referral ||
                attendees.length > 0) && (
                  <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
                      Patient Pre-consult
                    </h3>
                    {consultationMeta.mainConcern && (
                      <p className="text-sm text-black">
                        <span className="font-medium text-black">
                          Concern:
                        </span>{" "}
                        {consultationMeta.mainConcern}
                      </p>
                    )}
                    {consultationMeta.goal && (
                      <p className="text-sm text-black">
                        <span className="font-medium text-black">Goal:</span>{" "}
                        {consultationMeta.goal}
                      </p>
                    )}
                    {consultationMeta.duration && (
                      <p className="text-sm text-black">
                        <span className="font-medium text-black">
                          Duration:
                        </span>{" "}
                        {consultationMeta.duration}
                      </p>
                    )}
                    {/* {consultationMeta.referral && (
                      <p className="text-sm text-black">
                        <span className="font-medium text-black">
                          Referral Source:
                        </span>{" "}
                        {consultationMeta.referral}
                      </p>
                    )} */}
                    {attendees.length > 0 && (
                      <div className="mt-2">
                        <span className="font-medium text-black text-sm">Additional Attendees:</span>
                        <ul className="mt-1 space-y-1">
                          {attendees.map((a, i) => (
                            <li key={i} className="text-sm text-black flex items-center gap-2">
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{a.relationship}</span>
                              {a.email}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
                    Attachments
                  </h3>
                  <div className="space-y-1">
                    {attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <FileText size={14} />
                        {att.name || `Attachment ${i + 1}`}
                        <ExternalLink size={12} />
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Diagnosis */}
              <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
                  Diagnosis
                </h3>

                {/* Search Field */}
                {!isLocked && (
                  <div className="relative" ref={searchRef}>
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={diagSearchText}
                        onChange={(e) => setDiagSearchText(e.target.value)}
                        onFocus={() => {
                          if (diagSearchResults.length > 0) setShowDiagDropdown(true);
                        }}
                        placeholder="Search diagnosis by code or name..."
                        className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                      />
                      {isSearchingDiag && (
                        <Loader2
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
                        />
                      )}
                    </div>

                    {showDiagDropdown && (
                      <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                        {diagSearchResults.length === 0 && !isSearchingDiag ? (
                          <li className="px-4 py-3 text-sm text-gray-500">No results found</li>
                        ) : (
                          diagSearchResults.map((result) => (
                            <li
                              key={result.id}
                              onClick={() => selectDiagnosis(result)}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                            >
                              <div className="text-sm font-medium text-black">
                                {result.code} - {result.name}
                              </div>
                              {result.description && (
                                <div className="text-xs text-gray-500 truncate mt-0.5">
                                  {result.description}
                                </div>
                              )}
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      value={diagCode}
                      onChange={(e) => setDiagCode(e.target.value)}
                      disabled={isLocked}
                      placeholder="e.g. J06.9"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={diagName}
                      onChange={(e) => setDiagName(e.target.value)}
                      disabled={isLocked}
                      placeholder="Diagnosis name"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black text-black"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    Description
                  </label>
                  <textarea
                    value={diagDescription}
                    onChange={(e) => setDiagDescription(e.target.value)}
                    disabled={isLocked}
                    rows={2}
                    placeholder="Optional description"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black text-black"
                  />
                </div>
                {!isLocked && (diagCode || diagName) && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setDiagId(null);
                        setDiagCode("");
                        setDiagName("");
                        setDiagDescription("");
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Clear Diagnosis
                    </button>
                  </div>
                )}
              </section>

              {/* Follow-up */}
              <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 text-black">
                <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
                  Follow-up
                </h3>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followUpNeeded}
                    onChange={(e) => setFollowUpNeeded(e.target.checked)}
                    disabled={isLocked}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Follow-up needed
                </label>
                {followUpNeeded && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Follow-up Date
                      </label>
                      <div className="relative">
                        <Calendar
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-black"
                        />
                        <input
                          type="date"
                          value={followUpDate || ""}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          disabled={isLocked}
                          className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Follow-up Notes
                      </label>
                      <textarea
                        value={followupNotes}
                        onChange={(e) => setFollowupNotes(e.target.value)}
                        disabled={isLocked}
                        rows={2}
                        placeholder="Notes for the follow-up..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black"
                      />
                    </div>
                  </>
                )}
              </section>

              {/* Clinician Notes */}
              <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
                  Clinician Notes
                </h3>
                <textarea
                  value={clinicianNotes}
                  onChange={(e) => setClinicianNotes(e.target.value)}
                  disabled={isLocked}
                  rows={4}
                  placeholder="Clinical observations, findings, assessment..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black text-black"
                />
              </section>

              {/* Save Session */}
              {!isLocked && (
                <button
                  onClick={saveSession}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-black font-medium rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Session
                </button>
              )}
            </>
          )}

          {/* ============== PRESCRIPTION TAB ============== */}
          {activeTab === "prescription" && (
            <>
              {/* Medicine Items */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
                    Medicines
                  </h3>
                  {!isLocked && (
                    <button
                      onClick={addMedicine}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Plus size={14} /> Add
                    </button>
                  )}
                </div>

                {prescriptionItems.length === 0 && (
                  <p className="text-sm text-black italic">
                    No medicines added yet.
                  </p>
                )}

                {prescriptionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 relative"
                  >
                    {!isLocked && (
                      <button
                        onClick={() => removeMedicine(idx)}
                        className="absolute top-3 right-3 text-black hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Medicine Name
                      </label>
                      <input
                        type="text"
                        value={item.medicine_name}
                        onChange={(e) =>
                          updateMedicine(idx, "medicine_name", e.target.value)
                        }
                        disabled={isLocked}
                        placeholder="e.g. Amoxicillin"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black text-black"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-black mb-1">
                          Strength
                        </label>
                        <input
                          type="text"
                          value={item.strength}
                          onChange={(e) =>
                            updateMedicine(idx, "strength", e.target.value)
                          }
                          disabled={isLocked}
                          placeholder="500mg"
                          className="w-full text-black rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-black mb-1">
                          Route
                        </label>
                        <select
                          value={item.route}
                          onChange={(e) =>
                            updateMedicine(idx, "route", e.target.value)
                          }
                          disabled={isLocked}
                          className="w-full text-black rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black"
                        >
                          {ROUTE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-black mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={item.duration}
                          onChange={(e) =>
                            updateMedicine(idx, "duration", e.target.value)
                          }
                          disabled={isLocked}
                          placeholder="7 days"
                          className="w-full text-black rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) =>
                          updateMedicine(idx, "notes", e.target.value)
                        }
                        disabled={isLocked}
                        placeholder="e.g. After meals, twice daily"
                        className="w-full text-black rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black"
                      />
                    </div>
                  </div>
                ))}
              </section>

              {/* Special Notes */}
              <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
                  Special Notes
                </h3>
                <textarea
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  disabled={isLocked}
                  rows={3}
                  placeholder="Allergies, warnings, additional instructions..."
                  className="w-full text-black rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-black"
                />
              </section>

              {/* Signature Requirement Check */}
              {!practitionerHasSignature && !isLocked && (
                <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2 text-amber-800">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Signature Required</p>
                      <p className="text-xs">You must upload a digital signature to issue prescriptions. This signature will appear on all your prescriptions.</p>
                    </div>
                  </div>
                  
                  <div className="pt-1">
                    <label className="flex items-center justify-center gap-2 bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all shadow-sm">
                      {uploadingSignature ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      {uploadingSignature ? "Uploading..." : "Upload Signature"}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => e.target.files?.[0] && handleSignatureUpload(e.target.files[0])}
                        disabled={uploadingSignature}
                      />
                    </label>
                  </div>
                </section>
              )}

              {/* Action Buttons */}
              {!isLocked && (
                <div className="space-y-3 pt-2">
                  {/* Preview Button */}
                  <button
                    onClick={previewPrescription}
                    disabled={saving || pdfPreviewLoading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-xl py-3 text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {pdfPreviewLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Eye size={16} />
                    )}
                    {pdfPreviewLoading ? "Generating Preview…" : "Preview PDF"}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => savePrescription("draft")}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-slate-700 font-semibold rounded-xl py-3 text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Draft
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {prescriptionStatus === "draft" && (
                      <button
                        onClick={deletePrescription}
                        disabled={saving}
                        className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-100 active:scale-[0.95] disabled:opacity-50"
                        title="Delete Draft"
                      >
                        <X size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => savePrescription("issued")}
                      disabled={saving || !practitionerHasSignature}
                      className={`flex-1 flex items-center justify-center gap-2 font-bold rounded-xl py-3 text-sm transition-all active:scale-[0.98] ${
                        !practitionerHasSignature 
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200"
                      }`}
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      Final Issue
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ---- PDF Preview Modal (Doctor side) ---- */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-[92vw] max-w-5xl h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{pdfPreviewName || "Prescription Preview"}</div>
                  <div className="text-xs text-gray-500">Review before issuing</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <ExternalLink size={13} />
                  Open in new tab
                </a>
                <button
                  onClick={closePdfPreview}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Loading overlay */}
            {pdfPreviewLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-blue-600" size={36} />
                  <span className="text-sm text-gray-500 font-medium">Generating PDF preview…</span>
                </div>
              </div>
            )}

            {/* PDF Viewer */}
            <div className="flex-1 bg-gray-100">
              <object
                data={pdfPreviewUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                  <FileText size={48} className="text-gray-300" />
                  <p className="text-gray-500 text-sm text-center">
                    Your browser cannot display PDFs inline.
                  </p>
                  <a
                    href={pdfPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Open PDF
                  </a>
                </div>
              </object>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
              <p className="text-xs text-gray-400">This is a live preview — the prescription has not been issued yet.</p>
              <button
                onClick={closePdfPreview}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all"
              >
                <X size={14} />
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
