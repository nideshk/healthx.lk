"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  User,
  LogOut,
  ChevronDown,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useModalStore } from "@/store/useModalStore";
import Modal from "@/components/atom/Modal/Modal";

const LOCAL_DRAFT_KEY = "bookingDraft";

/* ------------------------------------------------
   HELPERS
------------------------------------------------ */

async function restoreBookingDraftIfExists(): Promise<boolean> {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      return false;
    }

    // Auto-expire drafts older than 24h
    const MAX_AGE = 1000 * 60 * 60 * 24;
    if (parsed.created_at && Date.now() - parsed.created_at > MAX_AGE) {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      return false;
    }

    // Sync the local draft to the database now that the user is logged in
    const res = await fetch("/api/booking/appointment/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: parsed }),
    });

    if (!res.ok) return false;

    localStorage.removeItem(LOCAL_DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

function ForgotPasswordForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email for the reset link.");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
            placeholder="name@company.com"
          />
        </div>
      </div>
      <button
        disabled={loading}
        className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-teal-600 transition-colors flex justify-center items-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Send Reset Link
      </button>
      <button type="button" onClick={onDone} className="w-full text-sm font-medium text-slate-500 hover:text-slate-800">
        Return to login
      </button>
    </form>
  );
}

/* ------------------------------------------------
   MAIN HEADER
------------------------------------------------ */

export default function Header() {
  const router = useRouter();
  const { isLoginModalOpen, openLoginModal, closeLoginModal } = useModalStore();

  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // MFA States
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [mfaInProgress, setMfaInProgress] = useState(false);

  /* ---------------- AUTH LOGIC ---------------- */

  // Finalize UI state and trigger side effects
  async function finalizeLogin(session: any) {
    setUser(session.user);
    setUsername(session.user.email?.split("@")[0] ?? null);

    setMfa(null);
    setOtp("");
    setMfaInProgress(false);
    closeLoginModal();

    // RESTORE BOOKING DRAFT FLOW
    const restored = await restoreBookingDraftIfExists();
    if (restored) {
      toast.success("Resuming your appointment booking... 🩺");
      router.push("/appointment");
    } else {
      router.push("/dashboard");
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw error || new Error("Login failed");

      // Check for MFA Enrollment
      const factors = data.user?.factors ?? [];
      const hasEnrolledMfa = factors.some(f => f.factor_type === "totp" && f.status === "verified");

      if (hasEnrolledMfa) {
        const factorId = factors[0].id;
        const { data: challenge, error: cErr } = await supabaseBrowser.auth.mfa.challenge({ factorId });
        if (cErr) throw cErr;

        setMfa({ factorId, challengeId: challenge.id });
        return;
      }

      await finalizeLogin(data.session);
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyMfa() {
    if (!mfa) return;
    setMfaInProgress(true);
    try {
      const { error } = await supabaseBrowser.auth.mfa.verify({
        factorId: mfa.factorId,
        challengeId: mfa.challengeId,
        code: otp,
      });

      if (error) throw error;

      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      if (!sessionData.session) throw new Error("MFA Session Error");

      await finalizeLogin(sessionData.session);
    } catch (err: any) {
      toast.error(err.message);
      setMfa(null);
      setOtp("");
    } finally {
      setMfaInProgress(false);
    }
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabaseBrowser.auth.getUser();
      if (data.user) {
        setUser(data.user);
        setUsername(data.user.email?.split("@")[0] ?? null);
      }
      setLoading(false);
    }
    init();

    // Listen for auth changes (like signing out from another tab)
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUsername(null);
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setUsername(session.user.email?.split("@")[0] ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <>
      {/* ... Header UI stays the same ... */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
        {/* ... Logo and Nav ... */}
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <Link href="/" className="font-black text-xl text-teal-600">MedX</Link>

          {!user ? (
            <button onClick={openLoginModal} className="text-sm font-bold text-slate-600">Sign In</button>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold">Hi, {username}</span>
              <button onClick={() => supabaseBrowser.auth.signOut()} className="text-xs text-red-500 font-bold">Log Out</button>
            </div>
          )}
        </div>
      </header>

      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => { setShowForgot(false); setMfa(null); closeLoginModal(); }}
        title={mfa ? "Security Verification" : showForgot ? "Reset Password" : "Welcome Back"}
      >
        <div className="p-1">
          {mfa ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium flex gap-3">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                Enter the 6-digit code from your authenticator app.
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full text-center tracking-[1em] font-black text-2xl py-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={verifyMfa}
                disabled={mfaInProgress || otp.length !== 6}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {mfaInProgress && <Loader2 className="w-5 h-5 animate-spin" />}
                Verify & Continue
              </button>
            </div>
          ) : !showForgot ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input name="email" type="email" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl outline-none" placeholder="Enter email" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                  <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-bold text-teal-600 hover:underline">Forgot?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input name="password" type={showPassword ? "text" : "password"} required className="w-full pl-10 pr-12 py-3 bg-slate-50 border rounded-xl outline-none" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <button disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-teal-600 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2">
                {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                Sign In
              </button>
            </form>
          ) : (
            <ForgotPasswordForm onDone={() => setShowForgot(false)} />
          )}
        </div>
      </Modal>
    </>
  );
}