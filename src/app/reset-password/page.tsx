"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // VERY IMPORTANT: this hydrates the recovery session from the URL hash
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session) {
        alert("Invalid or expired password reset link");
        // router.push("/login");
        // return;
      }
      setReady(true);
    });
  }, [router]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;

    setLoading(true);

    const { error } = await supabaseBrowser.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    // Optional but recommended: invalidate other sessions
    await supabaseBrowser.auth.signOut({ scope: "others" });

    router.push("/login?reset=success");
  }

  if (!ready) {
    return <p>Verifying reset link…</p>;
  }

  return (
    <form onSubmit={handleReset} className="space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-semibold">Reset Password</h1>

      <input
        type="password"
        required
        minLength={8}
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 w-full"
      />

      <button disabled={loading} className="btn-primary w-full">
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
