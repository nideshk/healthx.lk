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
  BarChart3,
  Phone
} from "lucide-react";
import { toast } from "react-toastify";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useModalStore } from "@/store/useModalStore";
import Modal from "@/components/atom/Modal/Modal";
import { useAuth } from "@/contexts/AuthContext";
import LanguageToggle from "@/components/common/LanguageToggle";
import CurrencyToggle from "@/components/common/CurrencyToggle";
import { homeRedesignCopy } from "@/content/homeRedesignCopy";
import { openSpecialties } from "@/lib/homeNavigation";

export default function Header() {
  const t = useTranslations("header"); // Initialize translations
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading, refreshUser } = useAuth();
  const { isLoginModalOpen, openLoginModal, closeLoginModal, redirectTo } = useModalStore();

  // --- UI States ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // --- MFA States ---
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [mfaInProgress, setMfaInProgress] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);


  const checkUserStatus = async (session: any, target?: string | null) => {
    const { data } = await supabaseBrowser.from("profiles").select("*").eq("id", session.user.id).single();
    if (!data.is_active) {
      supabaseBrowser.auth.signOut();
      router.push("/");
      toast.error("Your account has been deactivated");
    }
    else {
      router.push(target || "/dashboard")
    }
  }

  // --- Navigation Arrays ---

  const publicLinks = [
    { name: t("nav.ourStory"), href: "/about-us", icon: ShieldCheck },
    { name: t("nav.help"), href: "/help", icon: Calendar },
    { name: t("nav.contactUs"), href: "/contact-us", icon: Phone },
  ];

  const privateLinks = [
    { name: t("nav.dashboard"), href: "/dashboard", icon: Search },
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
    const target = redirectTo;
    setMfa(null);
    setOtp("");
    
    // 🔥 Ensure AuthContext is synced before we navigate
    // This prevents race conditions in RoleGuards on destination pages
    if (refreshUser) await refreshUser();

    await checkUserStatus(session, target)
    closeLoginModal();
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

  const onBook = () => {
    setIsMenuOpen(false);
    openSpecialties(pathname, (href) => router.push(href));
  };


  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full bg-white border-b border-cx-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="relative flex h-11 w-[7.25rem] items-center overflow-hidden" aria-label="Clinecxa">
            <img src="/assets/logo.png" alt="" className="absolute left-1/2 top-1/2 h-[6.75rem] w-auto max-w-none -translate-x-1/2 -translate-y-1/2" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-24 h-10 bg-cx-tint rounded-lg animate-pulse" />
            <div className="w-10 h-10 bg-cx-tint rounded-full animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white border-b border-cx-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 gap-4">

            <div className="flex items-center gap-4 md:gap-8 min-w-0">
              <button
                type="button"
                className="md:hidden min-h-12 min-w-12 inline-flex items-center justify-center text-cx-ink hover:bg-cx-tint rounded-xl"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={26} />
              </button>

              <Link href="/" className="relative flex h-11 w-[7.25rem] md:h-14 md:w-[11rem] items-center overflow-hidden shrink-0" aria-label="Clinecxa">
                <img src="/assets/logo.png" alt="" className="absolute left-1/2 top-1/2 h-[6.75rem] md:h-[10rem] w-auto max-w-none -translate-x-1/2 -translate-y-1/2" />
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {[...(user ? privateLinks : []), ...publicLinks].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-base font-semibold min-h-12 inline-flex items-center ${pathname === link.href ? "text-cx-primary bg-cx-tint" : "text-cx-ink hover:bg-cx-tint"
                      }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex md:hidden items-center gap-1">
                <LanguageToggle />
                {!user ? (
                  <button
                    type="button"
                    onClick={() => openLoginModal("/dashboard")}
                    className="sm:hidden min-h-12 px-2 text-base font-semibold text-cx-ink"
                  >
                    {t("auth.logIn")}
                  </button>
                ) : null}
              </div>
              <div className="hidden md:flex items-center gap-2">
                <CurrencyToggle />
                <LanguageToggle />
              </div>

              {!user ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => openLoginModal("/dashboard")} className="hidden sm:inline-flex min-h-12 items-center px-3 text-base font-semibold text-cx-ink hover:text-cx-primary">
                    {t("auth.logIn")}
                  </button>
                  <button type="button" onClick={onBook} className="cx-btn hidden md:inline-flex">
                    {homeRedesignCopy.bookConsultation}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={onBook} className="cx-btn hidden md:inline-flex">
                    {homeRedesignCopy.bookConsultation}
                  </button>
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className="flex items-center gap-3 p-1.5 pl-3 min-h-12 bg-white border border-cx-border rounded-full hover:bg-cx-tint"
                    >
                      <div className="flex flex-col items-end hidden sm:flex">
                        <span className="text-sm font-semibold text-cx-ink">{firstName}</span>
                        <span className="text-xs text-cx-primary font-semibold uppercase">{user.role}</span>
                      </div>
                      <div className="w-9 h-9 bg-cx-primary rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden shrink-0">
                        {user.profile?.avatar_url ? (
                          <img src={user.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          userInitial
                        )}
                      </div>
                      <ChevronDown size={14} className={`text-cx-ink transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserDropdownOpen && (
                      <div className="absolute right-0 mt-3 w-60 bg-white border border-cx-border rounded-2xl p-2 z-50">
                        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 text-base font-semibold text-cx-ink hover:bg-cx-tint rounded-xl">
                          <LayoutDashboard size={18} /> {t("dropdown.dashboard")}
                        </Link>
                        {user.role === "patient" || user.role === "practitioner" ? <Link href={"/profile"} className="flex items-center gap-3 px-3 py-3 text-base font-semibold text-cx-ink hover:bg-cx-tint rounded-xl">
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
        className={`fixed inset-0 z-[60] bg-cx-deep/40 transition-opacity duration-300 md:hidden ${isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setIsMenuOpen(false)}
      />

      <div className={`fixed inset-y-0 left-0 z-[70] w-[300px] bg-white border-r border-cx-border transform transition-transform duration-300 md:hidden ${isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-cx-border flex items-center justify-between">
            <span className="relative flex h-11 w-[7.25rem] items-center overflow-hidden">
              <img src="/assets/logo.png" alt="Clinecxa" className="absolute left-1/2 top-1/2 h-[6.75rem] w-auto max-w-none -translate-x-1/2 -translate-y-1/2" />
            </span>
            <button type="button" onClick={() => setIsMenuOpen(false)} className="min-h-12 min-w-12 inline-flex items-center justify-center text-cx-ink bg-cx-tint rounded-xl" aria-label="Close menu">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">

            {/* Section: Main Menu */}
            <div>
              <p className="px-4 text-sm font-semibold text-cx-primary mb-3">{t("sidebar.explore")}</p>
              <div className="space-y-1">
                {[...(user ? privateLinks : []), ...publicLinks].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-4 p-4 min-h-12 text-base font-semibold rounded-2xl ${isLinkActive(link.href) ? "bg-cx-tint text-cx-primary" : "text-cx-ink hover:bg-cx-tint"
                      }`}
                  >
                    <div className={`p-2 rounded-lg ${isLinkActive(link.href) ? "bg-white text-cx-primary" : "bg-cx-tint text-cx-primary"}`}>
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
                <p className="px-4 text-sm font-semibold text-cx-primary mb-3">{t("sidebar.patientPortal")}</p>
                <div className="space-y-1">
                  {patientPortalLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-4 p-4 min-h-12 text-base font-semibold rounded-2xl ${isLinkActive(link.href) ? "bg-cx-tint text-cx-primary" : "text-cx-ink hover:bg-cx-tint"
                        }`}
                    >
                      <div className={`p-2 rounded-lg ${isLinkActive(link.href) ? "bg-white text-cx-primary" : "bg-cx-tint text-cx-primary"}`}>
                        <link.icon size={18} />
                      </div>
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-cx-border flex flex-col gap-4">
              <CurrencyToggle />
              <LanguageToggle />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-cx-border bg-cx-bg">
            {!user ? (
              <div className="grid grid-cols-1 gap-3">
                <button type="button" onClick={() => { setIsMenuOpen(false); openLoginModal(); }} className="cx-btn-secondary inline-flex w-full">
                  {t("auth.logIn")}
                </button>
                <button type="button" onClick={onBook} className="cx-btn inline-flex w-full">
                  {homeRedesignCopy.bookConsultation}
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
        onClose={async () => {
          if (mfa) {
            // MFA was required but not completed
            await supabaseBrowser.auth.signOut();
          }
          setShowForgot(false); setMfa(null); closeLoginModal();
        }}
        title={mfa ? t("modal.mfaTitle") : showForgot ? t("modal.recoverTitle") : t("modal.signInTitle")}
      >
        <div className="px-1 py-2">
          {mfa ? (
            <div className="space-y-6">
              <input
                type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="0 0 0 0 0 0"
                className="w-full text-center tracking-[0.5em] font-black text-3xl py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-cx-primary"
              />
              <button
                onClick={async () => {
                  setMfaInProgress(true);
                  const { error } = await supabaseBrowser.auth.mfa.verify({ factorId: mfa.factorId, challengeId: mfa.challengeId, code: otp });
                  if (error) { toast.error(error.message); setMfaInProgress(false); return; }
                  const { data } = await supabaseBrowser.auth.getSession();
                  finalizeLogin(data.session);
                }}
                disabled={otp.length !== 6}
                className="cx-btn inline-flex w-full"
              >
                {t("modal.confirm")}
              </button>
            </div>
          ) : !showForgot ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("modal.emailLabel")}</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cx-primary" />
                  <input name="email" type="email" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-cx-primary" placeholder="email@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("modal.passwordLabel")}</label>
                  <button type="button" onClick={() => setShowForgot(true)} className="text-[10px] font-black text-cx-primary hover:underline uppercase">{t("modal.forgot")}</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cx-primary" />
                  <input name="password" type={showPassword ? "text" : "password"} required className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-cx-primary" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button disabled={isSubmitting} className="cx-btn inline-flex w-full">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("modal.signInTitle")}
              </button>
              <button type="button" onClick={() => {
                const dest = redirectTo;
                closeLoginModal();
                router.push(dest ? `/create-account?callbackUrl=${encodeURIComponent(dest)}` : "/create-account");
              }} className="cx-btn-secondary inline-flex w-full">
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
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-cx-primary" placeholder="email@example.com" />
        </div>
      </div>
      <button disabled={loading} className="cx-btn inline-flex w-full">
        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {t("modal.sendLink")}
      </button>
      <button type="button" onClick={onDone} className="text-[10px] font-black text-slate-400 hover:text-slate-800 uppercase text-center w-full">
        {t("modal.backLogin")}
      </button>
    </form>
  );
}