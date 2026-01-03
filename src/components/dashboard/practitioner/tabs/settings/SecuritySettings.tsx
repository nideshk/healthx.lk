"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "react-toastify";
import { useMfaEnrollment } from "@/hooks/useMfaEnrollment";

const SecuritySettings: React.FC = () => {

  const {
    twoFactorEnabled,
    factorId,
    challengeId,
    qr,
    otp,
    loading,
    error,
    setOtp,
    startEnrollment,
    createChallenge,
    verifyEnrollment,
    disableMfa,
  } = useMfaEnrollment();
  /* --------------------------------
     STATE
  --------------------------------- */
  // const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);

  // Enrollment lifecycle
  // const [factorId, setFactorId] = useState<string | null>(null);
  // const [challengeId, setChallengeId] = useState<string | null>(null);
  // const [qr, setQr] = useState<string | null>(null);

  // const [otp, setOtp] = useState("");
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);

  // console.log("🧩 [RENDER] SecuritySettings", {
  //   twoFactorEnabled,
  //   factorId,
  //   challengeId,
  // });

  /* --------------------------------
     CP-1: LOAD MFA STATUS
     Runs when tab becomes active
  --------------------------------- */
  useEffect(() => {
  });

  /* --------------------------------
     CP-2: TOGGLE HANDLER
  --------------------------------- */
  const handleToggle = async () => {
    if (loading || twoFactorEnabled === null) return;
    
    if (!twoFactorEnabled) {
      startEnrollment();
    } else {
      disableMfa();
    }
  };

  /* --------------------------------
     UI
  --------------------------------- */
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
            checked={!!twoFactorEnabled}
            onChange={handleToggle}
            disabled={twoFactorEnabled === null || loading}
          />
          <div className="w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-blue-600 transition" />
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5" />
        </label>
      </div>

      {/* ENROLLMENT UI */}
      {qr && (
        <div className="mt-4 border rounded-lg p-4 bg-slate-50">
          <div
            dangerouslySetInnerHTML={{ __html: qr }}
            className="mb-3"
          />

          {!challengeId ? (
            <button
              onClick={createChallenge}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded mb-2"
            >
              Enable 2FA
            </button>
          ) : (
            <>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                placeholder="Enter 6-digit code"
                className="border rounded px-3 py-2 w-full mb-2"
              />

              <button
                onClick={verifyEnrollment}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded"
              >
                Verify & Enable
              </button>
            </>
          )}

          {error && (
            <div className="text-xs text-red-600 mt-2">{error}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;
