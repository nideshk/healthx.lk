"use client";

import React, { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
  } = useForm<FormValues>({
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
      contact_email: "",
      contact_number: "",
      profile_bio: "",
      available_services: "",
      fees: "",
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

    if (documentType === "signature" && signatureCount >= 1) {
      setError("Only one signature document is allowed.");
      return;
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
  const onSubmit = async (form: FormValues) => {
    if (specialization.length === 0) {
      setError("Please select at least one specialization.");
      setLoading(false);
      return;
    }

    if (selectedAppointments.length === 0) {
      setError("Please select at least one appointment type.");
      setLoading(false);
      return;
    }

    if (governmentIdCount !== 2) {
      setError("Please upload exactly two Government ID documents.");
      setLoading(false);
      return;
    }

    if (supportingDocCount !== 1) {
      setError("Please upload one supporting document.");
      setLoading(false);
      return;
    }

    if (signatureCount !== 1) {
      setError("Please upload your signature document.");
      setLoading(false);
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
      if (!res.ok) throw new Error(data.error || "Registration failed");
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
                  rules={{ required: "First name is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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
                  rules={{ required: "Last name is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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
                  rules={{ required: "City is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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
                  rules={{ required: "State is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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
                  rules={{ 
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address"
                    }
                  }}
                  render={({ field, fieldState }) => (
                    <Input
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
                <Controller
                  name="password"
                  control={control}
                  rules={{ 
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters"
                    }
                  }}
                  render={({ field, fieldState }) => (
                    <Input
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-5 mt-4">
                <Controller
                  name="languages"
                  control={control}
                  rules={{ required: "Languages is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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
                  rules={{ required: "Qualification is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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
                  rules={{ required: "License Number is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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

              <div className="mt-4 relative">
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
                  rules={{ 
                    required: "Years of experience is required",
                    min: { value: 0, message: "Experience cannot be negative" }
                  }}
                  render={({ field, fieldState }) => (
                    <Input
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
                  rules={{ 
                    required: "Contact number is required",
                    pattern: {
                      value: /^\+?[0-9]{10,15}$/,
                      message: "Invalid contact number"
                    }
                  }}
                  render={({ field, fieldState }) => (
                    <Input
                      placeholder="Contact Number"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
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
                  rules={{ required: "Profile bio is required" }}
                  render={({ field, fieldState }) => (
                    <Textarea
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
              <div className="mt-4">
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
              <div className="space-y-6 mt-4">
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
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded flex items-center justify-center text-[10px] font-bold">
                            FILE
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {item.file.name}
                            </p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
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
                  rules={{ required: "Bank Name is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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
                  rules={{ required: "Account Name is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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
                  rules={{ required: "Branch Location is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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
                  rules={{ required: "Account Number is required" }}
                  render={({ field, fieldState }) => (
                    <Input
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
