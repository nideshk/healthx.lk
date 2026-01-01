"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Bell } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useModalStore } from "@/store/useModalStore";
import Modal from "@/components/atom/Modal/Modal";

/* ------------------------------------------------
   CONSTANTS
------------------------------------------------ */
const LOCAL_DRAFT_KEY = "bookingDraft";

/* ------------------------------------------------
   RESTORE DRAFT AFTER LOGIN
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

    const MAX_AGE = 1000 * 60 * 60 * 24; // 24h
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
  } catch {
    return false;
  }
}

/* ------------------------------------------------
   FORGOT PASSWORD FORM
------------------------------------------------ */
function ForgotPasswordForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } =
      await supabaseBrowser.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("We’ve sent a secure reset link to your email.");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border rounded-lg p-2 w-full"
      />
      <button
        disabled={loading}
        className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg font-medium"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

/* ------------------------------------------------
   HEADER
------------------------------------------------ */
export default function Header() {
  const router = useRouter();

  const {
    isLoginModalOpen,
    openLoginModal,
    closeLoginModal,
  } = useModalStore();

  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  /* ---------------- NOTIFICATIONS ---------------- */
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  /* -------------------------MFA------------------------*/
  const [mfa, setMfa] = useState<{
    factorId: string;
    challengeId: string;
  } | null>(null);

  const [otp, setOtp] = useState("");
  const [mfaInProgress, setMfaInProgress] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const unreadCount = notifications.filter(
    (n) => n.status === "unread"
  ).length;

  async function fetchNotifications() {
    try{
      const res = await axios.get("/api/notification");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.log("Failed to fetch notifications:", err);
    }
  }

  async function finalizeLogin(
    session: any,
    toastId: any,
  ) {
    // 1️⃣ Exchange session with backend
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Session setup failed");
    }

    // 2️⃣ Set auth state
    setUser(session.user);
    setUsername(session.user.email?.split("@")[0] ?? null);
    setAuthReady(true);

    // 3️⃣ Cleanup MFA state (safe even if MFA not used)
    setMfa(null);
    setOtp("");
    setMfaInProgress(false);

    // 4️⃣ Success toast
    toast.update(toastId, {
      render: `Welcome back. Your care continues here 💙`,
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });

    closeLoginModal();

    // 5️⃣ Restore draft + redirect
    const restored = await restoreBookingDraftIfExists();

    if (restored) {
      toast.success("We’ve restored your appointment in progress 🩺");
      router.push("/appointment");
    } else {
      router.push("/dashboard");
    }
  }


  /* ---------------- AUTH STATE ---------------- */
  useEffect(() => {
    async function init() {
      const { data } = await supabaseBrowser.auth.getUser();
      if (data.user ) {
        setUser(data.user);
        setUsername(data.user?.email?.split("@")[0] ?? null);
        setAuthReady(true);
      } else {
        setUser(null);
        setUsername(null);
        setAuthReady(false);
      }
      setLoading(false);

      if (data.user) fetchNotifications();
    }

    init();

    const { data: listener } =
      supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (mfaInProgress) {
          console.log("[AUTH] session received but MFA pending → ignoring");
          toast.error("[AUTH] session received but MFA pending → ignoring");
          return;
        }        
        setUser(session?.user ?? null);
        setNotifOpen(false);

        if (session?.user) {
          setUsername(session.user.email?.split("@")[0] ?? null);
          fetchNotifications();
        }
      });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ---------------- LOGIN ---------------- */
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    const toastId = toast.loading("Signing you in…");

    try {
      /* 1️⃣ Client-side login */
      const { data, error } =
        await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });

      if (error || !data.session) {
        throw new Error(error?.message || "Invalid credentials");
      }
      
      if (error) {
        console.error("[STEP 1] login error:", error);
        throw error;
      }

      // STEP 2 — detect MFA enrollment
      const factors = data.user?.factors ?? [];

      const hasEnrolledMfa = factors.some(
        (f) => f.factor_type === "totp" && f.status === "verified"
      );

      // STEP 3 — decide if MFA is required for this login
      const mustDoMfa = hasEnrolledMfa;

      if (mustDoMfa) {
        const factorId = factors[0].id; // first verified TOTP

        const { data: challenge, error: challengeError } =
          await supabaseBrowser.auth.mfa.challenge({ factorId });

        if (challengeError) {
          toast.update(toastId, {
            render: "Unable to start security verification",
            type: "error",
            isLoading: false,
            autoClose: 2000,
          });
          throw challengeError;
        }

        setMfa({
          factorId,
          challengeId: challenge.id,
        });

        toast.update(toastId, {
          render: "Enter the verification code from your authenticator app",
          type: "info",
          isLoading: false,
          autoClose: 2000,
        });

        // 🚫 STOP normal login here
        return;
      }
      
      /* ✅ NO MFA → normal flow */
      /* 2️⃣ Exchange session with server */
      await finalizeLogin(data.session, toastId);
    } catch (err: any) {
      toast.update(toastId, {
        render: err.message || "Login failed",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    }
  }

  async function verifyMfa() {
    if (!mfa) return;
    
    const toastId = toast.loading("Verifying security code…");

    const { error } = await supabaseBrowser.auth.mfa.verify({
      factorId: mfa.factorId,
      challengeId: mfa.challengeId,
      code: otp,
    });

    if (error) {
      // ⛔ CASE 2: ANY other error → abort MFA & restart login
      toast.update(toastId, {
        render: error.message,
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });

      // 🧹 Reset MFA state
      setMfa(null);
      setOtp("");
      handleLogout()
      return;
    }

    const { data: sessionData } =
      await supabaseBrowser.auth.getSession();

    if (!sessionData.session) {
      throw new Error("Session not available after MFA");
    }

    // 🔁 Reuse your EXISTING backend session exchange
    await finalizeLogin(sessionData.session, toastId);
  }

  /* ---------------- LOGOUT ---------------- */
  async function handleLogout() {
    try {
      await supabaseBrowser.auth.signOut();
      await fetch("/api/auth/logout", { method: "POST" });

      localStorage.clear();
      setNotifOpen(false);

      toast.success("You’ve been safely logged out. Take care 🌿");
      window.location.href = "/";
    } catch {
      toast.error("Unable to log out. Please try again.");
    }
  }

  if (loading) return null;

  /* ---------------- UI ---------------- */
  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-teal-600">
            MedX
          </Link>

          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <Link href="/dashboard">Home</Link>
            <Link href="/about">Our Story</Link>
            <Link href="/help">Help</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {!authReady ? (
              <button
                onClick={openLoginModal}
                className="px-4 py-2 rounded-full bg-gray-100"
              >
                Login
              </button>
            ) : (
              <>
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  className="relative p-2 rounded-full hover:bg-gray-100"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <span className="text-sm">Hi, {username}</span>

                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-full bg-gray-100"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2"
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* LOGIN MODAL */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={async () => {
          setShowForgot(false);
          closeLoginModal();
          if (mfa) {
            console.log("[MFA] Login aborted → signing out");

            setMfa(null);
            setOtp("");
            setAuthReady(false);
            handleLogout();
          }
        }}
        title={showForgot ? "Reset Password" : "Login"}
        theme="light"
      >
        {!showForgot && !mfa ? (
        <>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="border rounded-lg p-2 w-full"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              className="border rounded-lg p-2 w-full"
            />
            <button className="w-full bg-teal-500 text-white py-2 rounded-lg">
              Login
            </button>
          </form>

          <div className="flex justify-between text-sm mt-4">
            <button
              onClick={() => setShowForgot(true)}
              className="text-teal-500"
            >
              Forgot password?
            </button>
            <button
              onClick={() => {
                router.push("/create-account");
                closeLoginModal();
              }}
              className="text-teal-500"
            >
              Sign up
            </button>
          </div>
        </>
      ) : mfa ? (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.trim())}
            className="border rounded-lg p-2 w-full"
          />
          <button
            onClick={verifyMfa}
            className="w-full bg-teal-500 text-white py-2 rounded-lg"
          >
            Verify & Continue
          </button>
        </div>
      ) : (
        <ForgotPasswordForm onDone={() => setShowForgot(false)} />
      )}
      </Modal>
    </>
  );
}
