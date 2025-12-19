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
};

type FormValues = {
  email: string;
  password: string;
  full_name: string;
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
      full_name: "",
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
  const toggleSpecialization = (name: string) => {
    setValue(
      "specialization",
      specialization.includes(name)
        ? specialization.filter(s => s !== name)
        : [...specialization, name]
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

  /* ---------------- SUBMIT ---------------- */
  const onSubmit = async (form: FormValues) => {
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
            duration_mins: appt.duration_mins,
            max_attendees: appt.max_attendee,
            fee: Number(appt.base_fee || 0),
            platform_fee: Number(appt.platform_fee || 0),
            extra_fee_per_attendee: Number(appt.extra_fee_per_attendee || 0),
          };
          return acc;
        }, {}),
      };

      const res = await fetch("/api/auth/register-practitioner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      setMessage("🎉 Practitioner registered successfully!");
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  };

  const weekdays = [
    "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"
  ];

  /* ---------------- JSX (UNCHANGED) ---------------- */

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-5 flex justify-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-10">
          Register as <span className="text-teal-600">Practitioner</span>
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
                  name="full_name"
                  control={control}
                  rules={{ required: "Full Name is required" }}
                  render={({ field, fieldState }) => (
                    <Input
                      placeholder="Full Name"
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

              <Controller
                name="password"
                control={control}
                rules={{ required: "Password is required" }}
                render={({ field, fieldState }) => (
                  <Input
                    type="password"
                    className="mt-4"
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
                      specialization.map(name => (
                        <span
                          key={name}
                          className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-sm"
                        >
                          {name}
                        </span>
                      ))
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
                            checked={specialization.includes(spec.name)}
                            onChange={() => toggleSpecialization(spec.name)}
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
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none"
                  onChange={handleAppointmentSelect}
                >
                  <option value="" disabled>
                    Choose appointment type
                  </option>
                  {appointmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
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
                    className = "mt-4 h-20"
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
              disabled={loading}
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

