"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Eye, EyeOff } from "lucide-react";

/* ---------- Password strength helper ---------- */
function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "33%" };
  if (score <= 4) return { label: "Medium", color: "bg-yellow-500", width: "66%" };
  return { label: "Strong", color: "bg-green-500", width: "100%" };
}

export default function ResetPasswordPage() {
  const router = useRouter();

  /* ---------- Existing logic state ---------- */
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  /* ---------- UI-only state ---------- */
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const strength = getPasswordStrength(password);

  /* ---------- KEEP EXISTING LOGIC (UNCHANGED) ---------- */
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // Session may already be consumed — treat as expired UX
        setExpired(true);
      }
      setReady(true);
    });
  }, []);

  /* ---------- Submit ---------- */
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;

    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (strength.label === "Weak") {
      setError("Please choose a stronger password");
      return;
    }

    setLoading(true);

    const { error } = await supabaseBrowser.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setExpired(true);
      return;
    }

    // Security hardening
    await supabaseBrowser.auth.signOut({ scope: "others" });
    router.push("/");
  }

  /* ---------- Loading ---------- */
  if (!ready) {
    return <p className="text-center mt-20">Verifying reset link…</p>;
  }

  /* ---------- Expired / Invalid UX ---------- */
  if (expired) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 border rounded-2xl text-center space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Reset link expired
        </h2>

        <p className="text-sm text-gray-600">
          This password reset link may have expired or already been used.
        </p>

        <p className="text-sm text-gray-600">
          Please wait <strong>10–30 minutes</strong> and request a new reset link.
        </p>

        <button
          onClick={() => router.push("/forgot-password")}
          className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          Request new link
        </button>
      </div>
    );
  }

  /* ---------- Reset Form ---------- */
  return (
    <form
      onSubmit={handleReset}
      className="max-w-md mx-auto mt-16 p-6 border rounded-2xl shadow-sm space-y-5"
    >
      <h1 className="text-2xl font-semibold text-center">
        Reset your password
      </h1>

      {/* New password */}
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="border p-3 w-full rounded-lg pr-10"
        />

        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-3 text-gray-500"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        {/* Strength meter */}
        {password && (
          <div className="mt-2">
            <div className="h-2 w-full bg-gray-200 rounded">
              <div
                className={`h-2 rounded ${strength.color}`}
                style={{ width: strength.width }}
              />
            </div>
            <p className="text-xs mt-1 text-gray-600">
              Strength: <strong>{strength.label}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <input
        type={showPassword ? "text" : "password"}
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        className="border p-3 w-full rounded-lg"
      />

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 text-center">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        disabled={
          loading ||
          !password ||
          password !== confirmPassword ||
          strength.label === "Weak"
        }
        className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition"
      >
        {loading ? "Updating…" : "Update password"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Use at least 12 characters with a number and symbol for better security.
      </p>
    </form>
  );
}
