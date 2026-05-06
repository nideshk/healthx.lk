"use client";

import React, { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { practitionerSchema, PractitionerFormValues } from "@/lib/validation/practitioner";
import { Trash2, ChevronDown, X } from "lucide-react";
import Input from "@/components/atom/Input/Input";
import Textarea from "@/components/atom/Textarea/Textarea";

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
  password: string;
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
  bank_details: {
    bank_name: string;
    account_name: string;
    branch_location: string;
    account_number: string;
  };
};

export default function PractitionerRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedAppointments, setSelectedAppointments] = useState<AppointmentType[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [isSpecOpen, setIsSpecOpen] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<
    { file: File; document_type: "government_id" | "supporting_document" | "signature" }[]
  >([]);

  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  /* ---------------- RHF ---------------- */

  const {
    control,
    handleSubmit,
    watch,
    setValue,
  } = useForm<PractitionerFormValues>({
    resolver: zodResolver(practitionerSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      city: "",
      state: "",
      languages: "",
      qualification: "",
      specialization: [],
      license_number: "",
      experience_years: "",
      contact_number: "",
      profile_bio: "",
      bank_details: {
        bank_name: "",
        account_name: "",
        branch_location: "",
        account_number: "",
      },
    },
  });

  const specialization = watch("specialization");

  const governmentIdCount = pendingFiles.filter(
    f => f.document_type === "government_id"
  ).length;

  const supportingDocCount = pendingFiles.filter(
    f => f.document_type === "supporting_document"
  ).length;

  const signatureCount = pendingFiles.filter(
    f => f.document_type === "signature"
  ).length;

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        const res = await fetch("/api/form-data/appointment-config");

        if (!res.ok) {
          throw new Error("Failed to fetch appointment config");
        }

        const data = await res.json();

        // 🔹 Services → Specializations
        setSpecializations(data.services || []);

        // 🔹 Appointment types
        setAppointmentTypes(
          (data.appointment_types || []).map((t: any) => ({
            ...t,
            base_fee: t.base_fee ?? 0,
          }))
        );
      } catch (err) {
        console.error("Error loading appointment config", err);
      }
    };

    fetchFormConfig();
  }, []);

  /* ---------------- SPECIALIZATION ---------------- */
  const toggleSpecialization = (slug: string) => {
    setValue(
      "specialization",
      specialization.includes(slug)
        ? specialization.filter(s => s !== slug)
        : [...specialization, slug]
    );
  };

  /* ---------------- AVAILABILITY ---------------- */

  /* ---------------- APPOINTMENTS ---------------- */
  const handleAppointmentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;

    const type = appointmentTypes.find(t => t.id === id);
    if (!type) return;

    setSelectedAppointments(prev =>
      prev.some(p => p.id === id) ? prev : [...prev, { ...type }]
    );

    e.target.value = "";
  };

  const handleAppointmentFeeChange = (id: string, value: string) => {
    setSelectedAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, base_fee: value } : a))
    );
  };

  const handleFileSelect = (
    file: File,
    documentType: "government_id" | "supporting_document" | "signature"
  ) => {
    if (documentType === "government_id" && governmentIdCount >= 2) {
      setError("You can upload a maximum of 2 Government ID documents.");
      return;
    }

    if (documentType === "supporting_document" && supportingDocCount >= 1) {
      setError("Only one supporting document is allowed.");
      return;
    }

    if (documentType === "signature") {
      if (signatureCount >= 1) {
        setError("Only one signature document is allowed.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Only image files (JPG, PNG) are allowed for your signature.");
        return;
      }
    }

    setPendingFiles(prev => [...prev, { file, document_type: documentType }]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocumentsAfterApplication = async (applicationId: string) => {
    const governmentIdCount = pendingFiles.filter(
      f => f.document_type === "government_id"
    ).length;

    const supportingDocCount = pendingFiles.filter(
      f => f.document_type === "supporting_document"
    ).length;

    if (governmentIdCount !== 2) {
      throw new Error("Exactly two Government ID documents are required.");
    }

    if (supportingDocCount !== 1) {
      throw new Error("Exactly one supporting document is required.");
    }

    if (signatureCount !== 1) {
      throw new Error("Exactly one signature document is required.");
    }

    setUploadingDocs(true);

    const uploadedDocs: any[] = [];

    try {
      for (const item of pendingFiles) {
        const res = await fetch("/api/practitioner-document/upload-url", {
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
        if (!res.ok) {
          throw new Error(data.error || "Failed to get upload URL");
        }

        const uploadRes = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": item.file.type },
          body: item.file,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file to S3");
        }

        uploadedDocs.push(data.document);
      }

      const attachRes = await fetch(
        `/api/auth/practitioner-application/${applicationId}/document_added`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documents: uploadedDocs }),
        }
      );

      if (!attachRes.ok) {
        throw new Error("Failed to attach documents to application");
      }

      setPendingFiles([]);
    } finally {
      setUploadingDocs(false);
    }
  };

  /* ---------------- SUBMIT ---------------- */
  const onSubmit = async (form: PractitionerFormValues) => {
    if (specialization.length === 0) {
      setError("Please select at least one specialization.");
      document.getElementById("specialization-section")?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setLoading(false);
      return;
    }

    if (selectedAppointments.length === 0) {
      setError("Please select at least one appointment type.");
      document.getElementById("services-section")?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setLoading(false);
      return;
    }

    if (governmentIdCount !== 2 || supportingDocCount !== 1 || signatureCount !== 1) {
      setError("Please upload all required documents.");
      document.getElementById("documents-section")?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...form,
        email: form.email.toLowerCase().trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        contact_email: form.email.toLowerCase().trim(),
        languages: form.languages.split(",").map(l => l.trim()).filter(l => l !== ""),
        experience_years: Math.round(Number(form.experience_years) || 0),
        available_services: selectedAppointments.map(a => a.id),
        fees: selectedAppointments.reduce((acc: any, appt) => {
          acc[appt.id] = {
            type: appt.name,
            fee: Number(appt.base_fee || 0),
          };
          return acc;
        }, {}),
      };

      const res = await fetch("/api/auth/practitioner-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          setError(data.errors.map((e: any) => e.message).join(" | "));
        } else {
          throw new Error(data.message || data.error || "Registration failed");
        }
        setLoading(false);
        return;
      }

      const applicationId = data.application_id;

      try {
        await uploadDocumentsAfterApplication(applicationId);
      } catch (err) {
        setMessage(
          "Application submitted, but document upload failed. You can upload later."
        );
      }

      setMessage("🎉 Practitioner application submitted successfully!  The team will be in touch with you within 48 hours to grant access to your telehealth account.");
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  };

  const weekdays = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-5 flex justify-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-10">
          Application for <span className="text-teal-600">Practitioner</span>
        </h1>

        <div className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">

            {/* BASIC INFO */}
            <div>
              <h2 className="section-title">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Controller
                  name="first_name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="First Name"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
                <Controller
                  name="last_name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="Last Name"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
                <Controller
                  name="city"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="City"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
                <Controller
                  name="state"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="State"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Controller
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="Email Address"
                      type="email"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
                <div className="space-y-1">
                  <Controller
                    name="password"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input
                        ref={field.ref}
                        type="password"
                        placeholder="Password"
                        required
                        value={field.value || ""}
                        onChange={field.onChange}
                        error={fieldState.error?.message}
                        errorStatus={!!fieldState.error}
                      />
                    )}
                  />
                  {watch("password") && (
                    <PasswordStrength password={watch("password")} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-5 mt-4">
                <Controller
                  name="languages"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="Languages (comma separated, e.g. English, French)"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
              </div>
            </div>

            {/* PROFESSIONAL */}
            <div>
              <h2 className="section-title">Professional Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Controller
                  name="qualification"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="Qualification"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
                <Controller
                  name="license_number"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="License Number"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
              </div>

              <div className="mt-4 relative" id="specialization-section">
                <label className="text-gray-700 font-medium mb-1 block">
                  Specializations
                </label>
                <div
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white flex items-center justify-between focus-within:ring-2 focus-within:ring-teal-500"
                >
                  <div className="flex flex-wrap gap-2">
                    {specialization.length === 0 ? (
                      <span className="text-gray-400">Select specializations</span>
                    ) : (
                      specialization.map((slug) => {
                        const spec = specializations.find(s => s.slug === slug);
                        return (
                          <span
                            key={slug}
                            className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-sm"
                          >
                            {spec?.name || slug}
                          </span>
                        );
                      })
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSpecOpen(prev => !prev)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    {isSpecOpen ? <X size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {isSpecOpen && (
                  <div className="absolute z-20 mt-2 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    {specializations
                      .filter(spec => spec.active)
                      .map(spec => (
                        <label
                          key={spec.id}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="rounded accent-teal-600"
                            checked={specialization.includes(spec.slug)}
                            onChange={() => toggleSpecialization(spec.slug)}
                          />
                          <span className="text-gray-700">{spec.name}</span>
                        </label>
                      ))}
                  </div>
                )}
                {error && error.includes("specialization") && (
                  <p className="text-red-500 text-xs mt-1">{error}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Controller
                  name="experience_years"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      type="number"
                      placeholder="Years of Experience"
                      required
                      value={field.value || ""}
                      onChange={(e) => {
                        // Local filter: Allow only digits, prevent negative and decimals
                        const cleanValue = e.target.value.replace(/[^0-9]/g, "");
                        field.onChange(cleanValue);
                      }}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
                <Controller
                  name="contact_number"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="Contact Number"
                      required
                      value={field.value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Allow leading +, then only digits
                        const filtered = val.startsWith("+")
                          ? "+" + val.slice(1).replace(/[^0-9]/g, "")
                          : val.replace(/[^0-9]/g, "");
                        field.onChange(filtered);
                      }}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
              </div>

              <div className="mt-4">
                <Controller
                  name="profile_bio"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Textarea
                      ref={field.ref}
                      placeholder="Profile Bio (brief description of your expertise)"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </div>
            </div>

            {/* SERVICES & FEES */}
            <div>
              <h2 className="section-title">Services & Fees</h2>
              <div className="mt-4" id="services-section">
                <label className="text-gray-700 font-medium mb-1 block">
                  Add Appointment Types
                </label>
                <select
                  value={selectedAppointmentId}
                  onChange={handleAppointmentSelect}
                  className="w-full h-[44px] px-3 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="">-- Choose a type --</option>
                  {appointmentTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {error && error.includes("appointment type") && (
                  <p className="text-red-500 text-xs mt-1">{error}</p>
                )}

                <div className="mt-4 space-y-3">
                  {selectedAppointments.map(appt => (
                    <div
                      key={appt.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-teal-50 border border-teal-100 rounded-xl gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{appt.name}</p>
                        <p className="text-xs text-gray-500">
                          {appt.duration_mins} mins • Max {appt.max_attendee} attendees
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">Fee:</span>
                        <input
                          type="number"
                          value={appt.base_fee}
                          onChange={e => handleAppointmentFeeChange(appt.id, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAppointments(prev => prev.filter(a => a.id !== appt.id))
                          }
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* DOCUMENTS */}
            <div>
              <h2 className="section-title">Documents & Verification</h2>
              <div className="space-y-6 mt-4" id="documents-section">
                {/* Government ID */}
                <div className="p-5 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                  <p className="font-semibold text-gray-700 mb-1">
                    Government Issued IDs (Upload 2 Required)
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Passport, National ID, or Driver's License.
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    id="gov-id-upload"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0], "government_id");
                      }
                    }}
                  />
                  <label
                    htmlFor="gov-id-upload"
                    className={`inline-block px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition ${governmentIdCount >= 2 ? "opacity-50 pointer-events-none" : ""
                      }`}
                  >
                    Select File
                  </label>
                </div>

                {/* Supporting Documents */}
                <div className="p-5 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                  <p className="font-semibold text-gray-700 mb-1">
                    Supporting Document (Upload 1 Required)
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Sri Lanka Medical Council Registration Certificate (Reflecting current registration)
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    id="support-upload"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0], "supporting_document");
                      }
                    }}
                  />
                  <label
                    htmlFor="support-upload"
                    className={`inline-block px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition ${supportingDocCount >= 1 ? "opacity-50 pointer-events-none" : ""
                      }`}
                  >
                    Select File
                  </label>
                </div>

                {/* Signature Document */}
                <div className="p-5 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                  <p className="font-semibold text-gray-700 mb-1">
                    Signature Document (Upload 1 Required)
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Please upload a clear image of your signature on a white background.
                  </p>
                  <div className="flex items-start gap-2.5 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <span className="font-bold">Important:</span> This signature will be used to digitally sign all prescriptions you issue through the platform. Please ensure it matches your official medical signature.
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    id="signature-upload"
                    accept=".jpg,.jpeg,.png"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0], "signature");
                      }
                    }}
                  />
                  <label
                    htmlFor="signature-upload"
                    className={`inline-block px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition ${signatureCount >= 1 ? "opacity-50 pointer-events-none" : ""
                      }`}
                  >
                    Select File
                  </label>
                </div>

                {/* File List */}
                {pendingFiles.length > 0 && (
                  <div className="space-y-2">
                    {pendingFiles.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <FilePreview file={item.file} />
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {item.file.name}
                            </p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                              {item.document_type.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingFile(idx)}
                          className="text-gray-400 hover:text-red-500 transition"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BANK DETAILS */}
            <div className="pt-6 border-t border-gray-100">
              <h2 className="section-title">Payout Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Controller
                  name="bank_details.bank_name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="Bank Name"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
                <Controller
                  name="bank_details.account_name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="Account Holder Name"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
                <Controller
                  name="bank_details.branch_location"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="Branch Location"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />

                <Controller
                  name="bank_details.account_number"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      ref={field.ref}
                      placeholder="Account Number"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      errorStatus={!!fieldState.error}
                    />
                  )}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || uploadingDocs}
              className="w-full bg-teal-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-teal-700 transition"
            >
              {loading ? "Registering…" : "Register Practitioner"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

function FilePreview({ file }: { file: File }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (preview) {
    return (
      <img
        src={preview}
        className="w-12 h-12 object-cover rounded-lg border border-gray-200 shadow-sm"
        alt="Preview"
      />
    );
  }

  return (
    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center text-[10px] font-bold border border-teal-100 uppercase">
      {file.name.split(".").pop() || "File"}
    </div>
  );
}


function PasswordStrength({ password }: { password?: string }) {
  if (!password) return null;

  const requirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Lowercase", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special symbol", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const strength = requirements.filter((r) => r.met).length;
  const colors = ["bg-red-400", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors ${i <= strength ? colors[strength] : "bg-gray-200"
              }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {requirements.map((r) => (
          <div key={r.label} className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${r.met ? "bg-green-500" : "bg-gray-300"}`} />
            <span className={`text-[10px] font-medium ${r.met ? "text-green-600" : "text-gray-400"}`}>
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

