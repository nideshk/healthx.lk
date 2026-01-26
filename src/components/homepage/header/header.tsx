"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl"; // Added for translations
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
  Languages,
  File,
  BarChart3
} from "lucide-react";
import { toast } from "react-toastify";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useModalStore } from "@/store/useModalStore";
import Modal from "@/components/atom/Modal/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/authFetch";
import LanguageToggle from "@/components/common/LanguageToggle";

export default function Header() {
  const t = useTranslations("header"); // Initialize translations
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { isLoginModalOpen, openLoginModal, closeLoginModal } = useModalStore();

  // --- UI States ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // --- MFA States ---
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [mfaInProgress, setMfaInProgress] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // --- Navigation Arrays ---

  // Visible on both Desktop Header and Mobile Sidebar
  const publicLinks = [
    { name: t("nav.findDoctors"), href: "/dashboard", icon: Search },
    { name: t("nav.ourStory"), href: "/about-us", icon: ShieldCheck },
    { name: t("nav.help"), href: "/help", icon: Calendar },
  ];

  // Visible ONLY in the Mobile Sidebar (Left Drawer)
  const patientPortalLinks = [
    { name: t("portal.appointments"), href: "/dashboard?tab=appointments", icon: Calendar },
    { name: t("portal.reschedule"), href: "/dashboard?tab=reschedule", icon: Calendar },
    { name: t("portal.medicalRecords"), href: "/dashboard?tab=file-manager", icon: File },
    { name: t("portal.followUps"), href: "/dashboard?tab=follow-ups", icon: BarChart3 },
  ];

  // --- Effects ---

  // Prevent background scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "unset";
  }, [isMenuOpen]);

  // Handle outside clicks for dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserDropdownOpen(false);
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- Auth Logic ---

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

  // --- Helpers ---
  const firstName = user?.profile?.first_name || "User";
  const userInitial = firstName[0]?.toUpperCase() || "U";

  // Check if a link is active (considering query params for tabs)
  const isLinkActive = (href: string) => {
    if (href.includes('?tab=')) {
      const [basePath, query] = href.split('?');
      const targetTab = query.split('=')[1];
      return pathname === basePath && searchParams.get('tab') === targetTab;
    }
    return pathname === href;
  };


  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img src="/assets/logo.png" alt="MedX" className="w-24 h-24" />
          </Link>

          {/* Right: Skeleton */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* LEFT SIDE: MOBILE BURGER + LOGO + DESKTOP NAV */}
            <div className="flex items-center gap-6 md:gap-10">
              <button
                className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => setIsMenuOpen(true)}
              >
                <Menu size={26} />
              </button>

              <Link href="/" className="flex items-center gap-2 group">
                <img src="/assets/logo.png" alt="" className="w-24 h-24" />
              </Link>

              {/* DESKTOP NAVIGATION (Public Only) */}
              <nav className="hidden md:flex items-center gap-1">
                {publicLinks.map((link) => (
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

            {/* RIGHT SIDE: PROFILE / AUTH */}
            <div className="flex items-center gap-3">
              {user?.role === "patient" && <div className="hidden md:block mr-2">
                <LanguageToggle />
              </div>}

              {!user ? (
                <div className="flex items-center gap-2">
                  <button onClick={openLoginModal} className="hidden sm:block px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-teal-600 transition-colors">
                    {t("auth.logIn")}
                  </button>
                  <button onClick={openLoginModal} className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-teal-600 shadow-lg transition-all active:scale-95">
                    {t("auth.getStarted")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {/* Notification Bell (Simplified for full code) */}
                  <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all relative">
                    <Bell size={22} />
                  </button>

                  {/* USER DROPDOWN */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className="flex items-center gap-3 p-1.5 pl-4 bg-slate-50 border border-slate-200 rounded-full hover:bg-white transition-all shadow-sm"
                    >
                      <div className="flex flex-col items-end hidden sm:flex">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{firstName}</span>
                        <span className="text-[10px] text-teal-600 font-bold uppercase">{user.role}</span>
                      </div>
                      <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0 shadow-inner">
                        {user.profile?.avatar_url ? (
                          <img src={user.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          userInitial
                        )}
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserDropdownOpen && (
                      <div className="absolute right-0 mt-3 w-60 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in duration-200">
                        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-teal-600 rounded-xl transition-all">
                          <LayoutDashboard size={18} /> {t("dropdown.dashboard")}
                        </Link>
                        {user.role === "patient" || user.role === "practitioner" ? <Link href={"/profile"} className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-teal-600 rounded-xl transition-all">
                          <User size={18} /> {t("dropdown.profile")}
                        </Link> : null}
                        <button
                          onClick={() => {
                            supabaseBrowser.auth.signOut();
                            router.push("/");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all mt-1"
                        >
                          <LogOut size={18} /> {t("dropdown.signOut")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* --- MOBILE SIDEBAR (LEFT SIDE) --- */}
      <div
        className={`fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setIsMenuOpen(false)}
      />

      <div className={`fixed inset-y-0 left-0 z-[70] w-[300px] bg-white shadow-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white shadow-md">
                <ShieldCheck size={18} />
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900">Med<span className="text-teal-600">X</span></span>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">

            {/* Section: Main Menu */}
            <div>
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t("sidebar.explore")}</p>
              <div className="space-y-1">
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-4 p-4 text-sm font-bold rounded-2xl transition-all group ${isLinkActive(link.href) ? "bg-teal-50 text-teal-700 shadow-sm shadow-teal-100/50" : "text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <div className={`p-2 rounded-lg transition-colors ${isLinkActive(link.href) ? "bg-white text-teal-600" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-teal-600"}`}>
                      <link.icon size={18} />
                    </div>
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Section: Dashboard (Only visible if user logged in) */}
            {user && (
              <div>
                <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t("sidebar.patientPortal")}</p>
                <div className="space-y-1">
                  {patientPortalLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-4 p-4 text-sm font-bold rounded-2xl transition-all group ${isLinkActive(link.href) ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      <div className={`p-2 rounded-lg transition-colors ${isLinkActive(link.href) ? "bg-white text-teal-600" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-teal-600"}`}>
                        <link.icon size={18} />
                      </div>
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <LanguageToggle />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-50 bg-slate-50/30">
            {!user ? (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setIsMenuOpen(false); openLoginModal(); }} className="py-3.5 text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
                  {t("auth.logIn")}
                </button>
                <button onClick={() => { setIsMenuOpen(false); openLoginModal(); }} className="py-3.5 text-xs font-black text-white bg-slate-900 rounded-xl shadow-lg">
                  {t("auth.joinNow")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setIsMenuOpen(false); supabaseBrowser.auth.signOut(); router.push("/"); }}
                className="w-full flex items-center justify-center gap-3 py-4 text-sm font-bold text-red-500 bg-red-50 rounded-2xl active:scale-95 transition-all"
              >
                <LogOut size={18} /> {t("dropdown.signOut")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- LOGIN MODAL --- */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => { setShowForgot(false); setMfa(null); closeLoginModal(); }}
        title={mfa ? t("modal.mfaTitle") : showForgot ? t("modal.recoverTitle") : t("modal.signInTitle")}
      >
        <div className="px-1 py-2">
          {mfa ? (
            <div className="space-y-6">
              <input
                type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="0 0 0 0 0 0"
                className="w-full text-center tracking-[0.5em] font-black text-3xl py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-teal-500"
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
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-teal-600 transition-all"
              >
                {mfaInProgress && <Loader2 className="w-5 h-5 animate-spin" />} {t("modal.confirm")}
              </button>
            </div>
          ) : !showForgot ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("modal.emailLabel")}</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600" />
                  <input name="email" type="email" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-teal-500" placeholder="email@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("modal.passwordLabel")}</label>
                  <button type="button" onClick={() => setShowForgot(true)} className="text-[10px] font-black text-teal-600 hover:underline uppercase">{t("modal.forgot")}</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600" />
                  <input name="password" type={showPassword ? "text" : "password"} required className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-teal-500" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-teal-600 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-3 shadow-xl transition-all">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("modal.signInTitle")}
              </button>
              <button type="button" onClick={() => { closeLoginModal(); router.push("/create-account"); }} className="w-full bg-slate-100 text-slate-900 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all">
                {t("modal.createAccount")}
              </button>
            </form>
          ) : (
            <ForgotPasswordForm t={t} onDone={() => setShowForgot(false)} />
          )}
        </div>
      </Modal>
    </>
  );
}

function ForgotPasswordForm({ onDone, t }: { onDone: () => void, t: any }) {
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
    toast.success("Recovery link sent!");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("modal.accountEmail")}</label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-teal-500" placeholder="email@example.com" />
        </div>
      </div>
      <button disabled={loading} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-teal-600 transition-all">
        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {t("modal.sendLink")}
      </button>
      <button type="button" onClick={onDone} className="text-[10px] font-black text-slate-400 hover:text-slate-800 uppercase text-center w-full">
        {t("modal.backLogin")}
      </button>
    </form>
  );
}