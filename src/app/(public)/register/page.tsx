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
    register,
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
    if (documentType === "government_id" && governmentIdCount >= 1) {
      setError("Only one Government ID document is allowed.");
      return;
    }

    if (documentType === "supporting_document" && supportingDocCount >= 2) {
      setError("You can upload a maximum of 2 supporting documents.");
      return;
    }

    setPendingFiles(prev => [...prev, { file, document_type: documentType }]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocumentsAfterApplication = async (applicationId: string) => {
    // 🔐 Safety validation (never trust UI alone)
    const governmentIdCount = pendingFiles.filter(
      f => f.document_type === "government_id"
    ).length;

    const supportingDocCount = pendingFiles.filter(
      f => f.document_type === "supporting_document"
    ).length;

    if (governmentIdCount !== 1) {
      throw new Error("Exactly one Government ID document is required.");
    }

    if (supportingDocCount > 2) {
      throw new Error("You can upload a maximum of 2 supporting documents.");
    }

    setUploadingDocs(true);

    const uploadedDocs: any[] = [];

    try {
      for (const item of pendingFiles) {
        // 1️⃣ get upload URL
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

        // 2️⃣ upload to S3
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

      // 3️⃣ attach documents to application (ONLY if all uploads succeeded)
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

      // 4️⃣ clear local state (upload is done)
      setPendingFiles([]);
    } finally {
      setUploadingDocs(false);
    }
  };

  /* ---------------- SUBMIT ---------------- */
  const onSubmit = async (form: FormValues) => {
    if (governmentIdCount !== 1) {
      setError("Please upload exactly one Government ID document.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...form,
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

      setMessage("🎉 Practitioner application submitted successfully!");
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  };

  const weekdays = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];

  /* ---------------- JSX (UNCHANGED) ---------------- */

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
                      className=""
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

              {/* SPECIALIZATION — MARKUP UNCHANGED */}
              <div className="mt-4 relative">
                <label className="text-gray-700 font-medium mb-1 block">
                  Specializations
                </label>

                <div className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white flex items-center justify-between focus-within:ring-2 focus-within:ring-teal-500">
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

              <Controller
                name="experience_years"
                control={control}
                render={({ field }) => (
                  <Input
                    className="mt-4"
                    type="number"
                    placeholder="Experience (years)"
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                )}
              />

              <Controller
                name="profile_bio"
                control={control}
                render={({ field }) => (
                  <Textarea
                    className="mt-4 h-28"
                    placeholder="Short professional bio"
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* CONTACT */}
            <div>
              <h2 className="section-title">Contact Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Controller
                  name="contact_email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="Professional Email"
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
                      placeholder="Phone Number"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  )}
                />

              </div>
            </div>

            {/* SECTION: FEES – REPLACED WITH DROPDOWN + TABLE */}
            <div>
              <h2 className="section-title">Consultation Fees</h2>

              {/* Dropdown to select appointment type */}
              <div className="mt-4">
                <select
                  value={selectedAppointmentId}
                  onChange={(e) => {
                    handleAppointmentSelect(e);
                    setSelectedAppointmentId("");
                  }}
                  className={`w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-teal-500
                    ${selectedAppointmentId === ""
                      ? "text-[rgb(138,138,138)]"
                      : "text-gray-900"
                    }
                  `}
                >
                  <option value="" disabled>
                    Choose appointment type
                  </option>
                  {appointmentTypes.map((type) => (
                    <option key={type.id} value={type.id} className="text-gray-900">
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table of selected appointment types */}
              {selectedAppointments.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border border-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 border-b text-left border-gray-200">
                          Appointment Type
                        </th>
                        <th className="px-4 py-2 border-b text-left border-gray-200">
                          Duration
                        </th>
                        <th className="px-4 py-2 border-b text-left border-gray-200">
                          Fee
                        </th>
                        <th className="px-4 py-2 border-b text-left border-gray-200">
                          Max attendees
                        </th>
                        <th className="px-4 py-2 border-b text-left border-gray-200"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAppointments.map((appt) => (
                        <tr key={appt.id}>
                          <td className="px-4 py-2 border-b border-gray-200">
                            {appt.name}
                          </td>
                          <td className="px-4 py-2 border-b border-gray-200">
                            {appt.duration_mins} min
                          </td>
                          <td className="px-4 py-2 border-b border-gray-200">
                            <input
                              type="number"
                              className="w-24 px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none"
                              value={appt.base_fee}
                              onChange={(e) =>
                                handleAppointmentFeeChange(appt.id, e.target.value)
                              }
                            />
                          </td>
                          <td className="px-4 py-2 border-b border-gray-200">
                            {appt.max_attendee}
                          </td>
                          <td className="px-4 py-2 border-b border-gray-200">
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-700"
                              onClick={() =>
                                setSelectedAppointments((prev) =>
                                  prev.filter((item) => item.id !== appt.id)
                                )
                              }
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* DOCUMENTS */}
            <div>
              <h2 className="section-title">Documents</h2>
              {/* Government ID */}
              <div className="flex items-center justify-between mt-4">
                <span className="font-medium text-gray-700">
                  Passport / Government ID <span className="text-red-500">*</span>
                </span>

                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  id="government-id-input"
                  onChange={(e) =>
                    e.target.files &&
                    handleFileSelect(e.target.files[0], "government_id")
                  }
                />
                <button
                  type="button"
                  disabled={governmentIdCount >= 1 || uploadingDocs}
                  onClick={() =>
                    document.getElementById("government-id-input")?.click()
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Upload
                </button>
              </div>

              {/* Supporting Document */}
              <div className="flex items-center justify-between mt-4">
                <span className="font-medium text-gray-700">
                  Supporting Document (Max 2)
                </span>

                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  id="supporting-doc-input"
                  onChange={(e) =>
                    e.target.files &&
                    handleFileSelect(e.target.files[0], "supporting_document")
                  }
                />

                <button
                  type="button"
                  disabled={supportingDocCount >= 2 || uploadingDocs}
                  onClick={() =>
                    document.getElementById("supporting-doc-input")?.click()
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Upload
                </button>
              </div>

              {/* Uploaded files list */}
              {pendingFiles.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {pendingFiles.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                    >
                      <span>
                        {item.file.name}
                        <span className="ml-2 text-gray-500">
                          ({item.document_type})
                        </span>
                      </span>

                      {/* ❌ REMOVE */}
                      <button
                        type="button"
                        onClick={() => removePendingFile(idx)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* SECTION: BANK DETAILS */}
            <div>
              <h2 className="section-title">Bank Details</h2>
              <p className="text-sm text-gray-500 mt-1">
                Payment information for consultation fees
              </p>

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
                      placeholder="Account Name"
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

                <Controller
                  name="bank_details.ifsc_code"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="IFSC Code"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  )}
                />

                <Controller
                  name="bank_details.swift_code"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="SWIFT Code (optional)"
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <Controller
                name="bank_details.branch_address"
                control={control}
                render={({ field }) => (
                  <Textarea
                    className="mt-4 h-20"
                    placeholder="Branch Address"
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* SECTION: AVAILABILITY */}
            <div>
              <h2 className="section-title">Availability</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Input
                  type="time"
                  label="Start Time"
                  {...register("availability.start_time")}
                />
                <Input
                  type="time"
                  label="End Time"
                  {...register("availability.end_time")}
                />
              </div>

              <p className="font-medium text-gray-700 mt-4 mb-2">
                Days Unavailable
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {weekdays.map((day) => (
                  <label key={day} className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      className="rounded accent-teal-600"
                      checked={daysUnavailable.includes(day)}
                      onChange={() => toggleDayUnavailable(day)}
                    />
                    <span className="text-gray-700">{day}</span>
                  </label>
                ))}
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

