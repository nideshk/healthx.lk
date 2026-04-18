"use client";

import { useState } from "react";
import { toast } from "react-toastify";

export default function CreateAppointmentForm() {
  const [form, setForm] = useState({
    appointment_type_id: "",
    business_id: "",
    patient_id: "",
    practitioner_id: "",
    starts_at: "",
    ends_at: "",
    notes: "",
    repeat_type: "Daily",
    number_of_repeats: 1,
    repeating_interval: 30,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        appointment_type_id: form.appointment_type_id,
        business_id: form.business_id,
        patient_id: form.patient_id,
        practitioner_id: form.practitioner_id,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        notes: form.notes,
        repeat_rule: {
          number_of_repeats: Number(form.number_of_repeats),
          repeat_type: form.repeat_type,
          repeating_interval: Number(form.repeating_interval),
        },
      };


      const res = await fetch("/api/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create appointment");
        toast.error(data.error || "Failed to create appointment");
      } else {
        setSuccess("✅ Appointment created successfully!");
      }
    } catch (err: any) {
      toast.error("Unexpected error occurred");
      setError("Unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-8 space-y-6"
      >
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Create Appointment
        </h1>

        {error && (
          <p className="text-center text-sm text-red-600 bg-red-50 rounded-md p-2">{error}</p>
        )}
        {success && (
          <p className="text-center text-sm text-green-600 bg-green-50 rounded-md p-2">{success}</p>
        )}

        {/* Appointment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Appointment Type ID
          </label>
          <input
            name="appointment_type_id"
            type="text"
            value={form.appointment_type_id}
            onChange={handleChange}
            placeholder="e.g., 1725382641949091611"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-indigo-500"
            required
          />
        </div>

        {/* Business ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Business ID</label>
          <input
            name="business_id"
            type="text"
            value={form.business_id}
            onChange={handleChange}
            placeholder="e.g., 1725382642183972780"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-indigo-500"
            required
          />
        </div>

        {/* Practitioner + Patient */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Practitioner ID</label>
            <input
              name="practitioner_id"
              type="text"
              value={form.practitioner_id}
              onChange={handleChange}
              placeholder="e.g., 1725387578259023443"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Patient ID</label>
            <input
              name="patient_id"
              type="text"
              value={form.patient_id}
              onChange={handleChange}
              placeholder="e.g., 1798559871122023774"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        {/* Start & End */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              name="starts_at"
              type="datetime-local"
              value={form.starts_at}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Time</label>
            <input
              name="ends_at"
              type="datetime-local"
              value={form.ends_at}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Add any appointment notes..."
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-indigo-500"
          />
        </div>

        {/* Repeat Rule */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Repeat Type</label>
            <select
              name="repeat_type"
              value={form.repeat_type}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-indigo-500"
            >
              <option value="None">None</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              # of Repeats
            </label>
            <input
              name="number_of_repeats"
              type="number"
              value={form.number_of_repeats}
              onChange={handleChange}
              min={0}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Interval (days/weeks)
            </label>
            <input
              name="repeating_interval"
              type="number"
              value={form.repeating_interval}
              onChange={handleChange}
              min={0}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Appointment"}
        </button>
      </form>
    </div>
  );
}
