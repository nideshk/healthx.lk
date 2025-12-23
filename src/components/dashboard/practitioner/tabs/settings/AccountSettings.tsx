"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

const AccountSettings: React.FC = () => {
  const [form, setForm] = useState({
    username: "nidesh",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSave = () => {
    // FUTURE API:
    // POST /api/practitioner/settings/account
    console.log("Saving account settings", form);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white">
      <div className="text-sm font-semibold text-slate-900 mb-4">
        Account
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Username" value={form.username} disabled />

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

      <Button className="mt-5" onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  );
};

export default AccountSettings;
