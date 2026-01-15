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
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useModalStore } from "@/store/useModalStore";
import Modal from "@/components/atom/Modal/Modal";
import { authFetch } from "@/lib/authFetch";

/* ------------------------------------------------
   ENHANCED COMPONENTS
------------------------------------------------ */

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
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all outline-none"
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Close dropdowns when clicking outside
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ... fetchNotificationsSafe and Auth logic remain the same as your source ... */
  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data } = await supabaseBrowser.auth.getUser();
      if (!mounted) return;
      if (data.user) {
        setUser(data.user);
        setUsername(data.user.email?.split("@")[0] ?? null);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (error) throw error;

      closeLoginModal();
      router.push("/dashboard");
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-black group-hover:rotate-3 transition-transform">M</div>
            <span className="font-black text-xl tracking-tighter text-slate-900">MedX</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-2 sm:gap-6">
            {!user ? (
              <>
                <button
                  onClick={openLoginModal}
                  className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </button>
                <Link
                  href="/register"
                  className="hidden sm:block px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-teal-600 transition-all active:scale-95"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95">
                      <div className="p-4 border-b border-slate-50 font-bold text-sm">Notifications</div>
                      <div className="max-h-60 overflow-y-auto p-2 text-center text-slate-400 text-xs py-10">
                        No new notifications
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1 pl-3 bg-slate-50 border border-slate-100 rounded-full hover:border-slate-300 transition-all"
                  >
                    <span className="text-xs font-bold text-slate-700 hidden md:block">Hi, {username}</span>
                    <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 mr-1" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                      <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Dashboard
                      </Link>
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Settings
                      </Link>
                      <hr className="my-2 border-slate-50" />
                      <button
                        onClick={() => { supabaseBrowser.auth.signOut(); router.push("/"); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Enhanced Login Modal */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => { setShowForgot(false); closeLoginModal(); }}
        title={showForgot ? "Reset Password" : "Welcome Back"}
      >
        <div className="p-1">
          {!showForgot ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs font-bold text-teal-600 hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                disabled={isSubmitting}
                className="w-full bg-slate-900 hover:bg-teal-600 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 active:scale-95 shadow-xl shadow-slate-200"
              >
                {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                Sign In
              </button>

              <p className="text-center text-sm text-slate-500">
                New to MedX? <Link href="/register" onClick={closeLoginModal} className="text-teal-600 font-bold hover:underline">Create account</Link>
              </p>
            </form>
          ) : (
            <ForgotPasswordForm onDone={() => setShowForgot(false)} />
          )}
        </div>
      </Modal>
    </>
  );
}