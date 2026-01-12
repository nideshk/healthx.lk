"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { toast } from "react-toastify";

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

  const changePassword = async (newPassword: string) => {
    const res = await fetch("/api/auth/change-password", {
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

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">
        Account Profile
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Username" value={email || "-"} disabled />
        <Input
          label="New Password"
          type="password"
          value={accountForm.newPassword}
          onChange={(e) =>
            setAccountForm({ ...accountForm, newPassword: e.target.value })
          }
        />
      </div>
      <Input
        label="Confirm New Password"
        type="password"
        value={accountForm.confirmPassword}
        onChange={(e) =>
          setAccountForm({ ...accountForm, confirmPassword: e.target.value })
        }
      />
      <div className="flex justify-end pt-2">
        <Button onClick={handleSaveAccount} disabled={accountLoading}>
          {accountLoading ? "Saving..." : "Update Credentials"}
        </Button>
      </div>
    </div>
  );
};

export default AccountTab;
