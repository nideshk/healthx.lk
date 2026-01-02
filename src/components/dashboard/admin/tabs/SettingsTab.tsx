"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

/* -------------------------------------------------------------------------- */
/* TYPES                                    */
/* -------------------------------------------------------------------------- */

type SettingsTabType = "Security" | "Account" | "Platform";

interface SettingsTabProps {
  email: string;
}

interface ProfileResponse {
  success: boolean;
  profile: {
    id: string;
    role: string;
    display_name: string;
    multi_factor: boolean;
  };
}

interface ChangePasswordResponse {
  success?: boolean;
  error?: string;
}

interface PlatformFee {
  id: string;
  name: string;
  description: string;
  duration_mins: number;
  base_fee: number;
  max_attendee: number;
  extra_fee_per_attendee: number | null;
  platform_fee: number;
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const SettingsTab: React.FC<SettingsTabProps> = ({ email }) => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>("Security");

  /* ---------------- SECURITY ---------------- */

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading2FA, setLoading2FA] = useState(false);

  /* ---------------- ACCOUNT ---------------- */

  const [accountForm, setAccountForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);

  /* ---------------- PLATFORM ---------------- */

  const [fees, setFees] = useState<PlatformFee[]>([]);
  const [platformLoading, setPlatformLoading] = useState(false);

  /* -------------------------------------------------------------------------- */
  /* API HELPERS                                  */
  /* -------------------------------------------------------------------------- */

  // Fetch Platform Fees
  useEffect(() => {
    const fetchFees = async () => {
      try {
        const res = await fetch("/api/platform_fee");
        const json = await res.json();
        if (json.success) {
          setFees(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch platform fees", err);
      }
    };
    fetchFees();
  }, []);

  const update2FA = async (enabled: boolean) => {
    const res = await fetch("/api/profiles", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });

    if (!res.ok) {
      throw new Error("Failed to update 2FA");
    }

    const json: ProfileResponse = await res.json();
    return json.profile.multi_factor;
  };

  const changePassword = async (newPassword: string) => {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: newPassword }),
    });

    const json: ChangePasswordResponse = await res.json();

    if (!res.ok || json.error) {
      throw new Error(json.error || "Failed to change password");
    }

    return true;
  };

  /* -------------------------------------------------------------------------- */
  /* HANDLERS                                    */
  /* -------------------------------------------------------------------------- */

  const handleToggle2FA = async () => {
    const nextValue = !twoFactorEnabled;

    setTwoFactorEnabled(nextValue);
    setLoading2FA(true);

    try {
      const confirmedValue = await update2FA(nextValue);
      setTwoFactorEnabled(confirmedValue);
    } catch {
      setTwoFactorEnabled(!nextValue);
      alert("Failed to update 2FA. Please try again.");
    } finally {
      setLoading2FA(false);
    }
  };

  const handleSaveAccount = async () => {
    setAccountError(null);
    setAccountSuccess(null);

    const { newPassword, confirmPassword } = accountForm;

    if (!newPassword || !confirmPassword) {
      setAccountError("Please fill in both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setAccountError("Passwords do not match.");
      return;
    }

    try {
      setAccountLoading(true);
      await changePassword(newPassword);

      setAccountSuccess("Password updated successfully.");
      setAccountForm({ newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setAccountError(err.message);
    } finally {
      setAccountLoading(false);
    }
  };

  // Helper to update specific fee fields in state
  const updateFeeField = (id: string, field: keyof PlatformFee, value: number) => {
    setFees((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const savePlatformCharges = async () => {
    setPlatformLoading(true);
    try {
      const updates = fees.map((f) => ({
        id: f.id,
        base_fee: f.base_fee,
        max_attendee: f.max_attendee,
        platform_fee: f.platform_fee,
        extra_fee_per_attendee: f.extra_fee_per_attendee,
      }));

      const res = await fetch("/api/platform_fee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!res.ok) throw new Error("Update failed");
      alert("Platform charges updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to save platform charges.");
    } finally {
      setPlatformLoading(false);
    }
  };

  // Helper to get fee by name (Quick, Standard, Extended)
  const getFeeData = (name: string) => {
    return fees.find((f) => f.name.toLowerCase().includes(name.toLowerCase())) || {
      id: "",
      base_fee: 0,
      max_attendee: 0,
      platform_fee: 0,
      extra_fee_per_attendee: 0,
    };
  };

  /* -------------------------------------------------------------------------- */
  /* RENDER                                    */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="text-lg font-semibold">Settings</div>
        <div className="text-xs opacity-90">
          Security, account preferences, and platform charges
        </div>
      </div>

      {/* SUB TABS */}
      <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
        {["Security", "Account", "Platform"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as SettingsTabType)}
            className={`flex-1 text-sm py-2 rounded-md transition ${
              activeTab === tab
                ? "bg-white shadow text-slate-900 font-medium"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "Platform" ? "Platform Charges" : tab}
          </button>
        ))}
      </div>

      {/* ======================== SECURITY TAB ======================== */}
      {activeTab === "Security" && (
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
                disabled={loading2FA}
                onChange={handleToggle2FA}
              />
              <div className="w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-blue-600 transition"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
            </label>
          </div>
        </div>
      )}

      {/* ======================== ACCOUNT TAB ========================= */}
      {activeTab === "Account" && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white">
          <div className="text-sm font-semibold text-slate-900 mb-4">
            Account
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Username" value={email || "-"} disabled />

            <Input
              label="New Password"
              type="password"
              value={accountForm.newPassword}
              onChange={(e) =>
                setAccountForm({
                  ...accountForm,
                  newPassword: e.target.value,
                })
              }
            />
          </div>

          <div className="mt-4">
            <Input
              label="Confirm New Password"
              type="password"
              value={accountForm.confirmPassword}
              onChange={(e) =>
                setAccountForm({
                  ...accountForm,
                  confirmPassword: e.target.value,
                })
              }
            />
          </div>

          {accountError && (
            <p className="mt-3 text-xs text-red-600">{accountError}</p>
          )}

          {accountSuccess && (
            <p className="mt-3 text-xs text-green-600">
              {accountSuccess}
            </p>
          )}

          <Button
            className="mt-5"
            onClick={handleSaveAccount}
            disabled={accountLoading}
          >
            {accountLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}

      {/* ===================== PLATFORM CHARGES ======================= */}
      {activeTab === "Platform" && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-6">
          <div className="text-sm font-semibold text-slate-900">
            Appointment Fees
          </div>

          <Section title="Consultation Base Fees (LKR)">
            <div className="grid grid-cols-3 gap-4">
              {["Quick", "Standard", "Extended"].map((type) => {
                const item = getFeeData(type);
                return (
                  <Input
                    key={type}
                    label={`${type} (LKR)`}
                    type="number"
                    value={item.base_fee.toString()}
                    onChange={(e) =>
                      updateFeeField(item.id, "base_fee", Number(e.target.value))
                    }
                  />
                );
              })}
            </div>
          </Section>

          <Section title="Extra Fee Per Attendee (LKR)">
            <div className="grid grid-cols-3 gap-4">
              {["Quick", "Standard", "Extended"].map((type) => {
                const item = getFeeData(type);
                return (
                  <Input
                    key={type}
                    label={`${type} Extra (LKR)`}
                    type="number"
                    value={(item.extra_fee_per_attendee ?? 0).toString()}
                    onChange={(e) =>
                      updateFeeField(item.id, "extra_fee_per_attendee", Number(e.target.value))
                    }
                  />
                );
              })}
            </div>
          </Section>

          <Section title="Max Number of Attendees">
            <div className="grid grid-cols-3 gap-4">
              {["Quick", "Standard", "Extended"].map((type) => {
                const item = getFeeData(type);
                return (
                  <Input
                    key={type}
                    label={type}
                    type="number"
                    value={item.max_attendee.toString()}
                    onChange={(e) =>
                      updateFeeField(item.id, "max_attendee", Number(e.target.value))
                    }
                  />
                );
              })}
            </div>
          </Section>

          <Section title="Platform Charges">
            <Input
              label="System Platform Fee (LKR)"
              type="number"
              value={(fees[0]?.platform_fee ?? 0).toString()}
              onChange={(e) => {
                const val = Number(e.target.value);
                setFees(fees.map((f) => ({ ...f, platform_fee: val })));
              }}
            />
          </Section>

          <Button onClick={savePlatformCharges} disabled={platformLoading}>
            {platformLoading ? "Saving..." : "Save Service Charges"}
          </Button>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* HELPER COMPONENTS                              */
/* -------------------------------------------------------------------------- */

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="text-sm font-medium text-slate-800 mb-3">
      {title}
    </div>
    {children}
  </div>
);

export default SettingsTab;