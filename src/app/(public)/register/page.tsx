"use client";

import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";


type AppointmentType = {
  id: string;
  name: string;
  duration_mins: number;
  base_fee: number | string;   // number from API, becomes string when edited
  max_attendee: number;        // note: from API it's "max_attendee"
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
    specialization: "",
    license_number: "",
    experience_years: "",
    contact_email: "",
    contact_number: "",
    profile_bio: "",
    available_services: "",
    fees: "",
    profile_picture_url: "",
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
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
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

    fetchAppointmentTypes();
  }, []);


  const handleAvailabilityChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      availability: { ...prev.availability, [name]: value },
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

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...form,
        specialization: form.specialization.split(",").map((s) => s.trim()),
        experience_years: Number(form.experience_years),
        available_services: selectedAppointments.map(a => a.id),
        fees: selectedAppointments.reduce((acc: any, appt) => ({
        ...acc,
        [appt.id]: {
          type: appt.name,
          duration_mins: appt.duration_mins,
          max_attendees: appt.max_attendee,
          fee: Number(appt.base_fee || 0)
        }
      }), {} as any)
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

              <Input
                className="mt-4"
                name="specialization"
                placeholder="Specializations (comma separated)"
                value={form.specialization}
                onChange={handleChange}
              />

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

function Textarea({ label, className = "", ...props }: any) {
  return (
    <div className={className}>
      {label && <label className="text-gray-700 font-medium mb-1 block">{label}</label>}
      <textarea
        {...props}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-gray-800 h-28"
      />
    </div>
  );
}
