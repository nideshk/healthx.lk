"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type SettingsTabType = "Security" | "Account" | "Platform";

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const SettingsTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>("Security");

  /* ---------------- MOCK ACCOUNT DATA (API READY) ---------------- */
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [accountForm, setAccountForm] = useState({
    username: "nidesh",
    newPassword: "",
    confirmPassword: "",
  });

  const [platformCharges, setPlatformCharges] = useState({
    solo: {
      quick: 1500,
      standard: 2500,
      extended: 3500,
    },
    plusOne: {
      quick: 2000,
      standard: 3000,
      extended: 4000,
    },
    maxAttendees: {
      quick: 1,
      standard: 2,
      extended: 3,
    },
    baseFee: 950,
  });

  /* ---------------- HELPERS ---------------- */

  const updateCharge = (
    section: string,
    key: string,
    value: number,
    min = 0,
    max?: number
  ) => {
    if (value < min) return;
    if (max !== undefined && value > max) return;

    setPlatformCharges((prev) => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [key]: value,
      },
    }));
  };

  const updateBaseFee = (value: number) => {
    if (value < 0) return;
    setPlatformCharges((prev) => ({ ...prev, baseFee: value }));
  };

  const savePlatformCharges = () => {
    /**
     * FUTURE API:
     * POST /api/admin/settings/platform-charges
     * body: platformCharges
     */
    console.log("Saving platform charges:", platformCharges);
  };

  /* ---------------- HANDLERS ---------------- */

  const handleSaveAccount = () => {
    /**
     * FUTURE API:
     * POST /api/admin/settings/account
     * body: { newPassword }
     */
    console.log("Saving account settings:", accountForm);
  };

  const handleToggle2FA = () => {
    /**
     * FUTURE API:
     * POST /api/admin/settings/2fa
     * body: { enabled: !twoFactorEnabled }
     */
    setTwoFactorEnabled((prev) => !prev);
  };

  return (
    <div className="space-y-4">

      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="text-lg font-semibold">Settings</div>
        <div className="text-xs opacity-90">
          Security, account preferences, and platform charges
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SUB TABS                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
        {["Security", "Account", "Platform"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as SettingsTabType)}
            className={`
              flex-1 text-sm py-2 rounded-md transition
              ${
                activeTab === tab
                  ? "bg-white shadow text-slate-900 font-medium"
                  : "text-slate-500 hover:text-slate-700"
              }
            `}
          >
            {tab === "Platform" ? "Platform Charges" : tab}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB CONTENT                                                        */}
      {/* ------------------------------------------------------------------ */}

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
                onChange={handleToggle2FA}
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 transition"></div>
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
            <Input
              label="Username"
              value={accountForm.username}
              disabled
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
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
              placeholder="Re-enter new password"
              value={accountForm.confirmPassword}
              onChange={(e) =>
                setAccountForm({
                  ...accountForm,
                  confirmPassword: e.target.value,
                })
              }
            />
          </div>

          <Button className="mt-5" onClick={handleSaveAccount}>
            Save Changes
          </Button>
        </div>
      )}


      {/* ===================== PLATFORM CHARGES ======================= */}
    {activeTab === "Platform" && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-6">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Appointment Fees
            </div>
            <div className="text-xs text-slate-500">
              Configure pricing and platform limits
            </div>
          </div>

          {/* ROW 1 – SOLO */}
          <Section title="Solo Appointments">
            <ChargeRow
              values={platformCharges.solo}
              onChange={(k, v) => updateCharge("solo", k, v)}
            />
          </Section>

          {/* ROW 2 – +1 */}
          <Section title="Appointments with +1 Attendee">
            <ChargeRow
              values={platformCharges.plusOne}
              onChange={(k, v) => updateCharge("plusOne", k, v)}
            />
          </Section>

          {/* ROW 3 – MAX ATTENDEES */}
          <Section title="Max Number of Attendees">
            <ChargeRow
              values={platformCharges.maxAttendees}
              onChange={(k, v) =>
                updateCharge("maxAttendees", k, v, 0, 3)
              }
              suffix="attendees"
            />
          </Section>

          {/* ROW 4 – BASE FEE */}
          <Section title="Platform Charges">
            <div className="grid grid-cols-3 gap-4 max-w-sm">
              <Input
                label="Base Fee (LKR)"
                type="number"
                value={platformCharges.baseFee.toString()}
                onChange={(e) =>
                  updateBaseFee(Number(e.target.value))
                }
              />
            </div>
          </Section>

          <Button onClick={savePlatformCharges}>
            Save Service Charges
          </Button>
        </div>
      )}
    </div>
  );
};

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

const ChargeRow = ({
  values,
  onChange,
  suffix = "LKR",
}: {
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
  suffix?: string;
}) => (
  <div className="grid grid-cols-3 gap-4">
    {Object.entries(values).map(([key, value]) => (
      <Input
        key={key}
        label={formatLabel(key)}
        type="number"
        value={value.toString()}
        onChange={(e) => onChange(key, Number(e.target.value))}
      />
    ))}
  </div>
);

const formatLabel = (key: string) => {
  if (key === "quick") return "Quick Consultation (LKR)";
  if (key === "standard") return "Standard Consultation (LKR)";
  if (key === "extended") return "Extended Consultation (LKR)";
  return key;
};

export default SettingsTab;
