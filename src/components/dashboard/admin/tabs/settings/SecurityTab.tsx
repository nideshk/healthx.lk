"use client";

import React from "react";
import Button from "@/components/atom/Button/Button";
import { useMfaEnrollment } from "@/hooks/useMfaEnrollment";

const SecurityTab: React.FC = () => {
  const {
    twoFactorEnabled,
    qr,
    otp,
    loading,
    error,
    challengeId,
    setOtp,
    startEnrollment,
    createChallenge,
    verifyEnrollment,
    disableMfa,
    cancelEnrollment,
  } = useMfaEnrollment();

  const handleToggle2FA = () => {
    if (loading || twoFactorEnabled === null) return;
    if (!twoFactorEnabled) {
      startEnrollment();
    } else {
      disableMfa();
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
        <div className="text-sm font-semibold text-slate-900 mb-1">Security</div>
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
          <div>
            <div className="text-sm font-medium text-slate-900">Two-Factor Authentication (2FA)</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={!!twoFactorEnabled}
              disabled={loading}
              onChange={handleToggle2FA}
            />
            <div className="w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-blue-600 transition"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
          </label>
        </div>
      </div>

      {qr && (
        <div className="border rounded-xl p-6 bg-white shadow-sm animate-in slide-in-from-top-2">
          <div className="text-center">
            <div 
              className="inline-block p-2 bg-white border rounded-lg mb-4 shadow-sm" 
              dangerouslySetInnerHTML={{ __html: qr }} 
            />
            <p className="text-sm text-slate-600 mb-4 font-medium">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>

          {!challengeId ? (
            <div className="flex gap-2">
              <button
                onClick={createChallenge}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded"
              >
                Enable 2FA
              </button>

              <button
                onClick={cancelEnrollment}
                disabled={loading}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                placeholder="Enter 6-digit code"
                className="border rounded px-3 py-2 w-full mb-2"
              />

              <div className="flex gap-2">
                <button
                  onClick={verifyEnrollment}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded"
                >
                  Verify & Enable
                </button>

                <button
                  onClick={cancelEnrollment}
                  disabled={loading}
                  className="flex-1 border border-slate-300 text-slate-700 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
          {error && <div className="text-xs text-red-600 mt-2 text-center font-medium">{error}</div>}
        </div>
      )}
    </div>
  );
};

export default SecurityTab;