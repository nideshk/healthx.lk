"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { toast } from "react-toastify";
import { authFetch } from "@/lib/authFetch";
import { Eye, EyeOff } from "lucide-react";

interface AccountTabProps {
  email: string;
}

interface ChangePasswordResponse {
  success?: boolean;
  error?: string;
}

const AccountTab: React.FC<AccountTabProps> = ({ email }) => {
  const [accountForm, setAccountForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const changePassword = async (newPassword: string) => {
    const res = await authFetch("/api/auth/change-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: newPassword }),
    });
    const json: ChangePasswordResponse = await res.json();
    if (!res.ok || json.error)
      throw new Error(json.error || "Failed to change password");
    return true;
  };

  const handleSaveAccount = async () => {
    setAccountError(null);
    if (accountForm.newPassword !== accountForm.confirmPassword) {
      setAccountError("Passwords do not match.");
      toast.error("Passwords do not match");
      return;
    }
    try {
      setAccountLoading(true);
      await changePassword(accountForm.newPassword);
      toast.success("Password updated successfully");
      setAccountForm({ newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setAccountError(err.message);
      toast.error(err.message || "Failed to update password");
    } finally {
      setAccountLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">
        Account Profile
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Username" value={email || "-"} disabled />
        <div className="relative">
          <Input
            label="New Password"
            type={showPassword ? "text" : "password"}
            value={accountForm.newPassword}
            onChange={(e) =>
              setAccountForm({ ...accountForm, newPassword: e.target.value })
            }
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div className="relative">
        <Input
          label="Confirm New Password"
          type={showPassword ? "text" : "password"}
          value={accountForm.confirmPassword}
          onChange={(e) =>
            setAccountForm({ ...accountForm, confirmPassword: e.target.value })
          }
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <div className="flex justify-end pt-2">
        <Button onClick={handleSaveAccount} disabled={accountLoading}>
          {accountLoading ? "Saving..." : "Update Credentials"}
        </Button>
      </div>
    </div>
  );
};

export default AccountTab;
