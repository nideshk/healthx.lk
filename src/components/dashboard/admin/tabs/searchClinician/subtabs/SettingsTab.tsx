"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

interface SettingsTabProps {
  clinician: {
    id: string;
    email: string;
    isActive: boolean;
  };
}

const SettingsTab: React.FC<SettingsTabProps> = ({ clinician }) => {
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDeactivate = async () => {
    const confirm = window.confirm(
      "Are you sure you want to deactivate this clinician? This action cannot be undone."
    );

    if (!confirm) return;

    try {
      setIsDeactivating(true);

      const res = await fetch(`/api/practitioners/${clinician.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to deactivate clinician");
      }

      // ✅ Success feedback (simple toast / alert)
      alert(data.message || "Clinician deactivated successfully.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong while deactivating clinician");
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ---------------- USERNAME / EMAIL ---------------- */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white">
        <div className="text-sm font-semibold text-slate-900 mb-2">
          Username
        </div>

        <Input value={clinician.email} disabled />
      </div>

      {/* ---------------- DANGER ZONE ---------------- */}
      <div className="border border-red-300 bg-red-50 rounded-xl p-5">
        <div className="text-sm font-semibold text-red-700">Danger Zone</div>
        <div className="text-xs text-red-600 mb-4">Irreversible actions</div>

        <div className="flex items-center justify-between gap-4">
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
