"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { toast } from "react-toastify";

import { useModalStore } from "@/store/useModalStore";
import { supabaseClient } from "@/lib/supabaseClient";
import Modal from "@/components/atom/Modal/Modal";
import SignupForm from "@/components/form/SignupForm";

/* ---------------- FORGOT PASSWORD FORM ---------------- */

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

    toast.success("Check your email for the reset link");
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
        {loading ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}

/* ---------------- HEADER ---------------- */

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
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  /* ---------------- AUTH STATE ---------------- */

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabaseClient.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    loadUser();

    const { data: listener } =
      supabaseClient.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ---------------- LOGIN ---------------- */

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    const toastId = toast.loading("Signing you in...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      await supabaseClient.auth.getSession();
      setUser(data.user);

      toast.update(toastId, {
        render: "Welcome back 👋",
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
        autoClose: 3000,
      });
    }
  };

  /* ---------------- LOGOUT ---------------- */

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user_role");
    window.location.reload();
  };

  if (loading) return null;

  /* ---------------- UI ---------------- */

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* LOGO */}
          <Link href="/" className="text-2xl font-bold">
            <span className="text-teal-500">MedX</span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex gap-6">
            <Link href="/dashboard">Home</Link>
            <Link href="/about">Our Story</Link>
            <Link href="/how-to">How To</Link>
            <Link href="/help">Help</Link>
          </nav>

          {/* AUTH */}
          <div className="hidden md:flex gap-3">
            {!user ? (
              <button
                onClick={openLoginModal}
                className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200"
              >
                Login
              </button>
            ) : (
              <>
                <span className="text-sm">Hi, {user.email?.split("@")[0]}</span>
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
        footer={
          !showForgot && (
            <button
              type="submit"
              form="loginForm"
              className="bg-teal-500 text-white px-4 py-2 rounded-lg"
            >
              Login
            </button>
          )
        }
      >
        {!showForgot ? (
          <>
            <form id="loginForm" onSubmit={handleLogin} className="space-y-3">
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
            </form>

            <div className="flex justify-between text-sm mt-4">
              <button
                onClick={() => setShowForgot(true)}
                className="text-teal-500 hover:underline"
              >
                Forgot password?
              </button>

              <button
                onClick={() => {
                  closeLoginModal();
                  openSignupModal();
                }}
                className="text-teal-500 hover:underline"
              >
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
        theme="light"
      >
        <SignupForm />
      </Modal>
    </>
  );
}
