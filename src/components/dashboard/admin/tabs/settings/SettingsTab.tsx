"use client";

import React, { useState } from "react";
import SecurityTab from "../settings/SecurityTab";
import AccountTab from "../settings/AccountTab";
import PlatformTab from "../settings/PlatformTab";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type SettingsTabType = "Security" | "Account" | "Platform";

interface SettingsTabProps {
  email: string;
}

/* -------------------------------------------------------------------------- */
/* MAIN SKELETON COMPONENT                                                    */
/* -------------------------------------------------------------------------- */

const SettingsTab: React.FC<SettingsTabProps> = ({ email }) => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>("Security");

  return (
    <div className="space-y-4 relative">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-md">
        <div className="text-lg font-semibold">Settings</div>
        <div className="text-xs opacity-90">Security, account preferences, and platform charges</div>
      </div>

      {/* SUB TABS NAVIGATION */}
      <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
        {(["Security", "Account", "Platform"] as SettingsTabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
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

      {/* CONTENT AREA */}
      <div className="mt-2">
        {activeTab === "Security" && <SecurityTab />}
        {activeTab === "Account" && <AccountTab email={email} />}
        {activeTab === "Platform" && <PlatformTab />}
      </div>
    </div>
  );
};

export default SettingsTab;