"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "react-toastify";

export const useMfaEnrollment = () => {
  /* --------------------------------
     STATE (UNCHANGED)
  --------------------------------- */
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);

  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log("🧩 [RENDER] useMfaEnrollment", {
    twoFactorEnabled,
    factorId,
    challengeId,
  });

  /* --------------------------------
     CP-1: LOAD MFA STATUS
     (IDENTICAL – including missing deps)
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
   CP-0: CLEANUP ON UNMOUNT
    Cancel ONLY unfinished enrollment
  --------------------------------- */
  useEffect(() => {
    return () => {
      // Only cancel if enrollment was started but NOT completed
      if (qr && twoFactorEnabled === false && factorId) {
        supabaseClient.auth.mfa
          .unenroll({ factorId })
          .catch(() => {
            // ignore errors during unmount
          });
      }
    };
  }, [qr, twoFactorEnabled, factorId]);


  /* --------------------------------
     CP-2: ENROLL (QR CODE)
  --------------------------------- */
  const startEnrollment = async () => {
    if (factorId) return;

    setLoading(true);
    setError(null);
    toast.info("Starting two-factor authentication…");

    const { data, error } =
      await supabaseClient.auth.mfa.enroll({
        factorType: "totp",
      });

    if (error || !data) {
      toast.error(error?.message || "Failed to start MFA enrollment");
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
      toast.error(error?.message || "Unable to start verification");
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
      toast.error(error?.message || "Invalid code. Please try again.");
      setError(error.message);
      setLoading(false);
      return;
    }

    toast.success("MFA enrollment successful");

    const { data: factors } =
      await supabaseClient.auth.mfa.listFactors();

    setTwoFactorEnabled(!!factors && factors.totp.length > 0);

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

    if (error || !factors || factors.totp.length === 0) return;

    const { error: disable_error } =
      await supabaseClient.auth.mfa.unenroll({
        factorId: factors.totp[0].id,
      });

    if (disable_error) {
      toast.error("Unable to disable two-factor authentication");
      return;
    }

    toast.success("MFA enrollment disabled successful");
    setTwoFactorEnabled(false);
  };

  /* --------------------------------
    CP-8: CANCEL ENROLLMENT (USER ACTION)
  --------------------------------- */
  const cancelEnrollment = async () => {
    // Only cancel if enrollment is actually in progress
    if (!factorId || !qr || twoFactorEnabled === true) return;

    setLoading(true);
    setError(null);

    try {
      await supabaseClient.auth.mfa.unenroll({ factorId });
      toast.info("MFA enrollment cancelled");
    } catch {
      toast.error("Unable to cancel MFA enrollment");
    } finally {
      // Reset local state
      setFactorId(null);
      setChallengeId(null);
      setQr(null);
      setOtp("");
      setLoading(false);
    }
  };

  return {
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
    cancelEnrollment,
  };
};
