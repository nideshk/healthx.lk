"use client";

import React, { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Trash2, ChevronDown, X, ArrowLeft } from "lucide-react"; // Added ArrowLeft
import { useRouter } from "next/navigation"; // Added for list refresh
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

// Added onBack prop interface
interface AddClinicianFormProps {
  onBack: () => void;
}

export default function AddClinicianForm({ onBack }: AddClinicianFormProps) {
  const router = useRouter(); // Initialize router for data fetching refresh
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedAppointments, setSelectedAppointments] = useState<
    AppointmentType[]
  >([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>(
    []
  );
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [isSpecOpen, setIsSpecOpen] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<
    { file: File; document_type: "government_id" | "supporting_document" }[]
  >([]);

  const [uploadingDocs, setUploadingDocs] = useState(false);

  /* ---------------- RHF ---------------- */

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
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
        timezone: "Asia/Kolkata",
      },
    },
  });

  const specialization = watch("specialization");
  const daysUnavailable = watch("availability.days_unavailable");

  const governmentIdCount = pendingFiles.filter(
    (f) => f.document_type === "government_id"
  ).length;

  const supportingDocCount = pendingFiles.filter(
    (f) => f.document_type === "supporting_document"
  ).length;

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        const res = await authFetch("/api/form-data/appointment-config");

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
  const toggleSpecialization = (name: string) => {
    setValue(
      "specialization",
      specialization.includes(name)
        ? specialization.filter((s) => s !== name)
        : [...specialization, name]
    );
  };

  /* ---------------- AVAILABILITY ---------------- */

  const toggleDayUnavailable = (day: string) => {
    setValue(
      "availability.days_unavailable",
      daysUnavailable.includes(day)
        ? daysUnavailable.filter((d) => d !== day)
        : [...daysUnavailable, day]
    );
  };

  /* ---------------- APPOINTMENTS ---------------- */
  const handleAppointmentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;

    const type = appointmentTypes.find((t) => t.id === id);
    if (!type) return;

    // Avoid duplicates
    setSelectedAppointments((prev) =>
      prev.some((p) => p.id === id) ? prev : [...prev, { ...type }]
    );

    // Reset select
    e.target.value = "";
  };

  const handleAppointmentFeeChange = (id: string, value: string) => {
    setSelectedAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, base_fee: value } : a))
    );
  };

  /* ---------------- FILE UPLOAD ---------------- */

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

    setPendingFiles((prev) => [...prev, { file, document_type: documentType }]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadDocumentsAfterApplication = async (applicationId: string) => {
    const governmentIdCount = pendingFiles.filter(
      (f) => f.document_type === "government_id"
    ).length;

    const supportingDocCount = pendingFiles.filter(
      (f) => f.document_type === "supporting_document"
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
        // 1. Get pre-signed URL & document record
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
        if (!res.ok) {
          throw new Error(data.error || "Failed to get upload URL");
        }

        // 2. Put file to S3
        const uploadRes = await authFetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": item.file.type },
          body: item.file,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file to S3");
        }

        uploadedDocs.push(data.document);
      }

      // 3. Notify backend that documents were added
      const attachRes = await authFetch(
        `/api/auth/add-practitioner/${applicationId}/document-update`,
        {
          method: "PUT",
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
    if (governmentIdCount !== 1) {
      setError("Please upload exactly one Government ID document.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...form,
        experience_years: Number(form.experience_years),
        available_services: selectedAppointments.map((a) => a.id),
        fees: selectedAppointments.reduce((acc: any, appt) => {
          acc[appt.id] = {
            type: appt.name,
            duration_mins: appt.duration_mins,
            max_attendees: appt.max_attendee,
            fee: Number(appt.base_fee || 0),
            platform_fee: Number(appt.platform_fee || 0),
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
        setMessage(
          "Application submitted, but document upload failed. You can upload later."
        );
      }

      setMessage("🎉 Practitioner application submitted successfully!");
      
      // REFRESH & REDIRECT LOGIC
      router.refresh(); // Tells Next.js to re-fetch the data list
      setTimeout(() => {
        onBack(); // Go back to LIST view
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  /* ---------------- JSX ---------------- */

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl">
        {/* New Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-teal-600 mb-6 transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          Back to Clinicians
        </button>

        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
            Add New Practitioner
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg border border-green-200">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Account & Basic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            </div>

            {/* Professional */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">
                Professional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Specialization Checkboxes */}
              <div className="relative">
                <label className="text-gray-700 text-sm font-medium mb-1 block">
                  Specializations
                </label>
                <div
                  className="w-full px-3 py-2 border rounded-lg bg-white flex items-center justify-between cursor-pointer"
                  onClick={() => setIsSpecOpen(!isSpecOpen)}
                >
                  <div className="flex flex-wrap gap-1">
                    {specialization.length === 0 ? (
                      <span className="text-gray-400">Select...</span>
                    ) : (
                      specialization.map((s) => (
                        <span
                          key={s}
                          className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md text-xs border border-teal-100"
                        >
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown size={18} className="text-gray-400" />
                </div>

                {isSpecOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-60 overflow-auto p-2 grid grid-cols-1 gap-1">
                    {specializations
                      .filter((s) => s.active)
                      .map((spec) => (
                        <label
                          key={spec.id}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            className="rounded accent-teal-600"
                            checked={specialization.includes(spec.name)}
                            onChange={() => toggleSpecialization(spec.name)}
                          />
                          {spec.name}
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
                    placeholder="Short professional bio"
                    value={field.value || ""}
                    onChange={field.onChange}
                    className="h-24"
                  />
                )}
              />
            </div>

            {/* Contact */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Consultation Fees */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">Consultation Fees</h3>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                onChange={handleAppointmentSelect}
              >
                <option value="">Add appointment type...</option>
                {appointmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              {selectedAppointments.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Duration</th>
                        <th className="px-4 py-2 text-left w-32">Fee</th>
                        <th className="px-4 py-2 text-left">Platform Fee</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedAppointments.map((appt) => (
                        <tr key={appt.id}>
                          <td className="px-4 py-2">{appt.name}</td>
                          <td className="px-4 py-2">{appt.duration_mins}m</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              className="w-full border rounded px-2 py-1"
                              value={appt.base_fee}
                              onChange={(e) =>
                                handleAppointmentFeeChange(
                                  appt.id,
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-2">{appt.platform_fee}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAppointments((prev) =>
                                  prev.filter((p) => p.id !== appt.id)
                                )
                              }
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed rounded-xl p-4 text-center">
                  <p className="text-sm font-medium mb-2">Government ID *</p>
                  <input
                    type="file"
                    className="hidden"
                    id="gov-id-input"
                    onChange={(e) =>
                      e.target.files &&
                      handleFileSelect(e.target.files[0], "government_id")
                    }
                  />
                  <button
                    type="button"
                    disabled={governmentIdCount >= 1}
                    onClick={() => document.getElementById("gov-id-input")?.click()}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {governmentIdCount >= 1 ? "Uploaded" : "Choose File"}
                  </button>
                </div>

                <div className="border-2 border-dashed rounded-xl p-4 text-center">
                  <p className="text-sm font-medium mb-2">Supporting Documents</p>
                  <input
                    type="file"
                    className="hidden"
                    id="support-doc-input"
                    onChange={(e) =>
                      e.target.files &&
                      handleFileSelect(e.target.files[0], "supporting_document")
                    }
                  />
                  <button
                    type="button"
                    disabled={supportingDocCount >= 2}
                    onClick={() =>
                      document.getElementById("support-doc-input")?.click()
                    }
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {supportingDocCount >= 2 ? "Max Reached" : "Choose File"}
                  </button>
                </div>
              </div>

              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {pendingFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-gray-50 border px-3 py-1.5 rounded-full text-xs"
                    >
                      <span className="truncate max-w-[150px]">
                        {f.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePendingFile(i)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bank Details */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="bank_details.bank_name"
                  control={control}
                  rules={{ required: "Bank name is required" }}
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
                  rules={{ required: "Account name is required" }}
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
                  rules={{ required: "Account number is required" }}
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
                    placeholder="Branch Address"
                    value={field.value || ""}
                    onChange={field.onChange}
                    className="h-20"
                  />
                )}
              />
            </div>

            {/* Availability */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">Availability</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className="w-full bg-teal-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register Practitioner"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}