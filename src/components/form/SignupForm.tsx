"use client";

import { useState } from "react";

export default function SignupForm() {
  const [form, setForm] = useState({
    first_name: "anirudh",
    last_name: "kulkarni",
    email: "anirudhkulkarni9094@gmail.com",
    password: "Anirudh9094@123",
    date_of_birth: "2002-01-01",
    gender_identity: "male",
    phone: "+61412345678",
    address_1: "abc",
    city: "Bangalore",
    state: "Karnataka",
    post_code: "0000",
    referral_source: "Website",
    notes: "Created from portal",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      setSuccess("✅ Account created successfully!");
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        date_of_birth: "",
        gender_identity: "male",
        phone: "",
        address_1: "",
        city: "",
        state: "",
        post_code: "",
        referral_source: "Website",
        notes: "Created from portal",
      });

      console.log("Signup Success →", data);
    } catch (err: any) {
      console.error("Signup error:", err);
      setError("Unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSignup();
        }}
        className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg space-y-4"
      >
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Patient Signup
        </h1>

        {error && (
          <p className="text-center text-sm text-red-600 bg-red-50 rounded-md p-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-center text-sm text-green-600 bg-green-50 rounded-md p-2">
            {success}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              name="first_name"
              type="text"
              value={form.first_name}
              onChange={handleChange}
              placeholder="John"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              name="last_name"
              type="text"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Doe"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="********"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            required
            minLength={8}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              name="date_of_birth"
              type="date"
              value={form.date_of_birth}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Gender
            </label>
            <select
              name="gender_identity"
              value={form.gender_identity}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="unspecified">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="+61412345678"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <input
            name="address_1"
            type="text"
            value={form.address_1}
            onChange={handleChange}
            placeholder="123 Main Street"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="Melbourne"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              State
            </label>
            <input
              name="state"
              value={form.state}
              onChange={handleChange}
              placeholder="VIC"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Post Code
            </label>
            <input
              name="post_code"
              value={form.post_code}
              onChange={handleChange}
              placeholder="3000"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}
