"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "react-toastify";

type PersistedEnrollment = {
  factorId: string;
  qr: string;
};

export const useMfaEnrollment = () => {
  /* --------------------------------
     STATE
  --------------------------------- */
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);

  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  /* --------------------------------
     RESTORE VERIFIED MFA (UI PERSISTENCE)
  --------------------------------- */
  useEffect(() => {
    const verified = sessionStorage.getItem("mfa_verified");
    if (verified === "true") {
      setTwoFactorEnabled(true);
    }
  }, []);

  /* --------------------------------
     RESTORE IN-PROGRESS ENROLLMENT (QR)
  --------------------------------- */
  useEffect(() => {
    const raw = sessionStorage.getItem("mfa_enrollment");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PersistedEnrollment;
      setFactorId(parsed.factorId);
      setQr(parsed.qr);
    } catch {
      sessionStorage.removeItem("mfa_enrollment");
    }
  }, []);

  /* --------------------------------
     LOAD MFA STATUS (AUTHORITATIVE, GUARDED)
  --------------------------------- */
  useEffect(() => {
    const loadStatus = async () => {
      const { data: factors, error } =
        await supabaseClient.auth.mfa.listFactors();

      if (error) {
        console.error("❌ [MFA] listFactors error:", error);
        return;
      }

      const enabled = !!factors && factors.totp.length > 0;

      // 🔒 NEVER downgrade verified MFA from a background read
      setTwoFactorEnabled(prev => {
        if (prev === true) return true;
        return enabled;
      });
      sessionStorage.removeItem("mfa_enrollment");

    };

    loadStatus();
  }, []);

  /* --------------------------------
     START ENROLLMENT (QR)
  --------------------------------- */
  const startEnrollment = async () => {
    if (factorId || twoFactorEnabled === true) return;

    setLoading(true);
    setError(null);

    const { data, error } =
      await supabaseClient.auth.mfa.enroll({ factorType: "totp" });

    // 🧠 Factor already exists → treat as enabled
    if (error?.message?.includes("already exists")) {
      setTwoFactorEnabled(true);
      sessionStorage.setItem("mfa_verified", "true");
      setLoading(false);
      return;
    }

    if (error || !data) {
      toast.error(error?.message || "Failed to start MFA enrollment");
      setLoading(false);
      return;
    }

    const enrollment: PersistedEnrollment = {
      factorId: data.id,
      qr: data.totp.qr_code,
    };

    sessionStorage.setItem("mfa_enrollment", JSON.stringify(enrollment));

    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setLoading(false);
  };

  /* --------------------------------
     CREATE CHALLENGE
  --------------------------------- */
  const createChallenge = async () => {
    if (!factorId) return;

    setLoading(true);
    setError(null);

    const { data, error } =
      await supabaseClient.auth.mfa.challenge({ factorId });

    if (error || !data) {
      toast.error(error?.message || "Unable to start verification");
      setLoading(false);
      return;
    }

    setChallengeId(data.id);
    setLoading(false);
  };

  /* --------------------------------
     VERIFY OTP
  --------------------------------- */
  const verifyEnrollment = async () => {
    if (!factorId || !challengeId) return;

    setLoading(true);
    setError(null);

    const { error } =
      await supabaseClient.auth.mfa.verify({
        factorId,
        challengeId,
        code: otp.trim(),
      });

    if (error) {
      toast.error(error.message || "Invalid code");
      setLoading(false);
      return;
    }

    toast.success("MFA enrollment successful");

    // 🔥 AUTHORITATIVE UPDATE
    setTwoFactorEnabled(true);

    // 🧹 Clear enrollment state
    sessionStorage.removeItem("mfa_verified");
    sessionStorage.removeItem("mfa_enrollment");

    setFactorId(null);
    setChallengeId(null);
    setQr(null);
    setOtp("");
    setLoading(false);
  };

  /* --------------------------------
     DISABLE MFA (EXPLICIT USER ACTION)
  --------------------------------- */
  const disableMfa = async () => {
    const { data: factors } =
      await supabaseClient.auth.mfa.listFactors();

    if (!factors || factors.totp.length === 0) return;

    const { error } =
      await supabaseClient.auth.mfa.unenroll({
        factorId: factors.totp[0].id,
      });

    if (error) {
      toast.error("Unable to disable two-factor authentication");
      return;
    }

    toast.success("MFA disabled");

    setTwoFactorEnabled(false);
    sessionStorage.removeItem("mfa_verified");
    sessionStorage.removeItem("mfa_enrollment");
  };

  /* --------------------------------
     CANCEL ENROLLMENT (USER ACTION)
  --------------------------------- */
  const cancelEnrollment = async () => {
    if (!factorId || twoFactorEnabled === true) return;

    setLoading(true);

    try {
      await supabaseClient.auth.mfa.unenroll({ factorId });
    } catch {
      // ignore
    } finally {
      sessionStorage.removeItem("mfa_enrollment");

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
