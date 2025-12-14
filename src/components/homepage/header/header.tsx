"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModalStore } from "@/store/useModalStore";
import { supabaseClient } from "@/lib/supabaseClient";
import Modal from "@/components/atom/Modal/Modal";
import SignupForm from "@/components/form/SignupForm";

/* ===================================================== */

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

  /* ---------------- Load session ---------------- */
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabaseClient.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };
    getUser();

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

    try {
      // 1️⃣ Authenticate
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      // 2️⃣ Ensure session is available
      await supabaseClient.auth.getSession();
      setUser(data.user);

      // 3️⃣ CHECK FOR BOOKING DRAFT (GUEST → AUTH TRANSFER)
      const draftRaw = localStorage.getItem("bookingDraft");

      if (draftRaw) {
        const draftData = JSON.parse(draftRaw);

        // Upload to backend
        await fetch("/api/booking/appointment/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: draftData }),
        });

        // Clean guest storage
        localStorage.removeItem("bookingDraft");

        closeLoginModal();

        // 🚀 Resume booking → Step 3
        router.push("/book");
        return;
      }

      // 4️⃣ No draft → normal flow
      closeLoginModal();
      router.push("/dashboard");
    } catch (err: any) {
      alert(err.message);
    }
  };

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("user_role");
      window.location.reload();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) return null;

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-gray-800">
            <span className="text-teal-500">Clinico</span>
          </Link>

          <nav className="hidden md:flex space-x-6">
            <Link href="/dashboard" className="nav-link">Home</Link>
            <Link href="/about" className="nav-link">Our Story</Link>
            <Link href="/how-to" className="nav-link">How To</Link>
            <Link href="/help" className="nav-link">Help</Link>
          </nav>

          {!user ? (
            <button
              onClick={openLoginModal}
              className="flex items-center bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full"
            >
              Login
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <span className="font-medium text-gray-700">
                Hi, {user.email?.split("@")[0]}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full font-medium"
              >
                Logout
              </button>
            </div>
          )}
        </div>
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
        <form id="loginForm" onSubmit={handleLogin}>
          <div className="flex flex-col gap-3">
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="border border-gray-300 rounded-lg p-2"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              className="border border-gray-300 rounded-lg p-2"
            />
          </div>
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
