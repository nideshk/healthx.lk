"use client";

import React, { useState, useEffect } from "react";
import { Trash2, ChevronDown, X } from "lucide-react";



type AppointmentType = {
  id: string;
  name: string;
  duration_mins: number;
  base_fee: number | string;   // number from API, becomes string when edited
  max_attendee: number;        // note: from API it's "max_attendee"
  platform_fee: number;
  extra_fee_per_attendee: number;
};

type Specialization = {
  id: string;
  name: string;
  active: boolean;
};

export default function PractitionerRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    qualification: "",
    specialization: [] as string[],
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
    branch_address: ""
    },
    availability: {
      start_time: "09:00",
      end_time: "18:00",
      days_unavailable: ["Sunday"],
      timezone: "Asia/Kolkata",
    },
  });
  // NEW: selected appointment types & editable fees
  const [selectedAppointments, setSelectedAppointments] = useState<AppointmentType[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const fetchSpecializations = async () => {
    try {
      const res = await fetch("/api/specialisation");
      if (!res.ok) {
        console.error("Failed to fetch specializations");
        return;
      }

      const data = await res.json();
      setSpecializations(data.services || []);
    } catch (err) {
      console.error("Error fetching specializations", err);
    }
    };

    const fetchAppointmentTypes = async () => {
      try {
        const res = await fetch("/api/appointment/appointment_type");
        if (!res.ok) {
          console.error("Failed to fetch appointment types");
          return;
        }

        const data = await res.json();

        // data.appointment_types comes in as base_fee: number, max_attendee: number
        setAppointmentTypes(
          (data.appointment_types || []).map((t: any) => ({
            ...t,
            base_fee: t.base_fee ?? 0, // ensure it's defined
          }))
        );
      } catch (err) {
        console.error("Error fetching appointment types", err);
      }
    };

    fetchSpecializations();
    fetchAppointmentTypes();
  }, []);

  const toggleSpecialization = (name: string) => {
    setForm(prev => {
      const exists = prev.specialization.includes(name);
      return {
        ...prev,
        specialization: exists
          ? prev.specialization.filter(s => s !== name)
          : [...prev.specialization, name],
      };
    });
  };

  const handleAvailabilityChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      availability: { ...prev.availability, [name]: value },
    }));
  };

  const handleBankChange = (e: any) => {
  const { name, value } = e.target;
  setForm((prev: any) => ({
      ...prev,
      bank_details: {
        ...prev.bank_details,
        [name]: value,
      },
    }));
  };

  const toggleDayUnavailable = (day: string) => {
    setForm((prev: any) => {
      const exists = prev.availability.days_unavailable.includes(day);
      return {
        ...prev,
        availability: {
          ...prev.availability,
          days_unavailable: exists
            ? prev.availability.days_unavailable.filter((d: string) => d !== day)
            : [...prev.availability.days_unavailable, day],
        },
      };
    });
  };

  // NEW: when doctor chooses an appointment type from dropdown
  const handleAppointmentSelect = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const id = e.target.value;
    if (!id) return;

    const type = appointmentTypes.find((t) => t.id === id);
    if (!type) return;

    setSelectedAppointments((prev) => {
      if (prev.some((p) => p.id === type.id)) return prev; // avoid duplicates
      return [...prev, { ...type }]; // clone so fee is editable
    });

    // reset dropdown to placeholder
    e.target.value = "";
  };

  // NEW: edit fee in table
  const handleAppointmentFeeChange = (id: string, value: string) => {
    setSelectedAppointments((prev) =>
      prev.map((appt) =>
        appt.id === id ? { ...appt, base_fee: value } : appt
      )
    );
  };

  const handleSpecializationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedNames = Array.from(
      e.target.selectedOptions,
      option => option.value
    );

    setForm(prev => ({
      ...prev,
      specialization: selectedNames,
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...form,
        specialization: form.specialization,
        experience_years: Number(form.experience_years),
        available_services: selectedAppointments.map(a => a.id),
        fees: selectedAppointments.reduce((acc: any, appt) => ({
        ...acc,
        [appt.id]: {
          type: appt.name,
          duration_mins: appt.duration_mins,
          max_attendees: appt.max_attendee,
          fee: Number(appt.base_fee || 0),
          platform_fee: Number(appt.platform_fee || 0),
          extra_fee_per_attendee: Number(appt.extra_fee_per_attendee || 0)
        }
      }), {} as any),
      bank_details: {
          bank_name: form.bank_details.bank_name,
          account_name: form.bank_details.account_name,
          branch_location: form.bank_details.branch_location,
          account_number: form.bank_details.account_number,
          ifsc_code: form.bank_details.ifsc_code || null,
          swift_code: form.bank_details.swift_code || null,
          branch_address: form.bank_details.branch_address || null
        }
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
      console.log(err)
      setError(err.message);
    }

    setLoading(false);
  };

  const weekdays = [
    "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-5 flex justify-center">
      <div className="w-full max-w-3xl">
        
        {/* HEADER */}
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-10">
          Register as <span className="text-teal-600">Practitioner</span>
        </h1>

        {/* CARD */}
        <div className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100">

          {/* STATUS MESSAGES */}
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

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-10">

            {/* SECTION: BASIC INFO */}
            <div>
              <h2 className="section-title">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Full Name" required/>
                <Input name="email" value={form.email} onChange={handleChange} placeholder="Email Address" required/>
              </div>

              <Input 
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                required
                className="mt-4"
              />
            </div>

            {/* SECTION: PROFESSIONAL INFO */}
            <div>
              <h2 className="section-title">Professional Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Input name="qualification" placeholder="Qualification" value={form.qualification} onChange={handleChange}/>
                <Input name="license_number" placeholder="License Number" value={form.license_number} onChange={handleChange}/>
              </div>

              {/* MULTI SELECT DROP DOWN */}
              <div className="mt-4 relative">
                <label className="text-gray-700 font-medium mb-1 block">
                  Specializations
                </label>

                {/* Input box */}
                <div className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white flex items-center justify-between focus-within:ring-2 focus-within:ring-teal-500">
                  
                  {/* Selected chips */}
                  <div className="flex flex-wrap gap-2">
                    {form.specialization.length === 0 ? (
                      <span className="text-gray-400">Select specializations</span>
                    ) : (
                      form.specialization.map(name => (
                        <span
                          key={name}
                          className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-sm"
                        >
                          {name}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Toggle button */}
                  <button
                    type="button"
                    onClick={() => setIsSpecOpen(prev => !prev)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    {isSpecOpen ? <X size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* Dropdown */}
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
                            checked={form.specialization.includes(spec.name)}
                            onChange={() => toggleSpecialization(spec.name)}
                          />
                          <span className="text-gray-700">{spec.name}</span>
                        </label>
                      ))}
                  </div>
                )}
              </div>

              <Input
                className="mt-4"
                type="number"
                name="experience_years"
                placeholder="Experience (years)"
                value={form.experience_years}
                onChange={handleChange}
              />

              <Textarea
                className="mt-4"
                name="profile_bio"
                placeholder="Short professional bio"
                value={form.profile_bio}
                onChange={handleChange}
                textareaClassName = "h-28"
              />
            </div>

            {/* SECTION: CONTACT */}
            <div>
              <h2 className="section-title">Contact Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Input name="contact_email" placeholder="Professional Email" value={form.contact_email} onChange={handleChange}/>
                <Input name="contact_number" placeholder="Phone Number" value={form.contact_number} onChange={handleChange}/>
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
                        <th className="px-4 py-2 border-b text-left  border-gray-200">
                          Appointment Type
                        </th>
                        <th className="px-4 py-2 border-b text-left  border-gray-200">
                          Duration
                        </th>
                        <th className="px-4 py-2 border-b text-left  border-gray-200">Fee</th>
                        <th className="px-4 py-2 border-b text-left  border-gray-200">
                          Max attendees
                        </th>
                        <th className="px-4 py-2 border-b text-left  border-gray-200"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAppointments.map((appt) => (
                        <tr key={appt.id}>
                          <td className="px-4 py-2 border-b  border-gray-200">{appt.name}</td>
                          <td className="px-4 py-2 border-b  border-gray-200">
                            {appt.duration_mins} min
                          </td>
                          <td className="px-4 py-2 border-b  border-gray-200">
                            <input
                              type="number"
                              className="w-24 px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none"
                              value={appt.base_fee}
                              onChange={(e) =>
                                handleAppointmentFeeChange(
                                  appt.id,
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-2 border-b  border-gray-200">
                            {appt.max_attendee}
                          </td>
                          <td className="px-4 py-2 border-b  border-gray-200">
                            <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={() =>
                              setSelectedAppointments(prev =>
                                prev.filter(item => item.id !== appt.id)
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
                <Input
                  name="bank_name"
                  placeholder="Bank Name"
                  value={form.bank_details.bank_name}
                  onChange={handleBankChange}
                  required
                />

                <Input
                  name="account_name"
                  placeholder="Account Name"
                  value={form.bank_details.account_name}
                  onChange={handleBankChange}
                  required
                />

                <Input
                  name="branch_location"
                  placeholder="Branch Location"
                  value={form.bank_details.branch_location}
                  onChange={handleBankChange}
                />

                <Input
                  name="account_number"
                  placeholder="Account Number"
                  value={form.bank_details.account_number}
                  onChange={handleBankChange}
                  required
                />

                <Input
                  name="ifsc_code"
                  placeholder="IFSC Code"
                  value={form.bank_details.ifsc_code}
                  onChange={handleBankChange}
                />

                <Input
                  name="swift_code"
                  placeholder="SWIFT Code (optional)"
                  value={form.bank_details.swift_code}
                  onChange={handleBankChange}
                />
              </div>
              <Textarea
                  name="branch_address"
                  placeholder="Branch Address"
                  value={form.bank_details.branch_address}
                  onChange={handleBankChange}
                  className = "mt-4"
                  textareaClassName="h-20"
                />
            </div>

            {/* SECTION: AVAILABILITY */}
            <div>
              <h2 className="section-title">Availability</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Input
                  type="time"
                  name="start_time"
                  value={form.availability.start_time}
                  onChange={handleAvailabilityChange}
                  label="Start Time"
                />
                <Input
                  type="time"
                  name="end_time"
                  value={form.availability.end_time}
                  onChange={handleAvailabilityChange}
                  label="End Time"
                />
              </div>

              <p className="font-medium text-gray-700 mt-4 mb-2">Days Unavailable</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {weekdays.map((day) => (
                  <label key={day} className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={form.availability.days_unavailable.includes(day)}
                      onChange={() => toggleDayUnavailable(day)}
                    />
                    <span className="text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* SUBMIT */}
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

/* ---------------- REUSABLE COMPONENTS ---------------- */

function Input({ label, className = "", ...props }: any) {
  return (
    <div className={className}>
      {label && <label className="text-gray-700 font-medium mb-1 block">{label}</label>}
      <input
        {...props}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-gray-800"
      />
    </div>
  );
}

function Textarea({ label, className = "", textareaClassName = "", ...props }: any) {
  return (
    <div className={className}>
      {label && <label className="text-gray-700 font-medium mb-1 block">{label}</label>}
      <textarea
        {...props}
        className={`w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-gray-800 ${textareaClassName}`}
      />
    </div>
  );
}
