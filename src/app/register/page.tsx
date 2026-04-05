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
  profile_picture_url: string;
  bank_details: {
    bank_name: string;
    account_name: string;
    branch_location: string;
    account_number: string;
  };
  availability: {
    start_time: string;
    end_time: string;
    days_unavailable: string[];
    timezone: string;
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
    { file: File; document_type: "government_id" | "supporting_document" }[]
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
      profile_picture_url: "",
      bank_details: {
        bank_name: "",
        account_name: "",
        branch_location: "",
        account_number: "",
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

  const governmentIdCount = pendingFiles.filter(
    f => f.document_type === "government_id"
  ).length;

  const supportingDocCount = pendingFiles.filter(
    f => f.document_type === "supporting_document"
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

  const toggleDayUnavailable = (day: string) => {
    setValue(
      "availability.days_unavailable",
      daysUnavailable.includes(day)
        ? daysUnavailable.filter(d => d !== day)
        : [...daysUnavailable, day]
    );
  };

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
    documentType: "government_id" | "supporting_document"
  ) => {
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
                  rules={{ required: "Email is required" }}
                  render={({ field, fieldState }) => (
                    <Input
                      placeholder="Email Address"
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
                  rules={{ required: "Password is required" }}
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
                  render={({ field }) => (
                    <Input
                      placeholder="Qualification"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  name="license_number"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="License Number"
                      value={field.value || ""}
                      onChange={field.onChange}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Controller
                  name="experience_years"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      placeholder="Years of Experience"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  name="contact_number"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="Contact Number"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="mt-4">
                <Controller
                  name="profile_bio"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      placeholder="Profile Bio (brief description of your expertise)"
                      value={field.value || ""}
                      onChange={field.onChange}
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
                  render={({ field }) => (
                    <Input
                      placeholder="Branch Location"
                      value={field.value || ""}
                      onChange={field.onChange}
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
