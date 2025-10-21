"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModalStore } from "@/store/useModalStore";
import { supabaseClient } from "@/lib/supabaseClient";
import Modal from "@/components/atom/Modal/Modal";

export default function Header() {
  const router = useRouter();
  const { isLoginModalOpen, openLoginModal, closeLoginModal } = useModalStore();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🧠 Load current user session on mount
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabaseClient.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };
    getUser();

    // Listen for login/logout events
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🧩 Login function using API
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      // Refresh Supabase client session after cookie is set
      await supabaseClient.auth.getSession();

      setUser(data.user);
      closeLoginModal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 🧩 Logout function using API
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await supabaseClient.auth.signOut(); // client-side sync
      setUser(null);
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) return null;

  return (
    <>
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-gray-800">
            <span className="text-teal-500">Clinico</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-6">
            <Link href="/" className="text-gray-600 hover:text-teal-500 font-medium">
              Home
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-teal-500 font-medium">
              Our Story
            </Link>
            <Link href="/how-to" className="text-gray-600 hover:text-teal-500 font-medium">
              How To
            </Link>
            <Link href="/help" className="text-gray-600 hover:text-teal-500 font-medium">
              Help
            </Link>
          </nav>

          {/* Right Section */}
          {!user ? (
            <button
              onClick={openLoginModal}
              className="flex items-center text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Login
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <span className="font-medium text-gray-700">
                Hi, {user.email?.split("@")[0]}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition font-medium"
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
        title="Login to Clinico"
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
              className="border border-gray-300 rounded-lg w-full p-2"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              className="border border-gray-300 rounded-lg w-full p-2"
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
