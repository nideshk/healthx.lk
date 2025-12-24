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
import SignupForm from "@/components/form/SignupForm";

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
    isSignupModalOpen,
    openLoginModal,
    closeLoginModal,
    openSignupModal,
    closeSignupModal,
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

      if (data.user) {
        fetchNotifications();
      }
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

  /* ---------------- CLOSE NOTIFS ON ROUTE CHANGE ---------------- */
  useEffect(() => {
    setNotifOpen(false);
  }, [router]);

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
      setUsername(data.username?.display_name || email.split("@")[0]);

      toast.update(toastId, {
        render: "Welcome back. Your care continues here 💙",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      closeLoginModal();
      router.push("/dashboard");
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

          {/* LOGO */}
          <Link href="/" className="text-2xl font-bold text-teal-600">
            MedX
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <Link href="/dashboard">Home</Link>
            <Link href="/about">Our Story</Link>
            <Link href="/help">Help</Link>
          </nav>

          {/* AUTH + NOTIFICATIONS */}
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
                {/* 🔔 NOTIFICATIONS */}
                <div className="relative">
                  <button
                    aria-label="Notifications"
                    aria-expanded={notifOpen}
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

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow border z-50">
                      <div className="p-3 border-b font-semibold text-sm">
                        Notifications
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 && (
                          <p className="p-4 text-sm text-gray-500">
                            No notifications yet
                          </p>
                        )}

                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markAsRead(n.id)}
                            className={`p-3 text-sm cursor-pointer border-b hover:bg-gray-50 ${
                              n.status === "unread" ? "bg-blue-50" : ""
                            }`}
                          >
                            <p className="font-medium">{n.title}</p>
                            <p className="text-gray-600">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

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

          {/* MOBILE */}
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
              <button onClick={() => { closeLoginModal(); openSignupModal(); }} className="text-teal-500">
                Sign up
              </button>
            </div>
          </>
        ) : (
          <ForgotPasswordForm onDone={() => setShowForgot(false)} />
        )}
      </Modal>

      {/* SIGNUP MODAL */}
      <Modal
        isOpen={isSignupModalOpen}
        onClose={closeSignupModal}
        title="Create Your Account"
      >
        <SignupForm />
      </Modal>
    </>
  );
}
