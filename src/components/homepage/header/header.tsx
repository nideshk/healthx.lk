"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Bell } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

import { supabaseClient } from "@/lib/supabaseClient";
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
    console.log("Found booking draft in localStorage:", parsed);

    if (!parsed || typeof parsed !== "object") {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      return false;
    }

    // Optional TTL (24 hours)
    const MAX_AGE = 1000 * 60 * 60 * 24;
    if (parsed.created_at && Date.now() - parsed.created_at > MAX_AGE) {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      return false;
    }

    const res = await fetch("/api/booking/appointment/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: parsed, // ✅ ONLY THIS
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Draft restore failed:", err);
      return false;
    }

    localStorage.removeItem(LOCAL_DRAFT_KEY);
    return true;
  } catch (err) {
    console.error("❌ Failed to restore booking draft:", err);
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
      await supabaseClient.auth.resetPasswordForEmail(email, {
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

  const unreadCount = notifications.filter(
    (n) => n.status === "pending"
  ).length;

  async function fetchNotifications() {
    const res = await axios.get("/api/notification");
    setNotifications(res.data.notifications || []);
  }

  async function markAsRead(id: string) {
    await axios.patch(`/api/notification/${id}/read`);
    fetchNotifications();
    setNotifOpen(false);
  }

  /* ---------------- AUTH STATE ---------------- */
  useEffect(() => {
    async function init() {
      const { data } = await supabaseClient.auth.getUser();
      setUser(data.user);
      setUsername(data.user?.email?.split("@")[0] ?? null);
      setLoading(false);

      if (data.user) fetchNotifications();
    }

    init();

    const { data: listener } =
      supabaseClient.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null);
        setNotifOpen(false);
        if (session?.user) fetchNotifications();
      });

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ---------------- LOGIN ---------------- */
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const toastId = toast.loading("Signing you in…");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await supabaseClient.auth.getSession();
      setUser(data.user);
      setUsername(
        data.username?.first_name
          ? `${data.username.first_name} ${data.username.last_name}`
          : email.split("@")[0]
      );


      toast.update(toastId, {
        render: "Welcome back. Your care continues here 💙",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      closeLoginModal();

      // 🔁 Restore booking draft if exists
      const restored = await restoreBookingDraftIfExists();

      if (restored) {
        toast.success("We’ve restored your appointment in progress 🩺");
        router.push("/appointment");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      toast.update(toastId, {
        render: err.message || "Login failed",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    }
  }

  /* ---------------- LOGOUT ---------------- */
  async function handleLogout() {
    try {
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
            {!user ? (
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
                  {notifOpen && (
  <div
    className="
      absolute right-0 mt-3 w-96
      bg-white rounded-2xl shadow-xl border
      z-50 overflow-hidden
      animate-in fade-in slide-in-from-top-2
    "
  >
    {/* Header */}
    <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-900">
          Notifications
        </p>
        <p className="text-xs text-gray-500">
          {unreadCount > 0
            ? `${unreadCount} unread`
            : "You're all caught up"}
        </p>
      </div>

      {unreadCount > 0 && (
        <button
          onClick={() => {
            notifications
              .filter((n) => n.status === "unread")
              .forEach((n) => markAsRead(n.id));
          }}
          className="text-xs text-blue-600 hover:underline"
        >
          Mark all as read
        </button>
      )}
    </div>

    {/* Content */}
    <div className="max-h-96 overflow-y-auto divide-y">
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-800">
            No notifications
          </p>
          <p className="text-xs text-gray-500 mt-1">
            We’ll notify you when something important happens.
          </p>
        </div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => markAsRead(n.id)}
            className={`
              px-4 py-3 cursor-pointer transition
              hover:bg-gray-50
              ${n.status === "unread" ? "bg-blue-50/60" : ""}
            `}
          >
            <div className="flex gap-3">
              {/* Unread dot */}
              <div className="pt-1">
                {n.status === "unread" && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 block mt-1" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {n.title}
                </p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  {n.message}
                </p>

                {n.created_at && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
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
        onClose={() => {
          setShowForgot(false);
          closeLoginModal();
        }}
        title={showForgot ? "Reset Password" : "Login"}
        theme="light"
      >
        {!showForgot ? (
          <>
            <form onSubmit={handleLogin} className="space-y-3">
              <input name="email" type="email" placeholder="Email" required className="border rounded-lg p-2 w-full" />
              <input name="password" type="password" placeholder="Password" required className="border rounded-lg p-2 w-full" />
              <button className="w-full bg-teal-500 text-white py-2 rounded-lg">
                Login
              </button>
            </form>

            <div className="flex justify-between text-sm mt-4">
              <button onClick={() => setShowForgot(true)} className="text-teal-500">
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
        ) : (
          <ForgotPasswordForm onDone={() => setShowForgot(false)} />
        )}
      </Modal>
    </>
  );
}
