"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
  Calendar,
  Search,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "react-toastify";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useModalStore } from "@/store/useModalStore";
import Modal from "@/components/atom/Modal/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/authFetch";

const LOCAL_DRAFT_KEY = "bookingDraft";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { isLoginModalOpen, openLoginModal, closeLoginModal } = useModalStore();

  // --- UI States ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // --- Notification State ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // --- MFA States ---
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [mfaInProgress, setMfaInProgress] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { name: "Find Doctors", href: "/dashboard", icon: Search },
    { name: "About us", href: "/about-us", icon: ShieldCheck },
    { name: "Book Now", href: "/appointment", icon: Calendar },
  ];

  /* ------------------------------------------------
     1. NOTIFICATION LOGIC (Using your API)
  ------------------------------------------------ */
  const fetchNotifications = async () => {
    if (!user) return;
    setLoadingNotifs(true);
    try {
      const res = await authFetch("/api/notification");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error("Notif fetch error:", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, [user]);

  /* ------------------------------------------------
     2. AUTH & MFA LOGIC
  ------------------------------------------------ */
  async function finalizeLogin(session: any) {
    setMfa(null);
    setOtp("");
    closeLoginModal();
    router.push("/dashboard");
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (error) throw error;

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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ------------------------------------------------
     3. CLICK OUTSIDE HANDLERS
  ------------------------------------------------ */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserDropdownOpen(false);
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Derived Values
  const firstName = user?.profile?.first_name || "User";
  const userInitial = firstName[0]?.toUpperCase() || "U";
  const unreadCount = notifications.length;
  const redirectToSignup = () => {
    closeLoginModal()
    router.push("/create-account");

  }
  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* LOGO */}
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-200 group-hover:rotate-6 transition-transform">
                  <ShieldCheck size={24} />
                </div>
                <span className="text-2xl font-black tracking-tighter text-slate-900">Med<span className="text-teal-600">X</span></span>
              </Link>

              {/* DESKTOP NAV */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${pathname === link.href ? "text-teal-600 bg-teal-50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center gap-3">
              {!user ? (
                <div className="flex items-center gap-2">
                  <button onClick={openLoginModal} className="hidden sm:block px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-teal-600 transition-colors">Log In</button>
                  <button onClick={openLoginModal} className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-teal-600 shadow-lg shadow-slate-200 transition-all active:scale-95">Get Started</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 md:gap-4">

                  {/* NOTIFICATION BELL */}
                  <div className="relative" ref={notifMenuRef}>
                    <button
                      onClick={() => setIsNotifOpen(!isNotifOpen)}
                      className={`p-2.5 rounded-xl transition-all relative ${isNotifOpen ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
                    >
                      <Bell size={22} />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {isNotifOpen && (
                      <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white border border-slate-100 rounded-3xl shadow-2xl shadow-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                          <div>
                            <h3 className="text-sm font-black text-slate-900">Health Alerts</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{unreadCount} New Notifications</p>
                          </div>
                          <button className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline">Mark all read</button>
                        </div>
                        <div className="max-h-[350px] overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map((n) => (
                              <div key={n.id} className="p-4 flex gap-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 cursor-pointer bg-teal-50/20">
                                <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-teal-100 text-teal-600">
                                  <Clock size={18} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-black text-slate-900">{n.title || 'Notification'}</p>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">{n.content || n.message}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">
                                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-10 text-center">
                              <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                              <p className="text-xs font-bold text-slate-400">All caught up!</p>
                            </div>
                          )}
                        </div>
                        <Link href="/notifications" onClick={() => setIsNotifOpen(false)} className="block p-4 text-center text-[11px] font-black text-slate-500 hover:bg-slate-50 border-t border-slate-50">View All Activity</Link>
                      </div>
                    )}
                  </div>

                  {/* USER DROP_DOWN */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className="flex items-center gap-3 p-1.5 pl-4 bg-slate-50 border border-slate-200 rounded-full hover:bg-white transition-all shadow-sm"
                    >
                      <div className="flex flex-col items-end hidden sm:flex">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{firstName}</span>
                        <span className="text-[10px] text-teal-600 font-bold uppercase">{user.role}</span>
                      </div>
                      <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner">
                        {userInitial}
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserDropdownOpen && (
                      <div className="absolute right-0 mt-3 w-60 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200 p-2 z-50 animate-in fade-in zoom-in duration-200">
                        <div className="p-4 mb-2 border-b border-slate-50">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</p>
                          <p className="text-sm font-bold text-slate-900 truncate">{user.user.email}</p>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-teal-600 rounded-xl transition-all">
                          <LayoutDashboard size={18} /> Dashboard
                        </Link>
                        <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-teal-600 rounded-xl transition-all">
                          <User size={18} /> My Profile
                        </Link>
                        <button
                          onClick={() => {
                            router.push("/")
                            supabaseBrowser.auth.signOut()
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all mt-1"
                        >
                          <LogOut size={18} /> Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MOBILE MENU TOGGLE */}
              <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE DRAWER */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 p-4 space-y-2 animate-in slide-in-from-top duration-300">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-4 text-base font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-600 rounded-2xl transition-all">
                <link.icon size={20} /> {link.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => { setShowForgot(false); setMfa(null); closeLoginModal(); }}
        title={mfa ? "Two-Factor Auth" : showForgot ? "Recover Account" : "Sign In"}
      >
        <div className="px-1 py-2">
          {mfa ? (
            <div className="space-y-6">
              <div className="p-4 bg-teal-50 text-teal-700 rounded-2xl text-xs font-bold flex gap-3 leading-relaxed">
                <ShieldCheck className="w-5 h-5 shrink-0" /> Enter the 6-digit verification code from your authenticator app.
              </div>
              <input
                type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="0 0 0 0 0 0"
                className="w-full text-center tracking-[0.5em] font-black text-3xl py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-teal-500 focus:bg-white transition-all"
              />
              <button
                onClick={async () => {
                  setMfaInProgress(true);
                  const { error } = await supabaseBrowser.auth.mfa.verify({ factorId: mfa.factorId, challengeId: mfa.challengeId, code: otp });
                  if (error) { toast.error(error.message); setMfaInProgress(false); return; }
                  const { data } = await supabaseBrowser.auth.getSession();
                  finalizeLogin(data.session);
                }}
                disabled={mfaInProgress || otp.length !== 6}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-teal-600 transition-all shadow-xl shadow-teal-100"
              >
                {mfaInProgress && <Loader2 className="w-5 h-5 animate-spin" />} Confirm & Continue
              </button>
            </div>
          ) : !showForgot ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                  <input name="email" type="email" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-teal-500 focus:bg-white transition-all font-medium" placeholder="anirudh@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                  <button type="button" onClick={() => setShowForgot(true)} className="text-[10px] font-black text-teal-600 hover:underline uppercase tracking-wider">Forgot?</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                  <input name="password" type={showPassword ? "text" : "password"} required className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-teal-500 focus:bg-white transition-all font-medium" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-teal-600 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-slate-200">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
              </button>
              <button onClick={redirectToSignup} className="w-full bg-slate-900 hover:bg-teal-600 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-slate-200">
                Create Account
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

// ... ForgotPasswordForm remains same as previous ...
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
    toast.success("Recovery link sent to your email!");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Email</label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-teal-500 focus:bg-white transition-all" placeholder="anirudh@example.com" />
        </div>
      </div>
      <button disabled={loading} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-teal-600 transition-all flex justify-center items-center gap-2 shadow-xl shadow-slate-100">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />} Send Recovery Link
      </button>
      <button type="button" onClick={onDone} className="w-full text-[10px] font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest">Back to Login</button>
    </form>
  );
}