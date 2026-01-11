"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Bell, ShieldCheck, Lock, ArrowRight, UserCircle, KeyRound, Mail } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useModalStore } from "@/store/useModalStore";
import Modal from "@/components/atom/Modal/Modal";

const LOCAL_DRAFT_KEY = "bookingDraft";

/* ------------------------------------------------
   HELPERS & SUB-COMPONENTS
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
    const MAX_AGE = 1000 * 60 * 60 * 24;
    if (parsed.created_at && Date.now() - parsed.created_at > MAX_AGE) {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      return false;
    }
    const res = await fetch("/api/booking/appointment/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: parsed }),
    });
    if (!res.ok) return false;
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    return true;
  } catch { return false; }
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
    if (error) { toast.error(error.message); return; }
    toast.success("Secure reset link sent to your email.");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <input
          type="email"
          required
          placeholder="Enter your registered email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
        />
      </div>
      <button
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-100 transition-all disabled:opacity-50"
      >
        {loading ? "Sending link..." : "Send Reset Instructions"}
      </button>
      <button type="button" onClick={onDone} className="w-full text-sm font-semibold text-slate-500 hover:text-teal-600 transition-colors">
        Back to Login
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [mfaInProgress, setMfaInProgress] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  async function fetchNotifications() {
    try {
      const res = await axios.get("/api/notification");
      setNotifications(res.data.notifications || []);
    } catch (err) { console.log(err); }
  }

  async function finalizeLogin(session: any, toastId: any) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }),
    });
    if (!res.ok) throw new Error("Session setup failed");

    setUser(session.user);
    setUsername(session.user.email?.split("@")[0] ?? null);
    setAuthReady(true);
    setMfa(null);
    setOtp("");
    setMfaInProgress(false);

    toast.update(toastId, {
      render: `Welcome back. Your portal is ready 🛡️`,
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });

    closeLoginModal();
    const restored = await restoreBookingDraftIfExists();
    router.push(restored ? "/appointment" : "/dashboard");
  }

  useEffect(() => {
    async function init() {
      const { data }  : any = await supabaseBrowser.auth.getUser();
      if (data.user) {
        setUser(data.user);
        setUsername(data.user?.email?.split("@")[0] ?? null);
        setAuthReady(true);
        fetchNotifications();
      }
      setLoading(false);
    }
    init();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (mfaInProgress) return;
      setUser(session?.user ?? null);
      setNotifOpen(false);
      if (session?.user) {
        setUsername(session.user.email?.split("@")[0] ?? null);
        fetchNotifications();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const toastId = toast.loading("Verifying credentials...");

    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw new Error(error?.message || "Invalid credentials");

      const factors = data.user?.factors ?? [];
      if (factors.some((f) => f.factor_type === "totp" && f.status === "verified")) {
        const factorId = factors[0].id;
        const { data: challenge, error: challengeError } = await supabaseBrowser.auth.mfa.challenge({ factorId });
        if (challengeError) throw challengeError;

        setMfa({ factorId, challengeId: challenge.id });
        toast.update(toastId, { render: "Identity verification required", type: "info", isLoading: false, autoClose: 2000 });
        return;
      }
      await finalizeLogin(data.session, toastId);
    } catch (err: any) {
      toast.update(toastId, { render: err.message, type: "error", isLoading: false, autoClose: 2000 });
    }
  }

  async function verifyMfa() {
    if (!mfa) return;
    setMfaInProgress(true);
    const toastId = toast.loading("Confirming code...");
    const { error } = await supabaseBrowser.auth.mfa.verify({ factorId: mfa.factorId, challengeId: mfa.challengeId, code: otp });

    if (error) {
      toast.update(toastId, { render: error.message, type: "error", isLoading: false, autoClose: 2500 });
      setMfa(null); setMfaInProgress(false); setOtp("");
      handleLogout();
      return;
    }
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    if (!sessionData.session) throw new Error("Session lost");
    await finalizeLogin(sessionData.session, toastId);
  }

  async function handleLogout() {
    try {
      await supabaseBrowser.auth.signOut();
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.clear();
      setNotifOpen(false);
      toast.success("Logged out safely 🌿");
      window.location.href = "/";
    } catch { toast.error("Logout failed."); }
  }

  if (loading) return null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-100 group-hover:scale-105 transition-transform">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">MedX</span>
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-bold text-slate-500 uppercase tracking-widest">
            <Link href="/dashboard" className="hover:text-teal-600 transition-colors">Home</Link>
            <Link href="/about" className="hover:text-teal-600 transition-colors">Story</Link>
            <Link href="/help" className="hover:text-teal-600 transition-colors">Help</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {!authReady ? (
              <button
                onClick={openLoginModal}
                className="px-6 py-2 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-md shadow-slate-200"
              >
                Sign In
              </button>
            ) : (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-full border border-teal-100">
                  <UserCircle className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-teal-800 tracking-tight">Hi, {username}</span>
                </div>

                <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors ml-2">
                  Logout
                </button>
              </div>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-slate-600">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <Modal
        isOpen={isLoginModalOpen}
        onClose={async () => {
          setShowForgot(false);
          closeLoginModal();
          if (mfa) { setMfa(null); setOtp(""); setMfaInProgress(false); setAuthReady(false); handleLogout(); }
        }}
        title={mfa ? "Two-Factor Auth" : showForgot ? "Account Recovery" : "Patient Login"}
      >
        <div className="p-1">
          {!showForgot && !mfa ? (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Secure Access</h3>
                <p className="text-xs text-slate-500">Sign in to your private healthcare dashboard</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input name="email" type="email" placeholder="Email Address" required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all text-sm" />
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input name="password" type="password" placeholder="Password" required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all text-sm" />
                  </div>
                </div>
                
                <button className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-teal-50 flex items-center justify-center gap-2 group">
                  Continue to Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-slate-100">
                <button onClick={() => setShowForgot(true)} className="text-xs font-bold text-slate-400 hover:text-teal-600 text-center uppercase tracking-widest transition-colors">
                  Forgot Security Password?
                </button>
                <div className="h-px w-8 bg-slate-100 mx-auto" />
                <button onClick={() => { router.push("/create-account"); closeLoginModal(); }} className="text-sm font-bold text-teal-600 text-center">
                  Don't have an account? Sign up
                </button>
              </div>
            </>
          ) : mfa ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <p className="text-sm text-slate-600 px-4">Enter the 6-digit verification code from your authenticator app.</p>
              <input
                type="text"
                maxLength={6}
                placeholder="000 000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                className="w-full text-center text-2xl font-black tracking-[0.5em] py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-500 outline-none transition-all"
              />
              <button
                onClick={verifyMfa}
                disabled={mfaInProgress || otp.length !== 6}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold disabled:bg-slate-200 disabled:text-slate-400 transition-all"
              >
                {mfaInProgress ? "Authorizing..." : "Confirm Identity"}
              </button>
            </div>
          ) : (
            <ForgotPasswordForm onDone={() => setShowForgot(false)} />
          )}
        </div>
      </Modal>
    </>
  );
}