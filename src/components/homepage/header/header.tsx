"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useModalStore } from "@/store/useModalStore";
import { supabaseClient } from "@/lib/supabaseClient";
import Modal from "@/components/atom/Modal/Modal";
import SignupForm from "@/components/form/SignupForm";
import { toast } from "react-toastify";

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

  /* ---------------- AUTH STATE ---------------- */
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabaseClient.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    loadUser();

    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

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

      // Ensure session is synced
      await supabaseClient.auth.getSession();
      setUser(data.user);

      toast.update(toastId, {
        render: "Welcome back 👋",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      closeLoginModal();

      // Small delay so modal closes smoothly
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
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
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("user_role");
      window.location.reload();
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  if (loading) return null;

  /* ---------------- UI ---------------- */
  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* LOGO */}
          <Link href="/" className="text-2xl font-bold text-gray-800">
            <span className="text-teal-500">MedX</span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="nav-link">
              Home
            </Link>
            <Link href="/about" className="nav-link">
              Our Story
            </Link>
            <Link href="/how-to" className="nav-link">
              How To
            </Link>
            <Link href="/help" className="nav-link">
              Help
            </Link>
          </nav>

          {/* DESKTOP AUTH */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <button
                onClick={openLoginModal}
                className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 font-medium"
              >
                Login
              </button>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700">
                  Hi, {user.email?.split("@")[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* MOBILE MENU */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-4">
            <nav className="flex flex-col gap-3">
              <Link onClick={() => setMobileOpen(false)} href="/dashboard">
                Home
              </Link>
              <Link onClick={() => setMobileOpen(false)} href="/about">
                Our Story
              </Link>
              <Link onClick={() => setMobileOpen(false)} href="/how-to">
                How To
              </Link>
              <Link onClick={() => setMobileOpen(false)} href="/help">
                Help
              </Link>
            </nav>

            <div className="pt-3 border-t border-gray-100">
              {!user ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    openLoginModal();
                  }}
                  className="w-full px-4 py-2 rounded-xl bg-teal-500 text-white font-medium"
                >
                  Login
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-medium"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* LOGIN MODAL */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
        title="Login"
        theme="light"
        footer={
          <button
            type="submit"
            form="loginForm"
            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium"
          >
            Login
          </button>
        }
      >
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

        <p className="text-sm text-center mt-4">
          Don’t have an account?{" "}
          <button
            onClick={() => {
              closeLoginModal();
              openSignupModal();
            }}
            className="text-teal-500 font-medium hover:underline"
          >
            Sign Up
          </button>
        </p>
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
