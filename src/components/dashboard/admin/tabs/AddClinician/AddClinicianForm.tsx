"use client";

import React, { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Trash2, ChevronDown, X, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Input from "@/components/atom/Input/Input";
import Textarea from "@/components/atom/Textarea/Textarea";
import { authFetch } from "@/lib/authFetch";

type AppointmentType = {
  id: string;
  name: string;
  duration_mins: number;
  base_fee: number | string;
  max_attendee: number;
  platform_fee: number;
  extra_fee_per_attendee: number;
};

type Specialization = {
  id: string;
  name: string;
  active: boolean;
  slug: string;
};

type FormValues = {
  email: string;
  first_name: string;
  last_name: string;
  city: string;
  state: string;
  languages: string;
  qualification: string;
  specialization: string[];
  license_number: string;
  experience_years: string;
  contact_email: string;
  contact_number: string;
  profile_bio: string;
  available_services: string;
  fees: string;
  profile_picture_url: string;
  bank_details: {
    bank_name: string;
    account_name: string;
    branch_location: string;
    account_number: string;
    ifsc_code?: string;
    swift_code?: string;
    branch_address?: string;
  };
  availability: {
    start_time: string;
    end_time: string;
    days_unavailable: string[];
    timezone: string;
  };
};

interface AddClinicianFormProps {
  onBack: () => void;
}

export default function AddClinicianForm({ onBack }: AddClinicianFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedAppointments, setSelectedAppointments] = useState<AppointmentType[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [isSpecOpen, setIsSpecOpen] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<
    { file: File; document_type: "government_id" | "supporting_document" }[]
  >([]);

  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
  } = useForm<FormValues>({
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      city: "",
      state: "",
      languages: "",
      qualification: "",
      specialization: [],
      license_number: "",
      experience_years: "",
      contact_email: "",
      contact_number: "",
      profile_bio: "",
      available_services: "",
      fees: "",
      profile_picture_url: "",
      bank_details: {
        bank_name: "",
        account_name: "",
        branch_location: "",
        account_number: "",
        ifsc_code: "",
        swift_code: "",
        branch_address: "",
      },
      availability: {
        start_time: "09:00",
        end_time: "18:00",
        days_unavailable: ["Sunday"],
        timezone: "Asia/Colombo",
      },
    },
  });

  const specialization = watch("specialization");
  const daysUnavailable = watch("availability.days_unavailable");

  const governmentIdCount = pendingFiles.filter(f => f.document_type === "government_id").length;
  const supportingDocCount = pendingFiles.filter(f => f.document_type === "supporting_document").length;

  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        const res = await authFetch("/api/form-data/appointment-config");
        if (!res.ok) throw new Error("Failed to fetch appointment config");
        const data = await res.json();
        setSpecializations(data.services || []);
        setAppointmentTypes((data.appointment_types || []).map((t: any) => ({ ...t, base_fee: t.base_fee ?? 0 })));
      } catch (err) {
        console.error("Error loading appointment config", err);
      }
    };
    fetchFormConfig();
  }, []);

  const toggleSpecialization = (slug: string) => {
    setValue(
      "specialization",
      specialization.includes(slug) ? specialization.filter(s => s !== slug) : [...specialization, slug]
    );
  };

  const toggleDayUnavailable = (day: string) => {
    setValue(
      "availability.days_unavailable",
      daysUnavailable.includes(day) ? daysUnavailable.filter(d => d !== day) : [...daysUnavailable, day]
    );
  };

  const handleAppointmentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    const type = appointmentTypes.find(t => t.id === id);
    if (!type) return;
    setSelectedAppointments(prev => prev.some(p => p.id === id) ? prev : [...prev, { ...type }]);
    e.target.value = "";
  };

  const handleAppointmentFeeChange = (id: string, value: string) => {
    setSelectedAppointments(prev => prev.map(a => (a.id === id ? { ...a, base_fee: value } : a)));
  };

  const handleFileSelect = (file: File, documentType: "government_id" | "supporting_document") => {
    if (documentType === "government_id" && governmentIdCount >= 2) {
      setError("You can upload a maximum of 2 Government ID documents.");
      return;
    }

    if (documentType === "supporting_document" && supportingDocCount >= 1) {
      setError("Only one supporting document is allowed.");
      return;
    }
    setPendingFiles(prev => [...prev, { file, document_type: documentType }]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocumentsAfterApplication = async (applicationId: string) => {
    const governmentIdCount = pendingFiles.filter(f => f.document_type === "government_id").length;
    const supportingDocCount = pendingFiles.filter(f => f.document_type === "supporting_document").length;

    if (governmentIdCount !== 2)
      throw new Error("Exactly two Government ID documents are required.");

    if (supportingDocCount !== 1)
      throw new Error("Exactly one supporting document is required.");

    setUploadingDocs(true);
    const uploadedDocs: any[] = [];

    try {
      for (const item of pendingFiles) {
        const res = await authFetch("/api/practitioner-document/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            application_id: applicationId,
            fileName: item.file.name,
            fileType: item.file.type,
            fileSize: item.file.size,
            documentType: item.document_type,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to get upload URL");

        const uploadRes = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": item.file.type },
          body: item.file,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload file to S3");
        uploadedDocs.push(data.document);
      }

      const attachRes = await authFetch(`/api/auth/add-practitioner/${applicationId}/document-update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: uploadedDocs }),
      });

      if (!attachRes.ok) throw new Error("Failed to attach documents to application");
      setPendingFiles([]);
    } finally {
      setUploadingDocs(false);
    }
  };

  const onSubmit = async (form: FormValues) => {
    if (governmentIdCount !== 2) {
      setError("Please upload exactly two Government ID documents.");
      return;
    }

    if (supportingDocCount !== 1) {
      setError("Please upload one supporting document.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...form,
        contact_email: form.email,
        languages: form.languages.split(",").map(l => l.trim()).filter(l => l !== ""),
        experience_years: Number(form.experience_years),
        available_services: selectedAppointments.map(a => a.id),
        fees: selectedAppointments.reduce((acc: any, appt) => {
          acc[appt.id] = {
            type: appt.name,
            fee: Number(appt.base_fee || 0),
            platform_fee: Number(appt.platform_fee || 0),
            duration_mins: Number(appt.duration_mins || 0),
            max_attendee: Number(appt.max_attendee || 0),
            extra_fee_per_attendee: Number(appt.extra_fee_per_attendee || 0),
          };
          return acc;
        }, {}),
      };

      const res = await authFetch("/api/auth/add-practitioner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      const practitionerId = data.practitioner_id;

      try {
        await uploadDocumentsAfterApplication(practitionerId);
      } catch (err) {
        setMessage("Application submitted, but document upload failed.");
      }

      setMessage("🎉 Practitioner application submitted successfully!");
      router.refresh();
      setTimeout(() => onBack(), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-teal-600 mb-6 transition-colors font-medium">
          <ArrowLeft size={20} /> Back to Clinicians
        </button>
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Add New Practitioner</h1>
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-200">{error}</div>}
          {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg border border-green-200">{message}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller name="first_name" control={control} rules={{ required: "First name" }} render={({ field, fieldState }) => (
                <Input placeholder="First Name" required value={field.value} onChange={field.onChange} error={fieldState.error?.message} errorStatus={!!fieldState.error} />
              )} />
              <Controller name="last_name" control={control} rules={{ required: "Last name" }} render={({ field, fieldState }) => (
                <Input placeholder="Last Name" required value={field.value} onChange={field.onChange} error={fieldState.error?.message} errorStatus={!!fieldState.error} />
              )} />
              <Controller name="email" control={control} rules={{ required: "Email" }} render={({ field, fieldState }) => (
                <Input placeholder="Email Address" required value={field.value || ""} onChange={field.onChange} error={fieldState.error?.message} errorStatus={!!fieldState.error} />
              )} />
             
              <Controller name="city" control={control} rules={{ required: "City" }} render={({ field, fieldState }) => (
                <Input placeholder="City" required value={field.value} onChange={field.onChange} error={fieldState.error?.message} errorStatus={!!fieldState.error} />
              )} />
              <Controller name="state" control={control} rules={{ required: "State" }} render={({ field, fieldState }) => (
                <Input placeholder="State" required value={field.value} onChange={field.onChange} error={fieldState.error?.message} errorStatus={!!fieldState.error} />
              )} />
              <Controller name="languages" control={control} rules={{ required: "Languages" }} render={({ field, fieldState }) => (
                <Input placeholder="Languages (comma separated)" required value={field.value} onChange={field.onChange} error={fieldState.error?.message} errorStatus={!!fieldState.error} />
              )} />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller name="qualification" control={control} render={({ field }) => (
                  <Input placeholder="Qualification" value={field.value || ""} onChange={field.onChange} />
                )} />
                <Controller name="license_number" control={control} render={({ field }) => (
                  <Input placeholder="License Number" value={field.value || ""} onChange={field.onChange} />
                )} />
                <Controller name="experience_years" control={control} render={({ field }) => (
                  <Input placeholder="Years of Experience" type="number" value={field.value || ""} onChange={field.onChange} />
                )} />
                <Controller name="contact_number" control={control} render={({ field }) => (
                  <Input placeholder="Contact Number" value={field.value || ""} onChange={field.onChange} />
                )} />
              </div>

              <div className="relative">
                <label className="text-gray-700 text-sm font-medium mb-1 block">Specializations</label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between cursor-pointer" onClick={() => setIsSpecOpen(!isSpecOpen)}>
                  <div className="flex flex-wrap gap-1">
                    {specialization.length === 0 ? <span className="text-gray-400">Select...</span> : specialization.map(slug => {
                      const spec = specializations.find(s => s.slug === slug);
                      return <span key={slug} className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-sm">{spec?.name || slug}</span>;
                    })}
                  </div>
                  <ChevronDown size={18} className="text-gray-400" />
                </div>
                {isSpecOpen && (
                  <div className="absolute z-20 mt-2 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    {specializations.filter(s => s.active).map(spec => (
                      <label key={spec.id} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" className="rounded accent-teal-600" checked={specialization.includes(spec.slug)} onChange={() => toggleSpecialization(spec.slug)} />
                        <span className="text-gray-700">{spec.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <Controller name="profile_bio" control={control} render={({ field }) => (
                <Textarea placeholder="Brief Bio..." value={field.value || ""} onChange={field.onChange} />
              )} />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">Services & Fees</h3>
              <select onChange={handleAppointmentSelect} className="w-full h-[44px] px-3 border border-gray-300 rounded-lg bg-white outline-none">
                <option value="">-- Add Appointment Type --</option>
                {appointmentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="space-y-2">
                {selectedAppointments.map(appt => (
                  <div key={appt.id} className="flex items-center justify-between p-3 bg-teal-50 border border-teal-100 rounded-lg">
                    <span className="font-medium text-gray-700">{appt.name}</span>
                    <div className="flex items-center gap-2">
                      <input type="number" value={appt.base_fee} onChange={e => handleAppointmentFeeChange(appt.id, e.target.value)} className="w-20 px-2 py-1 border rounded" />
                      <button type="button" onClick={() => setSelectedAppointments(prev => prev.filter(a => a.id !== appt.id))} className="text-red-500"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                  <p className="text-sm font-medium">Gov ID (Required 2)</p>
                  <input type="file" className="hidden" id="gov-id" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], "government_id")} />
                  <label htmlFor="gov-id" className={`cursor-pointer text-xs text-teal-600 ${governmentIdCount >= 2 ? "opacity-50" : ""}`}>Select File</label>
                </div>
                <div className="p-4 border-2 border-dashed rounded-lg text-center">
                  <p className="text-sm font-medium">Supporting Document (Required)</p>
                  <input type="file" className="hidden" id="sup-doc" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], "supporting_document")} />
                  <label htmlFor="sup-doc" className={`cursor-pointer text-xs text-teal-600 ${supportingDocCount >= 1 ? "opacity-50" : ""}`}>Select File</label>
                </div>
              </div>
              <div className="space-y-1">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded border">
                    <span>{f.file.name} ({f.document_type})</span>
                    <button type="button" onClick={() => removePendingFile(i)} className="text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller name="bank_details.bank_name" control={control} render={({ field }) => <Input placeholder="Bank Name" value={field.value} onChange={field.onChange} />} />
                <Controller name="bank_details.account_name" control={control} render={({ field }) => <Input placeholder="Account Name" value={field.value} onChange={field.onChange} />} />
                <Controller name="bank_details.account_number" control={control} render={({ field }) => <Input placeholder="Account Number" value={field.value} onChange={field.onChange} />} />
                <Controller name="bank_details.branch_location" control={control} render={({ field }) => <Input placeholder="Branch Location" value={field.value} onChange={field.onChange} />} />
              </div>
            </div>

            <button type="submit" disabled={loading || uploadingDocs} className="w-full bg-teal-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50">
              {loading ? "Registering..." : "Register Practitioner"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}