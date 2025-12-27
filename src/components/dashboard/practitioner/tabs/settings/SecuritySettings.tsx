"use client";

import React, { useState } from "react";

const SecuritySettings: React.FC = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleToggle2FA = () => {
    // FUTURE API:
    // POST /api/practitioner/settings/2fa
    setTwoFactorEnabled((prev) => !prev);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white">
      <div className="text-sm font-semibold text-slate-900 mb-1">
        Security
      </div>

      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
        <div>
          <div className="text-sm font-medium text-slate-900">
            Two-Factor Authentication (2FA)
          </div>
          <div className="text-xs text-slate-500">
            Add an extra layer of security to your account
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={twoFactorEnabled}
            onChange={handleToggle2FA}
          />
          <div className="w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-blue-600 transition" />
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5" />
        </label>
      </div>
    </div>
  );
};

export default SecuritySettings;
