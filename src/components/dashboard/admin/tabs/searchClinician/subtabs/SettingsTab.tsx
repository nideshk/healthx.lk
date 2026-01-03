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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleDeactivate = async () => {
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

      // Success feedback
      alert(data.message || "Clinician deactivated successfully.");
      setShowConfirmModal(false);
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
            onClick={() => setShowConfirmModal(true)}
            disabled={!clinician.isActive || isDeactivating}
          >
            {isDeactivating ? "Deactivating..." : "Deactivate Clinician"}
          </Button>
        </div>
      </div>

      {/* ---------------- CUSTOM CONFIRMATION MODAL ---------------- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !isDeactivating && setShowConfirmModal(false)}
          />
          
          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Confirm Deactivation</h3>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Are you sure you want to deactivate <span className="font-semibold text-slate-900">{clinician.email}</span>? 
                This action is permanent and will restrict all future access for this user.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isDeactivating}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={isDeactivating}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeactivating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Deactivate"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;