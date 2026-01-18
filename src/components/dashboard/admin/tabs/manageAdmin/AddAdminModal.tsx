"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { authFetch } from "@/lib/authFetch";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

interface AddAdminModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

const AddAdminModal: React.FC<AddAdminModalProps> = ({
  onClose,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    gender: "",
    email: "",
    password: "",
    confirm_password: "",
    role: "admin",
  });

  useEffect(() => {
    if (isSuccess) {
      onClose();
      onRefresh();
    }
  }, [isSuccess, onClose, onRefresh]);

  // Password validation helper
  const validatePassword = (pass: string) => {
    const hasMinLength = pass.length >= 8;
    const hasUppercase = /[A-Z]/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    if (!hasMinLength) return "Password must be at least 8 characters long.";
    if (!hasUppercase)
      return "Password must contain at least one uppercase letter.";
    if (!hasSpecialChar)
      return "Password must contain at least one special character.";
    return null;
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.gender) {
      setError("Please select a gender.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    const passwordError = validatePassword(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/api/manage-admin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error(`Failed to create admin: ${res.status}`);
      }

      if (res.ok) {
        toast.success("Admin created successfully!");
        setIsSuccess(true);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to create admin");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative shadow-xl">
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 text-2xl"
          onClick={onClose}
        >
          ×
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Add New Administrator
          </h2>
          <p className="text-sm text-slate-500">
            Create a new administrator account with specific roles.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2 text-xs bg-red-50 text-red-600 border border-red-100 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Enter full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">
                Gender
              </label>
              <select
                className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input
              label="Email"
              type="email"
              placeholder="Enter email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter password"
              value={form.confirm_password}
              onChange={(e) =>
                setForm({ ...form, confirm_password: e.target.value })
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 mb-2 block">
              Admin Level
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={form.role === "admin"}
                  onChange={() => setForm({ ...form, role: "admin" })}
                  className="w-4 h-4 accent-blue-600"
                />
                Admin
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={form.role === "superadmin"}
                  onChange={() => setForm({ ...form, role: "superadmin" })}
                  className="w-4 h-4 accent-blue-600"
                />
                Super Admin
              </label>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Creating..." : "Add Administrator"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAdminModal;