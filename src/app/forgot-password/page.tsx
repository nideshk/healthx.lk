"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return <p className="text-green-600">Check your email for reset link</p>;
  }

  return (
  <form
    onSubmit={handleSubmit}
    className="max-w-md mx-auto mt-16 p-6 border rounded-2xl shadow-sm space-y-5"
  >
    <div className="text-center space-y-1">
      <h1 className="text-2xl font-semibold text-gray-900">
        Forgot your password?
      </h1>
      <p className="text-sm text-gray-600">
        Enter your email address and we’ll send you a reset link.
      </p>
    </div>

    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Email address
      </label>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>

    <button
      disabled={loading}
      className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition"
    >
      {loading ? "Sending reset link…" : "Send reset link"}
    </button>

    <p className="text-xs text-gray-500 text-center">
      If an account exists for this email, you’ll receive a link within a few
      minutes.
    </p>
  </form>
);

}
