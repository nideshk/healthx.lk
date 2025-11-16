"use client";

import React, { useState } from "react";

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
    solo_consultation_fee: "",
    family_consultation_fee: "",
    profile_picture_url: "",
    availability: {
      start_time: "09:00",
      end_time: "18:00",
      days_unavailable: ["Sunday"],
      timezone: "Asia/Kolkata",
    },
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

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
        solo_consultation_fee: Number(form.solo_consultation_fee),
        family_consultation_fee: Number(form.family_consultation_fee),
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

            {/* SECTION: FEES */}
            <div>
              <h2 className="section-title">Consultation Fees</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Input name="solo_consultation_fee" type="number" placeholder="Solo Consultation Fee" value={form.solo_consultation_fee} onChange={handleChange}/>
                <Input name="family_consultation_fee" type="number" placeholder="Family Consultation Fee" value={form.family_consultation_fee} onChange={handleChange}/>
              </div>
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
