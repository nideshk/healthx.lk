"use client";
import React, { useState } from "react";
import ToggleSwitch from "@/components/ToggleSwitch";
import { CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [twoFA, setTwoFA] = useState(false);
  const [secret, setSecret] = useState("");
  const [showToast, setShowToast] = useState(false);

  const generateSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    return (
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("") +
      "••••••••" +
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    );
  };

  const handleToggle2FA = () => {
    const nextState = !twoFA;
    setTwoFA(nextState);
    if (nextState) {
      setSecret(generateSecret());
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else {
      setSecret("");
    }
  };

  const handleReset2FA = () => {
    setSecret(generateSecret());
  };

  return (
    <div className="text-sm relative">
      <div className="rounded-t-lg bg-blue-600 text-white p-4">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-xs text-blue-100">Security and account preferences</p>
      </div>

      <div className="bg-white border border-blue-300 rounded-b-lg p-5 space-y-6">
        {/* Security */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-2 text-sm">Security</h3>

          <div className="border border-blue-300 rounded-md p-4 bg-blue-50 mb-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-medium text-sm">Two-Factor Authentication (2FA)</p>
                <p className="text-xs text-gray-600">
                  Add an extra layer of security to your account
                </p>
              </div>
              <ToggleSwitch checked={twoFA} onChange={handleToggle2FA} />
            </div>

          </div>
          
            {twoFA && (
              <div className="border border-gray-200 flex flex-col gap-4 rounded-md bg-white p-3 text-xs">
                <p className="font-medium mb-1 text-gray-600">
                  Your 2FA secret (store securely)
                </p>
                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block font-mono tracking-wide text-sm mb-2">
                  {secret}
                </div>
                <button
                  onClick={handleReset2FA}
                  className="text-blue-600 border border-blue-600 px-3 py-1 rounded-md text-xs hover:bg-blue-600 hover:text-white transition"
                >
                  Reset 2FA
                </button>
              </div>
            )}
        </div>

        <hr className="border-gray-200" />

        {/* Account Section */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-2 text-sm">Account</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Username</label>
              <input
                value="nidesh"
                readOnly
                className="w-full border rounded-md px-2 py-1 text-sm bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                className="w-full border rounded-md px-2 py-1 text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Re-enter new password"
                className="w-full border rounded-md px-2 py-1 text-sm"
              />
            </div>
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-1.5 rounded-md mt-4">
            Save Changes
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-5 right-5 bg-white border shadow-lg rounded-md flex items-center gap-2 px-4 py-2 text-xs text-gray-700 animate-fadeIn">
          <CheckCircle size={14} className="text-green-600" />
          <span>Two-factor authentication enabled</span>
        </div>
      )}
    </div>
  );
}
