"use client";

import React, { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "react-toastify";

const SecuritySettings: React.FC = () => {
  /* --------------------------------
     STATE
  --------------------------------- */
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);

  // Enrollment lifecycle
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toastId = toast.loading("Starting two-factor authentication…");


  console.log("🧩 [RENDER] SecuritySettings", {
    twoFactorEnabled,
    factorId,
    challengeId,
  });

  /* --------------------------------
     CP-1: LOAD MFA STATUS
     Runs when tab becomes active
  --------------------------------- */
  useEffect(() => {

    const loadStatus = async () => {

      const { data: factors, error } =
        await supabaseClient.auth.mfa.listFactors();

      if (error) {
        toast.error("Unable to load MFA status");
        setTwoFactorEnabled(false);
        return;
      }

      const enabled = !!factors && factors.totp.length > 0;

      setTwoFactorEnabled(enabled);
    };

    loadStatus();
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
     CP-3: ENROLL (QR CODE)
  --------------------------------- */
  const startEnrollment = async () => {
    if (factorId) {
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } =
      await supabaseClient.auth.mfa.enroll({
        factorType: "totp",
      });

    if (error || !data) {
      toast.update(toastId, {
        render: error?.message || "Failed to start MFA enrollment",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
      setError(error?.message ?? "Failed to start MFA enrollment");
      setLoading(false);
      return;
    }

    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setLoading(false);
  };

  /* --------------------------------
     CP-4: CREATE CHALLENGE
  --------------------------------- */
  const createChallenge = async () => {
    if (!factorId) return;

    setLoading(true);
    setError(null);
    debugger;
    const { data, error } =
      await supabaseClient.auth.mfa.challenge({
        factorId,
      });

    if (error || !data) {
      console.error("🔴 [CP-4] challenge error:", error);
      toast.update(toastId, {
        render: error?.message || "Unable to start verification",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
      setError(error?.message ?? "Failed to create challenge");
      setLoading(false);
      return;
    }

    setChallengeId(data.id);
    setLoading(false);
  };

  /* --------------------------------
     CP-5: VERIFY OTP
  --------------------------------- */
  const verifyEnrollment = async () => {
    if (!factorId || !challengeId) return;

    setLoading(true);
    setError(null);

    const { error } =
      await supabaseClient.auth.mfa.verify({
        factorId,
        challengeId,
        code: otp,
      });

    if (error) {
      toast.update(toastId, {
        render: "Invalid code. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
      setError(error.message);
      setLoading(false);
      return;
    }

    // Re-check MFA status
    const { data: factors } =
      await supabaseClient.auth.mfa.listFactors();

    setTwoFactorEnabled(!!factors && factors.totp.length > 0);

    // Cleanup
    setFactorId(null);
    setChallengeId(null);
    setQr(null);
    setOtp("");
    setLoading(false);
  };

  /* --------------------------------
     CP-7: DISABLE MFA
  --------------------------------- */
  const disableMfa = async () => {

    const { data: factors, error } =
      await supabaseClient.auth.mfa.listFactors();

    if (error || !factors || factors.totp.length === 0) {
      return;
    }

    const {error: disable_error} = await supabaseClient.auth.mfa.unenroll({
      factorId: factors.totp[0].id,
    });

    if(disable_error){
      toast.error("Unable to disable two-factor authentication");
      return;
    }

    setTwoFactorEnabled(false);
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
