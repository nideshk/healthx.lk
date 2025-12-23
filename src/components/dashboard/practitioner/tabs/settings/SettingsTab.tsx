"use client";

import React, { useState } from "react";
import SecuritySettings from "../settings/SecuritySettings";
import AccountSettings from "../settings/AccountSettings";
import Availability from "../settings/Availability";
import PricingSettings from "../settings/PricingSettings";

type SettingsTabType = "Security" | "Account" | "Availability" | "Pricing";

const SettingsTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>("Security");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="text-lg font-semibold">Settings</div>
        <div className="text-xs opacity-90">
          Security, account preferences, availability and pricing
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
        {["Security", "Account", "Availability", "Pricing"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as SettingsTabType)}
            className={`flex-1 text-sm py-2 rounded-md transition ${
              activeTab === tab
                ? "bg-white shadow text-slate-900 font-medium"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "Pricing" ? "Pricing Charges" : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "Security" && <SecuritySettings />}
      {activeTab === "Account" && <AccountSettings />}
      {activeTab === "Availability" && <Availability />}
      {activeTab === "Pricing" && <PricingSettings />}
    </div>
  );
};

export default SettingsTab;
