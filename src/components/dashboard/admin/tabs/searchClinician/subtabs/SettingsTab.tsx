"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

interface SettingsTabProps {
  clinician: {
    id: string;
    username: string;
    isActive: boolean;
  };
}

const SettingsTab: React.FC<SettingsTabProps> = ({ clinician }) => {
  const [isDeactivating, setIsDeactivating] = useState(false);

  /* ---------------- FUTURE API CALL ----------------
     POST /api/admin/clinicians/{id}/deactivate
     body: { isActive: false }
  --------------------------------------------------- */
  const handleDeactivate = async () => {
    setIsDeactivating(true);

    console.log("Deactivating clinician:", clinician.id);

    // mock delay
    setTimeout(() => {
      setIsDeactivating(false);
      alert("Clinician deactivated (mock)");
    }, 600);
  };

  return (
    <div className="space-y-8">

      {/* ---------------- USERNAME SECTION ---------------- */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white">
        <div className="text-sm font-semibold text-slate-900">
          Username
        </div>
       

        <Input
          value={clinician.username}
          disabled
        />

      </div>

      {/* ---------------- DANGER ZONE ---------------- */}
      <div className="border border-red-300 bg-red-50 rounded-xl p-5">
        <div className="text-sm font-semibold text-red-700">
          Danger Zone
        </div>
        <div className="text-xs text-red-600 mb-4">
          Irreversible actions
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">
              Deactivate Clinician
            </div>
            <div className="text-xs text-slate-600">
              This will remove the clinician from the system and prevent future
              logins.
            </div>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={handleDeactivate}
            disabled={!clinician.isActive || isDeactivating}
          >
            {isDeactivating ? "Deactivating..." : "Deactivate Clinician"}
          </Button>
        </div>
      </div>

    </div>
  );
};

export default SettingsTab;
