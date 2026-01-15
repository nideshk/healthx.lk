"use client";

import React, { useEffect, useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { authFetch } from "@/lib/authFetch";

const AccountSettings: React.FC = () => {
  const [form, setForm] = useState({
    username: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* --------------------------------------------------
   * Fetch logged-in user's email for username
   * -------------------------------------------------- */
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await authFetch("/api/auth/me");

        if (!res.ok) return;

        const data = await res.json();

        const email =
          data?.user?.user?.email ??
          data?.email ??
          "";

        setForm((prev) => ({
          ...prev,
          username: email,
        }));
      } catch (err) {
        console.error("Failed to fetch logged-in user", err);
      }
    };

    fetchMe();
  }, []);

  /* --------------------------------------------------
   * Save password
   * -------------------------------------------------- */
  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!form.newPassword || !form.confirmPassword) {
      setError("Please enter and confirm the new password.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const res = await authFetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_password: form.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data?.error || "Failed to change password. Please try again."
        );
        return;
      }

      setSuccess("Password updated successfully.");
      setForm((prev) => ({
        ...prev,
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err) {
      console.error("Change password failed", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white">
      <div className="text-sm font-semibold text-slate-900 mb-4">
        Account
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Username"
          value={form.username}
          disabled
        />

        <Input
          label="New Password"
          type="password"
          placeholder="Enter new password"
          value={form.newPassword}
          onChange={(e) =>
            setForm({ ...form, newPassword: e.target.value })
          }
        />
      </div>

      <div className="mt-4">
        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter new password"
          value={form.confirmPassword}
          onChange={(e) =>
            setForm({ ...form, confirmPassword: e.target.value })
          }
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      <Button
        className="mt-5"
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
};

export default AccountSettings;
